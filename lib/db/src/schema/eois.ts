import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { submissionsTable } from "./submissions";

export const eoisTable = pgTable("eois", {
  id: serial("id").primaryKey(),

  submissionId: integer("submission_id").references(() => submissionsTable.id, { onDelete: "set null" }),

  buyerEmail: text("buyer_email").notNull(),
  buyerFirstName: text("buyer_first_name").notNull(),
  buyerSurname: text("buyer_surname").notNull(),
  buyerLocation: text("buyer_location").notNull(),
  buyerPhone: text("buyer_phone").notNull(),

  horseName: text("horse_name").notNull(),

  formData: jsonb("form_data").$type<Record<string, unknown>>().notNull().default({}),

  signatureData: text("signature_data"),
  waiverAgreed: boolean("waiver_agreed").notNull().default(false),
  declarationAgreed: boolean("declaration_agreed").notNull().default(false),

  status: text("status").notNull().default("new"),
  adminNotes: text("admin_notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Eoi = typeof eoisTable.$inferSelect;
export type NewEoi = typeof eoisTable.$inferInsert;
