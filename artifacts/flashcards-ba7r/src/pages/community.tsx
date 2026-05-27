import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsentModal, useConsentNeeded } from "@/components/ConsentModal";
import {
  Users, Globe, MessageSquare, Heart, Trash2, BookOpen,
  Flame, Trophy, Sparkles, Send, Lock,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${basePath}/api`;

type Stats = { totalCards: number; contributors: number; languages: number; members: number };

type Post = {
  id: number;
  content: string;
  likeCount: number;
  createdAt: string;
  userId: string;
  displayName: string | null;
  imageUrl: string | null;
  isOwn: boolean;
  liked: boolean;
};

function Avatar({ name, imageUrl, size = 9 }: { name: string | null; imageUrl: string | null; size?: number }) {
  const s = `w-${size} h-${size}`;
  return imageUrl ? (
    <img src={imageUrl} alt="" className={`${s} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${s} rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0`}>
      {(name ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-black text-2xl leading-none">{typeof value === "number" ? value.toLocaleString() : value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
    </Card>
  );
}

function PostCard({ post, onLike, onDelete }: { post: Post; onLike: (id: number) => void; onDelete: (id: number) => void }) {
  const [liked, setLiked] = useState(post.liked);
  const [count, setCount] = useState(post.likeCount);

  const handleLike = () => {
    setLiked((v) => !v);
    setCount((c) => liked ? c - 1 : c + 1);
    onLike(post.id);
  };

  return (
    <div className="flex gap-3 py-4 border-b last:border-0">
      <Avatar name={post.displayName} imageUrl={post.imageUrl} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-sm">{post.displayName ?? "Anonymous"}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm mt-1 whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-400"}`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
            {count}
          </button>
          {post.isOwn && (
            <button
              onClick={() => onDelete(post.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const consentNeeded = useConsentNeeded();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: stats } = useQuery<Stats>({
    queryKey: ["community-stats"],
    queryFn: async () => {
      const r = await fetch(`${API}/community/stats`);
      return r.json();
    },
    refetchInterval: 120_000,
  });

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["community-posts"],
    queryFn: async () => {
      const r = await fetch(`${API}/community/posts`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: isSignedIn === true,
    refetchInterval: 30_000,
  });

  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      const r = await fetch(`${API}/community/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      const body = await r.json();
      if (!r.ok) {
        if (body.error === "consent_required") setShowConsent(true);
        throw new Error(body.error ?? "Failed");
      }
      return body;
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (e: Error) => {
      if (e.message !== "consent_required") {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${API}/community/posts/${id}/like`, { method: "POST", credentials: "include" });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["community-posts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${API}/community/posts/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-posts"] }),
    onError: () => toast({ title: "Error", description: "Could not delete post", variant: "destructive" }),
  });

  const handlePost = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (consentNeeded) { setShowConsent(true); return; }
    postMutation.mutate(trimmed);
  };

  return (
    <Layout>
      {showConsent && <ConsentModal onAccept={() => setShowConsent(false)} />}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Community</h1>
            <p className="text-sm text-muted-foreground">Share your learning journey with fellow German learners</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<BookOpen className="w-5 h-5 text-primary" />} value={stats.totalCards} label="Flashcards" />
            <StatCard icon={<Users className="w-5 h-5 text-blue-500" />} value={stats.members} label="Members" />
            <StatCard icon={<Globe className="w-5 h-5 text-green-500" />} value={stats.languages} label="Languages" />
            <StatCard icon={<Sparkles className="w-5 h-5 text-yellow-500" />} value={stats.contributors} label="Contributors" />
          </div>
        )}

        {/* Quick links */}
        <div className="flex gap-2 flex-wrap">
          <Link href="/leaderboard">
            <Button variant="outline" size="sm" className="gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />Leaderboard
            </Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="w-4 h-4 text-blue-500" />Friend Groups
            </Button>
          </Link>
          <Link href="/stats">
            <Button variant="outline" size="sm" className="gap-2">
              <Flame className="w-4 h-4 text-orange-500" />My Stats
            </Button>
          </Link>
        </div>

        {/* Discussion board */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />Discussion Board
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Composer */}
            {isSignedIn ? (
              <div className="flex gap-3">
                <Avatar name={user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? null} imageUrl={user?.imageUrl ?? null} size={9} />
                <div className="flex-1 space-y-2">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Share a learning tip, ask a question, or celebrate a milestone…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="resize-none text-sm min-h-[80px]"
                    maxLength={1000}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost();
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{draft.length}/1000 · Cmd+Enter to post</span>
                    <Button size="sm" onClick={handlePost} disabled={!draft.trim() || postMutation.isPending} className="gap-2">
                      <Send className="w-3.5 h-3.5" />Post
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Sign in to join the discussion</p>
                    <p className="text-xs text-muted-foreground">Share tips, ask questions, celebrate milestones</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/sign-in"><Button size="sm" variant="outline">Sign in</Button></Link>
                  <Link href="/sign-up"><Button size="sm">Register</Button></Link>
                </div>
              </div>
            )}

            {/* Legal note */}
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              🔒 Community posts are visible to all registered users. Do not share personal or confidential information.{" "}
              <Link href="/terms" className="underline">Terms</Link> · <Link href="/privacy" className="underline">Privacy</Link>
            </p>

            {/* Posts list */}
            {!isSignedIn && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Sign in to read and join community discussions.
              </div>
            )}
            {isSignedIn && isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
            )}
            {isSignedIn && !isLoading && posts?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No posts yet — be the first to share!
              </div>
            )}
            {isSignedIn && posts && posts.length > 0 && (
              <div className="divide-y">
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    onLike={(id) => likeMutation.mutate(id)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
