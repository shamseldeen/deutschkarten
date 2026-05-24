import React, { useState } from "react";
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

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const CATEGORIES = ["general", "animals", "food", "travel", "work", "family", "nature", "verbs", "adjectives"];
const COUNTS = [5, 10, 15, 20];

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

export default function GenerateScreen() {
  const appColors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedLevel, setSelectedLevel] = useState<Level>("A1");
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [selectedCount, setSelectedCount] = useState(10);
  const [success, setSuccess] = useState(false);

  const generate = useGenerateFlashcards();

  const handleGenerate = () => {
    setSuccess(false);
    generate.mutate(
      { level: selectedLevel, category: selectedCategory, count: selectedCount },
      { onSuccess: () => setSuccess(true) }
    );
  };

  const paddingTop = Platform.OS === "web" ? 67 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: appColors.background }]}
      contentContainerStyle={{ paddingTop, paddingBottom, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: appColors.foreground }]}>AI Generate</Text>
      <Text style={[styles.subtitle, { color: appColors.mutedForeground }]}>
        Generate new German flashcards using AI
      </Text>

      <Text style={[styles.label, { color: appColors.foreground }]}>CEFR Level</Text>
      <View style={styles.chipRow}>
        {LEVELS.map((lvl) => {
          const active = selectedLevel === lvl;
          const lvlColor = getLevelColor(lvl);
          return (
            <TouchableOpacity
              key={lvl}
              style={[
                styles.chip,
                { backgroundColor: active ? lvlColor : appColors.secondary, borderColor: active ? lvlColor : appColors.border },
              ]}
              onPress={() => setSelectedLevel(lvl as Level)}
              testID={`select-level-${lvl}`}
            >
              <Text style={[styles.chipText, { color: active ? "#fff" : appColors.foreground }]}>
                {lvl}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: appColors.foreground }]}>Category</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                { backgroundColor: active ? appColors.primary : appColors.secondary, borderColor: active ? appColors.primary : appColors.border },
              ]}
              onPress={() => setSelectedCategory(cat)}
              testID={`select-category-${cat}`}
            >
              <Text style={[styles.chipText, { color: active ? "#fff" : appColors.foreground }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: appColors.foreground }]}>Number of Cards</Text>
      <View style={styles.chipRow}>
        {COUNTS.map((c) => {
          const active = selectedCount === c;
          return (
            <TouchableOpacity
              key={c}
              style={[
                styles.chip,
                { backgroundColor: active ? appColors.primary : appColors.secondary, borderColor: active ? appColors.primary : appColors.border },
              ]}
              onPress={() => setSelectedCount(c)}
              testID={`select-count-${c}`}
            >
              <Text style={[styles.chipText, { color: active ? "#fff" : appColors.foreground }]}>
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.summary, { backgroundColor: appColors.secondary, borderColor: appColors.border }]}>
        <Text style={[styles.summaryText, { color: appColors.foreground }]}>
          Generate {selectedCount} {selectedCategory} words at {selectedLevel} level
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.generateBtn, { backgroundColor: appColors.primary, opacity: generate.isPending ? 0.7 : 1 }]}
        onPress={handleGenerate}
        disabled={generate.isPending}
        testID="button-generate"
      >
        {generate.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.generateBtnText}>Generate with AI</Text>
        )}
      </TouchableOpacity>

      {success && (
        <View style={[styles.successMsg, { backgroundColor: "#dcfce7", borderColor: "#86efac" }]}>
          <Text style={styles.successText}>
            {selectedCount} new flashcards added successfully!
          </Text>
        </View>
      )}

      {generate.isError && (
        <View style={[styles.errorMsg, { backgroundColor: "#fee2e2", borderColor: "#fca5a5" }]}>
          <Text style={styles.errorText}>Failed to generate. Please try again.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginTop: 20 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: "600" },
  summary: { borderRadius: 12, borderWidth: 1.5, padding: 14, marginTop: 24 },
  summaryText: { fontSize: 14, fontWeight: "500" },
  generateBtn: { borderRadius: 16, padding: 16, alignItems: "center", marginTop: 16 },
  generateBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  successMsg: { borderRadius: 12, borderWidth: 1.5, padding: 14, marginTop: 16 },
  successText: { color: "#166534", fontSize: 14, fontWeight: "600" },
  errorMsg: { borderRadius: 12, borderWidth: 1.5, padding: 14, marginTop: 16 },
  errorText: { color: "#991b1b", fontSize: 14, fontWeight: "600" },
});
