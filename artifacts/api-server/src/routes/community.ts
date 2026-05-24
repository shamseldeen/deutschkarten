import { Router, type IRouter } from "express";
import { db, flashcardsTable } from "@workspace/db";
import { sql, isNull, and } from "drizzle-orm";
import { SUPPORTED_LANGS, RTL_LANGS } from "../lib/languages";

const router: IRouter = Router();

type Cache = { at: number; data: { totalCards: number; contributors: number; languages: number } };
let cache: Cache | null = null;
const TTL = 60_000;

export function invalidateCommunityStats() {
  cache = null;
}

router.get("/community/stats", async (_req, res) => {
  if (cache && Date.now() - cache.at < TTL) {
    res.json(cache.data);
    return;
  }

  const [row] = await db
    .select({
      totalCards: sql<number>`count(*)::int`,
      contributors: sql<number>`count(distinct ${flashcardsTable.createdBy})::int`,
    })
    .from(flashcardsTable)
    .where(and(
      isNull(flashcardsTable.hiddenAt),
      isNull(flashcardsTable.ownerWorkspaceId),
    ));

  const data = {
    totalCards: row?.totalCards ?? 0,
    contributors: row?.contributors ?? 0,
    languages: SUPPORTED_LANGS.length,
  };
  cache = { at: Date.now(), data };
  res.json(data);
});

router.get("/languages", (_req, res) => {
  res.json(SUPPORTED_LANGS.map((l) => ({ ...l, rtl: RTL_LANGS.has(l.code) })));
});

export default router;
