import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const candidates = sqliteTable("candidates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  role: text("role").notNull(),
  score: integer("score").notNull(),
  status: text("status").notNull(),
  tone: text("tone").notNull(),
  school: text("school").notNull(),
  company: text("company").notNull(),
  experience: text("experience").notNull(),
  channel: text("channel").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  city: text("city").notNull().default(""),
  currentTitle: text("current_title").notNull().default(""),
  highlights: text("highlights", { mode: "json" }).$type<string[]>().notNull(),
  risk: text("risk").notNull(),
  ownerEmail: text("owner_email"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  role: text("role").notNull(),
  department: text("department").notNull(),
  jdText: text("jd_text").notNull().default(""),
  version: integer("version").notNull(),
  owner: text("owner").notNull(),
  headcount: integer("headcount").notNull(),
  filledHeadcount: integer("filled_headcount").notNull().default(0),
  gates: text("gates", { mode: "json" }).$type<string[]>().notNull(),
  weights: text("weights", { mode: "json" })
    .$type<Array<[string, number]>>()
    .notNull(),
  interviewDimensions: text("interview_dimensions", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  candidateId: text("candidate_id"),
  action: text("action").notNull(),
  actorEmail: text("actor_email"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const resumeFiles = sqliteTable("resume_files", {
  id: text("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  originalName: text("original_name").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  targetRole: text("target_role"),
  status: text("status").notNull().default("已入库"),
  score: integer("score"),
  result: text("result"),
  extractedText: text("extracted_text"),
  parsedData: text("parsed_data", { mode: "json" }).$type<Record<string, unknown>>(),
  candidateId: text("candidate_id"),
  duplicateOf: text("duplicate_of"),
  errorMessage: text("error_message"),
  uploadedBy: text("uploaded_by"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
