import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { submissionsTable } from "./submissions";

export const aiOutputsTable = pgTable("ai_outputs", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissionsTable.id),
  masterListing: text("master_listing"),
  shortListing: text("short_listing"),
  proHorseMatchListing: text("pro_horse_match_listing"),
  socialCaption: text("social_caption"),
  hashtags: text("hashtags"),
  buyerSummary: text("buyer_summary"),
  keySellingPoints: text("key_selling_points"),
  reelOverlayText: text("reel_overlay_text"),
  reelBrief: text("reel_brief"),
  tags: text("ai_tags"),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAiOutputSchema = createInsertSchema(aiOutputsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertAiOutput = z.infer<typeof insertAiOutputSchema>;
export type AiOutput = typeof aiOutputsTable.$inferSelect;
