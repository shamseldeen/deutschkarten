import { Router } from "express";
import { db, userWorkspacesTable, userSettingsTable, userProgressTable, flashcardsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../middlewares/requireAuth";
import {
  DEFAULT_WORKSPACE,
  LANG_LABELS,
  MAX_USER_WORKSPACES,
  SUPPORTED_SECONDARY_LANGS,
  type SupportedSecondaryLang,
} from "../lib/workspace";

const router = Router();

/**
 * Synthesizes the default Arabic workspace + the user's created workspaces
 * into one list, capped at 1 + MAX_USER_WORKSPACES dashboards.
 */
router.get("/me/workspaces", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const [rows, settings] = await Promise.all([
    db
      .select()
      .from(userWorkspacesTable)
      .where(eq(userWorkspacesTable.userId, userId))
      .orderBy(userWorkspacesTable.createdAt),
    db
      .select({ currentWorkspaceId: userSettingsTable.currentWorkspaceId })
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId))
      .limit(1),
  ]);
  const currentId = settings[0]?.currentWorkspaceId ?? null;
  res.json({
    currentId,
    max: MAX_USER_WORKSPACES,
    workspaces: [
      { ...DEFAULT_WORKSPACE, isCurrent: currentId === null },
      ...rows.map((r) => ({
        id: r.id,
        name: r.name,
        secondaryLanguage: r.secondaryLanguage,
        isDefault: false,
        isCurrent: r.id === currentId,
      })),
    ],
  });
});

router.post("/me/workspaces", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const lang = String(req.body?.secondaryLanguage ?? "").toUpperCase();
  const name = String(req.body?.name ?? "").trim();
  if (!SUPPORTED_SECONDARY_LANGS.includes(lang as SupportedSecondaryLang)) {
    res.status(400).json({ error: "Unsupported secondary language" });
    return;
  }
  const existing = await db
    .select({ id: userWorkspacesTable.id })
    .from(userWorkspacesTable)
    .where(eq(userWorkspacesTable.userId, userId));
  if (existing.length >= MAX_USER_WORKSPACES) {
    res.status(409).json({
      error: `You can create up to ${MAX_USER_WORKSPACES} additional dashboards (3 total).`,
    });
    return;
  }
  const id = randomUUID();
  const finalName = name || LANG_LABELS[lang] || lang;
  const [created] = await db
    .insert(userWorkspacesTable)
    .values({ id, userId, name: finalName, secondaryLanguage: lang })
    .returning();
  // Auto-switch into the new workspace.
  await db
    .insert(userSettingsTable)
    .values({ userId, currentWorkspaceId: id })
    .onConflictDoUpdate({
      target: userSettingsTable.userId,
      set: { currentWorkspaceId: id, updatedAt: new Date() },
    });
  res.status(201).json({
    id: created.id,
    name: created.name,
    secondaryLanguage: created.secondaryLanguage,
    isDefault: false,
    isCurrent: true,
  });
});

router.post("/me/workspaces/:id/switch", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = String(req.params.id);
  if (id === DEFAULT_WORKSPACE.id) {
    await db
      .insert(userSettingsTable)
      .values({ userId, currentWorkspaceId: null })
      .onConflictDoUpdate({
        target: userSettingsTable.userId,
        set: { currentWorkspaceId: null, updatedAt: new Date() },
      });
    res.json({ currentId: null });
    return;
  }
  const [ws] = await db
    .select()
    .from(userWorkspacesTable)
    .where(and(eq(userWorkspacesTable.id, id), eq(userWorkspacesTable.userId, userId)))
    .limit(1);
  if (!ws) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }
  await db
    .insert(userSettingsTable)
    .values({ userId, currentWorkspaceId: id })
    .onConflictDoUpdate({
      target: userSettingsTable.userId,
      set: { currentWorkspaceId: id, updatedAt: new Date() },
    });
  res.json({ currentId: id });
});

router.delete("/me/workspaces/:id", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const id = String(req.params.id);
  if (id === DEFAULT_WORKSPACE.id) {
    res.status(400).json({ error: "The default workspace cannot be deleted." });
    return;
  }
  // Ownership is enforced by (id, userId) match. Drop dependent rows first
  // so deletion never leaves orphaned cards/progress that the user can no
  // longer see or manage.
  const [owned] = await db
    .select({ id: userWorkspacesTable.id })
    .from(userWorkspacesTable)
    .where(and(eq(userWorkspacesTable.id, id), eq(userWorkspacesTable.userId, userId)))
    .limit(1);
  if (!owned) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  await db
    .delete(userProgressTable)
    .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.workspaceId, id)));
  await db.delete(flashcardsTable).where(eq(flashcardsTable.ownerWorkspaceId, id));
  await db
    .delete(userWorkspacesTable)
    .where(and(eq(userWorkspacesTable.id, id), eq(userWorkspacesTable.userId, userId)));
  // If user was inside this workspace, drop them back to default.
  await db
    .update(userSettingsTable)
    .set({ currentWorkspaceId: null, updatedAt: new Date() })
    .where(
      and(eq(userSettingsTable.userId, userId), eq(userSettingsTable.currentWorkspaceId, id)),
    );
  res.json({ deleted: id });
});

export default router;
