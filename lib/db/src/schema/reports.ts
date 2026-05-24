import { pgTable, text, serial, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const REPORT_REASONS = [
  "incorrect_translation",
  "offensive",
  "duplicate",
  "low_quality_image",
  "spam",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const flashcardReportsTable = pgTable(
  "flashcard_reports",
  {
    id: serial("id").primaryKey(),
    flashcardId: integer("flashcard_id").notNull(),
    userId: text("user_id").notNull(),
    reason: text("reason").notNull(),
    note: text("note"),
    status: text("status").notNull().default("open"), // open | dismissed | actioned
    createdAt: timestamp("created_at").notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at"),
  },
  (t) => ({
    byCard: index("flashcard_reports_card_idx").on(t.flashcardId),
    byStatus: index("flashcard_reports_status_idx").on(t.status),
    // At most one OPEN report per (card, user). Resolved/dismissed reports are
    // allowed alongside, so a user can re-report after admin dismissal.
    oneOpenPerUser: uniqueIndex("flashcard_reports_open_user_uq")
      .on(t.flashcardId, t.userId)
      .where(sql`status = 'open'`),
  }),
);

export type FlashcardReport = typeof flashcardReportsTable.$inferSelect;
