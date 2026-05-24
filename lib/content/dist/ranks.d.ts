export interface Rank {
    tier: number;
    slug: string;
    title: string;
    legend: string;
    blurb: string;
    threshold: number;
    image: string;
    accent: string;
    requiresC1?: boolean;
}
export declare const RANKS: Rank[];
export interface RankProgress {
    current: Rank;
    next: Rank | null;
    knownCards: number;
    toNext: number;
    progressPct: number;
    nextBlockedBy: "c1" | null;
}
/**
 * Compute the current rank from total known cards. The top rank
 * additionally requires at least one C1 card to be known so a student
 * can't "Master" by drilling A1 alone.
 *
 * When the next rank's card threshold is met but a non-card requirement
 * (e.g. C1) is unmet, `progressPct` caps at 99 and `nextBlockedBy`
 * reports which requirement is still pending — so the UI never claims
 * the user is "100% ready" while still being gated.
 */
export declare function computeRank(knownCards: number, knownAtC1: number): RankProgress;
//# sourceMappingURL=ranks.d.ts.map