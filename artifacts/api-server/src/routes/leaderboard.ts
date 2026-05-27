import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  usersTable,
  userProgressTable,
  userStreaksTable,
  quizSessionsTable,
  friendGroupsTable,
  friendGroupMembersTable,
} from "@workspace/db";
import { eq, sql, desc, isNotNull, and, inArray } from "drizzle-orm";
import { computeRank } from "@workspace/content";
import { randomUUID } from "crypto";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

type Row = {
  rank: number;
  userId: string;
  displayName: string;
  imageUrl: string | null;
  knownCards: number;
  correctAnswers: number;
  longestStreak: number;
  currentStreak: number;
  xp: number;
  rankTitle: string;
  rankSlug: string;
};

type Cached = { at: number; rows: Row[] };
let cache: Cached | null = null;
const CACHE_TTL_MS = 60_000;

async function buildLeaderboard(publicOnly = true): Promise<Row[]> {
  const knownSub = db
    .select({
      userId: userProgressTable.userId,
      knownCards: sql<number>`count(*) filter (where ${userProgressTable.known} = 1)::int`.as("known_cards"),
      knownAtC1: sql<number>`count(*) filter (where ${userProgressTable.known} = 1 and exists (select 1 from flashcards f where f.id = ${userProgressTable.flashcardId} and f.level = 'C1'))::int`.as("known_at_c1"),
    })
    .from(userProgressTable)
    .groupBy(userProgressTable.userId)
    .as("k");

  const quizSub = db
    .select({
      userId: quizSessionsTable.userId,
      correctAnswers: sql<number>`coalesce(sum(${quizSessionsTable.correctAnswers}), 0)::int`.as("correct_answers"),
    })
    .from(quizSessionsTable)
    .where(isNotNull(quizSessionsTable.finishedAt))
    .groupBy(quizSessionsTable.userId)
    .as("q");

  const baseQuery = db
    .select({
      userId: usersTable.id,
      displayName: usersTable.displayName,
      email: usersTable.email,
      imageUrl: usersTable.imageUrl,
      totalPoints: usersTable.totalPoints,
      knownCards: sql<number>`coalesce(${knownSub.knownCards}, 0)::int`,
      knownAtC1: sql<number>`coalesce(${knownSub.knownAtC1}, 0)::int`,
      correctAnswers: sql<number>`coalesce(${quizSub.correctAnswers}, 0)::int`,
      longestStreak: sql<number>`coalesce(${userStreaksTable.longestStreak}, 0)::int`,
      currentStreak: sql<number>`coalesce(${userStreaksTable.currentStreak}, 0)::int`,
    })
    .from(usersTable)
    .leftJoin(knownSub, eq(knownSub.userId, usersTable.id))
    .leftJoin(quizSub, eq(quizSub.userId, usersTable.id))
    .leftJoin(userStreaksTable, eq(userStreaksTable.userId, usersTable.id));

  const rows = await (publicOnly
    ? baseQuery.where(eq(usersTable.publicLeaderboard, 1))
    : baseQuery
  )
    .orderBy(desc(usersTable.totalPoints))
    .limit(500);

  return rows.map((r, idx) => {
    const name =
      (r.displayName && r.displayName.trim()) ||
      (r.email ? r.email.split("@")[0] : null) ||
      "Learner";
    const rankInfo = computeRank(r.totalPoints ?? 0, r.knownAtC1 ?? 0, r.knownCards);
    return {
      rank: idx + 1,
      userId: r.userId,
      displayName: name,
      imageUrl: r.imageUrl,
      knownCards: r.knownCards,
      correctAnswers: r.correctAnswers,
      longestStreak: r.longestStreak,
      currentStreak: r.currentStreak,
      xp: Math.round(r.totalPoints ?? 0),
      rankTitle: rankInfo.current.title,
      rankSlug: rankInfo.current.slug,
    };
  });
}

async function getCached(): Promise<Row[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;
  const rows = await buildLeaderboard(true);
  cache = { at: Date.now(), rows };
  return rows;
}

