import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const quizSessionsTable = pgTable("quiz_sessions", {
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
});

export const quizAnswersTable = pgTable("quiz_answers", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => quizSessionsTable.id, { onDelete: "cascade" }),
  flashcardId: integer("flashcard_id").notNull(),
  questionType: text("question_type").notNull(),
  prompt: jsonb("prompt"),
  userAnswer: text("user_answer"),
  correct: boolean("correct").notNull().default(false),
  answeredAt: timestamp("answered_at").notNull().defaultNow(),
});

export type QuizSession = typeof quizSessionsTable.$inferSelect;
export type QuizAnswer = typeof quizAnswersTable.$inferSelect;
