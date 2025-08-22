import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openAIService } from "./openai";
import { eventGenerationSchema, questionGenerationSchema, insertEventSchema, insertParticipantSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
      const hostId = "demo-user-id";
      const events = await storage.getEventsByHost(hostId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Get active events
  app.get("/api/events/active", async (req, res) => {
    try {
      const hostId = "demo-user-id";
      const events = await storage.getActiveEvents(hostId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching active events:", error);
      res.status(500).json({ error: "Failed to fetch active events" });
    }
  });

  // Create event manually
  app.post("/api/events", async (req, res) => {
    try {
      const validatedData = insertEventSchema.parse({
        ...req.body,
        hostId: "demo-user-id"
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
      const eventData = {
        title: generatedContent.title,
        description: generatedContent.description,
        hostId: "demo-user-id",
        eventType: validatedRequest.eventType,
        maxParticipants: validatedRequest.participants,
        difficulty: validatedRequest.difficulty,
        settings: generatedContent.settings,
        status: "draft" as const,
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

  // Generate questions with AI
  app.post("/api/questions/generate", async (req, res) => {
    try {
      const validatedRequest = questionGenerationSchema.parse(req.body);
      
      const questions = await openAIService.generateQuestions(validatedRequest);
      
      res.json({ questions });
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

  const httpServer = createServer(app);
  return httpServer;
}
