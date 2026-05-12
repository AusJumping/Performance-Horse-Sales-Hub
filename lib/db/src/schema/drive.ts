import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const driveSettingsTable = pgTable("drive_settings", {
  id: serial("id").primaryKey(),

  // ── Folder structure ────────────────────────────────────────────────────────
  rootFolderId: text("root_folder_id"),
  rootFolderLink: text("root_folder_link"),
  sellerFolderParentId: text("seller_folder_parent_id"),
  sellerFolderLink: text("seller_folder_link"),
  searchFolderParentId: text("search_folder_parent_id"),
  searchFolderLink: text("search_folder_link"),

  // ── OAuth tokens (Sally's Google account) ───────────────────────────────────
  // Never expose these in API responses — server-side only
  googleRefreshToken: text("google_refresh_token"),
  googleAccessToken: text("google_access_token"),
  googleTokenExpiry: timestamp("google_token_expiry", { withTimezone: true }),
  googleEmail: text("google_email"),

  // ── Connection status ───────────────────────────────────────────────────────
  isConnected: boolean("is_connected").notNull().default(false),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  lastTestError: text("last_test_error"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DriveSettings = typeof driveSettingsTable.$inferSelect;
