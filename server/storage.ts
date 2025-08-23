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
  type InsertResponse,
  type FunFact,
  type InsertFunFact
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
  
  // Fun Facts methods
  getFunFactsByEvent(eventId: string): Promise<FunFact[]>;
  createFunFact(funFact: InsertFunFact): Promise<FunFact>;
  updateFunFact(id: string, updates: Partial<FunFact>): Promise<FunFact | undefined>;
  deleteFunFact(id: string): Promise<boolean>;

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
  private funFacts: Map<string, FunFact>;

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.questions = new Map();
    this.participants = new Map();
    this.responses = new Map();
    this.funFacts = new Map();
    
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
    
    // Create seeded event for Mark with rich metadata
    const seedEventId = "seed-event-coast-to-cascades";
    const seedEvent: Event = {
      id: seedEventId,
      title: "Coast to Cascades Wine & Trivia Evening",
      description: "An elegant evening combining Pacific Northwest wines with engaging trivia, supporting West Wichita Rotary Club's community initiatives.",
      hostId: "mark-user-id",
      eventType: "wine_dinner",
      status: "draft",
      qrCode: "rotary-cascades-2025",
      maxParticipants: 50,
      difficulty: "mixed",
      
      // Rich content and branding
      logoUrl: "https://example.com/rotary-logo.png",
      backgroundImageUrl: "https://example.com/wine-background.jpg",
      eventCopy: "Experience an unforgettable evening where fine wine meets friendly competition! Join us for Coast to Cascades Wine & Trivia Night, where every sip and every answer helps support our local community. With carefully curated Pacific Northwest wines and engaging trivia questions, this elegant fundraiser promises both sophistication and fun.",
      welcomeMessage: "Welcome to Coast to Cascades Wine & Trivia Night! We're thrilled to have you join us for this special evening of wine, wisdom, and wonderful causes. Get ready for an exciting trivia experience while supporting our community!",
      thankYouMessage: "Thank you for participating in Coast to Cascades Wine & Trivia Night! Your involvement helps us continue supporting local charities and making a difference in our community. We hope you enjoyed the evening!",
      
      // Theme and styling
      primaryColor: "#7C2D12", // wine color
      secondaryColor: "#FEF3C7", // champagne color
      fontFamily: "Inter",
      
      // Contact and social
      contactEmail: "events@westwichitarotary.org",
      contactPhone: "(316) 555-0123",
      websiteUrl: "https://westwichitarotary.org",
      socialLinks: JSON.stringify({
        facebook: "https://facebook.com/westwichitarotary",
        twitter: "https://twitter.com/wwrotary",
        instagram: "https://instagram.com/westwichitarotary"
      }),
      
      // Event details
      prizeInformation: "1st Place: $500 Wine Country Gift Package\n2nd Place: $300 Local Restaurant Gift Cards\n3rd Place: $200 Wine Selection\nAll participants receive a commemorative wine glass and local business discount cards!",
      eventRules: "• Teams of 2-6 participants\n• No smartphones or electronic devices during questions\n• Wine tasting between rounds is encouraged\n• Be respectful to all participants and volunteers\n• Have fun and support a great cause!",
      specialInstructions: "Please arrive 30 minutes early for check-in and wine selection. Designated driver arrangements are encouraged. Business casual or cocktail attire suggested.",
      accessibilityInfo: "The venue is wheelchair accessible with elevator access to all floors. Large print question sheets available upon request. Please contact us for any specific accommodation needs.",
      dietaryAccommodations: "Light appetizers will be served. Vegetarian and gluten-free options available. Please contact us 48 hours in advance for specific dietary requirements.",
      dressCode: "Business casual or cocktail attire",
      ageRestrictions: "21+ for wine tasting, 18+ for trivia participation",
      technicalRequirements: "No technical requirements - all materials provided",
      
      // Business information
      registrationDeadline: new Date("2025-02-10T23:59:59"),
      cancellationPolicy: "Full refund available until 72 hours before the event. After that, 50% refund is available until 24 hours before. No refunds within 24 hours of the event.",
      refundPolicy: "Refunds processed within 5-7 business days to the original payment method. Processing fees may apply.",
      sponsorInformation: JSON.stringify({
        name: "Pacific Northwest Wine Distributors",
        logoUrl: "https://example.com/sponsor-logo.png",
        website: "https://pnwwine.com",
        description: "Leading distributor of premium Pacific Northwest wines, proudly supporting community fundraising events throughout the region."
      }),
      
      settings: {},
      eventDate: new Date("2025-09-13"),
      eventTime: "6:30 PM",
      location: "Riverside Conference Center",
      sponsoringOrganization: "West Wichita Rotary Club",
      createdAt: new Date("2025-08-23"),
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
    
    // Create sample fun facts for the seeded event
    const funFacts: FunFact[] = [
      {
        id: "ff1-rotary-history",
        eventId: seedEventId,
        title: "Rotary Foundation",
        content: "West Wichita Rotary Club has been serving the community since 1985 and has raised over $2 million for local charities! 🎉",
        orderIndex: 1,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "ff2-wine-trivia",
        eventId: seedEventId,
        title: "Wine Knowledge",
        content: "Did you know? The Pacific Northwest produces over 99% of American wine grapes, with Washington state being the second-largest wine producer in the US! 🍷",
        orderIndex: 2,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "ff3-community-impact",
        eventId: seedEventId,
        title: "Community Impact",
        content: "Our trivia nights have helped fund 15 local scholarships, 3 community gardens, and countless meals for families in need. Every question answered makes a difference! 💝",
        orderIndex: 3,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "ff4-event-stats",
        eventId: seedEventId,
        title: "Event Statistics",
        content: "This is our 12th annual Coast to Cascades event! Together, we've welcomed over 600 guests and created lasting memories while supporting worthy causes. 🌟",
        orderIndex: 4,
        isActive: true,
        createdAt: new Date(),
      }
    ];
    
    funFacts.forEach(ff => this.funFacts.set(ff.id, ff));
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
      id,
      title: insertEvent.title,
      qrCode,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      hostId: insertEvent.hostId,
      eventType: insertEvent.eventType,
      description: insertEvent.description || null,
      status: insertEvent.status || "draft",
      maxParticipants: insertEvent.maxParticipants || 50,
      difficulty: insertEvent.difficulty || "mixed",
      settings: insertEvent.settings || {},
      eventDate: insertEvent.eventDate || null,
      eventTime: insertEvent.eventTime || null,
      location: insertEvent.location || null,
      sponsoringOrganization: insertEvent.sponsoringOrganization || null,
      
      // Rich content and branding - provide defaults for nullables
      logoUrl: insertEvent.logoUrl || null,
      backgroundImageUrl: insertEvent.backgroundImageUrl || null,
      eventCopy: insertEvent.eventCopy || null,
      welcomeMessage: insertEvent.welcomeMessage || null,
      thankYouMessage: insertEvent.thankYouMessage || null,
      
      // Theme and styling - provide defaults
      primaryColor: insertEvent.primaryColor || "#7C2D12",
      secondaryColor: insertEvent.secondaryColor || "#FEF3C7",
      fontFamily: insertEvent.fontFamily || "Inter",
      
      // Contact and social
      contactEmail: insertEvent.contactEmail || null,
      contactPhone: insertEvent.contactPhone || null,
      websiteUrl: insertEvent.websiteUrl || null,
      socialLinks: insertEvent.socialLinks || null,
      
      // Event details
      prizeInformation: insertEvent.prizeInformation || null,
      eventRules: insertEvent.eventRules || null,
      specialInstructions: insertEvent.specialInstructions || null,
      accessibilityInfo: insertEvent.accessibilityInfo || null,
      dietaryAccommodations: insertEvent.dietaryAccommodations || null,
      dressCode: insertEvent.dressCode || null,
      ageRestrictions: insertEvent.ageRestrictions || null,
      technicalRequirements: insertEvent.technicalRequirements || null,
      
      // Business information
      registrationDeadline: insertEvent.registrationDeadline || null,
      cancellationPolicy: insertEvent.cancellationPolicy || null,
      refundPolicy: insertEvent.refundPolicy || null,
      sponsorInformation: insertEvent.sponsorInformation || null,
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
      timeRemaining: insertResponse.timeRemaining || null,
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

  async getFunFactsByEvent(eventId: string): Promise<FunFact[]> {
    return Array.from(this.funFacts.values())
      .filter(funFact => funFact.eventId === eventId && funFact.isActive)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }

  async createFunFact(insertFunFact: InsertFunFact): Promise<FunFact> {
    const id = randomUUID();
    const funFact: FunFact = {
      ...insertFunFact,
      id,
      createdAt: new Date(),
      isActive: insertFunFact.isActive ?? true,
      orderIndex: insertFunFact.orderIndex || 0,
    };
    this.funFacts.set(id, funFact);
    return funFact;
  }

  async updateFunFact(id: string, updates: Partial<FunFact>): Promise<FunFact | undefined> {
    const funFact = this.funFacts.get(id);
    if (!funFact) return undefined;
    
    const updatedFunFact = { ...funFact, ...updates };
    this.funFacts.set(id, updatedFunFact);
    return updatedFunFact;
  }

  async deleteFunFact(id: string): Promise<boolean> {
    return this.funFacts.delete(id);
  }
}

export const storage = new MemStorage();
