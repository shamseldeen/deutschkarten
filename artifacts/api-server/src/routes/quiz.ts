import { Router } from "express";
import {
  db,
  flashcardsTable,
  quizSessionsTable,
  quizAnswersTable,
} from "@workspace/db";
import { getAuth } from "@clerk/express";
import { eq, and, isNotNull, sql, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { isSupportedLang } from "../lib/languages";

const router = Router();

type QuizMode = "de-to-en" | "en-to-de" | "article" | "typing";
const MODES = ["de-to-en", "en-to-de", "article", "typing"] as const;

type Card = typeof flashcardsTable.$inferSelect;

interface Question {
  flashcardId: number;
  questionType: QuizMode;
  prompt: string;
  hint?: string | null;
  options?: string[];
  correctAnswer: string;
  // CEFR level of the source flashcard. Always included so the client can
  // render a per-level breakdown after the quiz (used by the "Test my level"
  // placement mode that mixes A1–C1).
  level: string;
}

// ── In-memory issued-question cache for server-authoritative scoring ─────────
// Keyed by sessionId (only set for authed users). 30-minute TTL.
interface CacheEntry { mode: QuizMode; questions: Question[]; expiresAt: number; }
const sessionCache = new Map<string, CacheEntry>();
const SESSION_TTL_MS = 30 * 60 * 1000;

function setCache(sessionId: string, mode: QuizMode, questions: Question[]) {
  sessionCache.set(sessionId, { mode, questions, expiresAt: Date.now() + SESSION_TTL_MS });
}
function getCache(sessionId: string): CacheEntry | null {
  const e = sessionCache.get(sessionId);
  if (!e) return null;
  if (e.expiresAt < Date.now()) { sessionCache.delete(sessionId); return null; }
  return e;
}
// Periodic cleanup (best-effort)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessionCache.entries()) if (v.expiresAt < now) sessionCache.delete(k);
}, 5 * 60 * 1000).unref?.();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function pickDistractors(pool: string[], correct: string, n: number): string[] {
  const unique = Array.from(new Set(pool.filter((p) => p && p !== correct)));
  return shuffle(unique).slice(0, n);
}

// Return the translation for a card in the requested language.
// Order: translations[lang] -> built-in column (en/ar) -> null.
// Cards lacking a translation in the requested language are skipped at
// question-build time (no silent fallback to a different language).
function tr(card: Card, lang: string): string | null {
  const map = (card.translations ?? null) as Record<string, string> | null;
  const v = map?.[lang];
  if (v && v.trim()) return v;
  if (lang === "en") return card.englishTranslation || null;
  if (lang === "ar") return card.arabicTranslation || null;
  return null;
}

function buildQuestion(mode: QuizMode, card: Card, pool: Card[], lang: string): Question | null {
  if (mode === "de-to-en") {
    const correct = tr(card, lang);
    if (!correct) return null;
    const poolTrs = pool.map((c) => tr(c, lang)).filter((s): s is string => !!s);
    const opts = pickDistractors(poolTrs, correct, 3);
    if (opts.length < 3) return null;
    return {
      flashcardId: card.id, questionType: mode, prompt: card.word,
      correctAnswer: correct,
      options: shuffle([correct, ...opts]),
      level: card.level,
    };
  }
  if (mode === "en-to-de") {
    const prompt = tr(card, lang);
    if (!prompt) return null;
    const opts = pickDistractors(pool.map((c) => c.word), card.word, 3);
    if (opts.length < 3) return null;
    return {
      flashcardId: card.id, questionType: mode, prompt,
      correctAnswer: card.word,
      options: shuffle([card.word, ...opts]),
      level: card.level,
    };
  }
  if (mode === "article") {
    if (!card.article) return null;
    return {
      flashcardId: card.id, questionType: mode, prompt: card.baseWord,
      hint: tr(card, lang) ?? card.englishTranslation, correctAnswer: card.article,
      options: ["der", "die", "das"],
      level: card.level,
    };
  }
  // typing
  const prompt = tr(card, lang);
  if (!prompt) return null;
  return {
    flashcardId: card.id, questionType: mode, prompt,
    hint: card.article ?? null, correctAnswer: card.baseWord,
    level: card.level,
  };
}

function isAnswerCorrect(mode: QuizMode, userAnswer: string, correctAnswer: string): boolean {
  if (mode === "typing") {
    return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  }
  return userAnswer === correctAnswer;
}

// ── Zod schemas ──────────────────────────────────────────────────────────────
const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

