import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@clerk/expo";
import { apiFetch } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

type Row = {
  rank: number;
  userId: string;
  displayName: string;
  imageUrl: string | null;
  knownCards: number;
  correctAnswers: number;
  longestStreak: number;
  xp: number;
};
type LbResp = { top: Row[]; me: Row | null };

function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.chipVal, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

export default function LeaderboardTab() {
  const { user } = useUser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<LbResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await apiFetch("/api/leaderboard");
      if (res.ok) setData(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const paddingTop = Platform.OS === "web" ? 67 : insets.top + 16;
  const paddingBottom = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const top = data?.top ?? [];
  const me = data?.me ?? null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop,
        paddingBottom,
        paddingHorizontal: 16,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
      }
    >
      <Text style={[styles.heading, { color: colors.foreground }]}>
        🏆 Leaderboard
      </Text>
      <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
        XP = cards × 10 + quiz × 5 + streak × 20
      </Text>

      {loading && !data && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {me && (
        <View
          style={[
            styles.meCard,
            {
              backgroundColor: colors.primary + "18",
              borderColor: colors.primary,
            },
          ]}
        >
          <Text style={[styles.meLabel, { color: colors.primary }]}>
            Your rank
          </Text>
          <View style={styles.rowInner}>
            <Text style={[styles.rank, { color: colors.primary }]}>
              {medal(me.rank)}
            </Text>
            {me.imageUrl ? (
              <Image source={{ uri: me.imageUrl }} style={styles.avatar} />
            ) : null}
            <Text
              style={[styles.name, { color: colors.foreground, flex: 1 }]}
              numberOfLines={1}
            >
              You
            </Text>
            <Text style={[styles.xp, { color: colors.primary }]}>
              {me.xp.toLocaleString()} XP
            </Text>
          </View>
          <View style={styles.chips}>
            <StatChip
              label="cards"
              value={me.knownCards}
              color={colors.primary}
            />
            <StatChip label="quiz" value={me.correctAnswers} color="#3b82f6" />
            <StatChip
              label="streak"
              value={`${me.longestStreak}d`}
              color="#f59e0b"
            />
          </View>
        </View>
      )}

      {top.length > 0 && (
        <View
          style={[
            styles.list,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.listTitle, { color: colors.foreground }]}>
            Top learners
          </Text>
          {top.map((r, idx) => {
            const isMe = r.userId === user?.id;
            return (
              <View
                key={r.userId}
                style={[
                  styles.row,
                  idx < top.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                  isMe && { backgroundColor: colors.muted, borderRadius: 8 },
                ]}
              >
                <Text
                  style={[
                    styles.rank,
                    {
                      color:
                        r.rank <= 3 ? colors.primary : colors.mutedForeground,
                      minWidth: 36,
                    },
                  ]}
                >
                  {medal(r.rank)}
                </Text>
                {r.imageUrl ? (
                  <Image source={{ uri: r.imageUrl }} style={styles.avatar} />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Text
                      style={{ fontSize: 12, color: colors.mutedForeground }}
                    >
                      {r.displayName[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text
                  style={[styles.name, { color: colors.foreground, flex: 1 }]}
                  numberOfLines={1}
                >
                  {isMe ? "You" : r.displayName}
                </Text>
                <Text style={[styles.xp, { color: colors.primary }]}>
                  {r.xp.toLocaleString()} XP
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {!loading && top.length === 0 && (
        <View style={styles.center}>
          <Text style={{ color: colors.mutedForeground }}>
            No data yet. Start learning to appear here!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subheading: { fontSize: 12, marginBottom: 16 },
  center: { alignItems: "center", paddingVertical: 40 },
  meCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 16,
  },
  meLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  chips: { flexDirection: "row", gap: 8, marginTop: 8 },
  chip: { alignItems: "center", minWidth: 48 },
  chipVal: { fontSize: 14, fontWeight: "700" },
  chipLabel: { fontSize: 10, color: "#94a3b8", marginTop: 1 },
  list: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  listTitle: { fontSize: 13, fontWeight: "600", padding: 12, paddingBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  rowInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  rank: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14 },
  xp: { fontSize: 13, fontWeight: "700" },
});
