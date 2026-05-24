import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userSettingsTable = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  primaryLang: text("primary_lang").notNull().default("en"),
  secondaryLang: text("secondary_lang"),
  // ID of the currently-active workspace from user_workspaces. NULL means
  // the user is in their default (Arabic) workspace.
  currentWorkspaceId: text("current_workspace_id"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserSettings = typeof userSettingsTable.$inferSelect;
