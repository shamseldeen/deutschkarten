import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * User-created workspaces (a.k.a. "dashboards"). Each workspace is a
 * German -> secondary-language pair with isolated flashcards, progress,
 * and stats. The default Arabic workspace is virtual (workspace_id = NULL
 * across user_progress / flashcards) and is NOT materialized as a row
 * here. Each user can create at most 2 additional workspaces (enforced at
 * the API layer), for a total of 3 visible dashboards (default + 2).
 *
 * `secondaryLanguage` is one of: EN | ES | FR | IT | TR. (AR is the
 * default workspace and never appears in this table.)
 */
export const userWorkspacesTable = pgTable(
  "user_workspaces",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    secondaryLanguage: text("secondary_language").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    byUser: index("user_workspaces_user_idx").on(t.userId),
  }),
);

export type UserWorkspace = typeof userWorkspacesTable.$inferSelect;
