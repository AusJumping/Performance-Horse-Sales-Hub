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
  shortCaptions: text("short_captions"),
  tags: text("ai_tags"),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),

  // Owner Response Certificate (Phase 2)
  // Factual structured document generated from workingRecord — NOT salesy
  // States: not_generated | generated | edited | ready_to_send
  ownerResponseCert: text("owner_response_cert"),
  orcStatus: text("orc_status").notNull().default("not_generated"),
  orcUpdatedAt: timestamp("orc_updated_at", { withTimezone: true }),

  // Horse Description (Phase 3) — generated FROM the ORC
  horseDescription: text("horse_description"),
  horseDescriptionStatus: text("horse_description_status").notNull().default("not_generated"),
  horseDescriptionUpdatedAt: timestamp("horse_description_updated_at", { withTimezone: true }),
});

export const insertAiOutputSchema = createInsertSchema(aiOutputsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertAiOutput = z.infer<typeof insertAiOutputSchema>;
export type AiOutput = typeof aiOutputsTable.$inferSelect;
