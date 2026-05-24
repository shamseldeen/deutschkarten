import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Image, ScrollView, ActivityIndicator } from "react-native";
import { useUser, useAuth } from "@clerk/expo";
import { useRouter, useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";

type Me = {
  user: { id: string; email: string | null; displayName: string | null; imageUrl: string | null } | null;
  streak: { currentStreak: number; longestStreak: number; lastActiveDate: string | null };
};

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "");

export default function ProfileTab() {
  const { user, isLoaded } = useUser();
  const { signOut, getToken } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getToken();
      const r = await fetch(`${BASE_URL}/api/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (r.ok) setMe(await r.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

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
});
