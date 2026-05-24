import { Router } from "express";
import { db } from "@workspace/db";
import { flashcardsTable, userProgressTable, userStreaksTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ai as gemini } from "@workspace/integrations-gemini-ai";
import { getAuth } from "@clerk/express";
import { randomUUID } from "crypto";
import {
  ListFlashcardsQueryParams,
  GenerateFlashcardsBody,
  GetFlashcardParams,
  UpdateFlashcardProgressParams,
  UpdateFlashcardProgressBody,
  GetDailyFlashcardsQueryParams,
} from "@workspace/api-zod";
import { eq, and, count, sql, isNull } from "drizzle-orm";
import { isSupportedLang } from "../lib/languages";
import { requireAuth } from "../middlewares/requireAuth";
import { invalidateCommunityStats } from "./community";
import { bumpStreak } from "../lib/streak";

const router = Router();

// ── Daily rate limit for AI generation ───────────────────────────────────────
const DAILY_LIMIT = 3;

interface RateLimitEntry {
  used: number;
  resetsAt: Date;
}
const generateLimits = new Map<string, RateLimitEntry>();

function getClientIp(req: import("express").Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  return (
    (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0])?.trim() ??
    req.socket.remoteAddress ??
    "unknown"
  );
}

function getLimitEntry(ip: string): RateLimitEntry {
  const now = new Date();
  const existing = generateLimits.get(ip);
  if (!existing || existing.resetsAt <= now) {
    const resetsAt = new Date();
    resetsAt.setUTCHours(24, 0, 0, 0);
    const entry: RateLimitEntry = { used: 0, resetsAt };
    generateLimits.set(ip, entry);
    return entry;
  }
  return existing;
}
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/flashcards
router.get("/flashcards", async (req, res) => {
  const parsed = ListFlashcardsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { level, category, limit = 20, offset = 0 } = parsed.data;

  const conditions = [isNull(flashcardsTable.hiddenAt)];
  if (level) conditions.push(eq(flashcardsTable.level, level));
  if (category) conditions.push(eq(flashcardsTable.category, category));

  const where = and(...conditions);

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
router.get("/flashcards/stats", async (req, res) => {
  const userId = getAuth(req)?.userId ?? null;
  const levels = ["A1", "A2", "B1", "B2", "C1"];

  if (userId) {
    const rows = await db
      .select({
        level: flashcardsTable.level,
        total: sql<number>`count(${flashcardsTable.id})::int`,
        known: sql<number>`count(case when ${userProgressTable.known} = 1 then 1 end)::int`,
      })
      .from(flashcardsTable)
      .leftJoin(
        userProgressTable,
        and(
          eq(userProgressTable.flashcardId, flashcardsTable.id),
          eq(userProgressTable.userId, userId),
        ),
      )
      .where(isNull(flashcardsTable.hiddenAt))
      .groupBy(flashcardsTable.level);

      const byLevel = new Map(rows.map((r) => [r.level, r]));
      const stats = levels.map((level) => {
        const r = byLevel.get(level) ?? { total: 0, known: 0 };
        return {
          level,
          total: r.total,
          known: r.known,
          unknown: r.total - r.known,
          percentage: r.total > 0 ? Math.round((r.known / r.total) * 100) : 0,
        };
      });
      res.json(stats);
      return;
  }

  const totalsByLevel = await db
    .select({
      level: flashcardsTable.level,
      total: sql<number>`count(${flashcardsTable.id})::int`,
    })
    .from(flashcardsTable)
    .where(isNull(flashcardsTable.hiddenAt))
    .groupBy(flashcardsTable.level);
  const totals = new Map(totalsByLevel.map((r) => [r.level, r.total]));
  const stats = levels.map((level) => {
    const total = totals.get(level) ?? 0;
    return { level, total, known: 0, unknown: total, percentage: 0 };
  });
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

  const conditions = [isNull(flashcardsTable.hiddenAt)];
  if (level) conditions.push(eq(flashcardsTable.level, level));
  const where = and(...conditions);

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
    .where(and(eq(flashcardsTable.id, parsed.data.id), isNull(flashcardsTable.hiddenAt)))
    .limit(1);

  if (!card) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }
  res.json(card);
});

// GET /api/flashcards/generate/status  — check daily limit without consuming it
router.get("/flashcards/generate/status", (req, res) => {
  const ip = getClientIp(req);
  const entry = getLimitEntry(ip);
  res.json({
    limit: DAILY_LIMIT,
    used: entry.used,
    remaining: Math.max(0, DAILY_LIMIT - entry.used),
    resetsAt: entry.resetsAt.toISOString(),
  });
});

// POST /api/flashcards/generate
router.post("/flashcards/generate", async (req, res) => {
  const ip = getClientIp(req);
  const entry = getLimitEntry(ip);

  if (entry.used >= DAILY_LIMIT) {
    res.status(429).json({
      error: "Daily generation limit reached",
      limit: DAILY_LIMIT,
      used: entry.used,
      remaining: 0,
      resetsAt: entry.resetsAt.toISOString(),
    });
    return;
  }

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
    model: "gpt-4o-mini",
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
        translations: {
          en: c.englishTranslation,
          ar: c.arabicTranslation,
        },
        exampleTranslations: {
          en: c.exampleSentenceEn,
          ar: c.exampleSentenceAr,
        },
        createdBy: getAuth(req)?.userId ?? null,
        imageUrl: null,
        known: false,
      }))
    )
    .returning();

  // Increment the daily counter only after successful generation
  entry.used += 1;
  invalidateCommunityStats();

  res.status(201).json(inserted);
});

