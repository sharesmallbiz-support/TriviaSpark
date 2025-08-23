import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openAIService } from "./openai";
import { eventGenerationSchema, questionGenerationSchema, insertEventSchema, insertParticipantSchema, insertTeamSchema } from "@shared/schema";
import { z } from "zod";

// Simple session store
const sessions = new Map<string, { userId: string; expiresAt: number }>();

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function cleanupSessions() {
  const now = Date.now();
  Array.from(sessions.entries()).forEach(([sessionId, session]) => {
    if (session.expiresAt < now) {
      sessions.delete(sessionId);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Clean up expired sessions every hour
  setInterval(cleanupSessions, 60 * 60 * 1000);
  // Get dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Using demo user for now
      const hostId = "demo-user-id";
      const stats = await storage.getEventStats(hostId);
      
      // Get AI insights
      const insights = await openAIService.generateInsights(stats);
      
      res.json({
        ...stats,
        insights
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Get events for host
  app.get("/api/events", async (req, res) => {
    try {
      // Get authenticated user's events
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const events = await storage.getEventsByHost(session.userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Get active events
  app.get("/api/events/active", async (req, res) => {
    try {
      // Get authenticated user's active events
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const events = await storage.getActiveEvents(session.userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching active events:", error);
      res.status(500).json({ error: "Failed to fetch active events" });
    }
  });

  // Create event manually
  app.post("/api/events", async (req, res) => {
    try {
      // Get authenticated user
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const validatedData = insertEventSchema.parse({
        ...req.body,
        hostId: session.userId
      });
      
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid event data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create event" });
      }
    }
  });

  // Generate event with AI
  app.post("/api/events/generate", async (req, res) => {
    try {
      const validatedRequest = eventGenerationSchema.parse(req.body);
      
      // Generate event content with OpenAI
      const generatedContent = await openAIService.generateEvent(validatedRequest);
      
      // Create the event
      // Get authenticated user
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const eventData = {
        title: generatedContent.title,
        description: generatedContent.description,
        hostId: session.userId,
        eventType: validatedRequest.eventType,
        maxParticipants: validatedRequest.participants,
        difficulty: validatedRequest.difficulty,
        settings: generatedContent.settings,
        status: "active" as const,
        eventDate: generatedContent.eventDate ? new Date(generatedContent.eventDate) : null,
        eventTime: generatedContent.eventTime || null,
        location: generatedContent.location || null,
        sponsoringOrganization: generatedContent.sponsoringOrganization || null,
      };
      
      const event = await storage.createEvent(eventData);
      
      // Create questions for the event
      const questionsWithEventId = generatedContent.questions.map(q => ({
        ...q,
        eventId: event.id
      }));
      
      const questions = await storage.createQuestions(questionsWithEventId);
      
      res.status(201).json({
        event,
        questions
      });
    } catch (error) {
      console.error("Error generating event:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to generate event" });
      }
    }
  });

  // Generate questions with AI for existing events
  app.post("/api/questions/generate", async (req, res) => {
    try {
      const validatedRequest = questionGenerationSchema.parse(req.body);
      
      // Verify event exists
      const event = await storage.getEvent(validatedRequest.eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Get existing questions to avoid duplicates
      const existingQuestions = await storage.getQuestionsByEvent(validatedRequest.eventId);
      
      const questions = await openAIService.generateQuestions(validatedRequest, existingQuestions);
      
      // Store generated questions in the event
      const questionsWithEventId = questions.map((q, index) => ({
        ...q,
        eventId: validatedRequest.eventId,
        orderIndex: existingQuestions.length + index
      }));
      
      const storedQuestions = await storage.createQuestions(questionsWithEventId);
      
      res.json({ questions: storedQuestions });
    } catch (error) {
      console.error("Error generating questions:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to generate questions" });
      }
    }
  });


  // Start event
  app.post("/api/events/:id/start", async (req, res) => {
    try {
      const event = await storage.updateEvent(req.params.id, {
        status: "active",
        startedAt: new Date()
      });
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error starting event:", error);
      res.status(500).json({ error: "Failed to start event" });
    }
  });

  // Join event via QR code
  app.post("/api/events/join/:qrCode", async (req, res) => {
    try {
      const { name, teamAction, teamIdentifier } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      // Check for existing participant via cookie
      const participantToken = req.cookies.participantToken;
      if (participantToken) {
        const existingParticipant = await storage.getParticipantByToken(participantToken);
        if (existingParticipant) {
          return res.json({
            participant: existingParticipant,
            event: await storage.getEvent(existingParticipant.eventId),
            returning: true
          });
        }
      }
      
      // Find event by QR code
      const events = await storage.getEventsByHost("mark-user-id");
      const event = events.find(e => e.qrCode === req.params.qrCode);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      if (event.status === "cancelled") {
        return res.status(400).json({ error: "Event has been cancelled" });
      }
      
      let teamId = null;
      
      // Handle team selection
      if (teamAction === "join" && teamIdentifier) {
        const team = await storage.getTeamByNameOrTable(event.id, teamIdentifier);
        if (!team) {
          return res.status(404).json({ error: "Team not found" });
        }
        
        // Check team capacity
        const teamMembers = await storage.getParticipantsByTeam(team.id);
        if (teamMembers.length >= (team.maxMembers || 6)) {
          return res.status(400).json({ error: "Team is full" });
        }
        
        teamId = team.id;
      } else if (teamAction === "create" && teamIdentifier) {
        // Create new team
        const existingTeam = await storage.getTeamByNameOrTable(event.id, teamIdentifier);
        if (existingTeam) {
          return res.status(400).json({ error: "Team name or table number already exists" });
        }
        
        const isTableNumber = !isNaN(Number(teamIdentifier));
        const newTeam = await storage.createTeam({
          eventId: event.id,
          name: isTableNumber ? `Table ${teamIdentifier}` : String(teamIdentifier),
          tableNumber: isTableNumber ? Number(teamIdentifier) : null,
        });
        
        teamId = newTeam.id;
      }
      
      const participant = await storage.createParticipant({
        eventId: event.id,
        name,
        teamId,
        isActive: true,
        canSwitchTeam: event.status !== "active"
      });
      
      // Set participant cookie
      res.cookie('participantToken', participant.participantToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      });
      
      res.status(201).json({
        participant,
        event: {
          id: event.id,
          title: event.title,
          description: event.description,
          status: event.status
        },
        returning: false
      });
    } catch (error) {
      console.error("Error joining event:", error);
      res.status(500).json({ error: "Failed to join event" });
    }
  });

  // Submit answer
  app.post("/api/responses", async (req, res) => {
    try {
      const { participantId, questionId, answer, responseTime, timeRemaining } = req.body;
      
      if (!participantId || !questionId || !answer) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Get question to check answer
      const question: any = Array.from((storage as any).questions.values())
        .find((q: any) => q.id === questionId);
      
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      const isCorrect = answer.toLowerCase().trim() === (question.correctAnswer || '').toLowerCase().trim();
      
      // Tiered scoring system based on time remaining
      let points = 0;
      if (isCorrect && timeRemaining > 0) {
        if (timeRemaining >= 20) {
          points = 20;
        } else if (timeRemaining >= 15) {
          points = 15;
        } else if (timeRemaining >= 10) {
          points = 10;
        } else if (timeRemaining >= 5) {
          points = 5;
        } else {
          points = 1; // 1-4 seconds remaining
        }
      }
      
      const response = await storage.createResponse({
        participantId,
        questionId,
        answer,
        isCorrect,
        points,
        responseTime: responseTime || null,
        timeRemaining: timeRemaining || null
      });
      
      res.status(201).json(response);
    } catch (error) {
      console.error("Error submitting response:", error);
      res.status(500).json({ error: "Failed to submit response" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Create session
      const sessionId = generateSessionId();
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      sessions.set(sessionId, { userId: user.id, expiresAt });
      
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  
  app.post("/api/auth/logout", async (req, res) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.clearCookie('sessionId');
    res.json({ success: true });
  });
  
  app.get("/api/auth/me", async (req, res) => {
    const sessionId = req.cookies.sessionId;
    const session = sessionId ? sessions.get(sessionId) : null;
    
    if (!session || session.expiresAt < Date.now()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt
      }
    });
  });

  app.put("/api/auth/profile", async (req, res) => {
    const sessionId = req.cookies.sessionId;
    const session = sessionId ? sessions.get(sessionId) : null;
    
    if (!session || session.expiresAt < Date.now()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const { fullName, email, username } = req.body;
    
    if (!fullName || !email || !username) {
      return res.status(400).json({ error: "Full name, email, and username are required" });
    }
    
    try {
      // In a real app, you'd update the database here
      // For now, we'll just return success since we're using in-memory storage
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Update user in memory storage
      const updatedUser = { ...user, fullName, email, username };
      (storage as any).users.set(session.userId, updatedUser);
      
      res.json({
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          createdAt: updatedUser.createdAt
        }
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Get teams for an event
  app.get("/api/events/:id/teams", async (req, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const eventId = req.params.id;
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Check if user owns this event
      if (event.hostId !== session.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const teams = await storage.getTeamsByEvent(eventId);
      
      // Include participant count for each team
      const teamsWithCounts = await Promise.all(teams.map(async (team) => {
        const participants = await storage.getParticipantsByTeam(team.id);
        return {
          ...team,
          participantCount: participants.length,
          participants: participants
        };
      }));
      
      res.json(teamsWithCounts);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });
  
  // Create team
  app.post("/api/events/:id/teams", async (req, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const eventId = req.params.id;
      const { name, tableNumber } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Team name is required" });
      }
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      if (event.hostId !== session.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Check for duplicate name or table number
      const existingTeam = await storage.getTeamByNameOrTable(eventId, tableNumber || name);
      if (existingTeam) {
        return res.status(400).json({ error: "Team name or table number already exists" });
      }
      
      const team = await storage.createTeam({
        eventId,
        name,
        tableNumber: tableNumber || null
      });
      
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ error: "Failed to create team" });
    }
  });
  
  // Switch participant team
  app.put("/api/participants/:id/team", async (req, res) => {
    try {
      const participantId = req.params.id;
      const { teamId } = req.body;
      
      // Check participant token
      const participantToken = req.cookies.participantToken;
      if (!participantToken) {
        return res.status(401).json({ error: "Not authenticated as participant" });
      }
      
      const participant = await storage.getParticipantByToken(participantToken);
      if (!participant || participant.id !== participantId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!participant.canSwitchTeam) {
        return res.status(400).json({ error: "Team switching is locked" });
      }
      
      const updatedParticipant = await storage.switchParticipantTeam(participantId, teamId);
      if (!updatedParticipant) {
        return res.status(400).json({ error: "Unable to switch teams" });
      }
      
      res.json(updatedParticipant);
    } catch (error) {
      console.error("Error switching team:", error);
      res.status(500).json({ error: "Failed to switch team" });
    }
  });
  
  // Start event
  app.post("/api/events/:id/start", async (req, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const eventId = req.params.id;
      const event = await storage.getEvent(eventId);
      
      if (!event || event.hostId !== session.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updatedEvent = await storage.updateEventStatus(eventId, "active");
      
      // Lock team switching once event starts
      await storage.lockTeamSwitching(eventId);
      
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error starting event:", error);
      res.status(500).json({ error: "Failed to start event" });
    }
  });

  // Get single event
  app.get("/api/events/:id", async (req, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const eventId = req.params.id;
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Check if user owns this event
      if (event.hostId !== session.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  // Update event
  app.put("/api/events/:id", async (req, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const eventId = req.params.id;
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Check if user owns this event
      if (event.hostId !== session.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updatedEvent = await storage.updateEvent(eventId, req.body);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  // Get participants for an event
  app.get("/api/events/:id/participants", async (req, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const eventId = req.params.id;
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Check if user owns this event
      if (event.hostId !== session.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const participants = await storage.getParticipantsByEvent(eventId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching participants:", error);
      res.status(500).json({ error: "Failed to fetch participants" });
    }
  });

  // Update event status
  app.patch("/api/events/:id/status", async (req, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const eventId = req.params.id;
      const { status } = req.body;
      
      if (!eventId || !status) {
        return res.status(400).json({ error: "Event ID and status are required" });
      }
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Check if user owns this event
      if (event.hostId !== session.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updatedEvent = await storage.updateEventStatus(eventId, status);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event status:", error);
      res.status(500).json({ error: "Failed to update event status" });
    }
  });

  // Get questions for an event
  app.get("/api/events/:id/questions", async (req, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const eventId = req.params.id;
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      // Check if user owns this event
      if (event.hostId !== session.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const questions = await storage.getQuestionsByEvent(eventId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Update a question
  app.put("/api/questions/:id", async (req, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const questionId = req.params.id;
      const question = await storage.getQuestion(questionId);
      
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      // Verify user owns the event this question belongs to
      const event = await storage.getEvent(question.eventId);
      if (!event || event.hostId !== session.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updatedQuestion = await storage.updateQuestion(questionId, req.body);
      res.json(updatedQuestion);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  // Get teams publicly (for participant joining)
  app.get("/api/events/:qrCode/teams-public", async (req, res) => {
    try {
      const qrCode = req.params.qrCode;
      
      // Find event by QR code
      const events = await storage.getEventsByHost("mark-user-id");
      const event = events.find(e => e.qrCode === qrCode);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const teams = await storage.getTeamsByEvent(event.id);
      
      // Include participant count for each team
      const teamsWithCounts = await Promise.all(teams.map(async (team) => {
        const participants = await storage.getParticipantsByTeam(team.id);
        return {
          ...team,
          participantCount: participants.length,
        };
      }));
      
      res.json(teamsWithCounts);
    } catch (error) {
      console.error("Error fetching public teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // Delete a question
  app.delete("/api/questions/:id", async (req, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;
      
      if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const questionId = req.params.id;
      const question = await storage.getQuestion(questionId);
      
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      // Verify user owns the event this question belongs to
      const event = await storage.getEvent(question.eventId);
      if (!event || event.hostId !== session.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteQuestion(questionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // Generate AI event copy
  app.post("/api/events/:id/generate-copy", async (req, res) => {
    try {
      const { type } = req.body;
      const eventId = req.params.id;

      if (!eventId) {
        return res.status(400).json({ error: "Event ID is required" });
      }

      // Get event details from storage
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      let prompt = "";
      
      switch (type) {
        case 'promotional':
          prompt = `Generate exciting promotional copy for a trivia event:
          Title: ${event.title}
          Type: ${event.eventType}
          Description: ${event.description || 'Fun trivia event'}
          Location: ${event.location || 'TBD'}
          Max Participants: ${event.maxParticipants}
          
          Create engaging promotional copy to attract participants. Include excitement about the event, what to expect, and why people should join. Make it sound fun and irresistible.`;
          break;
          
        case 'welcome':
          prompt = `Generate a warm welcome message for trivia event participants:
          Title: ${event.title}
          Type: ${event.eventType}
          
          Create a friendly welcome message that participants will see when they join the event. Make them feel excited and welcome.`;
          break;
          
        case 'thankyou':
          prompt = `Generate a thank you message for trivia event completion:
          Title: ${event.title}
          Type: ${event.eventType}
          
          Create a gracious thank you message that participants will see after completing the trivia event. Express appreciation for their participation.`;
          break;
          
        case 'rules':
          prompt = `Generate clear, friendly event rules for a trivia event:
          Title: ${event.title}
          Type: ${event.eventType}
          Max Participants: ${event.maxParticipants}
          
          Create simple, easy-to-understand rules that explain how the trivia works, scoring, and any important guidelines.`;
          break;
          
        default:
          prompt = `Generate a detailed event description for:
          Title: ${event.title}
          Type: ${event.eventType}
          Description: ${event.description || 'Fun trivia event'}
          
          Create a detailed event description that explains what participants can expect, the format, and any special features.`;
      }

      const generatedCopy = await openAIService.generateCopy(prompt);

      res.json({ 
        type,
        copy: generatedCopy,
        eventId 
      });

    } catch (error) {
      console.error('Error generating AI copy:', error);
      res.status(500).json({ error: "Failed to generate copy" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
