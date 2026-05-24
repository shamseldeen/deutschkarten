import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { FlashCard } from "@/components/FlashCard";
import { useDailyFlashcards, useUpdateProgress } from "@/lib/hooks";

export default function DailyScreen() {
  const appColors = useColors();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  const { data: cards, isLoading, error } = useDailyFlashcards();
  const apiError = error as Error | null;
  const updateProgress = useUpdateProgress();

  const handleResult = (known: boolean) => {
    const card = cards?.[currentIndex];
    if (!card) return;
    updateProgress.mutate({ id: card.id, known });
    if (currentIndex + 1 >= (cards?.length ?? 0)) {
      setCompleted(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const paddingTop = Platform.OS === "web" ? 67 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;
  const currentCard = cards?.[currentIndex];
  const total = cards?.length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: appColors.background, paddingTop, paddingBottom }]}>
      <Text style={[styles.title, { color: appColors.foreground }]}>Daily Practice</Text>

      {apiError ? (
        <View style={{ marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#dc2626" }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: "#991b1b", marginBottom: 4 }}>CONNECTION ERROR</Text>
          <Text style={{ fontSize: 12, color: "#7f1d1d" }}>{apiError.message}</Text>
        </View>
      ) : isLoading ? (
        <View style={[styles.skeleton, { backgroundColor: appColors.muted }]} />
      ) : completed || total === 0 ? (
        <View style={styles.completedContainer}>
          <Text style={[styles.completedTitle, { color: appColors.primary }]}>
            {total === 0 ? "No cards today" : "All done!"}
          </Text>
          <Text style={[styles.completedSubtitle, { color: appColors.mutedForeground }]}>
            {total === 0
              ? "Generate some flashcards to start practicing."
              : `You reviewed ${total} cards. Come back tomorrow!`}
          </Text>
          {completed && (
            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: appColors.primary }]}
              onPress={() => { setCurrentIndex(0); setCompleted(false); }}
              testID="button-restart-daily"
            >
              <Text style={styles.resetBtnText}>Practice Again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.studyContainer}>
          <Text style={[styles.progress, { color: appColors.mutedForeground }]}>
            {currentIndex + 1} / {total}
          </Text>
          <View style={[styles.progressBarBg, { backgroundColor: appColors.border }]}>
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: appColors.primary, width: `${(currentIndex / total) * 100}%` as any },
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 20 },
  skeleton: { height: 420, borderRadius: 20 },
  completedContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  completedTitle: { fontSize: 28, fontWeight: "800" },
  completedSubtitle: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  resetBtn: { marginTop: 12, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  resetBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  studyContainer: { flex: 1, alignItems: "center" },
  progress: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  progressBarBg: { width: "100%", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 24 },
  progressBarFill: { height: "100%", borderRadius: 3 },
});