// POST /api/flashcards/:id/translate  — translate a card to a target language on-demand
// Result is cached on the card so every learner benefits ("community library").
// Requires auth (prevents anonymous OpenAI billing-DoS).
// Per-user rate-limited and in-flight deduped so concurrent callers share one OpenAI call.
const translateLimits = new Map<string, { count: number; resetAt: number }>();
const TRANSLATE_LIMIT_PER_MIN = 30;
const inFlightTranslations = new Map<string, Promise<typeof flashcardsTable.$inferSelect>>();

router.post("/flashcards/:id/translate", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const now = Date.now();
  const slot = translateLimits.get(userId);
  if (!slot || now > slot.resetAt) {
    translateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
  } else {
    if (slot.count >= TRANSLATE_LIMIT_PER_MIN) {
      res.status(429).json({ error: "Too many translation requests, slow down" });
      return;
    }
    slot.count += 1;
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const lang = String(req.body?.lang ?? "");
  if (!isSupportedLang(lang)) {
    res.status(400).json({ error: "Unsupported language" });
    return;
  }

  const [card] = await db.select().from(flashcardsTable).where(eq(flashcardsTable.id, id)).limit(1);
  if (!card) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }

  const existingTrans = (card.translations ?? {}) as Record<string, string>;
  const existingExamples = (card.exampleTranslations ?? {}) as Record<string, string>;

  if (existingTrans[lang] && existingExamples[lang]) {
    res.json(card);
    return;
  }

  // Dedupe concurrent translations for the same (cardId, lang) — share one OpenAI call.
  const dedupeKey = `${id}:${lang}`;
  let job = inFlightTranslations.get(dedupeKey);
  if (!job) {
    job = (async () => {
      const prompt = `Translate the following German vocabulary card to language code "${lang}".
Return ONLY a JSON object with these exact keys (no markdown, no extra text):
{
  "translation": "<translation of the word>",
  "example": "<translation of the example sentence>"
}

German word: ${card.article ? `${card.article} ` : ""}${card.baseWord}
English meaning: ${card.englishTranslation}
German example sentence: ${card.exampleSentenceDe}
English example: ${card.exampleSentenceEn}

Use the native script of the target language. Be concise and natural.`;

      // Primary: Gemini 2.5 Flash (cheap, fast, great multilingual incl. RTL).
      // Fallback: GPT-5.1 if Gemini errors so users never see a hard failure.
      let text = "";
      try {
        const r = await gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
        });
        text = r.text ?? "";
      } catch (err) {
        req.log?.warn({ err, id, lang }, "gemini translate failed, falling back to openai");
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_completion_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        });
        text = completion.choices[0]?.message?.content ?? "{}";
      }
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const translation = String(parsed.translation ?? "").trim();
      const example = String(parsed.example ?? "").trim();
      if (!translation) throw new Error("Empty translation");

      // Atomic JSONB merge — concurrent translations for OTHER langs on the same card
      // won't clobber each other (right-hand side wins in `||`).
      const transPatch: Record<string, string> = { [lang]: translation };
      const examplesPatch: Record<string, string> = {};
      if (example) examplesPatch[lang] = example;

      const [updated] = await db
        .update(flashcardsTable)
        .set({
          translations: sql`coalesce(${flashcardsTable.translations}, '{}'::jsonb) || ${JSON.stringify(transPatch)}::jsonb`,
          exampleTranslations: sql`coalesce(${flashcardsTable.exampleTranslations}, '{}'::jsonb) || ${JSON.stringify(examplesPatch)}::jsonb`,
        })
        .where(eq(flashcardsTable.id, id))
        .returning();
      return updated;
    })().finally(() => {
      inFlightTranslations.delete(dedupeKey);
    });
    inFlightTranslations.set(dedupeKey, job);
  }

  try {
    const updated = await job;
    res.json(updated);
  } catch (err) {
    req.log?.error({ err, id, lang }, "translation failed");
    res.status(502).json({ error: "Translation failed" });
  }
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

  const userId = getAuth(req)?.userId ?? null;
  const flashcardId = paramsParsed.data.id;
  const known = bodyParsed.data.known;

  const [card] = await db
    .select()
    .from(flashcardsTable)
    .where(eq(flashcardsTable.id, flashcardId))
    .limit(1);

  if (!card) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }

  if (userId) {
    await db
      .insert(userProgressTable)
      .values({
        id: randomUUID(),
        userId,
        flashcardId,
        known: known ? 1 : 0,
        timesReviewed: 1,
        lastReviewedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userProgressTable.userId, userProgressTable.flashcardId],
        set: {
          known: known ? 1 : 0,
          timesReviewed: sql`${userProgressTable.timesReviewed} + 1`,
          lastReviewedAt: new Date(),
        },
      });

    await bumpStreak(userId);

    res.json({ ...card, known });
    return;
  }

  // Anonymous users may not write to shared state — would let any guest mutate
  // every user's "known" flag. They can still browse and study locally; the
  // client should store guest progress in localStorage / AsyncStorage.
  res.status(401).json({ error: "Sign in to save progress across devices." });
});

export default router;
