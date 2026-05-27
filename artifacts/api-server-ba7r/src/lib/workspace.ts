import {
  db,
  flashcardsTable,
  userProgressTable,
  userSettingsTable,
  userWorkspacesTable,
  usersTable,
} from "@workspace/db";
import { and, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import { randomUUID } from "crypto";
import { computeCardPoints } from "@workspace/content";

export const SUPPORTED_SECONDARY_LANGS = [
  "EN",
  "ES",
  "FR",
  "IT",
  "TR",
] as const;
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

export async function getCurrentWorkspaceId(
  userId: string,
): Promise<string | null> {
  const [settings] = await db
    .select({ currentWorkspaceId: userSettingsTable.currentWorkspaceId })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1);
  const id = settings?.currentWorkspaceId ?? null;
  if (!id) return null;
  const [owned] = await db
    .select({ id: userWorkspacesTable.id })
    .from(userWorkspacesTable)
    .where(
      and(
        eq(userWorkspacesTable.id, id),
        eq(userWorkspacesTable.userId, userId),
      ),
    )
    .limit(1);
  return owned ? id : null;
}

export function workspaceVisibility(
  currentWsId: string | null,
): SQL | undefined {
  if (currentWsId === null) return isNull(flashcardsTable.ownerWorkspaceId);
  return or(
    isNull(flashcardsTable.ownerWorkspaceId),
    eq(flashcardsTable.ownerWorkspaceId, currentWsId),
  );
}

export async function cardVisibleInWorkspace(
  flashcardId: number,
  currentWsId: string | null,
): Promise<boolean> {
  const pred = workspaceVisibility(currentWsId);
  const [row] = await db
    .select({ id: flashcardsTable.id })
    .from(flashcardsTable)
    .where(
      pred
        ? and(eq(flashcardsTable.id, flashcardId), pred)
        : eq(flashcardsTable.id, flashcardId),
    )
    .limit(1);
  return !!row;
}

/**
 * Upsert a (user, workspace, flashcard) progress row.
 * Awards XP on "Got it" using: CEFR_weight × streak_multiplier × difficulty_bonus
 */
export async function upsertProgress(args: {
  userId: string;
  workspaceId: string | null;
  flashcardId: number;
  known: boolean;
  cardLevel?: string;
  currentStreak?: number;
}) {
  const { userId, workspaceId, flashcardId, known, cardLevel, currentStreak } = args;

  const existingRow = workspaceId === null
    ? await db
        .select({ wrongCount: userProgressTable.wrongCount, timesReviewed: userProgressTable.timesReviewed })
        .from(userProgressTable)
        .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.flashcardId, flashcardId), isNull(userProgressTable.workspaceId)))
        .limit(1)
        .then((r) => r[0])
    : await db
        .select({ wrongCount: userProgressTable.wrongCount, timesReviewed: userProgressTable.timesReviewed })
        .from(userProgressTable)
        .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.flashcardId, flashcardId), eq(userProgressTable.workspaceId, workspaceId)))
        .limit(1)
        .then((r) => r[0]);

  const existingWrongCount = existingRow?.wrongCount ?? 0;
  const existingTimesReviewed = existingRow?.timesReviewed ?? 0;

  const base = {
    id: randomUUID(),
    userId,
    workspaceId,
    flashcardId,
    known: known ? 1 : 0,
    wrongCount: known ? existingWrongCount : existingWrongCount + 1,
    timesReviewed: 1,
    lastReviewedAt: new Date(),
  };

  const setClause = {
    known: known ? 1 : 0,
    wrongCount: known
      ? existingWrongCount
      : sql`${userProgressTable.wrongCount} + 1`,
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

  if (known && cardLevel) {
    const pts = computeCardPoints({
      level: cardLevel,
      currentStreak: currentStreak ?? 0,
      wrongCount: existingWrongCount,
      timesReviewed: existingTimesReviewed,
    });
    await db
      .update(usersTable)
      .set({ totalPoints: sql`${usersTable.totalPoints} + ${pts}`, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));
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