// GET /api/leaderboard?mode=public|friends
// mode=public (default): top 50 public learners + caller's own row
// mode=friends: caller's friend group leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const mode = (req.query.mode as string) ?? "public";
    const userId = getAuth(req)?.userId ?? null;

    if (mode === "friends" && userId) {
      // Find groups where caller is a member
      const memberRows = await db
        .select({ groupId: friendGroupMembersTable.groupId })
        .from(friendGroupMembersTable)
        .where(eq(friendGroupMembersTable.userId, userId));

      if (memberRows.length === 0) {
        res.json({ top: [], me: null, friendCode: null });
        return;
      }

      const groupIds = memberRows.map((r) => r.groupId);
      const memberUserIds = await db
        .select({ userId: friendGroupMembersTable.userId })
        .from(friendGroupMembersTable)
        .where(inArray(friendGroupMembersTable.groupId, groupIds));

      const uniqueUserIds = [...new Set(memberUserIds.map((r) => r.userId))];
      const allRows = await buildLeaderboard(false);
      const friendRows = allRows
        .filter((r) => uniqueUserIds.includes(r.userId))
        .map((r, idx) => ({ ...r, rank: idx + 1 }));

      const me = friendRows.find((r) => r.userId === userId) ?? null;
      const [userRow] = await db.select({ friendCode: usersTable.friendCode }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      res.json({ top: friendRows.slice(0, 50), me, friendCode: userRow?.friendCode ?? null });
      return;
    }

    // Public leaderboard (cached)
    const all = await getCached();
    const top = all.slice(0, 50);
    let me: Row | null = null;
    if (userId) {
      me = all.find((r) => r.userId === userId) ?? null;
    }
    res.json({ top, me });
  } catch (err) {
    req.log?.error({ err }, "leaderboard failed");
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

// POST /api/leaderboard/friend-group — create or get caller's friend group + invite code
router.post("/leaderboard/friend-group", requireAuth, async (req, res) => {
  const userId = getAuth(req)!.userId!;
  try {
    // Ensure user has a friendCode
    let [user] = await db
      .select({ friendCode: usersTable.friendCode })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user?.friendCode) {
      const code = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
      await db
        .update(usersTable)
        .set({ friendCode: code })
        .where(eq(usersTable.id, userId));
      user = { friendCode: code };
    }

    // Ensure group exists for this user as owner
    let [group] = await db
      .select({ id: friendGroupsTable.id })
      .from(friendGroupsTable)
      .where(eq(friendGroupsTable.ownerId, userId))
      .limit(1);

    if (!group) {
      const groupId = randomUUID();
      await db.insert(friendGroupsTable).values({ id: groupId, ownerId: userId });
      // Auto-add owner as member
      await db.insert(friendGroupMembersTable).values({ groupId, userId }).onConflictDoNothing();
      group = { id: groupId };
    }

    // Count members
    const [{ count: memberCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(friendGroupMembersTable)
      .where(eq(friendGroupMembersTable.groupId, group.id));

    res.json({ groupId: group.id, friendCode: user.friendCode, memberCount });
  } catch (err) {
    req.log?.error({ err }, "friend-group create failed");
    res.status(500).json({ error: "Failed to create friend group" });
  }
});

// POST /api/leaderboard/join — join a friend group by friendCode
router.post("/leaderboard/join", requireAuth, async (req, res) => {
  const userId = getAuth(req)!.userId!;
  const { friendCode } = req.body as { friendCode?: string };

  if (!friendCode || typeof friendCode !== "string") {
    res.status(400).json({ error: "friendCode required" });
    return;
  }

  try {
    // Find user who owns this code
    const [owner] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.friendCode, friendCode.toUpperCase()))
      .limit(1);

    if (!owner) {
      res.status(404).json({ error: "Friend code not found" });
      return;
    }

    if (owner.id === userId) {
      res.status(400).json({ error: "Cannot join your own group with your own code" });
      return;
    }

    // Find owner's group
    const [group] = await db
      .select({ id: friendGroupsTable.id })
      .from(friendGroupsTable)
      .where(eq(friendGroupsTable.ownerId, owner.id))
      .limit(1);

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    await db
      .insert(friendGroupMembersTable)
      .values({ groupId: group.id, userId })
      .onConflictDoNothing();

    res.json({ ok: true, groupId: group.id });
  } catch (err) {
    req.log?.error({ err }, "friend-group join failed");
    res.status(500).json({ error: "Failed to join group" });
  }
});

// PATCH /api/me/leaderboard-visibility — toggle public leaderboard opt-in/out
router.patch("/me/leaderboard-visibility", requireAuth, async (req, res) => {
  const userId = getAuth(req)!.userId!;
  const { public: isPublic } = req.body as { public?: boolean };
  if (typeof isPublic !== "boolean") {
    res.status(400).json({ error: "public (boolean) required" });
    return;
  }
  await db
    .update(usersTable)
    .set({ publicLeaderboard: isPublic ? 1 : 0, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
  res.json({ ok: true, public: isPublic });
});

export default router;
