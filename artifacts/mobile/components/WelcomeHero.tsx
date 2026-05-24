import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { pickMotivationOfTheDay } from "@/lib/motivation";

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Guten Morgen";
  if (h < 17) return "Guten Tag";
  if (h < 21) return "Guten Abend";
  return "Schönen Tag";
}

export function WelcomeHero({ name }: { name?: string | null }) {
  const colors = useColors();
  const router = useRouter();
  const m = useMemo(() => pickMotivationOfTheDay(), []);
  const greet = useMemo(() => timeGreeting(), []);

  return (
    <View style={[s.card, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "55" }]}>
      <View style={s.row}>
        <Feather name="sun" size={14} color={colors.primary} />
        <Text style={[s.kicker, { color: colors.primary }]}>Motivation des Tages</Text>
      </View>

      <Text style={[s.greet, { color: colors.foreground }]}>
        {greet}{name ? `, ${name}` : ""}!
      </Text>
      <Text style={[s.sub, { color: colors.mutedForeground }]}>
        Every German word you learn brings a new world closer.
      </Text>

      <View style={[s.quoteBox, { borderLeftColor: colors.primary }]}>
        <Text style={[s.quoteDe, { color: colors.foreground }]}>&ldquo;{m.de}&rdquo;</Text>
        <Text style={[s.quoteEn, { color: colors.mutedForeground }]}>{m.en}</Text>
        <Text style={[s.quoteAr, { color: colors.mutedForeground }]} numberOfLines={2}>
          {m.ar}
        </Text>
      </View>

      <View style={s.btnRow}>
        <Pressable
          onPress={() => router.push("/(tabs)/daily")}
          style={[s.btnPrimary, { backgroundColor: colors.primary }]}
        >
          <Feather name="zap" size={14} color="#fff" />
          <Text style={s.btnPrimaryText}>Today&rsquo;s practice</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)/roadmap" as any)}
          style={[s.btnGhost, { borderColor: colors.primary }]}
        >
          <Feather name="book-open" size={14} color={colors.primary} />
          <Text style={[s.btnGhostText, { color: colors.primary }]}>What to master</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 16, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  greet: { fontSize: 22, fontWeight: "900" },
  sub: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  quoteBox: { borderLeftWidth: 4, paddingLeft: 12, marginBottom: 14 },
  quoteDe: { fontSize: 16, fontWeight: "800", fontStyle: "italic", lineHeight: 22 },
  quoteEn: { fontSize: 12, marginTop: 4 },
  quoteAr: { fontSize: 12, marginTop: 2, writingDirection: "rtl", textAlign: "right" },
  btnRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  btnPrimary: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  btnPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  btnGhost: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 2 },
  btnGhostText: { fontWeight: "800", fontSize: 13 },
});
