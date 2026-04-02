import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reelTemplatesTable = pgTable("reel_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  apiKey: text("api_key").notNull(),
  templateId: text("template_id").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  // Creatomate element field names — different templates use different names
  overlayTextField: text("overlay_text_field").notNull().default("Title.text"),
  brandTextField: text("brand_text_field").notNull().default("Brand.text"),
  websiteTextField: text("website_text_field").notNull().default("Website.text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReelTemplateSchema = createInsertSchema(reelTemplatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReelTemplate = z.infer<typeof insertReelTemplateSchema>;
export type ReelTemplate = typeof reelTemplatesTable.$inferSelect;
