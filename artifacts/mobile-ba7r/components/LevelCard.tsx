import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

type LevelStats = {
  level: string;
  total: number;
  known: number;
  unknown: number;
  percentage: number;
};

type Props = {
  stats: LevelStats;
  onPress: () => void;
};

function getLevelColor(level: string): string {
  switch (level) {
    case "A1": return colors.light.levelA1;
    case "A2": return colors.light.levelA2;
    case "B1": return colors.light.levelB1;
    case "B2": return colors.light.levelB2;
    case "C1": return colors.light.levelC1;
    default: return colors.light.primary;
  }
}

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  A1: "Absolute Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper Intermediate",
  C1: "Advanced",
};

export function LevelCard({ stats, onPress }: Props) {
  const appColors = useColors();
  const levelColor = getLevelColor(stats.level);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: appColors.card, borderColor: appColors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`card-level-${stats.level}`}
    >
      <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
        <Text style={styles.levelText}>{stats.level}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.description, { color: appColors.mutedForeground }]}>
          {LEVEL_DESCRIPTIONS[stats.level] ?? stats.level}
        </Text>
        <Text style={[styles.count, { color: appColors.foreground }]}>
          {stats.known}/{stats.total} known
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBg, { backgroundColor: appColors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: levelColor, width: `${stats.percentage}%` as any },
            ]}
          />
        </View>
        <Text style={[styles.percentage, { color: levelColor }]}>{stats.percentage}%</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  info: { flex: 1 },
  description: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
  count: { fontSize: 15, fontWeight: "600" },
  progressContainer: { alignItems: "flex-end", gap: 4 },
  progressBg: { width: 60, height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  percentage: { fontSize: 12, fontWeight: "700" },
});
