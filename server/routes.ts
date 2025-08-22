import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openAIService } from "./openai";
import { eventGenerationSchema, questionGenerationSchema, insertEventSchema, insertParticipantSchema } from "@shared/schema";
import { z } from "zod";

// Simple session store
const sessions = new Map<string, { userId: string; expiresAt: number }>();

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function cleanupSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(sessionId);
    }
  }
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
      
      const questions = await openAIService.generateQuestions(validatedRequest);
      
      // Store generated questions in the event
      const existingQuestions = await storage.getQuestionsByEvent(validatedRequest.eventId);
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

  // Get event by ID
  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const questions = await storage.getQuestionsByEvent(event.id);
      const participants = await storage.getParticipantsByEvent(event.id);
      
      res.json({
        event,
        questions,
        participants
      });
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ error: "Failed to fetch event" });
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
      const { name, teamName } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      // Find event by QR code
      const events = await storage.getEventsByHost("demo-user-id");
      const event = events.find(e => e.qrCode === req.params.qrCode);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      if (event.status !== "active") {
        return res.status(400).json({ error: "Event is not currently active" });
      }
      
      const participant = await storage.createParticipant({
        eventId: event.id,
        name,
        teamName: teamName || null,
        isActive: true
      });
      
      res.status(201).json({
        participant,
        event: {
          id: event.id,
          title: event.title,
          description: event.description
        }
      });
    } catch (error) {
      console.error("Error joining event:", error);
      res.status(500).json({ error: "Failed to join event" });
    }
  });

  // Submit answer
  app.post("/api/responses", async (req, res) => {
    try {
      const { participantId, questionId, answer, responseTime } = req.body;
      
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
      const points = isCorrect ? (question.points || 100) : 0;
      
      const response = await storage.createResponse({
        participantId,
        questionId,
        answer,
        isCorrect,
        points,
        responseTime: responseTime || null
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
        fullName: user.fullName
      }
    });
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
      const updatedEvent = await storage.updateEventStatus(eventId, "active");
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error starting event:", error);
      res.status(500).json({ error: "Failed to start event" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