const StartBody = z.object({
  mode: z.enum(MODES),
  // "mixed" → placement quiz: draw evenly from all 5 CEFR levels so students
  // who already know German can self-assess where they stand without studying
  // in the app first. null/omitted = no level filter (any card, any level).
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "mixed"]).nullish(),
  count: z.coerce.number().int().min(5).max(25).default(10),
  // Target language for translation-based modes (de-to-en, en-to-de, typing).
  // Defaults to English; "ar" works out of the box, other langs depend on
  // whether the card has a stored translation in that language.
  lang: z.string().refine((v) => isSupportedLang(v), { message: "Unsupported language" }).default("en"),
});

const FinishBody = z.object({
  sessionId: z.string().min(1).nullable().optional(),
  answers: z.array(z.object({
    flashcardId: z.coerce.number().int().positive(),
    questionType: z.enum(MODES),
    userAnswer: z.string().nullable().optional(),
  })).max(50),
});

// POST /api/quiz/start
router.post("/quiz/start", async (req, res) => {
  const parsed = StartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { mode, level, count, lang } = parsed.data;
  const userId = getAuth(req)?.userId ?? null;
  const isMixed = level === "mixed";

  // For mixed (placement) mode, fetch a balanced pool: ~count*2 cards per
  // level so every CEFR band is represented in the final 10–25 question set.
  // For single-level or unfiltered mode, fall back to a single random draw.
  let pool: Card[];
  if (isMixed) {
    const perLevel = Math.max(count, 6); // small buffer over what we'll use
    const buckets = await Promise.all(
      LEVELS.map((lv) =>
        db
          .select()
          .from(flashcardsTable)
          .where(
            mode === "article"
              ? and(eq(flashcardsTable.level, lv), isNotNull(flashcardsTable.article))
              : eq(flashcardsTable.level, lv),
          )
          .orderBy(sql`RANDOM()`)
          .limit(perLevel),
      ),
    );
    pool = buckets.flat();
  } else {
    const conds = [];
    if (level) conds.push(eq(flashcardsTable.level, level));
    if (mode === "article") conds.push(isNotNull(flashcardsTable.article));
    const where = conds.length > 0 ? and(...conds) : undefined;
    pool = await db
      .select()
      .from(flashcardsTable)
      .where(where)
      .orderBy(sql`RANDOM()`)
      .limit(Math.max(count * 3, 30));
  }

  if (pool.length === 0) {
    res.status(400).json({ error: "No cards available for this mode/level." });
    return;
  }
  if (pool.length < 4 && (mode === "de-to-en" || mode === "en-to-de")) {
    res.status(400).json({ error: "Not enough cards to build a quiz. Generate more cards first." });
    return;
  }

  const questions: Question[] = [];
  if (isMixed) {
    // Round-robin: take one question per level at a time so the final list
    // is evenly distributed across A1–C1 even if buildQuestion drops some
    // cards (e.g. missing translation in the chosen language).
    const byLevel: Record<string, Card[]> = {};
    for (const c of pool) (byLevel[c.level] ??= []).push(c);
    const target = Math.min(count, 25);
    const perLevelTarget = Math.max(1, Math.floor(target / LEVELS.length));
    for (const lv of LEVELS) {
      const cards = byLevel[lv] ?? [];
      let taken = 0;
      for (const card of cards) {
        if (taken >= perLevelTarget) break;
        const q = buildQuestion(mode, card, pool, lang);
        if (q) { questions.push(q); taken += 1; }
      }
    }
    // Fill any remaining slots from leftover cards (in case some levels
    // were short on usable questions for the chosen language/mode).
    // Shuffle the pool first so top-up questions don't bias toward the
    // levels that were fetched first (the per-level buckets are flattened
    // in CEFR order, so without this the fallback would over-sample A1/A2).
    if (questions.length < target) {
      const used = new Set(questions.map((q) => q.flashcardId));
      for (const card of shuffle(pool)) {
        if (questions.length >= target) break;
        if (used.has(card.id)) continue;
        const q = buildQuestion(mode, card, pool, lang);
        if (q) questions.push(q);
      }
    }
    // Shuffle so the user doesn't see all A1 first, then all A2, etc.
    questions.splice(0, questions.length, ...shuffle(questions));
  } else {
    for (const card of pool) {
      if (questions.length >= count) break;
      const q = buildQuestion(mode, card, pool, lang);
      if (q) questions.push(q);
    }
  }

  if (questions.length === 0) {
    res.status(400).json({
      error: `Could not build any ${lang === "en" ? "" : lang.toUpperCase() + " "}questions for this mode. Try another language or generate more cards.`,
    });
    return;
  }

  let sessionId: string | null = null;
  if (userId) {
    sessionId = randomUUID();
    await db.insert(quizSessionsTable).values({
      id: sessionId,
      userId,
      mode,
      level: level ?? null,
      totalQuestions: questions.length,
      correctAnswers: 0,
    });
    setCache(sessionId, mode, questions);
  }

  res.json({ sessionId, mode, level: level ?? null, lang, questions });
});

