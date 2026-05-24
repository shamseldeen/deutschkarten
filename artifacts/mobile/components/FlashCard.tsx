import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";
import type { Flashcard } from "@/lib/api";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width - 40, 400);
const CARD_HEIGHT = 420;

type Props = {
  card: Flashcard;
  onKnown?: () => void;
  onUnknown?: () => void;
  showActions?: boolean;
};

function getArticleColor(article: string | null): string {
  if (article === "der") return colors.light.articleDer;
  if (article === "die") return colors.light.articleDie;
  if (article === "das") return colors.light.articleDas;
  return colors.light.primary;
}

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

export function FlashCard({ card, onKnown, onUnknown, showActions = true }: Props) {
  const appColors = useColors();
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const flip = () => {
    if (flipped) {
      Animated.spring(flipAnim, { toValue: 0, useNativeDriver: true }).start();
    } else {
      Animated.spring(flipAnim, { toValue: 180, useNativeDriver: true }).start();
    }
    setFlipped(!flipped);
  };

  const articleColor = getArticleColor(card.article);
  const levelColor = getLevelColor(card.level);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={flip} activeOpacity={0.95}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: appColors.card, borderColor: appColors.border },
            { transform: [{ rotateY: frontInterpolate }] },
            { backfaceVisibility: "hidden" },
          ]}
        >
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
            <Text style={styles.levelText}>{card.level}</Text>
          </View>

          {card.imageUrl ? (
            <Image
              source={{ uri: card.imageUrl }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: appColors.secondary }]}>
              <Text style={[styles.categoryText, { color: appColors.mutedForeground }]}>
                {card.category}
              </Text>
            </View>
          )}

          <View style={styles.wordContainer}>
            {card.article && (
              <Text style={[styles.article, { color: articleColor }]}>
                {card.article}
              </Text>
            )}
            <Text style={[styles.word, { color: appColors.foreground }]}>{card.baseWord}</Text>
          </View>

          <Text style={[styles.tapHint, { color: appColors.mutedForeground }]}>
            Tap to reveal translation
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            { backgroundColor: appColors.card, borderColor: appColors.border },
            { transform: [{ rotateY: backInterpolate }] },
            { backfaceVisibility: "hidden" },
          ]}
        >
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
            <Text style={styles.levelText}>{card.level}</Text>
          </View>

          <Text style={[styles.translationEn, { color: appColors.foreground }]}>
            {card.englishTranslation}
          </Text>

          <Text style={[styles.translationAr, { color: appColors.primary }]}>
            {card.arabicTranslation}
          </Text>

          <View style={[styles.divider, { backgroundColor: appColors.border }]} />

          <Text style={[styles.exampleDe, { color: appColors.foreground }]}>
            {card.exampleSentenceDe}
          </Text>
          <Text style={[styles.exampleEn, { color: appColors.mutedForeground }]}>
            {card.exampleSentenceEn}
          </Text>
          <Text style={[styles.exampleAr, { color: appColors.mutedForeground }]}>
            {card.exampleSentenceAr}
          </Text>
        </Animated.View>
      </TouchableOpacity>

      {showActions && flipped && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.unknownBtn]}
            onPress={onUnknown}
            testID="button-unknown"
          >
            <Text style={styles.actionBtnText}>Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.knownBtn]}
            onPress={onKnown}
            testID="button-known"
          >
            <Text style={styles.actionBtnText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardBack: { position: "absolute", top: 0 },
  levelBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  levelText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cardImage: { width: CARD_WIDTH - 48, height: 140, borderRadius: 12, marginBottom: 16 },
  imagePlaceholder: {
    width: CARD_WIDTH - 48,
    height: 100,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: { fontSize: 14, fontWeight: "500", textTransform: "capitalize" },
  wordContainer: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 8 },
  article: { fontSize: 24, fontWeight: "600", fontStyle: "italic" },
  word: { fontSize: 36, fontWeight: "800", textAlign: "center" },
  tapHint: { fontSize: 13, marginTop: 12 },
  translationEn: { fontSize: 30, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  translationAr: { fontSize: 24, fontWeight: "600", textAlign: "center", marginBottom: 16, writingDirection: "rtl" },
  divider: { width: "100%", height: 1, marginVertical: 12 },
  exampleDe: { fontSize: 14, fontWeight: "500", textAlign: "center", marginBottom: 4 },
  exampleEn: { fontSize: 12, textAlign: "center", marginBottom: 4 },
  exampleAr: { fontSize: 12, textAlign: "center", writingDirection: "rtl" },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  unknownBtn: { backgroundColor: "#fca5a5" },
  knownBtn: { backgroundColor: "#86efac" },
  actionBtnText: { fontSize: 16, fontWeight: "700", color: "#1a1207" },
});
