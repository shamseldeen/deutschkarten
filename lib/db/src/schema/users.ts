import {
  pgTable,
  text,
  timestamp,
  integer,
  date,
  uniqueIndex,
  index,
  real,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { flashcardsTable } from "./flashcards";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  displayName: text("display_name"),
  imageUrl: text("image_url"),
  // Aggregate total XP points (updated on every progress PATCH).
  // Derived from the advanced formula: CEFR_weight × streak_multiplier × difficulty_bonus.
  totalPoints: real("total_points").notNull().default(0),
  // Invite code for friends leaderboard (nanoid-6, unique, generated on first use).
  friendCode: text("friend_code").unique(),
  // Whether the user opts into the public leaderboard (default true).
  publicLeaderboard: integer("public_leaderboard").notNull().default(1),
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
    // Number of times the user answered "Not yet" for this card (difficulty signal).
    wrongCount: integer("wrong_count").notNull().default(0),
    timesReviewed: integer("times_reviewed").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userCardUnique: uniqueIndex("user_progress_user_ws_card_uq")
      .on(t.userId, t.workspaceId, t.flashcardId)
      .where(sql`${t.workspaceId} IS NOT NULL`),
    userCardDefaultUnique: uniqueIndex("user_progress_user_default_card_uq")
      .on(t.userId, t.flashcardId)
      .where(sql`${t.workspaceId} IS NULL`),
    byUser: index("user_progress_user_idx").on(t.userId),
    byUserWorkspace: index("user_progress_user_ws_idx").on(
      t.userId,
      t.workspaceId,
    ),
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

/**
 * Friend groups for the friends leaderboard.
 * A user joins a group by sharing their friendCode; the owner's code becomes
 * the groupId. Members array is maintained by the API.
 */
export const friendGroupsTable = pgTable(
  "friend_groups",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("My Group"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    byOwner: index("friend_groups_owner_idx").on(t.ownerId),
  }),
);

export const friendGroupMembersTable = pgTable(
  "friend_group_members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => friendGroupsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: uniqueIndex("friend_group_members_pk").on(t.groupId, t.userId),
    byUser: index("friend_group_members_user_idx").on(t.userId),
  }),
);

export const insertUserSchema = createInsertSchema(usersTable);
export type User = typeof usersTable.$inferSelect;
export type UserProgress = typeof userProgressTable.$inferSelect;
export type UserStreak = typeof userStreaksTable.$inferSelect;
export type FriendGroup = typeof friendGroupsTable.$inferSelect;
export type FriendGroupMember = typeof friendGroupMembersTable.$inferSelect;
export const _z = z;
