import { 
  type User, 
  type InsertUser, 
  type Event, 
  type InsertEvent,
  type Question, 
  type InsertQuestion,
  type Participant, 
  type InsertParticipant,
  type Response,
  type InsertResponse
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Event methods
  getEvent(id: string): Promise<Event | undefined>;
  getEventsByHost(hostId: string): Promise<Event[]>;
  getActiveEvents(hostId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;
  
  // Question methods
  getQuestionsByEvent(eventId: string): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  createQuestions(questions: InsertQuestion[]): Promise<Question[]>;
  
  // Participant methods
  getParticipantsByEvent(eventId: string): Promise<Participant[]>;
  createParticipant(participant: InsertParticipant): Promise<Participant>;
  
  // Response methods
  getResponsesByParticipant(participantId: string): Promise<Response[]>;
  getResponsesByQuestion(questionId: string): Promise<Response[]>;
  createResponse(response: InsertResponse): Promise<Response>;
  
  // Analytics methods
  getEventStats(hostId: string): Promise<{
    totalEvents: number;
    totalParticipants: number;
    totalQuestions: number;
    averageRating: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private events: Map<string, Event>;
  private questions: Map<string, Question>;
  private participants: Map<string, Participant>;
  private responses: Map<string, Response>;

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.questions = new Map();
    this.participants = new Map();
    this.responses = new Map();
    
    // Initialize with demo user
    this.initializeDemoData();
  }

  private initializeDemoData() {
    const demoUser: User = {
      id: "demo-user-id",
      username: "markhazleton",
      email: "mark@webspark.dev",
      password: "hashed-password",
      fullName: "Mark Hazleton",
      createdAt: new Date(),
    };
    this.users.set(demoUser.id, demoUser);
    
    // Add Mark user for login
    const markUser: User = {
      id: "mark-user-id",
      username: "mark",
      email: "mark@triviaspark.com",
      password: "mark123",
      fullName: "Mark Hazleton",
      createdAt: new Date(),
    };
    this.users.set(markUser.id, markUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEventsByHost(hostId: string): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter(event => event.hostId === hostId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getActiveEvents(hostId: string): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter(event => event.hostId === hostId && event.status === "active");
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const qrCode = `trivia-${id.substring(0, 8)}`;
    const event: Event = {
      ...insertEvent,
      id,
      qrCode,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      description: insertEvent.description || null,
      status: insertEvent.status || null,
      maxParticipants: insertEvent.maxParticipants || null,
      difficulty: insertEvent.difficulty || null,
      settings: insertEvent.settings || {},
      eventDate: insertEvent.eventDate || null,
      eventTime: insertEvent.eventTime || null,
      location: insertEvent.location || null,
      sponsoringOrganization: insertEvent.sponsoringOrganization || null,
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...updates };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async getQuestionsByEvent(eventId: string): Promise<Question[]> {
    return Array.from(this.questions.values())
      .filter(question => question.eventId === eventId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = randomUUID();
    const question: Question = {
      ...insertQuestion,
      id,
      createdAt: new Date(),
      points: insertQuestion.points || null,
      difficulty: insertQuestion.difficulty || null,
      timeLimit: insertQuestion.timeLimit || null,
      category: insertQuestion.category || null,
      aiGenerated: insertQuestion.aiGenerated || null,
      orderIndex: insertQuestion.orderIndex || null,
      options: insertQuestion.options || [],
    };
    this.questions.set(id, question);
    return question;
  }

  async createQuestions(insertQuestions: InsertQuestion[]): Promise<Question[]> {
    const questions = insertQuestions.map((insertQuestion, index) => {
      const id = randomUUID();
      const question: Question = {
        ...insertQuestion,
        id,
        orderIndex: insertQuestion.orderIndex || index,
        createdAt: new Date(),
        points: insertQuestion.points || null,
        difficulty: insertQuestion.difficulty || null,
        timeLimit: insertQuestion.timeLimit || null,
        category: insertQuestion.category || null,
        aiGenerated: insertQuestion.aiGenerated || null,
        options: insertQuestion.options || [],
      };
      this.questions.set(id, question);
      return question;
    });
    return questions;
  }

  async getParticipantsByEvent(eventId: string): Promise<Participant[]> {
    return Array.from(this.participants.values())
      .filter(participant => participant.eventId === eventId);
  }

  async createParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    const id = randomUUID();
    const participant: Participant = {
      ...insertParticipant,
      id,
      joinedAt: new Date(),
      teamName: insertParticipant.teamName || null,
      isActive: insertParticipant.isActive || null,
    };
    this.participants.set(id, participant);
    return participant;
  }

  async getResponsesByParticipant(participantId: string): Promise<Response[]> {
    return Array.from(this.responses.values())
      .filter(response => response.participantId === participantId);
  }

  async getResponsesByQuestion(questionId: string): Promise<Response[]> {
    return Array.from(this.responses.values())
      .filter(response => response.questionId === questionId);
  }

  async createResponse(insertResponse: InsertResponse): Promise<Response> {
    const id = randomUUID();
    const response: Response = {
      ...insertResponse,
      id,
      submittedAt: new Date(),
      points: insertResponse.points || null,
      responseTime: insertResponse.responseTime || null,
    };
    this.responses.set(id, response);
    return response;
  }

  async getEventStats(hostId: string): Promise<{
    totalEvents: number;
    totalParticipants: number;
    totalQuestions: number;
    averageRating: number;
  }> {
    const userEvents = Array.from(this.events.values())
      .filter(event => event.hostId === hostId);
    
    const totalEvents = userEvents.length;
    
    let totalParticipants = 0;
    for (const event of userEvents) {
      const eventParticipants = await this.getParticipantsByEvent(event.id);
      totalParticipants += eventParticipants.length;
    }
    
    let totalQuestions = 0;
    for (const event of userEvents) {
      const eventQuestions = await this.getQuestionsByEvent(event.id);
      totalQuestions += eventQuestions.filter(q => q.aiGenerated).length;
    }
    
    // Mock average rating for now
    const averageRating = 4.9;
    
    return {
      totalEvents,
      totalParticipants,
      totalQuestions,
      averageRating,
    };
  }
}

export const storage = new MemStorage();
