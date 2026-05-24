import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { LevelCard } from "@/components/LevelCard";
import { DonationCard } from "@/components/DonationCard";
import { useFlashcardStats, useDailyFlashcards } from "@/lib/hooks";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: stats, isLoading: statsLoading } = useFlashcardStats();
  const { data: daily } = useDailyFlashcards();

  const totalKnown = stats?.reduce((s, l) => s + l.known, 0) ?? 0;
  const totalCards = stats?.reduce((s, l) => s + l.total, 0) ?? 0;
  const overallPct = totalCards > 0 ? Math.round((totalKnown / totalCards) * 100) : 0;

  const paddingTop = Platform.OS === "web" ? 67 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop, paddingBottom, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.appTitle, { color: colors.primary }]}>DeutschKarten</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Your German vocabulary companion
      </Text>

      <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.progressTitle}>Overall Progress</Text>
        <Text style={styles.progressStat}>
          {totalKnown} / {totalCards} words
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${overallPct}%` as any }]} />
        </View>
        <Text style={styles.progressPct}>{overallPct}% mastered</Text>
      </View>

      {(daily?.length ?? 0) > 0 && (
        <TouchableOpacity
          style={[styles.dailyCta, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/daily")}
          testID="button-daily-practice"
        >
          <Text style={[styles.dailyCtaTitle, { color: colors.foreground }]}>
            Daily Practice Ready
          </Text>
          <Text style={[styles.dailyCtaCount, { color: colors.mutedForeground }]}>
            {daily?.length} cards waiting for review
          </Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Study by Level</Text>

      {statsLoading
        ? LEVELS.map((lvl) => (
            <View
              key={lvl}
              style={[styles.skeletonCard, { backgroundColor: colors.muted }]}
            />
          ))
        : LEVELS.map((lvl) => {
            const s = stats?.find((x) => x.level === lvl) ?? {
              level: lvl,
              total: 0,
              known: 0,
              unknown: 0,
              percentage: 0,
            };
            return (
              <LevelCard
                key={lvl}
                stats={s}
                onPress={() => router.push(`/study/${lvl}` as any)}
              />
            );
          })}

      <View style={{ height: 20 }} />
      <DonationCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appTitle: { fontSize: 32, fontWeight: "900", marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  progressCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  progressTitle: { color: "#fff", fontSize: 13, fontWeight: "600", opacity: 0.85, marginBottom: 4 },
  progressStat: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 12 },
  progressBarBg: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: { height: "100%", backgroundColor: "#fff", borderRadius: 4 },
  progressPct: { color: "#fff", fontSize: 13, opacity: 0.85 },
  dailyCta: { borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 24 },
  dailyCtaTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  dailyCtaCount: { fontSize: 13 },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 12 },
  skeletonCard: { height: 72, borderRadius: 16, marginBottom: 12 },
});
