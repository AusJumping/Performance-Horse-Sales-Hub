import {
  pgTable,
  text,
  serial,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

export const horseSearchesTable = pgTable("horse_searches", {
  id: serial("id").primaryKey(),

  firstName: text("first_name").notNull(),
  surname: text("surname").notNull(),
  email: text("email").notNull(),
  emailOptional: text("email_optional"),
  phone: text("phone").notNull(),
  location: text("location").notNull(),

  searchServiceLevel: text("search_service_level").notNull(),

  formData: jsonb("form_data").$type<Record<string, unknown>>().notNull().default({}),

  termsAgreed: boolean("terms_agreed").notNull().default(false),
  signatureData: text("signature_data"),

  status: text("status").notNull().default("new"),
  adminNotes: text("admin_notes"),

  driveFolderId: text("drive_folder_id"),
  driveFolderLink: text("drive_folder_link"),
  driveDocId: text("drive_doc_id"),
  driveDocLink: text("drive_doc_link"),
  driveSetupStatus: text("drive_setup_status").notNull().default("not_started"),
  driveSetupError: text("drive_setup_error"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HorseSearch = typeof horseSearchesTable.$inferSelect;
export type NewHorseSearch = typeof horseSearchesTable.$inferInsert;
