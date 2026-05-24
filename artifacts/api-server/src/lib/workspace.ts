import {
  db,
  flashcardsTable,
  userProgressTable,
  userSettingsTable,
  userWorkspacesTable,
} from "@workspace/db";
import { and, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import { randomUUID } from "crypto";

export const SUPPORTED_SECONDARY_LANGS = ["EN", "ES", "FR", "IT", "TR"] as const;
export type SupportedSecondaryLang = (typeof SUPPORTED_SECONDARY_LANGS)[number];

export const MAX_USER_WORKSPACES = 2;

export const DEFAULT_WORKSPACE = {
  id: "default" as const,
  name: "Arabic" as const,
  secondaryLanguage: "AR" as const,
  isDefault: true as const,
};

export const LANG_LABELS: Record<string, string> = {
  AR: "Arabic",
  EN: "English",
  ES: "Spanish",
  FR: "French",
  IT: "Italian",
  TR: "Turkish",
};

/**
 * Returns the currently-active workspace id for the user, or null when the
 * user is in their default (virtual) Arabic workspace. Falls back to null
 * when the workspace was deleted out from under them.
 */
export async function getCurrentWorkspaceId(userId: string): Promise<string | null> {
  const [settings] = await db
    .select({ currentWorkspaceId: userSettingsTable.currentWorkspaceId })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1);
  const id = settings?.currentWorkspaceId ?? null;
  if (!id) return null;
  // Defense in depth: only honor the stored workspace id when it both
  // exists AND is owned by the calling user. Prevents cross-user data
  // bleed if user_settings ever gets a foreign workspace id written into
  // it (data corruption, future bug, admin script gone wrong).
  const [owned] = await db
    .select({ id: userWorkspacesTable.id })
    .from(userWorkspacesTable)
    .where(and(
      eq(userWorkspacesTable.id, id),
      eq(userWorkspacesTable.userId, userId),
    ))
    .limit(1);
  return owned ? id : null;
}

/**
 * SQL predicate restricting flashcards to those visible in the given workspace.
 * - Default workspace (null): only global cards (owner_workspace_id IS NULL).
 * - User workspace: global cards OR cards owned by this workspace.
 */
export function workspaceVisibility(currentWsId: string | null): SQL | undefined {
  if (currentWsId === null) return isNull(flashcardsTable.ownerWorkspaceId);
  return or(
    isNull(flashcardsTable.ownerWorkspaceId),
    eq(flashcardsTable.ownerWorkspaceId, currentWsId),
  );
}

/**
 * Returns true if the card is visible in the given workspace (i.e. global
 * cards or cards owned by that workspace). Used to gate per-card mutations
 * so users in workspace A cannot read/write cards private to workspace B.
 */
export async function cardVisibleInWorkspace(
  flashcardId: number,
  currentWsId: string | null,
): Promise<boolean> {
  const pred = workspaceVisibility(currentWsId);
  const [row] = await db
    .select({ id: flashcardsTable.id })
    .from(flashcardsTable)
    .where(pred ? and(eq(flashcardsTable.id, flashcardId), pred) : eq(flashcardsTable.id, flashcardId))
    .limit(1);
  return !!row;
}

/**
 * Upsert a (user, workspace, flashcard) progress row. Postgres treats NULL
 * as distinct in unique indexes, so for default-workspace rows we route
 * through a partial unique index on `(user_id, flashcard_id) WHERE
 * workspace_id IS NULL` to keep dedup correct.
 */
export async function upsertProgress(args: {
  userId: string;
  workspaceId: string | null;
  flashcardId: number;
  known: boolean;
}) {
  const { userId, workspaceId, flashcardId, known } = args;
  const base = {
    id: randomUUID(),
    userId,
    workspaceId,
    flashcardId,
    known: known ? 1 : 0,
    timesReviewed: 1,
    lastReviewedAt: new Date(),
  };
  const setClause = {
    known: known ? 1 : 0,
    timesReviewed: sql`${userProgressTable.timesReviewed} + 1`,
    lastReviewedAt: new Date(),
  };
  if (workspaceId === null) {
    await db
      .insert(userProgressTable)
      .values(base)
      .onConflictDoUpdate({
        target: [userProgressTable.userId, userProgressTable.flashcardId],
        targetWhere: sql`${userProgressTable.workspaceId} IS NULL`,
        set: setClause,
      });
  } else {
    await db
      .insert(userProgressTable)
      .values(base)
      .onConflictDoUpdate({
        target: [
          userProgressTable.userId,
          userProgressTable.workspaceId,
          userProgressTable.flashcardId,
        ],
        targetWhere: sql`${userProgressTable.workspaceId} IS NOT NULL`,
        set: setClause,
      });
  }
}

export async function getWorkspaceSecondaryLang(
  userId: string,
  workspaceId: string | null,
): Promise<string> {
  if (!workspaceId) return "AR";
  const [ws] = await db
    .select({
      secondaryLanguage: userWorkspacesTable.secondaryLanguage,
      userId: userWorkspacesTable.userId,
    })
    .from(userWorkspacesTable)
    .where(eq(userWorkspacesTable.id, workspaceId))
    .limit(1);
  if (!ws || ws.userId !== userId) return "AR";
  return ws.secondaryLanguage;
}
