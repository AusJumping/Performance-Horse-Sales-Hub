import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const driveSettingsTable = pgTable("drive_settings", {
  id: serial("id").primaryKey(),
  sellerFolderParentId: text("seller_folder_parent_id"),
  isConnected: boolean("is_connected").notNull().default(false),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  lastTestError: text("last_test_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DriveSettings = typeof driveSettingsTable.$inferSelect;
