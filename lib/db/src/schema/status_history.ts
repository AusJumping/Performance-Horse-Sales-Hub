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

export const statusHistoryTable = pgTable("status_history", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissionsTable.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStatusHistorySchema = createInsertSchema(statusHistoryTable).omit({
  id: true,
  changedAt: true,
});

export type InsertStatusHistory = z.infer<typeof insertStatusHistorySchema>;
export type StatusHistory = typeof statusHistoryTable.$inferSelect;
