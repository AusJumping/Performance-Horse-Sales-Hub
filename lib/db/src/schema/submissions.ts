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
  "costs_agreement_sent",   // costs agreement has been sent to seller
  "drafting",               // Sally is drafting the listing content
  "approval_pack_sent",     // approval pack sent to seller for review
  "approved",               // seller has approved the listing
  "listed",                 // listed and ready to market
  "live",                   // listing is live / actively marketed
  "contract_signed",        // contract of sale has been signed
  "deposit_paid",           // holding deposit has been received
  "vetted",                 // horse has passed vet check
  "sold",                   // completed sale
  // Legacy statuses kept for backward compatibility with existing records
  "awaiting_review",
  "awaiting_seller_response",
  "needs_more_information",
  "ready_to_list",
  "seller_review_sent",
  "approved_to_market",
  "viewing_pending",
  "sold_pending",
  "in_vetting",
  "archived",
  "processing",
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
  commissionRate: text("commission_rate"),              // e.g. "5%"
  minimumFee: text("minimum_fee"),                      // e.g. "$500"
  maximumFee: text("maximum_fee"),                      // e.g. "$2,000"
  listingPeriodDays: integer("listing_period_days"),    // e.g. 90
  listingTermsNotes: text("listing_terms_notes"),       // special conditions

  // Workflow states: not_started | agreement_generated | sent_to_seller | signed
  listingAgreementStatus: text("listing_agreement_status").notNull().default("not_started"),
  listingAgreementSentAt: timestamp("listing_agreement_sent_at", { withTimezone: true }),
  listingAgreementSignedAt: timestamp("listing_agreement_signed_at", { withTimezone: true }),

  // Digital signing link (UUID token for seller-facing signing page)
  listingAgreementToken: text("listing_agreement_token").unique(),
  listingAgreementSellerSignature: text("listing_agreement_seller_signature"),

  // ── Google Drive (Phase 6) ────────────────────────────────────────────────
  driveFolderId: text("drive_folder_id"),
  driveFolderLink: text("drive_folder_link"),
  drivePortfolioFolderId: text("drive_portfolio_folder_id"),
  driveDocumentsFolderId: text("drive_documents_folder_id"),
  driveEoiFormsFolderId: text("drive_eoi_forms_folder_id"),
  // not_started | creating | done | failed
  driveSetupStatus: text("drive_setup_status").notNull().default("not_started"),
  driveSetupError: text("drive_setup_error"),

  // Links to generated documents
  // Portfolio folder docs (seller-facing content)
  driveOrcDocLink: text("drive_orc_doc_link"),
  driveHorseDescriptionDocLink: text("drive_horse_description_doc_link"),
  // Documents folder docs (contracts / agreements)
  driveApprovalPackDocLink: text("drive_approval_pack_doc_link"),
  driveListingAgreementDocLink: text("drive_listing_agreement_doc_link"),
  // Media sync
  driveMediaSyncedAt: timestamp("drive_media_synced_at", { withTimezone: true }),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
