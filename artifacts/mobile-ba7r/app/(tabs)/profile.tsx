import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Image, ScrollView, ActivityIndicator } from "react-native";
import { useUser, useAuth } from "@clerk/expo";
import { useRouter, useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { DonationCard } from "@/components/DonationCard";
import { ReminderSection } from "@/components/ReminderSection";
import { useLangPrefs } from "@/lib/useLangPrefs";
import { SUPPORTED_LANGS } from "@/lib/languages";
import { Feather } from "@expo/vector-icons";
import { Linking } from "react-native";

type CommunityStats = { totalCards: number; contributors: number; languages: number };

type Me = {
  user: { id: string; email: string | null; displayName: string | null; imageUrl: string | null } | null;
  streak: { currentStreak: number; longestStreak: number; lastActiveDate: string | null };
};

type QuizStats = {
  overall: { sessions: number; questions: number; correct: number; accuracy: number };
  byMode: { mode: string; sessions: number; questions: number; correct: number; accuracy: number }[];
};

type QuizHistoryRow = {
  id: string;
  mode: string;
  level: string | null;
  totalQuestions: number;
  correctAnswers: number;
  finishedAt: string | null;
};

type LbRow = {
  rank: number;
  userId: string;
  displayName: string;
  imageUrl: string | null;
  knownCards: number;
  correctAnswers: number;
  longestStreak: number;
  xp: number;
};
type LbResp = { top: LbRow[]; me: LbRow | null };

const MODE_LABEL: Record<string, string> = {
  "de-to-en": "German → English",
  "en-to-de": "English → German",
  "article": "Articles",
  "typing": "Typing",
};

import { apiFetch } from "@/lib/api";
import { useFlashcardStats } from "@/lib/hooks";
import { computeRank, rankImageUrl, RANKS } from "@/lib/ranks";

export default function ProfileTab() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const [me, setMe] = useState<Me | null>(null);
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);
  const [quizHistory, setQuizHistory] = useState<QuizHistoryRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LbResp | null>(null);
  const [community, setCommunity] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: stats } = useFlashcardStats();
  const totalKnown = stats?.reduce((s, l) => s + l.known, 0) ?? 0;
  const c1Known = stats?.find((s) => s.level === "C1")?.known ?? 0;
  const rank = computeRank(totalKnown, c1Known);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [meRes, statsRes, histRes, lbRes, comRes] = await Promise.all([
        apiFetch("/ba7r-api/me"),
        apiFetch("/ba7r-api/me/quiz-stats"),
        apiFetch("/ba7r-api/me/quiz-history"),
        apiFetch("/ba7r-api/leaderboard"),
        apiFetch("/ba7r-api/community/stats"),
      ]);
      if (meRes.ok) setMe(await meRes.json());
      if (statsRes.ok) setQuizStats(await statsRes.json());
      if (histRes.ok) setQuizHistory(await histRes.json());
      if (lbRes.ok) setLeaderboard(await lbRes.json());
      if (comRes.ok) setCommunity(await comRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!isLoaded) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;
  }

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Text style={[styles.title, { color: colors.foreground, marginBottom: 8 }]}>Sign in to track progress</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, marginBottom: 24, textAlign: "center" }]}>
          Sync your flashcards, streaks, and stats across devices.
        </Text>
        <Pressable onPress={() => router.push("/(auth)/sign-in" as any)} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={styles.btnText}>Sign In</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/(auth)/sign-up" as any)} style={{ marginTop: 12 }}>
          <Text style={[styles.link, { color: colors.primary }]}>Create an account</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {user.imageUrl ? (
          <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" }]}>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>
              {(user.firstName?.[0] ?? user.emailAddresses?.[0]?.emailAddress?.[0] ?? "U").toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user.firstName || user.username || user.emailAddresses?.[0]?.emailAddress || "User"}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>
            {user.emailAddresses?.[0]?.emailAddress}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: colors.card,
            borderColor: rank.current.accent + "55",
            borderWidth: 2,
            flexDirection: "row",
            gap: 14,
            alignItems: "center",
          },
        ]}
      >
        <Image
          source={{ uri: rankImageUrl(rank.current) }}
          style={{ width: 88, height: 88, borderRadius: 18, backgroundColor: rank.current.accent + "15" }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: colors.mutedForeground, letterSpacing: 1 }}>
            RANK {rank.current.tier} OF {RANKS.length}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "900", color: rank.current.accent, marginTop: 2 }}>
            {rank.current.title}
          </Text>
          <Text style={{ fontSize: 12, fontStyle: "italic", color: colors.mutedForeground }}>
            {rank.current.legend}
          </Text>
          <Text style={{ fontSize: 12, color: colors.foreground, marginTop: 4 }}>{rank.current.blurb}</Text>
          {rank.next ? (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: colors.mutedForeground, fontWeight: "700" }}>
                  {totalKnown} mastered
                </Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                  {rank.toNext > 0 ? (
                    <>{rank.toNext} → <Text style={{ color: colors.foreground, fontWeight: "800" }}>{rank.next.title}</Text></>
                  ) : rank.nextBlockedBy === "c1" ? (
                    <Text style={{ color: colors.foreground, fontWeight: "800" }}>Learn 1 C1 card → {rank.next.title}</Text>
                  ) : (
                    <Text style={{ color: colors.foreground, fontWeight: "800" }}>Ready for {rank.next.title}!</Text>
                  )}
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.muted, overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${rank.progressPct}%`, backgroundColor: rank.current.accent }} />
              </View>
            </View>
          ) : (
            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.primary, marginTop: 6 }}>
              👑 Top rank reached — {totalKnown} words mastered.
            </Text>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.fire}>🔥</Text>
          <Text style={[styles.statNum, { color: colors.foreground }]}>{me?.streak.currentStreak ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Current Streak</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.fire}>🏆</Text>
          <Text style={[styles.statNum, { color: colors.foreground }]}>{me?.streak.longestStreak ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Longest</Text>
        </View>
      </View>

      {loading && <ActivityIndicator style={{ marginVertical: 16 }} />}

      {quizStats && quizStats.overall.sessions > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quiz Stats</Text>

          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={[styles.miniNum, { color: colors.primary }]}>{quizStats.overall.accuracy}%</Text>
              <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Accuracy</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniNum, { color: colors.foreground }]}>{quizStats.overall.sessions}</Text>
              <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Quizzes</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniNum, { color: colors.foreground }]}>{quizStats.overall.questions}</Text>
              <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Questions</Text>
            </View>
          </View>

          {quizStats.byMode.map((m) => (
            <View key={m.mode} style={{ marginTop: 10 }}>
              <View style={styles.modeRow}>
                <Text style={[styles.modeLabel, { color: colors.foreground }]}>{MODE_LABEL[m.mode] ?? m.mode}</Text>
                <Text style={[styles.modeRight, { color: colors.mutedForeground }]}>
                  {m.correct}/{m.questions} · <Text style={{ color: colors.foreground, fontWeight: "800" }}>{m.accuracy}%</Text>
                </Text>
              </View>
              <View style={[styles.miniBarBg, { backgroundColor: colors.muted }]}>
                <View style={[styles.miniBarFill, { width: `${m.accuracy}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>
          ))}
        </View>
      )}

      {quizHistory.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Quizzes</Text>
          {quizHistory.slice(0, 5).map((row) => {
            const pct = row.totalQuestions > 0 ? Math.round((row.correctAnswers / row.totalQuestions) * 100) : 0;
            return (
              <View key={row.id} style={[styles.historyRow, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyTitle, { color: colors.foreground }]}>
                    {MODE_LABEL[row.mode] ?? row.mode}{row.level ? ` · ${row.level}` : ""}
                  </Text>
                  {row.finishedAt && (
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                      {new Date(row.finishedAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.historyPct, { color: colors.foreground }]}>{pct}%</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{row.correctAnswers}/{row.totalQuestions}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {leaderboard && (leaderboard.top.length > 0 || leaderboard.me) && (
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🏆 Leaderboard</Text>
          {leaderboard.me && (
            <View style={[styles.lbRow, { backgroundColor: colors.muted, borderRadius: 8, paddingHorizontal: 8 }]}>
              <Text style={[styles.lbRank, { color: colors.foreground }]}>#{leaderboard.me.rank}</Text>
              <Text style={[styles.lbName, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>You</Text>
              <Text style={[styles.lbXp, { color: colors.primary }]}>{leaderboard.me.xp.toLocaleString()} XP</Text>
            </View>
          )}
          {leaderboard.top.slice(0, 10).map((r) => {
            const isMe = r.userId === user.id;
            return (
              <View key={r.userId} style={[styles.lbRow, isMe && { backgroundColor: colors.muted, borderRadius: 8, paddingHorizontal: 8 }]}>
                <Text style={[styles.lbRank, { color: r.rank <= 3 ? colors.primary : colors.mutedForeground }]}>
                  {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`}
                </Text>
                <Text style={[styles.lbName, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
                  {isMe ? "You" : r.displayName}
                </Text>
                <Text style={[styles.lbXp, { color: colors.primary }]}>{r.xp.toLocaleString()} XP</Text>
              </View>
            );
          })}
          <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 6, textAlign: "center" }}>
            XP = known × 10 + correct answers × 5 + longest streak × 20
          </Text>
        </View>
      )}

      <LanguagesSection colors={colors} />

      <ReminderSection colors={colors} />

      {community && (
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>👥 Community Library</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 8 }}>
            Free for everyone. Every word added or translated is shared with all learners.
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={[styles.miniNum, { color: colors.primary }]}>{community.totalCards}</Text>
              <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Words</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniNum, { color: colors.primary }]}>{community.contributors}</Text>
              <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Contributors</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniNum, { color: colors.primary }]}>{community.languages}</Text>
              <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Languages</Text>
            </View>
          </View>
          <Pressable
            onPress={() => Linking.openURL("https://github.com/shamseldeen")}
            style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Feather name="github" size={14} color={colors.mutedForeground} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Open source on GitHub</Text>
          </Pressable>
        </View>
      )}

      <DonationCard />

      <Pressable
        onPress={() => signOut()}
        style={[styles.signOutBtn, { borderColor: colors.border }]}
      >
        <Text style={[styles.signOutText, { color: colors.foreground }]}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 24, paddingTop: 64, gap: 16, flexGrow: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  name: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  email: { fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 4 },
  fire: { fontSize: 28 },
  statNum: { fontSize: 28, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  signOutBtn: { borderWidth: 1, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 16 },
  signOutText: { fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14 },
  btn: { borderRadius: 10, paddingVertical: 14, paddingHorizontal: 40, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16, fontFamily: "Inter_700Bold" },
  link: { fontSize: 14, fontWeight: "500" },
  sectionCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginBottom: 8, fontFamily: "Inter_700Bold" },
  miniStat: { flex: 1, alignItems: "center" },
  miniNum: { fontSize: 22, fontWeight: "900" },
  miniLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "700", marginTop: 2 },
  modeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modeLabel: { fontSize: 13, fontWeight: "700" },
  modeRight: { fontSize: 12 },
  miniBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  miniBarFill: { height: "100%", borderRadius: 3 },
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  historyTitle: { fontSize: 13, fontWeight: "700" },
  historyPct: { fontSize: 16, fontWeight: "800" },
  lbRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
  lbRank: { fontSize: 13, fontWeight: "800", width: 38 },
  lbName: { fontSize: 13, fontWeight: "600" },
  lbXp: { fontSize: 13, fontWeight: "800" },
  langRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  langPickerWrap: { flex: 1 },
  langPickerLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  langOptions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  langChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  langChipText: { fontSize: 11, fontWeight: "700" },
});

function LanguagesSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { prefs, save } = useLangPrefs();
  const [editing, setEditing] = React.useState<"primary" | "secondary" | null>(null);

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🌍 Translation Languages</Text>
      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 4 }}>
        Pick which languages appear on each card. Translations are generated on demand and shared with everyone.
      </Text>

      <View style={styles.langRow}>
        <Pressable
          style={[styles.langPickerWrap, { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10 }]}
          onPress={() => setEditing(editing === "primary" ? null : "primary")}
        >
          <Text style={[styles.langPickerLabel, { color: colors.mutedForeground }]}>Primary</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
            {SUPPORTED_LANGS.find((l) => l.code === prefs.primaryLang)?.name ?? prefs.primaryLang}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.langPickerWrap, { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10 }]}
          onPress={() => setEditing(editing === "secondary" ? null : "secondary")}
        >
          <Text style={[styles.langPickerLabel, { color: colors.mutedForeground }]}>Secondary</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
            {prefs.secondaryLang ? (SUPPORTED_LANGS.find((l) => l.code === prefs.secondaryLang)?.name ?? prefs.secondaryLang) : "None"}
          </Text>
        </Pressable>
      </View>

      {editing && (
        <View style={styles.langOptions}>
          {editing === "secondary" && (
            <Pressable
              onPress={() => { save({ ...prefs, secondaryLang: null }); setEditing(null); }}
              style={[styles.langChip, { borderColor: colors.border, backgroundColor: colors.muted }]}
            >
              <Text style={[styles.langChipText, { color: colors.foreground }]}>None</Text>
            </Pressable>
          )}
          {SUPPORTED_LANGS.filter((l) => editing === "primary" || l.code !== prefs.primaryLang).map((l) => {
            const isActive = editing === "primary" ? l.code === prefs.primaryLang : l.code === prefs.secondaryLang;
            return (
              <Pressable
                key={l.code}
                onPress={() => {
                  if (editing === "primary") save({ ...prefs, primaryLang: l.code });
                  else save({ ...prefs, secondaryLang: l.code });
                  setEditing(null);
                }}
                style={[
                  styles.langChip,
                  {
                    borderColor: isActive ? colors.primary : colors.border,
                    backgroundColor: isActive ? colors.primary : "transparent",
                  },
                ]}
              >
                <Text style={[styles.langChipText, { color: isActive ? "#fff" : colors.foreground }]}>
                  {l.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
