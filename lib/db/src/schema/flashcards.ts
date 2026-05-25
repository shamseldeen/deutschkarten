import {
  pgTable,
  text,
  serial,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type LangMap = Record<string, string>;

export const flashcardsTable = pgTable(
  "flashcards",
  {
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
    translations: jsonb("translations").$type<LangMap>().notNull().default({}),
    exampleTranslations: jsonb("example_translations")
      .$type<LangMap>()
      .notNull()
      .default({}),
    createdBy: text("created_by"),
    imageUrl: text("image_url"),
    known: boolean("known").notNull().default(false),
    hiddenAt: timestamp("hidden_at"),
    // NULL = global card (baseline + AI generated into default Arabic
    // workspace). Non-null = AI card private to that user workspace.
    // Not a hard FK so deleting a workspace cascades via app-level cleanup
    // rather than tying the global flashcards table to user_workspaces.
    ownerWorkspaceId: text("owner_workspace_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    byLevel: index("flashcards_level_idx").on(t.level),
    byCategory: index("flashcards_category_idx").on(t.category),
    byLevelHidden: index("flashcards_level_hidden_idx").on(t.level, t.hiddenAt),
    byOwnerWorkspace: index("flashcards_owner_workspace_idx").on(
      t.ownerWorkspaceId,
    ),
  }),
);

export const insertFlashcardSchema = createInsertSchema(flashcardsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcardsTable.$inferSelect;
