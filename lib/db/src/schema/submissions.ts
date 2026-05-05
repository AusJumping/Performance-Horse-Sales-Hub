import {
  pgTable,
  text,
  serial,
  timestamp,
  jsonb,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Full set of statuses used across the workflow
export const SUBMISSION_STATUSES = [
  "new",                    // just received, not yet looked at
  "awaiting_review",        // submitted, pending Sally's review
  "awaiting_seller_response", // Sally has questions, waiting on seller
  "needs_more_information", // more info needed before proceeding
  "ready_to_list",          // ready to move forward
  "seller_review_sent",     // approval pack sent to seller
  "approved_to_market",     // seller approved, ready for Google Drive etc.
  "live",                   // listing is live
  "viewing_pending",        // a viewing is scheduled
  "sold_pending",           // sale agreed, not yet settled
  "in_vetting",             // horse undergoing vet check
  "sold",                   // completed sale
  "archived",               // no longer active
  // Legacy statuses kept for backward compatibility
  "processing",
  "approved",
  "published",
] as const;

export type SubmissionStatus = typeof SUBMISSION_STATUSES[number];

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("new"),

  // Core horse fields (extracted from form for quick querying)
  horseName: text("horse_name"),
  breed: text("breed"),
  age: text("age"),
  colour: text("colour"),
  height: text("height"),
  sex: text("sex"),
  askingPrice: text("asking_price"),
  location: text("location"),
  discipline: text("discipline"),

  // Seller contact
  sellerName: text("seller_name"),
  sellerEmail: text("seller_email"),
  sellerPhone: text("seller_phone"),

  // Seller's intent from the submission form
  // "happy_to_proceed" | "would_like_to_speak"
  sellerIntent: text("seller_intent"),

  // LOCKED original submission — never edited after creation
  formData: jsonb("form_data").notNull().default({}),

  // Sally's editable working copy — starts as clone of formData
  // AI generation reads from here, not formData
  workingRecord: jsonb("working_record").notNull().default({}),
  workingRecordUpdatedAt: timestamp("working_record_updated_at", { withTimezone: true }),

  tags: text("tags").array().notNull().default([]),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),

  // ── Listing Agreement (Phase 5) ──────────────────────────────────────────
  // Commercial terms Sally sets before generating the agreement PDF
  commissionRate: text("commission_rate"),              // e.g. "10%"
  listingPeriodDays: integer("listing_period_days"),    // e.g. 90
  listingTermsNotes: text("listing_terms_notes"),       // special conditions

  // Workflow states: not_started | agreement_generated | sent_to_seller | signed
  listingAgreementStatus: text("listing_agreement_status").notNull().default("not_started"),
  listingAgreementSentAt: timestamp("listing_agreement_sent_at", { withTimezone: true }),
  listingAgreementSignedAt: timestamp("listing_agreement_signed_at", { withTimezone: true }),

  // ── Google Drive (Phase 6) ────────────────────────────────────────────────
  driveFolderId: text("drive_folder_id"),
  driveFolderLink: text("drive_folder_link"),
  drivePortfolioFolderId: text("drive_portfolio_folder_id"),
  driveDocumentsFolderId: text("drive_documents_folder_id"),
  driveEoiFormsFolderId: text("drive_eoi_forms_folder_id"),
  // not_started | creating | done | failed
  driveSetupStatus: text("drive_setup_status").notNull().default("not_started"),
  driveSetupError: text("drive_setup_error"),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
