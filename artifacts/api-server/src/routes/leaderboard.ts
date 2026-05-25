import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  usersTable,
  userProgressTable,
  userStreaksTable,
  quizSessionsTable,
} from "@workspace/db";
import { eq, sql, desc, isNotNull } from "drizzle-orm";

const router: IRouter = Router();

// XP formula: known card = 10, correct quiz answer = 5, longest streak day = 20
const XP_KNOWN = 10;
const XP_CORRECT = 5;
const XP_STREAK = 20;

type Cached = { at: number; rows: Row[] };
type Row = {
  rank: number;
  userId: string;
  displayName: string;
  imageUrl: string | null;
  knownCards: number;
  correctAnswers: number;
  longestStreak: number;
  xp: number;
};

let cache: Cached | null = null;
const CACHE_TTL_MS = 60_000;

async function buildLeaderboard(): Promise<Row[]> {
  // Aggregate per user: known cards + correct quiz answers + longest streak
  const known = db
    .select({
      userId: userProgressTable.userId,
      knownCards:
        sql<number>`count(*) filter (where ${userProgressTable.known} = 1)::int`.as(
          "known_cards",
        ),
    })
    .from(userProgressTable)
    .groupBy(userProgressTable.userId)
    .as("k");

  const quiz = db
    .select({
      userId: quizSessionsTable.userId,
      correctAnswers:
        sql<number>`coalesce(sum(${quizSessionsTable.correctAnswers}), 0)::int`.as(
          "correct_answers",
        ),
    })
    .from(quizSessionsTable)
    .where(isNotNull(quizSessionsTable.finishedAt))
    .groupBy(quizSessionsTable.userId)
    .as("q");

  const rows = await db
    .select({
      userId: usersTable.id,
      displayName: usersTable.displayName,
      email: usersTable.email,
      imageUrl: usersTable.imageUrl,
      knownCards: sql<number>`coalesce(${known.knownCards}, 0)::int`,
      correctAnswers: sql<number>`coalesce(${quiz.correctAnswers}, 0)::int`,
      longestStreak: sql<number>`coalesce(${userStreaksTable.longestStreak}, 0)::int`,
    })
    .from(usersTable)
    .leftJoin(known, eq(known.userId, usersTable.id))
    .leftJoin(quiz, eq(quiz.userId, usersTable.id))
    .leftJoin(userStreaksTable, eq(userStreaksTable.userId, usersTable.id))
    .orderBy(
      desc(
        sql`coalesce(${known.knownCards}, 0) * ${XP_KNOWN} + coalesce(${quiz.correctAnswers}, 0) * ${XP_CORRECT} + coalesce(${userStreaksTable.longestStreak}, 0) * ${XP_STREAK}`,
      ),
    )
    .limit(500);

  return rows.map((r, idx) => {
    const xp =
      r.knownCards * XP_KNOWN +
      r.correctAnswers * XP_CORRECT +
      r.longestStreak * XP_STREAK;
    const name =
      (r.displayName && r.displayName.trim()) ||
      (r.email ? r.email.split("@")[0] : null) ||
      "Learner";
    return {
      rank: idx + 1,
      userId: r.userId,
      displayName: name,
      imageUrl: r.imageUrl,
      knownCards: r.knownCards,
      correctAnswers: r.correctAnswers,
      longestStreak: r.longestStreak,
      xp,
    };
  });
}

async function getCached(): Promise<Row[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;
  const rows = await buildLeaderboard();
  cache = { at: Date.now(), rows };
  return rows;
}

router.get("/leaderboard", async (req, res) => {
  try {
    const all = await getCached();
    const top = all.slice(0, 50);
    const userId = getAuth(req)?.userId ?? null;
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

export default router;
