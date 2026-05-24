import { pgTable, text, timestamp, integer, date, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { flashcardsTable } from "./flashcards";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  displayName: text("display_name"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userProgressTable = pgTable(
  "user_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    flashcardId: integer("flashcard_id")
      .notNull()
      .references(() => flashcardsTable.id, { onDelete: "cascade" }),
    // NULL = progress in the default (Arabic) workspace. Non-null = progress
    // in a user-created workspace. Existing rows pre-multi-workspace stay
    // NULL and continue to map to the default workspace.
    workspaceId: text("workspace_id"),
    known: integer("known").notNull().default(0),
    timesReviewed: integer("times_reviewed").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    // Unique per (user, workspace, card) for non-null workspaces. Postgres
    // treats NULL as distinct in unique indexes, so this index alone would
    // NOT dedupe the default-workspace rows — those are covered by the
    // partial index below.
    userCardUnique: uniqueIndex("user_progress_user_ws_card_uq")
      .on(t.userId, t.workspaceId, t.flashcardId)
      .where(sql`${t.workspaceId} IS NOT NULL`),
    // Dedup default-workspace (NULL) progress rows. One row per (user, card)
    // when workspace_id is NULL.
    userCardDefaultUnique: uniqueIndex("user_progress_user_default_card_uq")
      .on(t.userId, t.flashcardId)
      .where(sql`${t.workspaceId} IS NULL`),
    byUser: index("user_progress_user_idx").on(t.userId),
    byUserWorkspace: index("user_progress_user_ws_idx").on(t.userId, t.workspaceId),
  }),
);

export const userStreaksTable = pgTable("user_streaks", {
  userId: text("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: date("last_active_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable);
export type User = typeof usersTable.$inferSelect;
export type UserProgress = typeof userProgressTable.$inferSelect;
export type UserStreak = typeof userStreaksTable.$inferSelect;
export const _z = z;
