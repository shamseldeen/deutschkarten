import { Router } from "express";
import {
  db,
  usersTable,
  userProgressTable,
  userStreaksTable,
  flashcardsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and, sql, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { bumpStreak } from "../lib/streak";
import {
  cardVisibleInWorkspace,
  getCurrentWorkspaceId,
  upsertProgress,
  workspaceVisibility,
} from "../lib/workspace";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const [streak] = await db
    .select()
    .from(userStreaksTable)
    .where(eq(userStreaksTable.userId, userId))
    .limit(1);
  res.json({
    user,
    streak: streak ?? {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
    },
  });
});

router.get("/me/stats", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const wsId = await getCurrentWorkspaceId(userId);
  const visibility = workspaceVisibility(wsId);
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
        wsId === null
          ? isNull(userProgressTable.workspaceId)
          : eq(userProgressTable.workspaceId, wsId),
      ),
    )
    .where(visibility)
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
  const wsId = await getCurrentWorkspaceId(userId);

  if (!(await cardVisibleInWorkspace(flashcardId, wsId))) {
    res.status(404).json({ error: "Flashcard not in this workspace" });
    return;
  }

  await upsertProgress({ userId, workspaceId: wsId, flashcardId, known });
  await bumpStreak(userId);

  res.json({ ok: true });
});

export default router;
