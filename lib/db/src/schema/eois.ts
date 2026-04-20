import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { submissionsTable } from "./submissions";

export const eoisTable = pgTable("eois", {
  id: serial("id").primaryKey(),

  submissionId: integer("submission_id").references(() => submissionsTable.id, { onDelete: "cascade" }),

  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  buyerPhone: text("buyer_phone"),
  budget: text("budget"),
  message: text("message"),

  status: text("status").notNull().default("new"),

  adminNotes: text("admin_notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Eoi = typeof eoisTable.$inferSelect;
export type NewEoi = typeof eoisTable.$inferInsert;
