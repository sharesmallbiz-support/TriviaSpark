import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  hostId: varchar("host_id").notNull().references(() => users.id),
  eventType: text("event_type").notNull(), // wine_dinner, corporate, party, educational, fundraiser
  maxParticipants: integer("max_participants").default(50),
  difficulty: text("difficulty").default("mixed"), // easy, medium, hard, mixed
  status: text("status").default("draft"), // draft, active, completed, cancelled
  qrCode: text("qr_code"),
  eventDate: timestamp("event_date"),
  eventTime: text("event_time"),
  location: text("location"),
  sponsoringOrganization: text("sponsoring_organization"),
  
  // Rich content and branding
  logoUrl: text("logo_url"),
  backgroundImageUrl: text("background_image_url"),
  eventCopy: text("event_copy"), // AI-generated promotional description
  welcomeMessage: text("welcome_message"), // Custom welcome message for participants
  thankYouMessage: text("thank_you_message"), // Message shown after event completion
  
  // Theme and styling
  primaryColor: text("primary_color").default("#7C2D12"), // wine color
  secondaryColor: text("secondary_color").default("#FEF3C7"), // champagne color
  fontFamily: text("font_family").default("Inter"),
  
  // Contact and social
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  websiteUrl: text("website_url"),
  socialLinks: text("social_links"), // JSON string of social media links
  
  // Event details
  prizeInformation: text("prize_information"),
  eventRules: text("event_rules"),
  specialInstructions: text("special_instructions"),
  accessibilityInfo: text("accessibility_info"),
  dietaryAccommodations: text("dietary_accommodations"),
  dressCode: text("dress_code"),
  ageRestrictions: text("age_restrictions"),
  technicalRequirements: text("technical_requirements"),
  
  // Business information
  registrationDeadline: timestamp("registration_deadline"),
  cancellationPolicy: text("cancellation_policy"),
  refundPolicy: text("refund_policy"),
  sponsorInformation: text("sponsor_information"), // JSON string of sponsor details
  
  settings: json("settings").default({}), // theme, timing, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  type: text("type").notNull(), // multiple_choice, true_false, fill_blank, image
  question: text("question").notNull(),
  options: json("options").default([]), // array of answer options
  correctAnswer: text("correct_answer").notNull(),
  points: integer("points").default(100),
  timeLimit: integer("time_limit").default(30), // seconds
  difficulty: text("difficulty").default("medium"),
  category: text("category"),
  aiGenerated: boolean("ai_generated").default(false),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  name: text("name").notNull(),
  tableNumber: integer("table_number"),
  maxMembers: integer("max_members").default(6),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  teamId: varchar("team_id").references(() => teams.id),
  name: text("name").notNull(),
  participantToken: varchar("participant_token").notNull().unique(), // For cookie-based auth
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
  canSwitchTeam: boolean("can_switch_team").default(true),
});

export const responses = pgTable("responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull().references(() => participants.id),
  questionId: varchar("question_id").notNull().references(() => questions.id),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  points: integer("points").default(0),
  responseTime: integer("response_time"), // seconds taken to answer
  timeRemaining: integer("time_remaining"), // seconds remaining when locked
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const funFacts = pgTable("fun_facts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  orderIndex: integer("order_index").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
  qrCode: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export const insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  joinedAt: true,
  lastActiveAt: true,
  participantToken: true,
});

export const insertResponseSchema = createInsertSchema(responses).omit({
  id: true,
  submittedAt: true,
});

export const insertFunFactSchema = createInsertSchema(funFacts).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type FunFact = typeof funFacts.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type InsertFunFact = z.infer<typeof insertFunFactSchema>;

// Event generation request schema
export const eventGenerationSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  eventType: z.enum(["wine_dinner", "corporate", "party", "educational", "fundraiser"]),
  participants: z.number().min(1).max(500),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
});

export type EventGenerationRequest = z.infer<typeof eventGenerationSchema>;

// Question generation request schema
export const questionGenerationSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  topic: z.string().min(1, "Topic is required"),
  type: z.enum(["multiple_choice", "true_false", "fill_blank", "image"]),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  category: z.string().optional(),
  count: z.number().min(1).max(20).default(1),
});

export type QuestionGenerationRequest = z.infer<typeof questionGenerationSchema>;
