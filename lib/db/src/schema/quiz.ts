import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { flashcardsTable } from "./flashcards";

export const quizSessionsTable = pgTable(
  "quiz_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    level: text("level"),
    totalQuestions: integer("total_questions").notNull().default(0),
    correctAnswers: integer("correct_answers").notNull().default(0),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    finishedAt: timestamp("finished_at"),
  },
  (t) => ({
    byUser: index("quiz_sessions_user_idx").on(t.userId),
  }),
);

export const quizAnswersTable = pgTable("quiz_answers", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => quizSessionsTable.id, { onDelete: "cascade" }),
  flashcardId: integer("flashcard_id")
    .notNull()
    .references(() => flashcardsTable.id, { onDelete: "cascade" }),
  questionType: text("question_type").notNull(),
  prompt: jsonb("prompt"),
  userAnswer: text("user_answer"),
  correct: boolean("correct").notNull().default(false),
  answeredAt: timestamp("answered_at").notNull().defaultNow(),
});

export type QuizSession = typeof quizSessionsTable.$inferSelect;
export type QuizAnswer = typeof quizAnswersTable.$inferSelect;
