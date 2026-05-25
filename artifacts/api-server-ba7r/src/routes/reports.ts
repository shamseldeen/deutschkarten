import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod/v4";
import { eq, desc, sql, and, isNull } from "drizzle-orm";
import {
  db,
  flashcardsTable,
  flashcardReportsTable,
  REPORT_REASONS,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { isAdmin } from "../lib/admin";
import {
  getCurrentWorkspaceId,
  cardVisibleInWorkspace,
} from "../lib/workspace";

const router: IRouter = Router();

// Per-user rate limit for report submission.
const REPORT_LIMIT_PER_HOUR = 20;
const reportLimits = new Map<string, { count: number; resetAt: number }>();

const AUTO_HIDE_AT = 3; // unresolved reports needed to auto-hide a card

const reportBodySchema = z.object({
  reason: z.enum(REPORT_REASONS),
  note: z.string().max(500).optional(),
});

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdmin(req.userId)) {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}

// POST /api/flashcards/:id/report — any signed-in user can report a card
router.post("/flashcards/:id/report", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = reportBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const userId = req.userId!;
  const now = Date.now();
  const slot = reportLimits.get(userId);
  if (!slot || now > slot.resetAt) {
    reportLimits.set(userId, { count: 1, resetAt: now + 3_600_000 });
  } else {
    slot.count += 1;
    if (slot.count > REPORT_LIMIT_PER_HOUR) {
      res.status(429).json({ error: "Too many reports — try again later" });
      return;
    }
  }

  // Only let a user report a card that is visible in their current workspace.
  // Without this, a signed-in user could guess flashcard IDs and report cards
  // in other users' private workspaces, eventually auto-hiding them at the
  // threshold. Return 404 (not 403) so existence isn't leaked.
  const currentWsId = await getCurrentWorkspaceId(userId);
  const visible = await cardVisibleInWorkspace(id, currentWsId);
  if (!visible) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  // Wrap insert + threshold evaluation + hide in a single transaction so
  // concurrent reports can't leave the card in an inconsistent state, and so
  // a failed hide rolls back the report row. The unique index on
  // (flashcardId, userId) WHERE status='open' enforces one open report per
  // user — duplicates raise a unique-violation that we treat as success.
  let alreadyReported = false;
  let distinctReporters = 0;
  let autoHidden = false;

  await db.transaction(async (tx) => {
    try {
      await tx.insert(flashcardReportsTable).values({
        flashcardId: id,
        userId,
        reason: parsed.data.reason,
        note: parsed.data.note ?? null,
      });
    } catch (e) {
      // Unique violation on (flashcardId, userId) where status='open' —
      // user already has an open report for this card. Treat as no-op.
      const code = (e as { code?: string } | null)?.code;
      if (code === "23505") {
        alreadyReported = true;
        return;
      }
      throw e;
    }

    // Count DISTINCT reporters with an open report against this card. The
    // unique index guarantees this == count(*), but using distinct keeps the
    // intent clear and defends against future index changes.
    const rows = await tx
      .select({
        c: sql<number>`count(distinct ${flashcardReportsTable.userId})::int`,
      })
      .from(flashcardReportsTable)
      .where(
        and(
          eq(flashcardReportsTable.flashcardId, id),
          eq(flashcardReportsTable.status, "open"),
        ),
      );
    distinctReporters = rows[0]?.c ?? 0;

    if (distinctReporters >= AUTO_HIDE_AT) {
      const updated = await tx
        .update(flashcardsTable)
        .set({ hiddenAt: new Date() })
        .where(
          and(eq(flashcardsTable.id, id), isNull(flashcardsTable.hiddenAt)),
        )
        .returning({ id: flashcardsTable.id });
      autoHidden = updated.length > 0;
    }
  });

  req.log.info(
    {
      flashcardId: id,
      userId,
      reason: parsed.data.reason,
      distinctReporters,
      autoHidden,
      alreadyReported,
    },
    "card reported",
  );
  res
    .status(alreadyReported ? 200 : 201)
    .json({ ok: true, autoHidden, alreadyReported });
});

// GET /api/admin/reports — list open reports, newest first
router.get("/admin/reports", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      id: flashcardReportsTable.id,
      flashcardId: flashcardReportsTable.flashcardId,
      userId: flashcardReportsTable.userId,
      reason: flashcardReportsTable.reason,
      note: flashcardReportsTable.note,
      status: flashcardReportsTable.status,
      createdAt: flashcardReportsTable.createdAt,
      word: flashcardsTable.word,
      level: flashcardsTable.level,
      hiddenAt: flashcardsTable.hiddenAt,
    })
    .from(flashcardReportsTable)
    .leftJoin(
      flashcardsTable,
      eq(flashcardReportsTable.flashcardId, flashcardsTable.id),
    )
    .where(eq(flashcardReportsTable.status, "open"))
    .orderBy(desc(flashcardReportsTable.createdAt))
    .limit(200);
  res.json({ reports: rows });
});

// POST /api/admin/reports/:id/dismiss — keep card, mark report closed (good content)
router.post(
  "/admin/reports/:id/dismiss",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .update(flashcardReportsTable)
      .set({ status: "dismissed", resolvedAt: new Date() })
      .where(eq(flashcardReportsTable.id, id));
    res.json({ ok: true });
  },
);

// POST /api/admin/flashcards/:id/unhide — restore an auto-hidden card + dismiss all open reports
router.post(
  "/admin/flashcards/:id/unhide",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .update(flashcardsTable)
      .set({ hiddenAt: null })
      .where(eq(flashcardsTable.id, id));
    await db
      .update(flashcardReportsTable)
      .set({ status: "dismissed", resolvedAt: new Date() })
      .where(
        and(
          eq(flashcardReportsTable.flashcardId, id),
          eq(flashcardReportsTable.status, "open"),
        ),
      );
    res.json({ ok: true });
  },
);

// DELETE /api/admin/flashcards/:id — hard-delete a bad card + mark reports actioned
router.delete(
  "/admin/flashcards/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .update(flashcardReportsTable)
      .set({ status: "actioned", resolvedAt: new Date() })
      .where(eq(flashcardReportsTable.flashcardId, id));
    await db.delete(flashcardsTable).where(eq(flashcardsTable.id, id));
    res.json({ ok: true });
  },
);

export default router;
