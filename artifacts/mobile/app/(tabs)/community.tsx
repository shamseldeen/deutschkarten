import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { communityApi, type CommunityStats, type CommunityPost } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ name, imageUrl }: { name: string | null; imageUrl: string | null }) {
  const colors = useColors();
  const letter = (name ?? "?").charAt(0).toUpperCase();
  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
      <Text style={[styles.avatarLetter, { color: colors.primary }]}>{letter}</Text>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={styles.statEmoji}>{icon}</Text>
      <Text style={[styles.statValue, { color: colors.foreground }]}>
        {value.toLocaleString()}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function PostCard({
  post,
  onLike,
  onDelete,
}: {
  post: CommunityPost;
  onLike: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const colors = useColors();
  const [liked, setLiked] = useState(post.liked);
  const [count, setCount] = useState(post.likeCount);

  const handleLike = () => {
    setLiked((v) => !v);
    setCount((c) => (liked ? c - 1 : c + 1));
    onLike(post.id);
  };

  return (
    <View style={[styles.postCard, { borderBottomColor: colors.border }]}>
      <Avatar name={post.displayName} imageUrl={post.imageUrl} />
      <View style={styles.postBody}>
        <View style={styles.postHeader}>
          <Text style={[styles.postName, { color: colors.foreground }]}>
            {post.displayName ?? "Anonymous"}
          </Text>
          <Text style={[styles.postTime, { color: colors.mutedForeground }]}>
            {timeAgo(post.createdAt)}
          </Text>
        </View>
        <Text style={[styles.postContent, { color: colors.foreground }]}>
          {post.content}
        </Text>
        <View style={styles.postActions}>
          <Pressable onPress={handleLike} style={styles.actionBtn}>
            <Feather
              name="heart"
              size={14}
              color={liked ? "#ef4444" : colors.mutedForeground}
            />
            <Text
              style={[
                styles.actionText,
                { color: liked ? "#ef4444" : colors.mutedForeground },
              ]}
            >
              {count}
            </Text>
          </Pressable>
          {post.isOwn && (
            <Pressable onPress={() => onDelete(post.id)} style={styles.actionBtn}>
              <Feather name="trash-2" size={14} color={colors.mutedForeground} />
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
                Delete
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export default function CommunityTab() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const s = await communityApi.getStats();
        setStats(s);
        if (isSignedIn) {
          const p = await communityApi.getPosts();
          setPosts(p);
        }
      } catch {}
      finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isSignedIn],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const doPost = async (content: string) => {
    setPosting(true);
    try {
      await communityApi.createPost(content);
      setDraft("");
      await loadData();
    } catch (e: any) {
      const errMsg: string = e?.body?.error ?? e?.message ?? "Failed to post";
      if (errMsg === "consent_required") {
        showConsentDialog(content);
      } else {
        Alert.alert("Error", errMsg);
      }
    } finally {
      setPosting(false);
    }
  };

  const showConsentDialog = (pendingContent: string) => {
    Alert.alert(
      "Community Agreement",
      "Before posting, please confirm:\n\n" +
        "✅ Posts are visible to all registered users\n" +
        "⚠️ Do NOT share personal or confidential information\n" +
        "✅ Be respectful and constructive\n" +
        "✅ Your display name will be shown\n\n" +
        "By accepting you agree to our Terms of Service.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept & Post",
          onPress: async () => {
            try {
              await communityApi.acceptConsent();
              await doPost(pendingContent);
            } catch {}
          },
        },
      ],
    );
  };

  const handleLike = async (id: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
          : p,
      ),
    );
    try {
      await communityApi.likePost(id);
    } catch {
      loadData();
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Delete Post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await communityApi.deletePost(id);
            setPosts((prev) => prev.filter((p) => p.id !== id));
          } catch {
            Alert.alert("Error", "Could not delete post");
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="users" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Community</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Share your German learning journey
            </Text>
          </View>
        </View>

        {/* Stats */}
        {loading && !stats ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : stats ? (
          <View style={styles.statsGrid}>
            <StatCard icon="📚" value={stats.totalCards} label="Flashcards" />
            <StatCard icon="👥" value={stats.members} label="Members" />
            <StatCard icon="🌍" value={stats.languages} label="Languages" />
            <StatCard icon="✨" value={stats.contributors} label="Contributors" />
          </View>
        ) : null}

        {/* Discussion Board */}
        <View style={[styles.board, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.boardHeader}>
            <Feather name="message-square" size={16} color={colors.foreground} />
            <Text style={[styles.boardTitle, { color: colors.foreground }]}>Discussion Board</Text>
          </View>

          {/* Composer or Guest lock */}
          {isSignedIn ? (
            <View style={styles.composer}>
              <Avatar
                name={user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? null}
                imageUrl={user?.imageUrl ?? null}
              />
              <View style={styles.composerRight}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Share a tip, ask a question, celebrate a milestone…"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  maxLength={1000}
                  style={[
                    styles.input,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                />
                <View style={styles.composerFooter}>
                  <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
                    {draft.length}/1000
                  </Text>
                  <Pressable
                    onPress={() => {
                      const t = draft.trim();
                      if (t) doPost(t);
                    }}
                    disabled={!draft.trim() || posting}
                    style={[
                      styles.postBtn,
                      {
                        backgroundColor:
                          draft.trim() && !posting ? colors.primary : colors.muted,
                      },
                    ]}
                  >
                    {posting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="send" size={14} color="#fff" />
                    )}
                    <Text style={styles.postBtnText}>Post</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.guestLock, { backgroundColor: colors.muted + "60" }]}>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.guestTitle, { color: colors.foreground }]}>
                  Sign in to join the discussion
                </Text>
                <Text style={[styles.guestSub, { color: colors.mutedForeground }]}>
                  Share tips, ask questions, celebrate milestones
                </Text>
              </View>
              <View style={styles.guestBtns}>
                <Pressable
                  onPress={() => router.push("/(auth)/sign-in")}
                  style={[styles.guestBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.guestBtnText, { color: colors.foreground }]}>Sign in</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/(auth)/sign-up")}
                  style={[styles.guestBtnPrimary, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.guestBtnPrimaryText}>Register</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Legal note */}
          <Text
            style={[
              styles.legalNote,
              { color: colors.mutedForeground, backgroundColor: colors.muted + "40" },
            ]}
          >
            🔒 Community posts are visible to all registered users. Do not share personal
            or confidential information.
          </Text>

          {/* Posts */}
          {isSignedIn && loading && posts.length === 0 && (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          )}
          {isSignedIn && !loading && posts.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No posts yet — be the first to share!
            </Text>
          )}
          {isSignedIn && posts.length > 0 && (
            <View>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onLike={handleLike} onDelete={handleDelete} />
              ))}
            </View>
          )}
          {!isSignedIn && (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Sign in to read and join community discussions.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11 },
  board: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  boardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    paddingBottom: 10,
  },
  boardTitle: { fontSize: 15, fontWeight: "700" },
  composer: { flexDirection: "row", gap: 10, padding: 14, paddingTop: 0 },
  composerRight: { flex: 1, gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  composerFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  charCount: { fontSize: 11 },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  postBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  guestLock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 14,
    marginTop: 0,
    padding: 12,
    borderRadius: 12,
  },
  guestTitle: { fontSize: 13, fontWeight: "600" },
  guestSub: { fontSize: 11, marginTop: 1 },
  guestBtns: { gap: 6 },
  guestBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  guestBtnText: { fontSize: 12, fontWeight: "600" },
  guestBtnPrimary: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: "center" },
  guestBtnPrimaryText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  legalNote: { fontSize: 11, margin: 14, marginTop: 4, padding: 10, borderRadius: 8, lineHeight: 16 },
  emptyText: { textAlign: "center", fontSize: 14, padding: 24 },
  postCard: { flexDirection: "row", gap: 10, padding: 14, borderBottomWidth: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 15, fontWeight: "700" },
  postBody: { flex: 1 },
  postHeader: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  postName: { fontSize: 13, fontWeight: "700" },
  postTime: { fontSize: 11 },
  postContent: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  postActions: { flexDirection: "row", gap: 16, marginTop: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 12 },
});
