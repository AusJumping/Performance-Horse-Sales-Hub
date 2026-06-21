import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { horseSearchesTable } from "./horse_searches";

// ── Costs Agreement ──────────────────────────────────────────────────────────

export const horseSearchAgreementsTable = pgTable("horse_search_agreements", {
  id: serial("id").primaryKey(),
  horseSearchId: integer("horse_search_id")
    .notNull()
    .references(() => horseSearchesTable.id, { onDelete: "cascade" }),

  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending | submitted | voided

  // Admin-editable fields pre-filled from the search record
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  clientAddress: text("client_address"),
  clientPhone: text("client_phone"),

  serviceLevel: text("service_level"), // e.g. "level2"
  upfrontFee: text("upfront_fee"),     // e.g. "$1,000"
  consultancyFee: text("consultancy_fee"), // e.g. "5% (min $1,000, capped at $2,000)"
  customTerms: text("custom_terms"),

  // Signed fields
  clientSignature: text("client_signature"), // base64 PNG

  agreedTerms: boolean("agreed_terms").notNull().default(false),
  agreedFee: boolean("agreed_fee").notNull().default(false),
  agreedReady: boolean("agreed_ready").notNull().default(false),

  submittedAt: timestamp("submitted_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type HorseSearchAgreement = typeof horseSearchAgreementsTable.$inferSelect;
export type NewHorseSearchAgreement = typeof horseSearchAgreementsTable.$inferInsert;

// ── Bill of Sale / Contract ──────────────────────────────────────────────────

export const horseSearchContractsTable = pgTable("horse_search_contracts", {
  id: serial("id").primaryKey(),
  horseSearchId: integer("horse_search_id")
    .notNull()
    .references(() => horseSearchesTable.id, { onDelete: "cascade" }),

  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending | submitted | voided

  horseName: text("horse_name").notNull().default("Horse"),
  salesPrice: text("sales_price"),
  holdingDepositAmount: text("holding_deposit_amount"),
  horseDescription: text("horse_description"),
  customClauses: text("custom_clauses"),

  sellerName: text("seller_name"),
  sellerEmail: text("seller_email"),
  sellerAddress: text("seller_address"),
  sellerPhone: text("seller_phone"),
  sellerBankAccountName: text("seller_bank_account_name"),
  sellerBankBsb: text("seller_bank_bsb"),
  sellerBankAccount: text("seller_bank_account"),

  buyerName: text("buyer_name"),
  buyerEmail: text("buyer_email"),
  buyerAddress: text("buyer_address"),
  buyerPhone: text("buyer_phone"),

  fillerName: text("filler_name"),
  fillerEmail: text("filler_email"),
  fillerRole: text("filler_role"),

  buyerSignature: text("buyer_signature"),
  sellerSignature: text("seller_signature"),

  agreedSalesPrice: boolean("agreed_sales_price").notNull().default(false),
  agreedHoldingDeposit: boolean("agreed_holding_deposit").notNull().default(false),
  agreedDescription: boolean("agreed_description").notNull().default(false),
  agreedSection3: boolean("agreed_section3").notNull().default(false),
  agreedSection4: boolean("agreed_section4").notNull().default(false),
  agreedSellerDeclaration: boolean("agreed_seller_declaration").notNull().default(false),
  agreedBuyerDeclaration: boolean("agreed_buyer_declaration").notNull().default(false),

  submittedAt: timestamp("submitted_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type HorseSearchContract = typeof horseSearchContractsTable.$inferSelect;
export type NewHorseSearchContract = typeof horseSearchContractsTable.$inferInsert;
