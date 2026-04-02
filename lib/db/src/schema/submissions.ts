import {
  pgTable,
  text,
  serial,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("new"),
  horseName: text("horse_name"),
  breed: text("breed"),
  age: text("age"),
  colour: text("colour"),
  height: text("height"),
  sex: text("sex"),
  askingPrice: text("asking_price"),
  location: text("location"),
  discipline: text("discipline"),
  sellerName: text("seller_name"),
  sellerEmail: text("seller_email"),
  sellerPhone: text("seller_phone"),
  formData: jsonb("form_data").notNull().default({}),
  tags: text("tags").array().notNull().default([]),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
