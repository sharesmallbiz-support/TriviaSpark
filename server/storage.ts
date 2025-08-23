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
    
    // Create seeded event for Mark
    const seedEventId = "seed-event-coast-to-cascades";
    const seedEvent: Event = {
      id: seedEventId,
      title: "Coast to Cascades Wine & Trivia Evening",
      description: "An elegant evening combining Pacific Northwest wines with engaging trivia, supporting West Wichita Rotary Club's community initiatives.",
      hostId: "mark-user-id",
      eventType: "wine-dinner",
      status: "draft",
      qrCode: "rotary-cascades-2025",
      maxParticipants: 50,
      difficulty: "medium",
      settings: {},
      eventDate: new Date("2025-02-15"),
      eventTime: "6:30 PM",
      location: "Riverside Conference Center",
      sponsoringOrganization: "West Wichita Rotary Club",
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
    };
    this.events.set(seedEventId, seedEvent);
    
    // Create sample questions for the seeded event
    const questions: Question[] = [
      {
        id: "q1-wine-regions",
        eventId: seedEventId,
        type: "multiple-choice",
        question: "Which Pacific Northwest wine region is known as Oregon's premier Pinot Noir producing area?",
        options: ["Willamette Valley", "Columbia Valley", "Walla Walla Valley", "Yakima Valley"],
        correctAnswer: "Willamette Valley",
        difficulty: "medium",
        category: "wine",
        points: 100,
        timeLimit: 30,
        orderIndex: 1,
        aiGenerated: false,
        createdAt: new Date(),
      },
      {
        id: "q2-rotary-service",
        eventId: seedEventId,
        type: "multiple-choice",
        question: "What is Rotary International's primary focus in community service?",
        options: ["Environmental conservation", "Education and literacy", "Service Above Self", "Economic development"],
        correctAnswer: "Service Above Self",
        difficulty: "medium",
        category: "rotary",
        points: 100,
        timeLimit: 30,
        orderIndex: 2,
        aiGenerated: false,
        createdAt: new Date(),
      },
      {
        id: "q3-pacific-northwest",
        eventId: seedEventId,
        type: "multiple-choice",
        question: "Mount Rainier, the iconic peak visible from Seattle, reaches what elevation?",
        options: ["12,330 feet", "14,411 feet", "16,050 feet", "11,249 feet"],
        correctAnswer: "14,411 feet",
        difficulty: "medium",
        category: "geography",
        points: 100,
        timeLimit: 30,
        orderIndex: 3,
        aiGenerated: false,
        createdAt: new Date(),
      },
    ];
    
    questions.forEach(q => this.questions.set(q.id, q));
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

  async updateEventStatus(id: string, status: string): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, status };
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

  async getQuestion(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async updateQuestion(id: string, updates: Partial<Question>): Promise<Question | undefined> {
    const question = this.questions.get(id);
    if (!question) return undefined;
    
    const updatedQuestion = { ...question, ...updates };
    this.questions.set(id, updatedQuestion);
    return updatedQuestion;
  }

  async deleteQuestion(id: string): Promise<boolean> {
    return this.questions.delete(id);
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
