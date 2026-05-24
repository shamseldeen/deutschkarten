import { Card } from "@/components/ui/card";
import { Trophy, Lock } from "lucide-react";
import { RANKS, rankImageUrl, type Rank } from "@/lib/ranks";
import { cn } from "@/lib/utils";

interface Props {
  knownCards: number;
  knownAtC1: number;
}

function isUnlocked(r: Rank, knownCards: number, knownAtC1: number): boolean {
  if (knownCards < r.threshold) return false;
  if (r.requiresC1 && knownAtC1 === 0) return false;
  return true;
}

function currentTier(knownCards: number, knownAtC1: number): number {
  const eligible = RANKS.filter((r) => isUnlocked(r, knownCards, knownAtC1));
  return (eligible[eligible.length - 1] ?? RANKS[0]!).tier;
}

export function RankLadder({ knownCards, knownAtC1 }: Props) {
  const curTier = currentTier(knownCards, knownAtC1);

  return (
    <Card className="p-5 md:p-6 bg-gradient-to-br from-card to-primary/5 border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-bold uppercase tracking-wider">
            <Trophy className="w-4 h-4" /> Your Journey
          </div>
          <h3 className="text-xl md:text-2xl font-black font-serif mt-1">
            From Tide Pool Crab to Kraken Master
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            10 ranks. Master German vocabulary and climb the ocean.
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x">
        {RANKS.map((r) => {
          const unlocked = isUnlocked(r, knownCards, knownAtC1);
          const isCurrent = r.tier === curTier;
          return (
            <div
              key={r.slug}
              className={cn(
                "snap-start shrink-0 w-36 md:w-40 rounded-2xl border-2 p-3 transition-all",
                isCurrent
                  ? "border-primary bg-primary/10 shadow-lg scale-[1.03]"
                  : unlocked
                    ? "border-border bg-card"
                    : "border-dashed border-border/60 bg-muted/30",
              )}
              style={isCurrent ? { boxShadow: `0 6px 24px ${r.accent}33` } : undefined}
            >
              <div className="relative aspect-square mb-2 rounded-xl overflow-hidden bg-gradient-to-br from-background to-muted">
                <img
                  src={rankImageUrl(r)}
                  alt={r.title}
                  className={cn(
                    "w-full h-full object-contain p-1",
                    !unlocked && "opacity-30 grayscale",
                  )}
                  loading="lazy"
                />
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                {isCurrent && (
                  <div
                    className="absolute top-1 right-1 text-[10px] font-black px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: r.accent }}
                  >
                    YOU
                  </div>
                )}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Tier {r.tier}
              </div>
              <div className="text-sm font-black leading-tight" style={{ color: unlocked ? r.accent : undefined }}>
                {r.title}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 italic line-clamp-1">
                {r.legend}
              </div>
              <div className="text-[11px] font-bold mt-1.5 text-foreground/80">
                {r.threshold === 0 ? "Start here" : `${r.threshold}+ words`}
                {r.requiresC1 && <span className="ml-1 text-primary">· C1</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
