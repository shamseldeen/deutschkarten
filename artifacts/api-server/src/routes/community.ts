import { Router, type IRouter } from "express";
import {
  db,
  flashcardsTable,
  usersTable,
  communityPostsTable,
  communityPostLikesTable,
} from "@workspace/db";
import { sql, isNull, and, eq, desc, isNotNull } from "drizzle-orm";
import { SUPPORTED_LANGS, RTL_LANGS } from "../lib/languages";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router: IRouter = Router();

type StatsCache = {
  at: number;
  data: { totalCards: number; contributors: number; languages: number; members: number };
};
let cache: StatsCache | null = null;
const TTL = 60_000;

export function invalidateCommunityStats() {
  cache = null;
}

// GET /community/stats — public
router.get("/community/stats", async (_req, res) => {
  if (cache && Date.now() - cache.at < TTL) {
    res.json(cache.data);
    return;
  }
  const [[cardRow], [memberRow]] = await Promise.all([
    db
      .select({
        totalCards: sql<number>`count(*)::int`,
        contributors: sql<number>`count(distinct ${flashcardsTable.createdBy})::int`,
      })
      .from(flashcardsTable)
      .where(and(isNull(flashcardsTable.hiddenAt), isNull(flashcardsTable.ownerWorkspaceId))),
    db.select({ members: sql<number>`count(*)::int` }).from(usersTable),
  ]);
  const data = {
    totalCards: cardRow?.totalCards ?? 0,
    contributors: cardRow?.contributors ?? 0,
    languages: SUPPORTED_LANGS.length,
    members: memberRow?.members ?? 0,
  };
  cache = { at: Date.now(), data };
  res.json(data);
});

// GET /languages — public
router.get("/languages", (_req, res) => {
  res.json(SUPPORTED_LANGS.map((l) => ({ ...l, rtl: RTL_LANGS.has(l.code) })));
});

// POST /me/consent — record consent timestamp
router.post("/me/consent", requireAuth, async (req, res) => {
  const userId = req.userId!;
  await db
    .update(usersTable)
    .set({ consentAcceptedAt: new Date() })
    .where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

// GET /community/posts — paginated list (requires auth)
router.get("/community/posts", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const limit = Math.min(Number(req.query.limit) || 30, 50);
  const offset = Number(req.query.offset) || 0;

  const posts = await db
    .select({
      id: communityPostsTable.id,
      content: communityPostsTable.content,
      likeCount: communityPostsTable.likeCount,
      createdAt: communityPostsTable.createdAt,
      userId: communityPostsTable.userId,
      displayName: usersTable.displayName,
      imageUrl: usersTable.imageUrl,
    })
    .from(communityPostsTable)
    .innerJoin(usersTable, eq(communityPostsTable.userId, usersTable.id))
    .where(isNull(communityPostsTable.hiddenAt))
    .orderBy(desc(communityPostsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Check which posts the current user has liked
  const likedRows = await db
    .select({ postId: communityPostLikesTable.postId })
    .from(communityPostLikesTable)
    .where(eq(communityPostLikesTable.userId, userId));
  const likedSet = new Set(likedRows.map((r) => r.postId));

  res.json(
    posts.map((p) => ({
      ...p,
      isOwn: p.userId === userId,
      liked: likedSet.has(p.id),
    })),
  );
});

// POST /community/posts — create a post
router.post("/community/posts", requireAuth, async (req, res) => {
  const userId = req.userId!;

  // Verify consent
  const [user] = await db
    .select({ consentAcceptedAt: usersTable.consentAcceptedAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user?.consentAcceptedAt) {
    res.status(403).json({ error: "consent_required" });
    return;
  }

  const content = (req.body?.content ?? "").trim();
  if (!content || content.length > 1000) {
    res.status(400).json({ error: "Content must be 1–1000 characters" });
    return;
  }

  const [post] = await db
    .insert(communityPostsTable)
    .values({ userId, content })
    .returning();

  // Fetch display info
  const [userRow] = await db
    .select({ displayName: usersTable.displayName, imageUrl: usersTable.imageUrl })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  res.status(201).json({ ...post, displayName: userRow?.displayName, imageUrl: userRow?.imageUrl, isOwn: true, liked: false });
});

// POST /community/posts/:id/like — toggle like
router.post("/community/posts/:id/like", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const postId = Number(req.params.id);
  if (!Number.isFinite(postId)) { res.status(400).json({ error: "Invalid id" }); return; }

  // Check existing like
  const [existing] = await db
    .select()
    .from(communityPostLikesTable)
    .where(and(eq(communityPostLikesTable.postId, postId), eq(communityPostLikesTable.userId, userId)))
    .limit(1);

  if (existing) {
    await db
      .delete(communityPostLikesTable)
      .where(and(eq(communityPostLikesTable.postId, postId), eq(communityPostLikesTable.userId, userId)));
    await db
      .update(communityPostsTable)
      .set({ likeCount: sql`greatest(0, ${communityPostsTable.likeCount} - 1)` })
      .where(eq(communityPostsTable.id, postId));
    res.json({ liked: false });
  } else {
    await db.insert(communityPostLikesTable).values({ postId, userId });
    await db
      .update(communityPostsTable)
      .set({ likeCount: sql`${communityPostsTable.likeCount} + 1` })
      .where(eq(communityPostsTable.id, postId));
    res.json({ liked: true });
  }
});

// DELETE /community/posts/:id — delete own post
router.delete("/community/posts/:id", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const postId = Number(req.params.id);
  if (!Number.isFinite(postId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [post] = await db
    .select()
    .from(communityPostsTable)
    .where(and(eq(communityPostsTable.id, postId), eq(communityPostsTable.userId, userId)))
    .limit(1);
  if (!post) { res.status(404).json({ error: "Not found or not yours" }); return; }

  await db.delete(communityPostsTable).where(eq(communityPostsTable.id, postId));
  res.json({ ok: true });
});

export default router;
