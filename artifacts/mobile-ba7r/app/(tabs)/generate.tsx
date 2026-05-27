import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGenerateFlashcards } from "@/lib/hooks";
import type { Level } from "@/lib/api";
import colors from "@/constants/colors";
import { api, apiFetch } from "@/lib/api";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const CATEGORIES = [
  "general",
  "animals",
  "food",
  "travel",
  "work",
  "family",
  "nature",
  "verbs",
  "adjectives",
];
const COUNTS = [5, 10, 15, 20];

interface LimitStatus {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

function getLevelColor(level: string): string {
  switch (level) {
    case "A1":
      return colors.light.levelA1;
    case "A2":
      return colors.light.levelA2;
    case "B1":
      return colors.light.levelB1;
    case "B2":
      return colors.light.levelB2;
    case "C1":
      return colors.light.levelC1;
    default:
      return colors.light.primary;
  }
}

function useCountdown(resetsAt: string | null) {
  const [label, setLabel] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!resetsAt) {
      setLabel("");
      return;
    }
    const tick = () => {
      const diff = new Date(resetsAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(
        `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`,
      );
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetsAt]);
  return label;
}

export default function GenerateScreen() {
  const appColors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedLevel, setSelectedLevel] = useState<Level>("A1");
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [selectedCount, setSelectedCount] = useState(10);
  const [success, setSuccess] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [limitStatus, setLimitStatus] = useState<LimitStatus | null>(null);
  const [blockedResetsAt, setBlockedResetsAt] = useState<string | null>(null);
  const countdown = useCountdown(blockedResetsAt);
  const generate = useGenerateFlashcards();

  const fetchStatus = useCallback(() => {
    apiFetch(`/ba7r-api/flashcards/generate/status`)
      .then((r) => r.json())
      .then((data: LimitStatus) => {
        setLimitStatus(data);
        if (data.remaining === 0) setBlockedResetsAt(data.resetsAt);
        else setBlockedResetsAt(null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleGenerate = () => {
    setSuccess(false);
    setErrorDetail(null);
    generate.mutate(
      {
        level: selectedLevel,
        category: selectedCategory,
        count: selectedCount,
      },
      {
        onSuccess: () => {
          setSuccess(true);
          fetchStatus();
        },
        onError: (err: any) => {
          const status = err?.status ?? err?.response?.status;
          const body = err?.data ?? err?.body ?? err?.response?.data ?? {};
          if (status === 429 || body?.resetsAt) {
            setBlockedResetsAt(body.resetsAt ?? null);
            setLimitStatus((prev) => (prev ? { ...prev, remaining: 0 } : null));
            setErrorDetail(null);
          } else {
            const msg =
              body?.detail ?? body?.error ?? `HTTP ${status ?? "?"} error`;
            setErrorDetail(msg);
          }
          fetchStatus();
        },
      },
    );
  };

  const paddingTop = Platform.OS === "web" ? 67 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;
  const isBlocked = limitStatus ? limitStatus.remaining === 0 : false;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: appColors.background }]}
      contentContainerStyle={{
        paddingTop,
        paddingBottom,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: appColors.foreground }]}>
        AI Generate
      </Text>
      <Text style={[styles.subtitle, { color: appColors.mutedForeground }]}>
        Generate new German flashcards using AI
      </Text>

      {/* Free tier banner */}
      <View
        style={[
          styles.infoBanner,
          { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
        ]}
      >
        <Text style={styles.infoIcon}>✦</Text>
        <Text style={[styles.infoText, { color: "#1e40af" }]}>
          <Text style={{ fontWeight: "700" }}>Free AI Generation — </Text>
          {limitStatus
            ? isBlocked
              ? `Daily limit reached. Resets in ${countdown || "…"}`
              : `${limitStatus.remaining} of ${limitStatus.limit} generations left today`
            : "Up to 3 free AI generations per day"}
        </Text>
      </View>

      {/* Blocked state */}
      {isBlocked ? (
        <View
          style={[
            styles.blockedCard,
            { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
          ]}
        >
          <Text style={styles.blockedIcon}>⏳</Text>
          <Text style={[styles.blockedTitle, { color: "#b91c1c" }]}>
            Daily limit reached
          </Text>
          <Text style={[styles.blockedSub, { color: "#dc2626" }]}>
            You've used all {limitStatus?.limit} free AI generations for today.
          </Text>
          <View style={styles.countdownBox}>
            <Text style={[styles.countdownLabel, { color: "#ef4444" }]}>
              Next generation in
            </Text>
            <Text style={[styles.countdownTimer, { color: "#b91c1c" }]}>
              {countdown || "—"}
            </Text>
          </View>
          <Text
            style={[styles.blockedHint, { color: appColors.mutedForeground }]}
          >
            Keep studying your existing cards while you wait!
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.label, { color: appColors.foreground }]}>
            CEFR Level
          </Text>
          <View style={styles.chipRow}>
            {LEVELS.map((lvl) => {
              const active = selectedLevel === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? getLevelColor(lvl)
                        : appColors.secondary,
                      borderColor: active
                        ? getLevelColor(lvl)
                        : appColors.border,
                    },
                  ]}
                  onPress={() => setSelectedLevel(lvl as Level)}
                  testID={`select-level-${lvl}`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? "#fff" : appColors.foreground },
                    ]}
                  >
                    {lvl}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: appColors.foreground }]}>
            Category
          </Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? appColors.primary
                        : appColors.secondary,
                      borderColor: active
                        ? appColors.primary
                        : appColors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  testID={`select-category-${cat}`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? "#fff" : appColors.foreground },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: appColors.foreground }]}>
            Number of Cards
          </Text>
          <View style={styles.chipRow}>
            {COUNTS.map((c) => {
              const active = selectedCount === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? appColors.primary
                        : appColors.secondary,
                      borderColor: active
                        ? appColors.primary
                        : appColors.border,
                    },
                  ]}
                  onPress={() => setSelectedCount(c)}
                  testID={`select-count-${c}`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? "#fff" : appColors.foreground },
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[
              styles.summary,
              {
                backgroundColor: appColors.secondary,
                borderColor: appColors.border,
              },
            ]}
          >
            <Text style={[styles.summaryText, { color: appColors.foreground }]}>
              Generate {selectedCount} {selectedCategory} words at{" "}
              {selectedLevel} level
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.generateBtn,
              {
                backgroundColor: appColors.primary,
                opacity: generate.isPending ? 0.7 : 1,
              },
            ]}
            onPress={handleGenerate}
            disabled={generate.isPending}
            testID="button-generate"
          >
            {generate.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateBtnText}>✦ Generate with AI</Text>
            )}
          </TouchableOpacity>

          {success && (
            <View
              style={[
                styles.successMsg,
                { backgroundColor: "#dcfce7", borderColor: "#86efac" },
              ]}
            >
              <Text style={styles.successText}>
                ✓ {selectedCount} new flashcards added! (
                {limitStatus?.remaining ?? "?"} generations left today)
              </Text>
            </View>
          )}

          {generate.isError && !isBlocked && (
            <View
              style={[
                styles.errorMsg,
                { backgroundColor: "#fee2e2", borderColor: "#fca5a5" },
              ]}
            >
              <Text style={styles.errorText}>
                Generation failed:{" "}
                {errorDetail ?? "Unknown error — please try again."}
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  infoBanner: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 20,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  infoIcon: { fontSize: 14, marginTop: 1 },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 20,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  summary: { borderRadius: 12, borderWidth: 1.5, padding: 14, marginTop: 24 },
  summaryText: { fontSize: 14, fontWeight: "500" },
  generateBtn: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  generateBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  successMsg: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 16,
  },
  successText: { color: "#166534", fontSize: 14, fontWeight: "600" },
  errorMsg: { borderRadius: 12, borderWidth: 1.5, padding: 14, marginTop: 16 },
  errorText: { color: "#991b1b", fontSize: 14, fontWeight: "600" },
  blockedCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 24,
    marginTop: 8,
    alignItems: "center",
    gap: 8,
  },
  blockedIcon: { fontSize: 40, marginBottom: 4 },
  blockedTitle: { fontSize: 20, fontWeight: "800" },
  blockedSub: { fontSize: 14, textAlign: "center" },
  countdownBox: {
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
    alignItems: "center",
  },
  countdownLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  countdownTimer: {
    fontSize: 36,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  blockedHint: { fontSize: 13, textAlign: "center", marginTop: 4 },
});
