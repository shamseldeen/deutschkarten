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
    threshold: 25,
    image: "2-clownfish-cadet.png",
    accent: "#fb923c",
  },
  {
    tier: 3,
    slug: "seahorse-apprentice",
    title: "Seahorse Apprentice",
    legend: "of the Phoenician charts",
    blurb: "Steady currents, steady study.",
    threshold: 75,
    image: "3b-seahorse-apprentice.png",
    accent: "#14b8a6",
  },
  {
    tier: 4,
    slug: "sea-turtle-voyager",
    title: "Sea Turtle Voyager",
    legend: "with Ibn Battuta's maps",
    blurb: "A long journey is just many small ones.",
    threshold: 150,
    image: "3-sea-turtle-voyager.png",
    accent: "#10b981",
  },
  {
    tier: 5,
    slug: "dolphin-navigator",
    title: "Dolphin Navigator",
    legend: "in da Gama's fleet",
    blurb: "Quick, clever, and rarely lost.",
    threshold: 300,
    image: "4-dolphin-navigator.png",
    accent: "#06b6d4",
  },
  {
    tier: 6,
    slug: "octopus-scholar",
    title: "Octopus Scholar",
    legend: "like Hypatia of Alexandria",
    blurb: "Eight tentacles, eight grammar books.",
    threshold: 600,
    image: "5b-octopus-scholar.png",
    accent: "#a855f7",
  },
  {
    tier: 7,
    slug: "shark-captain",
    title: "Shark Captain",
    legend: "of Magellan's crossing",
    blurb: "You hunt der/die/das in your sleep.",
    threshold: 1000,
    image: "5-shark-captain.png",
    accent: "#0ea5e9",
  },
  {
    tier: 8,
    slug: "manta-ray-admiral",
    title: "Manta Ray Admiral",
    legend: "commanding Zheng He's fleet",
    blurb: "Whole sentences fly under your wings.",
    threshold: 1750,
    image: "6b-manta-ray-admiral.png",
    accent: "#3b82f6",
  },
  {
    tier: 9,
    slug: "whale-sage",
    title: "Whale Sage",
    legend: "with Odysseus' patience",
    blurb: "You speak in long, calm currents.",
    threshold: 2750,
    image: "6-whale-sage.png",
    accent: "#6366f1",
  },
  {
    tier: 10,
    slug: "kraken-master",
    title: "Kraken Master",
    legend: "crowned by Poseidon",
    blurb: "C1 mastered, 4000+ words conquered.",
    threshold: 4000,
    image: "7-kraken-master.png",
    accent: "#9333ea",
    requiresC1: true,
  },
];

export interface RankProgress {
  current: Rank;
  next: Rank | null;
  knownCards: number;
  toNext: number; // cards needed to reach the next tier (0 if at top or threshold met)
  progressPct: number; // 0–100 progress toward the next tier
  nextBlockedBy: "c1" | null; // a non-card requirement still blocking the next rank, if any
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
export function computeRank(
  knownCards: number,
  knownAtC1: number,
): RankProgress {
  const meetsExtras = (r: Rank) => !r.requiresC1 || knownAtC1 > 0;
  const eligible = RANKS.filter(
    (r) => knownCards >= r.threshold && meetsExtras(r),
  );
  const current = eligible[eligible.length - 1] ?? RANKS[0]!;
  const next = RANKS[current.tier] ?? null; // tier is 1-indexed, so RANKS[tier] is the next one

  if (!next) {
    return {
      current,
      next,
      knownCards,
      toNext: 0,
      progressPct: 100,
      nextBlockedBy: null,
    };
  }

  const span = next.threshold - current.threshold;
  const done = knownCards - current.threshold;
  const rawPct = span > 0 ? Math.round((done / span) * 100) : 100;
  let progressPct = Math.max(0, Math.min(100, rawPct));
  const toNext = Math.max(0, next.threshold - knownCards);

  let nextBlockedBy: "c1" | null = null;
  if (next.requiresC1 && knownAtC1 === 0) {
    nextBlockedBy = "c1";
    // Cap so the UI never displays "100% — ready" while the C1 gate is unmet.
    if (progressPct >= 100) progressPct = 99;
  }

  return { current, next, knownCards, toNext, progressPct, nextBlockedBy };
}