// POST /api/quiz/finish
router.post("/quiz/finish", async (req, res) => {
  const parsed = FinishBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { sessionId, answers } = parsed.data;
  const userId = getAuth(req)?.userId ?? null;

  // Anonymous or no session: nothing to persist; client uses its local score
  if (!userId || !sessionId) {
    res.json({ saved: false, total: answers.length });
    return;
  }

  // Verify session belongs to user and is not already finished
  const [session] = await db
    .select()
    .from(quizSessionsTable)
    .where(and(eq(quizSessionsTable.id, sessionId), eq(quizSessionsTable.userId, userId)))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (session.finishedAt) {
    res.status(409).json({ error: "Session already finished" });
    return;
  }

  const cached = getCache(sessionId);
  if (!cached) {
    res.status(410).json({ error: "Quiz session expired. Please start a new quiz." });
    return;
  }

  // Build lookup from issued questions: (flashcardId, questionType) -> correctAnswer
  const issued = new Map<string, Question>();
  for (const q of cached.questions) {
    issued.set(`${q.flashcardId}:${q.questionType}`, q);
  }

  // Server-authoritative scoring
  const rows: typeof quizAnswersTable.$inferInsert[] = [];
  let correctCount = 0;
  for (const a of answers) {
    const key = `${a.flashcardId}:${a.questionType}`;
    const q = issued.get(key);
    if (!q) continue; // ignore answers that weren't part of this session
    const userAnswer = (a.userAnswer ?? "").trim();
    const correct = userAnswer.length > 0 && isAnswerCorrect(q.questionType, userAnswer, q.correctAnswer);
    if (correct) correctCount += 1;
    rows.push({
      id: randomUUID(),
      sessionId,
      flashcardId: q.flashcardId,
      questionType: q.questionType,
      prompt: { prompt: q.prompt, correctAnswer: q.correctAnswer },
      userAnswer: userAnswer || null,
      correct,
    });
  }

  if (rows.length > 0) {
    await db.insert(quizAnswersTable).values(rows);
  }

  await db
    .update(quizSessionsTable)
    .set({
      correctAnswers: correctCount,
      totalQuestions: rows.length,
      finishedAt: new Date(),
    })
    .where(eq(quizSessionsTable.id, sessionId));

  sessionCache.delete(sessionId);

  res.json({ correct: correctCount, total: rows.length, saved: true });
});

// GET /api/me/quiz-history
router.get("/me/quiz-history", async (req, res) => {
  const userId = getAuth(req)?.userId ?? null;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db
    .select()
    .from(quizSessionsTable)
    .where(and(eq(quizSessionsTable.userId, userId), isNotNull(quizSessionsTable.finishedAt)))
    .orderBy(desc(quizSessionsTable.finishedAt))
    .limit(25);
  res.json(rows);
});

// GET /api/me/quiz-stats
router.get("/me/quiz-stats", async (req, res) => {
  const userId = getAuth(req)?.userId ?? null;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [overall] = await db
    .select({
      sessions: sql<number>`count(*)::int`,
      questions: sql<number>`coalesce(sum(${quizSessionsTable.totalQuestions}), 0)::int`,
      correct: sql<number>`coalesce(sum(${quizSessionsTable.correctAnswers}), 0)::int`,
    })
    .from(quizSessionsTable)
    .where(and(eq(quizSessionsTable.userId, userId), isNotNull(quizSessionsTable.finishedAt)));

  const byMode = await db
    .select({
      mode: quizSessionsTable.mode,
      sessions: sql<number>`count(*)::int`,
      questions: sql<number>`coalesce(sum(${quizSessionsTable.totalQuestions}), 0)::int`,
      correct: sql<number>`coalesce(sum(${quizSessionsTable.correctAnswers}), 0)::int`,
    })
    .from(quizSessionsTable)
    .where(and(eq(quizSessionsTable.userId, userId), isNotNull(quizSessionsTable.finishedAt)))
    .groupBy(quizSessionsTable.mode);

  const o = overall ?? { sessions: 0, questions: 0, correct: 0 };
  res.json({
    overall: {
      sessions: o.sessions,
      questions: o.questions,
      correct: o.correct,
      accuracy: o.questions > 0 ? Math.round((o.correct / o.questions) * 100) : 0,
    },
    byMode: byMode.map((b) => ({
      mode: b.mode,
      sessions: b.sessions,
      questions: b.questions,
      correct: b.correct,
      accuracy: b.questions > 0 ? Math.round((b.correct / b.questions) * 100) : 0,
    })),
  });
});

export default router;
