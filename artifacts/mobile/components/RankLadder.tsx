import React from "react";
import { View, Text, ScrollView, StyleSheet, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { RANKS, rankImageUrl, type Rank } from "@/lib/ranks";

function isUnlocked(r: Rank, knownCards: number, knownAtC1: number): boolean {
  if (knownCards < r.threshold) return false;
  if (r.requiresC1 && knownAtC1 === 0) return false;
  return true;
}

function currentTier(knownCards: number, knownAtC1: number): number {
  const eligible = RANKS.filter((r) => isUnlocked(r, knownCards, knownAtC1));
  return (eligible[eligible.length - 1] ?? RANKS[0]!).tier;
}

export function RankLadder({
  knownCards,
  knownAtC1,
}: {
  knownCards: number;
  knownAtC1: number;
}) {
  const colors = useColors();
  const curTier = currentTier(knownCards, knownAtC1);

  return (
    <View
      style={[
        s.card,
        { backgroundColor: colors.card, borderColor: colors.primary + "33" },
      ]}
    >
      <View style={s.header}>
        <Feather name="award" size={16} color={colors.primary} />
        <Text style={[s.label, { color: colors.primary }]}>YOUR JOURNEY</Text>
      </View>
      <Text style={[s.title, { color: colors.foreground }]}>
        From Tide Pool Crab to Kraken Master
      </Text>
      <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
        10 ranks. Master German vocabulary and climb the ocean.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
      >
        {RANKS.map((r) => {
          const unlocked = isUnlocked(r, knownCards, knownAtC1);
          const isCurrent = r.tier === curTier;
          return (
            <View
              key={r.slug}
              style={[
                s.tile,
                {
                  backgroundColor: isCurrent
                    ? colors.primary + "15"
                    : colors.background,
                  borderColor: isCurrent ? colors.primary : colors.border,
                  borderStyle: unlocked ? "solid" : "dashed",
                  transform: [{ scale: isCurrent ? 1.03 : 1 }],
                },
              ]}
            >
              <View style={s.imageWrap}>
                <Image
                  source={{ uri: rankImageUrl(r) }}
                  style={[s.image, !unlocked && { opacity: 0.3 }]}
                  resizeMode="contain"
                />
                {!unlocked && (
                  <View style={s.lockOverlay}>
                    <Feather
                      name="lock"
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </View>
                )}
                {isCurrent && (
                  <View style={[s.youBadge, { backgroundColor: r.accent }]}>
                    <Text style={s.youText}>YOU</Text>
                  </View>
                )}
              </View>
              <Text style={[s.tier, { color: colors.mutedForeground }]}>
                TIER {r.tier}
              </Text>
              <Text
                style={[
                  s.tileTitle,
                  { color: unlocked ? r.accent : colors.foreground },
                ]}
                numberOfLines={2}
              >
                {r.title}
              </Text>
              <Text
                style={[s.legend, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {r.legend}
              </Text>
              <Text style={[s.thresh, { color: colors.foreground }]}>
                {r.threshold === 0 ? "Start here" : `${r.threshold}+ words`}
                {r.requiresC1 ? ` · C1` : ""}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  label: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: "900", marginBottom: 2 },
  subtitle: { fontSize: 12, marginBottom: 12 },
  tile: { width: 140, borderRadius: 16, borderWidth: 2, padding: 10 },
  imageWrap: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 6,
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  lockOverlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  youBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  youText: {
    color: "white",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  tier: { fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 2 },
  tileTitle: { fontSize: 13, fontWeight: "900", lineHeight: 16, marginTop: 1 },
  legend: { fontSize: 10, fontStyle: "italic", marginTop: 1 },
  thresh: { fontSize: 11, fontWeight: "800", marginTop: 4 },
});
