import { Router } from "express";
import { db, usersTable, userProgressTable, userStreaksTable, flashcardsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { bumpStreak } from "../lib/streak";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const [streak] = await db.select().from(userStreaksTable).where(eq(userStreaksTable.userId, userId)).limit(1);
  res.json({
    user,
    streak: streak ?? { userId, currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  });
});

router.get("/me/stats", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const rows = await db
    .select({
      level: flashcardsTable.level,
      total: sql<number>`count(${flashcardsTable.id})::int`,
      known: sql<number>`count(case when ${userProgressTable.known} = 1 then 1 end)::int`,
    })
    .from(flashcardsTable)
    .leftJoin(
      userProgressTable,
      and(eq(userProgressTable.flashcardId, flashcardsTable.id), eq(userProgressTable.userId, userId)),
    )
    .groupBy(flashcardsTable.level);

  const out = rows.map((r) => ({
    level: r.level,
    total: r.total,
    known: r.known,
    unknown: r.total - r.known,
    percentage: r.total > 0 ? Math.round((r.known / r.total) * 100) : 0,
  }));
  res.json(out);
});

router.post("/me/progress/:flashcardId", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const flashcardId = Number(req.params.flashcardId);
  if (!Number.isFinite(flashcardId)) {
    res.status(400).json({ error: "Invalid flashcard id" });
    return;
  }
  const known = Boolean(req.body?.known);

  const id = randomUUID();
  await db
    .insert(userProgressTable)
    .values({
      id,
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

  res.json({ ok: true });
});

export default router;
