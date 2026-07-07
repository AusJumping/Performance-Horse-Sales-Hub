import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { submissionsTable } from "./submissions";

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id")
    .references(() => submissionsTable.id, { onDelete: "cascade" }),

  token: text("token").notNull().unique(),
  // pending | seller_signed | buyer_signed | fully_signed | submitted (legacy) | voided
  status: text("status").notNull().default("pending"),

  horseName: text("horse_name").notNull(),
  salesPrice: text("sales_price"),
  holdingDepositAmount: text("holding_deposit_amount"),
  horseDescription: text("horse_description"),
  customClauses: text("custom_clauses"),

  fillerName: text("filler_name"),
  fillerEmail: text("filler_email"),
  fillerRole: text("filler_role"), // buyer | seller

  buyerName: text("buyer_name"),
  buyerEmail: text("buyer_email"),
  buyerAddress: text("buyer_address"),
  buyerPhone: text("buyer_phone"),
  sellerName: text("seller_name"),
  sellerEmail: text("seller_email"),
  sellerAddress: text("seller_address"),
  sellerPhone: text("seller_phone"),
  sellerBankAccountName: text("seller_bank_account_name"),
  sellerBankBsb: text("seller_bank_bsb"),
  sellerBankAccount: text("seller_bank_account"),

  buyerSignature: text("buyer_signature"),
  sellerSignature: text("seller_signature"),

  agreedSalesPrice: boolean("agreed_sales_price").notNull().default(false),
  agreedHoldingDeposit: boolean("agreed_holding_deposit").notNull().default(false),
  agreedDescription: boolean("agreed_description").notNull().default(false),
  agreedSection3: boolean("agreed_section3").notNull().default(false),
  agreedSection4: boolean("agreed_section4").notNull().default(false),
  agreedSellerDeclaration: boolean("agreed_seller_declaration").notNull().default(false),
  agreedBuyerDeclaration: boolean("agreed_buyer_declaration").notNull().default(false),

  sellerSignedAt: timestamp("seller_signed_at", { withTimezone: true }),
  buyerSignedAt: timestamp("buyer_signed_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  drivePdfLink: text("drive_pdf_link"),
  driveFileId: text("drive_file_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Contract = typeof contractsTable.$inferSelect;
export type NewContract = typeof contractsTable.$inferInsert;
