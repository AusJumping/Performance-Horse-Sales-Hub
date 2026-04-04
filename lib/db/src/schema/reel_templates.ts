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
  // Image source field names (leave empty to skip that slot)
  image1Field: text("image1_field").notNull().default("Image-1.source"),
  image2Field: text("image2_field").notNull().default("Image-2.source"),
  image3Field: text("image3_field").notNull().default("Image-3.source"),
  image4Field: text("image4_field").notNull().default(""),
  // Creatomate API version: "v1" or "v2"
  apiVersion: text("api_version").notNull().default("v1"),
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
