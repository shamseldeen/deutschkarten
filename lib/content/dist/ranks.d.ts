export interface Rank {
    tier: number;
    slug: string;
    title: string;
    legend: string;
    blurb: string;
    /** Points threshold (advanced formula: CEFR × streak × difficulty). */
    threshold: number;
    image: string;
    accent: string;
    requiresC1?: boolean;
}
export declare const RANKS: Rank[];
export interface RankProgress {
    current: Rank;
    next: Rank | null;
    /** Total XP points (advanced formula). */
    totalPoints: number;
    toNext: number;
    progressPct: number;
    nextBlockedBy: "c1" | null;
    /** Legacy: kept for back-compat with stats that track knownCards. */
    knownCards: number;
}
/**
 * CEFR level → base point weight.
 * A1 words are worth 1 pt, C1 words are worth 5 pts before multipliers.
 */
export declare const CEFR_WEIGHT: Record<string, number>;
/**
 * Compute XP earned for a single "Got it" event.
 *
 * Formula:
 *   points = CEFR_weight × streak_multiplier × difficulty_bonus
 *
 *   CEFR_weight      A1=1, A2=2, B1=3, B2=4, C1=5
 *   streak_multiplier  1 + min(currentStreak, 20) × 0.05   (caps at 2.0 at day 20)
 *   difficulty_bonus   1 + wrongCount / max(timesReviewed, 1)
 *                      (rewarded for mastering hard cards)
 *
 * Returns a rounded integer ≥ 1.
 */
export declare function computeCardPoints({ level, currentStreak, wrongCount, timesReviewed, }: {
    level: string;
    currentStreak: number;
    wrongCount: number;
    timesReviewed: number;
}): number;
/**
 * Compute the current rank from total XP points. The top rank additionally
 * requires at least one C1 card to be known.
 *
 * When the next rank's threshold is met but a non-point requirement (C1) is
 * unmet, progressPct caps at 99 and nextBlockedBy reports "c1".
 */
export declare function computeRank(totalPoints: number, knownAtC1: number, knownCards?: number): RankProgress;
//# sourceMappingURL=ranks.d.ts.map