import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { ROADMAP, STUDY_HABITS } from "@/lib/roadmap";

const LEVEL_COLOR: Record<string, string> = {
  A1: "#22c55e", A2: "#14b8a6", B1: "#3b82f6", B2: "#a855f7", C1: "#e11d48",
};

export default function RoadmapScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === "web" ? 24 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop, paddingBottom, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[s.kickerPill, { backgroundColor: colors.primary + "15" }]}>
        <Feather name="award" size={12} color={colors.primary} />
        <Text style={[s.kicker, { color: colors.primary }]}>Learning Roadmap</Text>
      </View>
      <Text style={[s.h1, { color: colors.foreground }]}>What you need to master</Text>
      <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
        A clear path from absolute beginner to advanced. Each CEFR level shows what you
        should be able to do, the grammar to master, and a realistic vocab goal.
      </Text>

      {ROADMAP.map((lv) => {
        const color = LEVEL_COLOR[lv.level] ?? colors.primary;
        return (
          <View key={lv.level} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.bar, { backgroundColor: color }]} />
            <View style={s.cardBody}>
              <View style={s.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={s.row}>
                    <View style={[s.levelBadge, { borderColor: color }]}>
                      <Text style={[s.levelBadgeText, { color }]}>{lv.level}</Text>
                    </View>
                    <Text style={[s.cardTitle, { color: colors.foreground }]}>{lv.title}</Text>
                  </View>
                  <Text style={[s.cardDesc, { color: colors.mutedForeground }]}>{lv.description}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[s.vocab, { color }]}>{lv.vocabGoal.toLocaleString()}</Text>
                  <Text style={[s.vocabLabel, { color: colors.mutedForeground }]}>WORDS</Text>
                  <Text style={[s.vocabLabel, { color: colors.mutedForeground }]}>≈ {lv.hoursEstimate}</Text>
                </View>
              </View>

              <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>YOU CAN…</Text>
              {lv.canDo.map((c) => (
                <View key={c} style={s.bulletRow}>
                  <View style={[s.dot, { backgroundColor: color }]} />
                  <Text style={[s.bulletText, { color: colors.foreground }]}>{c}</Text>
                </View>
              ))}

              <Text style={[s.sectionLabel, { color: colors.mutedForeground, marginTop: 12 }]}>GRAMMAR TO MASTER</Text>
              {lv.grammar.map((g) => (
                <View key={g} style={s.bulletRow}>
                  <View style={[s.dot, { backgroundColor: color }]} />
                  <Text style={[s.bulletText, { color: colors.foreground }]}>{g}</Text>
                </View>
              ))}

              <Text style={[s.sectionLabel, { color: colors.mutedForeground, marginTop: 12 }]}>VOCABULARY THEMES</Text>
              <View style={s.chipsWrap}>
                {lv.topics.map((t) => (
                  <View key={t} style={[s.topicChip, { borderColor: color + "55", backgroundColor: color + "10" }]}>
                    <Text style={[s.topicChipText, { color }]}>{t}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => router.push(`/study/${lv.level}` as any)}
                style={[s.btn, { borderColor: colors.border }]}
              >
                <Text style={[s.btnText, { color: colors.foreground }]}>Study {lv.level} cards →</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Text style={[s.h2, { color: colors.foreground, marginTop: 24 }]}>Habits that actually work</Text>
      {STUDY_HABITS.map((h) => (
        <View key={h.title} style={[s.habitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.habitIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name={h.icon} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.habitTitle, { color: colors.foreground }]}>{h.title}</Text>
            <Text style={[s.habitDesc, { color: colors.mutedForeground }]}>{h.desc}</Text>
          </View>
        </View>
      ))}

      <View style={[s.cta, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "40" }]}>
        <Text style={[s.ctaTitle, { color: colors.foreground }]}>Ready to start?</Text>
        <Text style={[s.ctaDesc, { color: colors.mutedForeground }]}>
          Pick today&rsquo;s practice or take a placement quiz to see where you stand.
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <Pressable onPress={() => router.push("/(tabs)/daily")} style={[s.btnPrimary, { backgroundColor: colors.primary }]}>
            <Text style={s.btnPrimaryText}>Daily Practice</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/quiz")} style={[s.btnGhost, { borderColor: colors.primary }]}>
            <Text style={[s.btnGhostText, { color: colors.primary }]}>Placement Quiz</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  kickerPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: "flex-start", marginBottom: 8 },
  kicker: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  h1: { fontSize: 28, fontWeight: "900", marginBottom: 8 },
  h2: { fontSize: 20, fontWeight: "800", marginBottom: 12 },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 20 },
  card: { borderRadius: 18, borderWidth: 1, marginBottom: 14, overflow: "hidden" },
  bar: { height: 5, width: "100%" },
  cardBody: { padding: 16 },
  cardHeaderRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  levelBadge: { borderWidth: 2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  levelBadgeText: { fontSize: 14, fontWeight: "900" },
  cardTitle: { fontSize: 16, fontWeight: "800", flexShrink: 1 },
  cardDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  vocab: { fontSize: 22, fontWeight: "900" },
  vocabLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 6 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletText: { fontSize: 13, lineHeight: 18, flex: 1 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  topicChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  topicChipText: { fontSize: 11, fontWeight: "700" },
  btn: { paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center", marginTop: 6 },
  btnText: { fontSize: 13, fontWeight: "700" },
  habitCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  habitIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  habitTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  habitDesc: { fontSize: 12, lineHeight: 17 },
  cta: { borderRadius: 18, borderWidth: 1, padding: 20, marginTop: 16, alignItems: "center" },
  ctaTitle: { fontSize: 20, fontWeight: "900", marginBottom: 4 },
  ctaDesc: { fontSize: 13, textAlign: "center" },
  btnPrimary: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
  btnGhost: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, borderWidth: 2 },
  btnGhostText: { fontWeight: "800" },
});
