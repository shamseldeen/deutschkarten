import { Router } from "express";
import { db } from "@workspace/db";
import {
  flashcardsTable,
  userProgressTable,
  userStreaksTable,
} from "@workspace/db";
import { ai as gemini } from "@workspace/integrations-gemini-ai";
import { fetchPexelsImage } from "../lib/pexels.js";
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
import { eq, and, count, sql, isNull, inArray } from "drizzle-orm";
import { isSupportedLang } from "../lib/languages";
import { requireAuth } from "../middlewares/requireAuth";
import { invalidateCommunityStats } from "./community";
import { bumpStreak } from "../lib/streak";
import {
  getCurrentWorkspaceId,
  getWorkspaceSecondaryLang,
  upsertProgress,
  workspaceVisibility,
} from "../lib/workspace";
import { correctLevel } from "@workspace/content";

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
    (Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(",")[0]
    )?.trim() ??
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

  const userId = getAuth(req)?.userId ?? null;
  let wsId: string | null = null;
  try {
    wsId = userId ? await getCurrentWorkspaceId(userId) : null;
  } catch {}
  const visibility = workspaceVisibility(wsId);

  const conditions = [isNull(flashcardsTable.hiddenAt)];
  if (visibility) conditions.push(visibility);
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
  let wsId: string | null = null;
  try {
    wsId = userId ? await getCurrentWorkspaceId(userId) : null;
  } catch {}
  const visibility = workspaceVisibility(wsId);

  if (userId) {
    const progressJoinConds = [
      eq(userProgressTable.flashcardId, flashcardsTable.id),
      eq(userProgressTable.userId, userId),
      wsId === null
        ? isNull(userProgressTable.workspaceId)
        : eq(userProgressTable.workspaceId, wsId),
    ];
    const rows = await db
      .select({
        level: flashcardsTable.level,
        total: sql<number>`count(${flashcardsTable.id})::int`,
        known: sql<number>`count(case when ${userProgressTable.known} = 1 then 1 end)::int`,
      })
      .from(flashcardsTable)
      .leftJoin(userProgressTable, and(...progressJoinConds))
      .where(and(isNull(flashcardsTable.hiddenAt), visibility))
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
    .where(and(isNull(flashcardsTable.hiddenAt), visibility))
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

  const userId = getAuth(req)?.userId ?? null;
  let wsId: string | null = null;
  try {
    wsId = userId ? await getCurrentWorkspaceId(userId) : null;
  } catch {}
  const visibility = workspaceVisibility(wsId);

  const conditions = [isNull(flashcardsTable.hiddenAt)];
  if (visibility) conditions.push(visibility);
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
  const userId = getAuth(req)?.userId ?? null;
  let wsId: string | null = null;
  try {
    wsId = userId ? await getCurrentWorkspaceId(userId) : null;
  } catch {}
  const visibility = workspaceVisibility(wsId);

  const [card] = await db
    .select()
    .from(flashcardsTable)
    .where(
      and(
        eq(flashcardsTable.id, parsed.data.id),
        isNull(flashcardsTable.hiddenAt),
        visibility,
      ),
    )
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

  const userId = getAuth(req)?.userId ?? null;
  let wsId: string | null = null;
  let secondaryLang = "AR";
  try {
    wsId = userId ? await getCurrentWorkspaceId(userId) : null;
    secondaryLang = userId
      ? await getWorkspaceSecondaryLang(userId, wsId)
      : "AR";
  } catch (wsErr) {
    req.log.warn(
      { wsErr },
      "workspace lookup failed, falling back to defaults",
    );
  }
  const langNames: Record<string, string> = {
    AR: "Arabic (in Arabic script)",
    EN: "English",
    ES: "Spanish",
    FR: "French",
    IT: "Italian",
    TR: "Turkish",
  };
  const secondaryLangLabel = langNames[secondaryLang] ?? secondaryLang;
  const wantsExtraLang = secondaryLang !== "AR" && secondaryLang !== "EN";
  const extraTransField = wantsExtraLang
    ? `\n- extraTranslation: string (translation in ${secondaryLangLabel})\n- extraExample: string (translation of the example sentence in ${secondaryLangLabel})`
    : "";

  const cefrGuidance: Record<string, string> = {
    A1: "absolute beginner vocabulary: greetings, numbers, colors, basic family members (Mutter, Vater), common animals (Hund, Katze), everyday objects (Tisch, Buch), core verbs (sein, haben, gehen, essen). Sentences must be very short (4–6 words).",
    A2: "elementary vocabulary: travel (Bahnhof, Fahrkarte), health (Arzt, Medikament), shopping (Preis, Rechnung), work basics (Beruf, Büro), simple adjectives (teuer, billig). Sentences 5–8 words.",
    B1: "intermediate vocabulary: opinions, environment (Umwelt), work & career (Lebenslauf, Bewerbung, kündigen), society basics (Verantwortung, Möglichkeit), common verbs (entscheiden, entwickeln, planen). Sentences can be compound.",
    B2: "upper-intermediate vocabulary: abstract concepts (Auswirkung, Einschätzung, Nachhaltigkeit), complex verbs (berücksichtigen, abwägen, bewältigen), nuanced adjectives (widersprüchlich, umfangreich, fundiert). Avoid very rare academic terms.",
    C1: "advanced/academic vocabulary: scholarly or literary terms (Abhandlung, Evidenz, Empirie), rare verbs (validieren, extrapolieren, disambiguieren), nuanced concepts rarely seen below C1 level.",
  };
  const levelHint = cefrGuidance[level] ?? `appropriate for ${level} learners`;

  const prompt = `Generate ${wordCount} German vocabulary flashcards for CEFR level ${level}.
Category: ${category}.

IMPORTANT — level accuracy: ${level} means ${levelHint}
Do NOT include words that clearly belong to a lower level.

Return a JSON array (no markdown, no code block) where each item has exactly these fields:
- word: string (German word WITH article for nouns, e.g. "der Hund"; bare word for verbs/adjectives)
- article: string or null (der/die/das for nouns, null for verbs/adjectives)
- baseWord: string (the word without article)
- level: "${level}"
- category: "${category}"
- englishTranslation: string
- arabicTranslation: string (in Arabic script)
- exampleSentenceDe: string (German example sentence appropriate for ${level})
- exampleSentenceEn: string (English translation of the example)
- exampleSentenceAr: string (Arabic translation of the example, in Arabic script)${extraTransField}

Return ONLY a valid JSON array, no explanation.`;

  let r;
  try {
    r = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    });
  } catch (err) {
    req.log.error({ err }, "Gemini generateContent failed");
    res.status(502).json({
      error: "AI generation failed",
      detail: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  const text = r.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
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
    extraTranslation?: string;
    extraExample?: string;
  }> = [];

  try {
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    cards = JSON.parse(cleaned);
  } catch {
    res.status(502).json({
      error: "Failed to parse AI response",
      rawText: text.slice(0, 300),
    });
    return;
  }

  if (!Array.isArray(cards) || cards.length === 0) {
    res
      .status(502)
      .json({ error: "AI returned no cards", rawText: text.slice(0, 300) });
    return;
  }

  // ── Deduplication: drop cards whose base word already exists in this scope ──
  const baseWords = cards
    .map((c) => c.baseWord?.trim().toLowerCase())
    .filter(Boolean);

  const existingWords =
    baseWords.length > 0
      ? await db
          .select({ baseWord: flashcardsTable.baseWord })
          .from(flashcardsTable)
          .where(
            and(
              inArray(sql`lower(trim(${flashcardsTable.baseWord}))`, baseWords),
              isNull(flashcardsTable.hiddenAt),
            ),
          )
      : [];

  const existingSet = new Set(
    existingWords.map((r) => r.baseWord?.trim().toLowerCase()),
  );
  const uniqueCards = cards.filter(
    (c) => !existingSet.has(c.baseWord?.trim().toLowerCase()),
  );
  const skippedCount = cards.length - uniqueCards.length;
  if (skippedCount > 0) {
    req.log.info(
      { skipped: skippedCount },
      "Skipped duplicate cards during generation",
    );
  }
  if (uniqueCards.length === 0) {
    res.status(200).json({
      cards: [],
      skipped: skippedCount,
      message: `All ${skippedCount} generated words already exist in your card set.`,
    });
    return;
  }
  // ──────────────────────────────────────────────────────────────────────────

  const extraLangKey = secondaryLang.toLowerCase();
  let inserted: (typeof flashcardsTable.$inferSelect)[];
  try {
    inserted = await db
      .insert(flashcardsTable)
      .values(
        uniqueCards.map((c) => {
          const translations: Record<string, string> = {
            en: c.englishTranslation,
            ar: c.arabicTranslation,
          };
          const exampleTranslations: Record<string, string> = {
            en: c.exampleSentenceEn,
            ar: c.exampleSentenceAr,
          };
          if (wantsExtraLang && c.extraTranslation) {
            translations[extraLangKey] = c.extraTranslation;
          }
          if (wantsExtraLang && c.extraExample) {
            exampleTranslations[extraLangKey] = c.extraExample;
          }
          return {
            word: c.word,
            article: c.article ?? null,
            baseWord: c.baseWord,
            level: correctLevel(c.baseWord, c.level),
            category: c.category,
            englishTranslation: c.englishTranslation,
            arabicTranslation: c.arabicTranslation,
            exampleSentenceDe: c.exampleSentenceDe,
            exampleSentenceEn: c.exampleSentenceEn,
            exampleSentenceAr: c.exampleSentenceAr,
            translations,
            exampleTranslations,
            createdBy: userId,
            ownerWorkspaceId: wsId,
            imageUrl: null,
            known: false,
          };
        }),
      )
      .returning();
  } catch (dbErr) {
    req.log.error({ dbErr }, "DB insert failed after AI generation");
    res.status(502).json({
      error: "Failed to save generated cards",
      detail: dbErr instanceof Error ? dbErr.message : String(dbErr),
    });
    return;
  }

  // Increment the daily counter only after successful generation
  entry.used += 1;
  invalidateCommunityStats();

  // Fetch images from Pexels in parallel (fire-and-forget updates; don't block response)
  const withImages = await Promise.all(
    inserted.map(async (card) => {
      const imageUrl = await fetchPexelsImage(card.englishTranslation);
      if (imageUrl) {
        await db
          .update(flashcardsTable)
          .set({ imageUrl })
          .where(eq(flashcardsTable.id, card.id));
        return { ...card, imageUrl };
      }
      return card;
    }),
  );

  res.status(201).json({ cards: withImages, skipped: skippedCount });
});

