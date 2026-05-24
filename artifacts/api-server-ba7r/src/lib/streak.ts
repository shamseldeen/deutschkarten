import { db, userStreaksTable } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Atomically bump a user's streak in a single SQL statement.
 *
 * Rules:
 * - Same day → no change.
 * - lastActiveDate was yesterday → current_streak += 1.
 * - Otherwise → current_streak resets to 1.
 * longest_streak = greatest(longest_streak, new current_streak).
 *
 * Implemented as INSERT ... ON CONFLICT DO UPDATE so concurrent calls cannot
 * interleave a stale read with a write.
 */
export async function bumpStreak(userId: string): Promise<void> {
  await db
    .insert(userStreaksTable)
    .values({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: sql`CURRENT_DATE`,
    })
    .onConflictDoUpdate({
      target: userStreaksTable.userId,
      set: {
        currentStreak: sql`CASE
          WHEN ${userStreaksTable.lastActiveDate} = CURRENT_DATE THEN ${userStreaksTable.currentStreak}
          WHEN ${userStreaksTable.lastActiveDate} = CURRENT_DATE - INTERVAL '1 day' THEN ${userStreaksTable.currentStreak} + 1
          ELSE 1
        END`,
        longestStreak: sql`GREATEST(${userStreaksTable.longestStreak}, CASE
          WHEN ${userStreaksTable.lastActiveDate} = CURRENT_DATE THEN ${userStreaksTable.currentStreak}
          WHEN ${userStreaksTable.lastActiveDate} = CURRENT_DATE - INTERVAL '1 day' THEN ${userStreaksTable.currentStreak} + 1
          ELSE 1
        END)`,
        lastActiveDate: sql`CURRENT_DATE`,
        updatedAt: new Date(),
      },
    });
}
