import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import * as Speech from "expo-speech";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";
import { apiFetch, type Flashcard } from "@/lib/api";
import { useLangPrefs } from "@/lib/useLangPrefs";
import { LANG_BY_CODE, isRtl } from "@/lib/languages";
import { ReportCardModal } from "./ReportCardModal";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width - 40, 400);
const CARD_HEIGHT = 460;

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

export function FlashCard({
  card: incomingCard,
  onKnown,
  onUnknown,
  showActions = true,
}: Props) {
  const appColors = useColors();
  const { prefs } = useLangPrefs();
  const [card, setCard] = useState<Flashcard>(incomingCard);
  const [flipped, setFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setCard(incomingCard);
  }, [incomingCard]);

  const translations: Record<string, string> = (card.translations ?? {
    en: card.englishTranslation,
    ar: card.arabicTranslation,
  }) as Record<string, string>;
  const exampleTr: Record<string, string> = (card.exampleTranslations ?? {
    en: card.exampleSentenceEn,
    ar: card.exampleSentenceAr,
  }) as Record<string, string>;

  const langList = [prefs.primaryLang, prefs.secondaryLang].filter(
    (l, i, arr): l is string => !!l && arr.indexOf(l) === i,
  );

  useEffect(() => {
    let cancelled = false;
    const missing = langList.filter((l) => !translations[l]);
    if (missing.length === 0) return;
    (async () => {
      for (const lang of missing) {
        try {
          const r = await apiFetch(`/api/flashcards/${card.id}/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lang }),
          });
          if (!r.ok) continue;
          const updated = await r.json();
          if (cancelled) return;
          setCard(updated);
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, prefs.primaryLang, prefs.secondaryLang]);

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const flip = () => {
    Animated.spring(flipAnim, {
      toValue: flipped ? 0 : 180,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const handleSpeak = useCallback(() => {
    const fullText = card.article
      ? `${card.article} ${card.baseWord}`
      : card.baseWord;
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(fullText, {
      language: "de-DE",
      rate: 0.85,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [card.article, card.baseWord]);

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
          {card.createdBy && (
            <View
              style={[
                styles.communityBadge,
                { backgroundColor: appColors.muted },
              ]}
            >
              <Feather
                name="users"
                size={10}
                color={appColors.mutedForeground}
              />
              <Text
                style={[
                  styles.communityText,
                  { color: appColors.mutedForeground },
                ]}
              >
                community
              </Text>
            </View>
          )}

          {card.imageUrl ? (
            <Image
              source={{ uri: card.imageUrl }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.imagePlaceholder,
                { backgroundColor: appColors.secondary },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: appColors.mutedForeground },
                ]}
              >
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
            <Text style={[styles.word, { color: appColors.foreground }]}>
              {card.baseWord}
            </Text>
          </View>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              handleSpeak();
            }}
            style={[
              styles.speakBtn,
              {
                backgroundColor: isSpeaking
                  ? appColors.primary
                  : appColors.muted,
              },
            ]}
            activeOpacity={0.7}
          >
            <Feather
              name="volume-2"
              size={14}
              color={isSpeaking ? "#fff" : appColors.mutedForeground}
            />
            <Text
              style={[
                styles.speakBtnText,
                { color: isSpeaking ? "#fff" : appColors.mutedForeground },
              ]}
            >
              {isSpeaking ? "Playing…" : "Pronunciation"}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.tapHint, { color: appColors.mutedForeground }]}>
            Tap card to reveal translation
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

          {langList.map((lang) => {
            const meta = LANG_BY_CODE[lang];
            const rtl = isRtl(lang);
            const value = translations[lang];
            const ex = exampleTr[lang];
            return (
              <View key={lang} style={styles.langBlock}>
                <Text
                  style={[
                    styles.langLabel,
                    { color: appColors.mutedForeground },
                  ]}
                >
                  {(meta?.name ?? lang).toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.translationText,
                    {
                      color: appColors.foreground,
                      writingDirection: rtl ? "rtl" : "ltr",
                      textAlign: rtl ? "right" : "left",
                    },
                  ]}
                >
                  {value ?? "Translating…"}
                </Text>
                {ex && (
                  <Text
                    style={[
                      styles.exampleText,
                      {
                        color: appColors.mutedForeground,
                        writingDirection: rtl ? "rtl" : "ltr",
                        textAlign: rtl ? "right" : "left",
                      },
                    ]}
                  >
                    {ex}
                  </Text>
                )}
              </View>
            );
          })}

          <View
            style={[styles.divider, { backgroundColor: appColors.border }]}
          />
          <Text style={[styles.exampleDe, { color: appColors.foreground }]}>
            {card.exampleSentenceDe}
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

      <TouchableOpacity
        onPress={() => setReportOpen(true)}
        style={styles.reportBtn}
        hitSlop={8}
        accessibilityLabel="Report this card"
      >
        <Feather name="flag" size={12} color={appColors.mutedForeground} />
        <Text style={[styles.reportText, { color: appColors.mutedForeground }]}>
          Report
        </Text>
      </TouchableOpacity>

      <ReportCardModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        cardId={card.id}
        word={card.baseWord}
      />
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
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardBack: {
    position: "absolute",
    top: 0,
    justifyContent: "flex-start",
    paddingTop: 50,
  },
  levelBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  levelText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  communityBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  communityText: { fontSize: 10, fontWeight: "600" },
  cardImage: {
    width: CARD_WIDTH - 48,
    height: 140,
    borderRadius: 12,
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: CARD_WIDTH - 48,
    height: 100,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  wordContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 8,
  },
  article: { fontSize: 24, fontWeight: "600", fontStyle: "italic" },
  word: { fontSize: 36, fontWeight: "800", textAlign: "center" },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 10,
  },
  speakBtnText: { fontSize: 12, fontWeight: "600" },
  tapHint: { fontSize: 13, marginTop: 10 },
  langBlock: { width: "100%", marginBottom: 12 },
  langLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  translationText: { fontSize: 22, fontWeight: "700" },
  exampleText: { fontSize: 12, marginTop: 2 },
  divider: { width: "100%", height: 1, marginVertical: 10 },
  exampleDe: { fontSize: 14, fontWeight: "500", textAlign: "center" },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  unknownBtn: { backgroundColor: "#fca5a5" },
  knownBtn: { backgroundColor: "#86efac" },
  actionBtnText: { fontSize: 16, fontWeight: "700", color: "#1a1207" },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    opacity: 0.7,
  },
  reportText: { fontSize: 11, fontWeight: "600" },
});
