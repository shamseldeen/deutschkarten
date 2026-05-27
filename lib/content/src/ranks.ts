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

export const RANKS: Rank[] = [
  {
    tier: 1,
    slug: "tide-pool-crab",
    title: "Tide Pool Crab",
    legend: "the curious beginner",
    blurb: "Your first words wash ashore.",
    threshold: 0,
    image: "1-tide-pool-crab.png",
    accent: "#f59e0b",
  },
  {
    tier: 2,
    slug: "clownfish-cadet",
    title: "Clownfish Cadet",
    legend: "in Marco Polo's wake",
    blurb: "Bright stripes, brave heart.",
    threshold: 50,
    image: "2-clownfish-cadet.png",
    accent: "#fb923c",
  },
  {
    tier: 3,
    slug: "seahorse-apprentice",
    title: "Seahorse Apprentice",
    legend: "of the Phoenician charts",
    blurb: "Steady currents, steady study.",
    threshold: 150,
    image: "3b-seahorse-apprentice.png",
    accent: "#14b8a6",
  },
  {
    tier: 4,
    slug: "sea-turtle-voyager",
    title: "Sea Turtle Voyager",
    legend: "with Ibn Battuta's maps",
    blurb: "A long journey is just many small ones.",
    threshold: 350,
    image: "3-sea-turtle-voyager.png",
    accent: "#10b981",
  },
  {
    tier: 5,
    slug: "dolphin-navigator",
    title: "Dolphin Navigator",
    legend: "in da Gama's fleet",
    blurb: "Quick, clever, and rarely lost.",
    threshold: 750,
    image: "4-dolphin-navigator.png",
    accent: "#06b6d4",
  },
  {
    tier: 6,
    slug: "octopus-scholar",
    title: "Octopus Scholar",
    legend: "like Hypatia of Alexandria",
    blurb: "Eight tentacles, eight grammar books.",
    threshold: 1500,
    image: "5b-octopus-scholar.png",
    accent: "#a855f7",
  },
  {
    tier: 7,
    slug: "shark-captain",
    title: "Shark Captain",
    legend: "of Magellan's crossing",
    blurb: "You hunt der/die/das in your sleep.",
    threshold: 3000,
    image: "5-shark-captain.png",
    accent: "#0ea5e9",
  },
  {
    tier: 8,
    slug: "manta-ray-admiral",
    title: "Manta Ray Admiral",
    legend: "commanding Zheng He's fleet",
    blurb: "Whole sentences fly under your wings.",
    threshold: 6000,
    image: "6b-manta-ray-admiral.png",
    accent: "#3b82f6",
  },
  {
    tier: 9,
    slug: "whale-sage",
    title: "Whale Sage",
    legend: "with Odysseus' patience",
    blurb: "You speak in long, calm currents.",
    threshold: 12000,
    image: "6-whale-sage.png",
    accent: "#6366f1",
  },
  {
    tier: 10,
    slug: "kraken-master",
    title: "Kraken Master",
    legend: "crowned by Poseidon",
    blurb: "C1 mastered, the ocean bows.",
    threshold: 25000,
    image: "7-kraken-master.png",
    accent: "#9333ea",
    requiresC1: true,
  },
];

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
export const CEFR_WEIGHT: Record<string, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
};

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
export function computeCardPoints({
  level,
  currentStreak,
  wrongCount,
  timesReviewed,
}: {
  level: string;
  currentStreak: number;
  wrongCount: number;
  timesReviewed: number;
}): number {
  const cefrWeight = CEFR_WEIGHT[level] ?? 1;
  const streakMultiplier = 1 + Math.min(currentStreak, 20) * 0.05;
  const difficultyBonus = 1 + wrongCount / Math.max(timesReviewed, 1);
  const raw = cefrWeight * streakMultiplier * difficultyBonus;
  return Math.max(1, Math.round(raw));
}

/**
 * Compute the current rank from total XP points. The top rank additionally
 * requires at least one C1 card to be known.
 *
 * When the next rank's threshold is met but a non-point requirement (C1) is
 * unmet, progressPct caps at 99 and nextBlockedBy reports "c1".
 */
export function computeRank(
  totalPoints: number,
  knownAtC1: number,
  knownCards = 0,
): RankProgress {
  const meetsExtras = (r: Rank) => !r.requiresC1 || knownAtC1 > 0;
  const eligible = RANKS.filter(
    (r) => totalPoints >= r.threshold && meetsExtras(r),
  );
  const current = eligible[eligible.length - 1] ?? RANKS[0]!;
  const next = RANKS[current.tier] ?? null;

  if (!next) {
    return {
      current,
      next,
      totalPoints,
      knownCards,
      toNext: 0,
      progressPct: 100,
      nextBlockedBy: null,
    };
  }

  const span = next.threshold - current.threshold;
  const done = totalPoints - current.threshold;
  const rawPct = span > 0 ? Math.round((done / span) * 100) : 100;
  let progressPct = Math.max(0, Math.min(100, rawPct));
  const toNext = Math.max(0, next.threshold - totalPoints);

  let nextBlockedBy: "c1" | null = null;
  if (next.requiresC1 && knownAtC1 === 0) {
    nextBlockedBy = "c1";
    if (progressPct >= 100) progressPct = 99;
  }

  return {
    current,
    next,
    totalPoints,
    knownCards,
    toNext,
    progressPct,
    nextBlockedBy,
  };
}
