import { Router } from "express";
import { db } from "@workspace/db";
import { flashcardsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  ListFlashcardsQueryParams,
  GenerateFlashcardsBody,
  GetFlashcardParams,
  UpdateFlashcardProgressParams,
  UpdateFlashcardProgressBody,
  GetDailyFlashcardsQueryParams,
} from "@workspace/api-zod";
import { eq, and, count, sql } from "drizzle-orm";

const router = Router();

// GET /api/flashcards
router.get("/flashcards", async (req, res) => {
  const parsed = ListFlashcardsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { level, category, limit = 20, offset = 0 } = parsed.data;

  const conditions = [];
  if (level) conditions.push(eq(flashcardsTable.level, level));
  if (category) conditions.push(eq(flashcardsTable.category, category));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(flashcardsTable)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(flashcardsTable.createdAt),
    db.select({ count: count() }).from(flashcardsTable).where(where),
  ]);

  const total = totalResult[0]?.count ?? 0;

  res.json({ items, total, offset, limit });
});

// GET /api/flashcards/stats
router.get("/flashcards/stats", async (_req, res) => {
  const levels = ["A1", "A2", "B1", "B2", "C1"];
  const stats = await Promise.all(
    levels.map(async (level) => {
      const rows = await db
        .select({ known: flashcardsTable.known })
        .from(flashcardsTable)
        .where(eq(flashcardsTable.level, level));
      const total = rows.length;
      const known = rows.filter((r) => r.known).length;
      return {
        level,
        total,
        known,
        unknown: total - known,
        percentage: total > 0 ? Math.round((known / total) * 100) : 0,
      };
    })
  );
  res.json(stats);
});

// GET /api/flashcards/daily
router.get("/flashcards/daily", async (req, res) => {
  const parsed = GetDailyFlashcardsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { level } = parsed.data;

  const conditions = [];
  if (level) conditions.push(eq(flashcardsTable.level, level));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(flashcardsTable)
    .where(where)
    .orderBy(sql`RANDOM()`)
    .limit(10);

  res.json(items);
});

// GET /api/flashcards/:id
router.get("/flashcards/:id", async (req, res) => {
  const parsed = GetFlashcardParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [card] = await db
    .select()
    .from(flashcardsTable)
    .where(eq(flashcardsTable.id, parsed.data.id))
    .limit(1);

  if (!card) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }
  res.json(card);
});

// POST /api/flashcards/generate
router.post("/flashcards/generate", async (req, res) => {
  const parsed = GenerateFlashcardsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { level, category = "general", count: wordCount = 10 } = parsed.data;

  const prompt = `Generate ${wordCount} German vocabulary words for level ${level} (CEFR scale). 
Category: ${category}.
Return a JSON array (no markdown, no code block) where each item has exactly these fields:
- word: string (German word with its article, e.g. "der Hund" for nouns, or just the word for verbs/adjectives)
- article: string or null (der/die/das for nouns, null for verbs, adjectives, etc.)
- baseWord: string (the word without article)
- level: "${level}"
- category: "${category}"
- englishTranslation: string
- arabicTranslation: string (in Arabic script)
- exampleSentenceDe: string (a simple German sentence using the word, appropriate for ${level})
- exampleSentenceEn: string (English translation of the example sentence)
- exampleSentenceAr: string (Arabic translation of the example sentence, in Arabic script)

Make sure the words and sentences are appropriate for ${level} learners. Return ONLY valid JSON array.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.1",
    max_completion_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = completion.choices[0]?.message?.content ?? "[]";
  let cards: Array<{
    word: string;
    article: string | null;
    baseWord: string;
    level: string;
    category: string;
    englishTranslation: string;
    arabicTranslation: string;
    exampleSentenceDe: string;
    exampleSentenceEn: string;
    exampleSentenceAr: string;
  }> = [];

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    cards = JSON.parse(cleaned);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const inserted = await db
    .insert(flashcardsTable)
    .values(
      cards.map((c) => ({
        word: c.word,
        article: c.article ?? null,
        baseWord: c.baseWord,
        level: c.level,
        category: c.category,
        englishTranslation: c.englishTranslation,
        arabicTranslation: c.arabicTranslation,
        exampleSentenceDe: c.exampleSentenceDe,
        exampleSentenceEn: c.exampleSentenceEn,
        exampleSentenceAr: c.exampleSentenceAr,
        imageUrl: null,
        known: false,
      }))
    )
    .returning();

  res.status(201).json(inserted);
});

// PATCH /api/flashcards/:id/progress
router.patch("/flashcards/:id/progress", async (req, res) => {
  const paramsParsed = UpdateFlashcardProgressParams.safeParse({
    id: Number(req.params.id),
  });
  const bodyParsed = UpdateFlashcardProgressBody.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [updated] = await db
    .update(flashcardsTable)
    .set({ known: bodyParsed.data.known })
    .where(eq(flashcardsTable.id, paramsParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }
  res.json(updated);
});

export default router;
