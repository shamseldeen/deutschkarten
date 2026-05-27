import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser, useAuth } from "@clerk/react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trophy, Medal, Award, Sparkles, BookOpen, Flame,
  Users, Globe, Lock, Copy, Check, UserPlus, Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Row = {
  rank: number;
  userId: string;
  displayName: string;
  imageUrl: string | null;
  knownCards: number;
  correctAnswers: number;
  longestStreak: number;
  currentStreak: number;
  xp: number;
  rankTitle: string;
  rankSlug: string;
};

type Resp = { top: Row[]; me: Row | null; friendCode?: string | null };

type Mode = "public" | "friends" | "personal";

function rankBadge(rank: number) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-700" />;
  return <span className="text-slate-400 text-sm font-semibold w-5 text-center">{rank}</span>;
}

function XpBar({ pct }: { pct: number }) {
  return (
    <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}

function LeaderRow({ row, highlight }: { row: Row; highlight?: boolean }) {
  return (
    <div className={
      "flex items-center gap-3 py-2.5 px-3 rounded-lg " +
      (highlight ? "bg-yellow-50 dark:bg-yellow-950/30 ring-1 ring-yellow-300" : "hover:bg-slate-50 dark:hover:bg-slate-900")
    }>
      <div className="w-6 flex justify-center shrink-0">{rankBadge(row.rank)}</div>
      {row.imageUrl ? (
        <img src={row.imageUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 shrink-0">
          {row.displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate text-sm">{row.displayName}</div>
        <div className="text-xs text-slate-500 truncate">{row.rankTitle}</div>
        <div className="flex gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <BookOpen className="w-3 h-3" />{row.knownCards}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Flame className="w-3 h-3" />{row.currentStreak}d
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Sparkles className="w-3 h-3" />{row.correctAnswers}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-bold text-base text-yellow-600 dark:text-yellow-400">
          {row.xp.toLocaleString()}
          <span className="text-xs ml-1 font-normal text-slate-400">XP</span>
        </div>
      </div>
    </div>
  );
}

function PersonalStats({ me }: { me: Row }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: "XP Points", value: me.xp.toLocaleString(), icon: <Zap className="w-4 h-4 text-yellow-500" /> },
        { label: "Cards Known", value: me.knownCards, icon: <BookOpen className="w-4 h-4 text-blue-500" /> },
        { label: "Current Streak", value: `${me.currentStreak}d`, icon: <Flame className="w-4 h-4 text-orange-500" /> },
        { label: "Rank", value: `#${me.rank}`, icon: <Trophy className="w-4 h-4 text-purple-500" /> },
      ].map((s) => (
        <Card key={s.label} className="p-3">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            {s.icon}
            <span className="text-xs">{s.label}</span>
          </div>
          <div className="font-bold text-xl">{s.value}</div>
          <div className="text-xs text-slate-400 mt-0.5">{me.rankTitle}</div>
        </Card>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useUser();
  const { isSignedIn } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [mode, setMode] = useState<Mode>("public");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  const apiBase = `${basePath}/api`;

  const { data, isLoading } = useQuery<Resp>({
    queryKey: ["leaderboard", mode],
    queryFn: async () => {
      const r = await fetch(`${apiBase}/leaderboard?mode=${mode === "personal" ? "public" : mode}`, { credentials: "include" });
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    refetchInterval: mode === "public" ? 60_000 : 0,
  });

  const { data: friendGroup } = useQuery<{ groupId: string; friendCode: string; memberCount: number }>({
    queryKey: ["friend-group"],
    enabled: isSignedIn === true && mode === "friends",
    queryFn: async () => {
      const r = await fetch(`${apiBase}/leaderboard/friend-group`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      const r = await fetch(`${apiBase}/leaderboard/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ friendCode: code }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "Failed to join");
      return body;
    },
    onSuccess: () => {
      toast({ title: "Joined group!", description: "You've joined the friend group." });
      setJoinCode("");
      qc.invalidateQueries({ queryKey: ["leaderboard", "friends"] });
      qc.invalidateQueries({ queryKey: ["friend-group"] });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const copyCode = () => {
    if (!friendGroup?.friendCode) return;
    navigator.clipboard.writeText(friendGroup.friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const top = data?.top ?? [];
  const me = data?.me ?? null;
  const myId = user?.id;

  const tabs: { key: Mode; label: string; icon: React.ReactNode }[] = [
    { key: "public", label: "Public", icon: <Globe className="w-4 h-4" /> },
    { key: "friends", label: "Friends", icon: <Users className="w-4 h-4" /> },
    { key: "personal", label: "My Stats", icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Trophy className="w-7 h-7 text-yellow-500" />
          <h1 className="text-2xl font-bold">Leaderboard</h1>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={
                "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all " +
                (mode === t.key
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* XP formula tooltip */}
        {mode === "public" && (
          <p className="text-xs text-slate-400">
            XP = CEFR weight (A1=1…C1=5) × streak bonus × difficulty bonus — harder cards earned from mistakes are worth more.
          </p>
        )}

        {/* Personal stats */}
        {mode === "personal" && me && <PersonalStats me={me} />}
        {mode === "personal" && !me && !isLoading && (
          <Card className="p-6 text-center text-slate-500 text-sm">
            Sign in to see your personal stats.
          </Card>
        )}

        {/* Friends mode: invite code UI */}
        {mode === "friends" && isSignedIn && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4" />Invite friends to compete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {friendGroup && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Share your invite code:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-1.5 rounded font-mono text-sm font-bold tracking-widest">
                      {friendGroup.friendCode}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyCode}>
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{friendGroup.memberCount} member{friendGroup.memberCount !== 1 ? "s" : ""} in your group</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 mb-1">Or enter a friend's code to join their group:</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="ABCD1234"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase tracking-widest"
                    maxLength={8}
                  />
                  <Button
                    size="sm"
                    disabled={joinCode.length < 6 || joinMutation.isPending}
                    onClick={() => joinMutation.mutate(joinCode)}
                  >
                    Join
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* My rank card */}
        {mode !== "personal" && me && (
          <Card className="border-2 border-yellow-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />Your rank
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderRow row={me} highlight />
            </CardContent>
          </Card>
        )}

        {/* Leaderboard table */}
        {mode !== "personal" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {mode === "friends" ? "Friends ranking" : "Top 50 learners"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {isLoading && <div className="text-sm text-slate-500 py-4">Loading…</div>}
              {!isLoading && top.length === 0 && (
                <div className="text-sm text-slate-500 py-6 text-center">
                  {mode === "friends"
                    ? "No friends yet — share your invite code to start competing!"
                    : "No one has earned XP yet — be the first!"}
                </div>
              )}
              {top.map((r) => (
                <LeaderRow key={r.userId} row={r} highlight={r.userId === myId} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
