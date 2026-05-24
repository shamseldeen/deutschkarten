import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { FlashCard } from "@/components/FlashCard";
import { useFlashcards, useUpdateProgress } from "@/lib/hooks";
import type { Flashcard, Level } from "@/lib/api";
import colors from "@/constants/colors";

const LEVELS = ["All", "A1", "A2", "B1", "B2", "C1"];

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

export default function BrowseScreen() {
  const appColors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedLevel, setSelectedLevel] = useState<string>("All");
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const params = selectedLevel !== "All"
    ? { level: selectedLevel as Level, limit: 100 }
    : { limit: 100 };

  const { data, isLoading } = useFlashcards(params);
  const updateProgress = useUpdateProgress();

  const handleProgress = (id: number, known: boolean) => {
    updateProgress.mutate({ id, known });
  };

  const cards = data?.items ?? [];
  const activeCard = selectedCard !== null ? cards.find((c) => c.id === selectedCard) : null;

  const paddingTop = Platform.OS === "web" ? 67 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  return (
    <View style={[styles.container, { backgroundColor: appColors.background }]}>
      <View style={[styles.header, { paddingTop }]}>
        <Text style={[styles.title, { color: appColors.foreground }]}>Browse Cards</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {LEVELS.map((lvl) => {
            const active = selectedLevel === lvl;
            const lvlColor = lvl === "All" ? appColors.primary : getLevelColor(lvl);
            return (
              <TouchableOpacity
                key={lvl}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? lvlColor : appColors.secondary,
                    borderColor: active ? lvlColor : appColors.border,
                  },
                ]}
                onPress={() => setSelectedLevel(lvl)}
                testID={`filter-level-${lvl}`}
              >
                <Text style={[styles.filterText, { color: active ? "#fff" : appColors.foreground }]}>
                  {lvl}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.skeleton, { backgroundColor: appColors.muted }]} />
          ))}
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: appColors.mutedForeground }]}>
            No flashcards yet for this level.
          </Text>
          <Text style={[styles.emptyHint, { color: appColors.mutedForeground }]}>
            Use the Generate tab to create some!
          </Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom }}
          scrollEnabled={!!cards.length}
          renderItem={({ item }) => {
            const lvlColor = getLevelColor(item.level);
            return (
              <TouchableOpacity
                style={[
                  styles.cardRow,
                  { backgroundColor: appColors.card, borderColor: appColors.border },
                  item.known && { opacity: 0.65 },
                ]}
                onPress={() => setSelectedCard(item.id)}
                testID={`card-flashcard-${item.id}`}
              >
                <View style={[styles.levelDot, { backgroundColor: lvlColor }]}>
                  <Text style={styles.levelDotText}>{item.level}</Text>
                </View>
                <View style={styles.cardRowInfo}>
                  <Text style={[styles.cardWord, { color: appColors.foreground }]}>{item.word}</Text>
                  <Text style={[styles.cardEn, { color: appColors.mutedForeground }]}>
                    {item.englishTranslation}
                  </Text>
                </View>
                {item.known && (
                  <View style={styles.knownBadge}>
                    <Text style={styles.knownText}>Known</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={activeCard !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: appColors.background }]}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedCard(null)}
              testID="button-close-modal"
            >
              <Text style={[styles.modalCloseText, { color: appColors.primary }]}>Close</Text>
            </TouchableOpacity>
            {activeCard && (
              <FlashCard
                card={activeCard}
                onKnown={() => { handleProgress(activeCard.id, true); setSelectedCard(null); }}
                onUnknown={() => { handleProgress(activeCard.id, false); setSelectedCard(null); }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 12 },
  filterScroll: { flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  loadingContainer: { padding: 20, gap: 12 },
  skeleton: { height: 68, borderRadius: 12 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptyHint: { fontSize: 14 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    marginTop: 10,
    gap: 12,
  },
  levelDot: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  levelDotText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  cardRowInfo: { flex: 1 },
  cardWord: { fontSize: 16, fontWeight: "700" },
  cardEn: { fontSize: 13, marginTop: 2 },
  knownBadge: { backgroundColor: "#86efac", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  knownText: { fontSize: 11, fontWeight: "700", color: "#166534" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalClose: { alignSelf: "flex-end", marginBottom: 16 },
  modalCloseText: { fontSize: 16, fontWeight: "600" },
});
