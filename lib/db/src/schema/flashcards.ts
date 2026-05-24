import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flashcardsTable = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  word: text("word").notNull(),
  article: text("article"),
  baseWord: text("base_word").notNull(),
  level: text("level").notNull(),
  category: text("category").notNull().default("general"),
  englishTranslation: text("english_translation").notNull(),
  arabicTranslation: text("arabic_translation").notNull(),
  exampleSentenceDe: text("example_sentence_de").notNull(),
  exampleSentenceEn: text("example_sentence_en").notNull(),
  exampleSentenceAr: text("example_sentence_ar").notNull(),
  imageUrl: text("image_url"),
  known: boolean("known").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFlashcardSchema = createInsertSchema(flashcardsTable).omit({ id: true, createdAt: true });
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcardsTable.$inferSelect;