// POST /api/flashcards/:id/translate  — translate a card to a target language on-demand
// Result is cached on the card so every learner benefits ("community library").
// Requires auth (prevents anonymous AI billing-DoS).
// Per-user rate-limited and in-flight deduped so concurrent callers share one Gemini call.
const translateLimits = new Map<string, { count: number; resetAt: number }>();
const TRANSLATE_LIMIT_PER_MIN = 30;
const inFlightTranslations = new Map<
  string,
  Promise<typeof flashcardsTable.$inferSelect>
>();

router.post("/flashcards/:id/translate", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const now = Date.now();
  const slot = translateLimits.get(userId);
  if (!slot || now > slot.resetAt) {
    translateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
  } else {
    if (slot.count >= TRANSLATE_LIMIT_PER_MIN) {
      res
        .status(429)
        .json({ error: "Too many translation requests, slow down" });
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

  let wsIdForVisibility: string | null = null;
  try {
    wsIdForVisibility = await getCurrentWorkspaceId(userId);
  } catch {}
  const visPred = workspaceVisibility(wsIdForVisibility);
  const [card] = await db
    .select()
    .from(flashcardsTable)
    .where(
      visPred
        ? and(eq(flashcardsTable.id, id), visPred)
        : eq(flashcardsTable.id, id),
    )
    .limit(1);
  if (!card) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }

  const existingTrans = (card.translations ?? {}) as Record<string, string>;
  const existingExamples = (card.exampleTranslations ?? {}) as Record<
    string,
    string
  >;

  if (existingTrans[lang] && existingExamples[lang]) {
    res.json(card);
    return;
  }

  // Dedupe concurrent translations for the same (cardId, lang) — share one Gemini call.
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

      const r = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      });
      const text = r.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const cleaned = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
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
    res.status(502).json({
      error: "Translation failed",
      detail: err instanceof Error ? err.message : String(err),
    });
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

  if (userId) {
    let wsId: string | null = null;
    try {
      wsId = await getCurrentWorkspaceId(userId);
    } catch {}
    const visPred = workspaceVisibility(wsId);
    const [card] = await db
      .select()
      .from(flashcardsTable)
      .where(
        visPred
          ? and(eq(flashcardsTable.id, flashcardId), visPred)
          : eq(flashcardsTable.id, flashcardId),
      )
      .limit(1);
    if (!card) {
      res.status(404).json({ error: "Flashcard not found" });
      return;
    }

    await upsertProgress({ userId, workspaceId: wsId, flashcardId, known });
    await bumpStreak(userId);

    res.json({ ...card, known });
    return;
  }

  const [card] = await db
    .select()
    .from(flashcardsTable)
    .where(eq(flashcardsTable.id, flashcardId))
    .limit(1);

  if (!card) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }

  // Anonymous users may not write to shared state — would let any guest mutate
  // every user's "known" flag. They can still browse and study locally; the
  // client should store guest progress in localStorage / AsyncStorage.
  res.status(401).json({ error: "Sign in to save progress across devices." });
});

// POST /ba7r-api/admin/flashcards/backfill-images
// Fetches Pexels images for all cards that currently have no imageUrl.
// Admin-only. Runs in background — responds immediately with count.
router.post("/admin/flashcards/backfill-images", async (req, res) => {
  const userId = getAuth(req)?.userId;
  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .filter(Boolean);
  if (!userId || !adminIds.includes(userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const cards = await db
    .select({
      id: flashcardsTable.id,
      englishTranslation: flashcardsTable.englishTranslation,
    })
    .from(flashcardsTable)
    .where(isNull(flashcardsTable.imageUrl));

  res.json({
    message: `Backfilling ${cards.length} cards in background…`,
    count: cards.length,
  });

  // Run in background after responding
  (async () => {
    for (const card of cards) {
      const imageUrl = await fetchPexelsImage(card.englishTranslation);
      if (imageUrl) {
        await db
          .update(flashcardsTable)
          .set({ imageUrl })
          .where(eq(flashcardsTable.id, card.id));
      }
      // Small delay to respect Pexels rate limits
      await new Promise((r) => setTimeout(r, 200));
    }
  })().catch(() => {});
});

export default router;
