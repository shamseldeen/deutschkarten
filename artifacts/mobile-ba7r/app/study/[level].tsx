import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { FlashCard } from "@/components/FlashCard";
import { useFlashcards, useUpdateProgress } from "@/lib/hooks";
import type { Level } from "@/lib/api";

export default function StudyScreen() {
  const { level } = useLocalSearchParams<{ level: string }>();
  const appColors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [knownCount, setKnownCount] = useState(0);

  const { data, isLoading } = useFlashcards({
    level: level as Level,
    limit: 20,
  });
  const updateProgress = useUpdateProgress();
  const cards = data?.items ?? [];

  const handleResult = (known: boolean) => {
    const card = cards[currentIndex];
    if (!card) return;
    if (known) setKnownCount((n) => n + 1);
    updateProgress.mutate({ id: card.id, known });
    if (currentIndex + 1 >= cards.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const paddingTop = Platform.OS === "web" ? 67 : insets.top + 16;
  const currentCard = cards[currentIndex];
  const total = cards.length;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: appColors.background, paddingTop },
      ]}
    >
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          testID="button-back"
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={appColors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.levelTitle, { color: appColors.foreground }]}>
          Level {level}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View
        style={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
        ]}
      >
        {isLoading ? (
          <View
            style={[styles.skeleton, { backgroundColor: appColors.muted }]}
          />
        ) : sessionDone || total === 0 ? (
          <View style={styles.completedContainer}>
            <Text style={[styles.completedTitle, { color: appColors.primary }]}>
              {total === 0 ? "No cards at this level" : "Session Complete!"}
            </Text>
            {total > 0 && (
              <Text
                style={[styles.completedStat, { color: appColors.foreground }]}
              >
                {knownCount} / {total} correct
              </Text>
            )}
            <Text
              style={[
                styles.completedHint,
                { color: appColors.mutedForeground },
              ]}
            >
              {total === 0
                ? "Generate some words for this level first."
                : "Keep studying to improve your score."}
            </Text>
            <TouchableOpacity
              style={[
                styles.restartBtn,
                { backgroundColor: appColors.primary },
              ]}
              onPress={() => {
                setCurrentIndex(0);
                setSessionDone(false);
                setKnownCount(0);
              }}
              testID="button-restart"
            >
              <Text style={styles.restartBtnText}>Study Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.backHomeBtn, { borderColor: appColors.border }]}
              onPress={() => router.back()}
              testID="button-back-home"
            >
              <Text
                style={[
                  styles.backHomeBtnText,
                  { color: appColors.foreground },
                ]}
              >
                Back to Home
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.studyContainer}>
            <Text
              style={[styles.progress, { color: appColors.mutedForeground }]}
            >
              {currentIndex + 1} / {total}
            </Text>
            <View
              style={[styles.progressBg, { backgroundColor: appColors.border }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: appColors.primary,
                    width: `${(currentIndex / total) * 100}%` as any,
                  },
                ]}
              />
            </View>
            {currentCard && (
              <FlashCard
                card={currentCard}
                onKnown={() => handleResult(true)}
                onUnknown={() => handleResult(false)}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  levelTitle: { fontSize: 20, fontWeight: "800" },
  content: { flex: 1, paddingHorizontal: 20 },
  skeleton: { height: 420, borderRadius: 20 },
  completedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  completedTitle: { fontSize: 28, fontWeight: "800" },
  completedStat: { fontSize: 22, fontWeight: "700" },
  completedHint: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  restartBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  restartBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  backHomeBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  backHomeBtnText: { fontSize: 16, fontWeight: "600" },
  studyContainer: { flex: 1, alignItems: "center" },
  progress: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  progressBg: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 24,
  },
  progressFill: { height: "100%", borderRadius: 3 },
});
