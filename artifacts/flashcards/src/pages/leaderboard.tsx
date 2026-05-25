import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Sparkles, BookOpen, Flame } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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

type Resp = { top: Row[]; me: Row | null };

function rankBadge(rank: number) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-700" />;
  return (
    <span className="text-slate-400 text-sm font-semibold w-5 text-center">
      {rank}
    </span>
  );
}

export default function LeaderboardPage() {
  const { user } = useUser();

  const { data, isLoading } = useQuery<Resp>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const r = await fetch(`${basePath}/api/leaderboard`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    refetchInterval: 60_000,
  });

  const top = data?.top ?? [];
  const me = data?.me ?? null;
  const myId = user?.id;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-7 h-7 text-yellow-500" />
          <h1 className="text-2xl font-bold">Leaderboard</h1>
        </div>
        <p className="text-sm text-slate-500">
          XP = known cards × 10 + correct quiz answers × 5 + longest streak × 20
        </p>

        {me && (
          <Card className="border-2 border-yellow-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Your rank
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Row row={me} highlight />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top learners</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading && (
              <div className="text-sm text-slate-500 py-4">Loading…</div>
            )}
            {!isLoading && top.length === 0 && (
              <div className="text-sm text-slate-500 py-4">
                No one has earned XP yet — be the first!
              </div>
            )}
            {top.map((r) => (
              <Row key={r.userId} row={r} highlight={r.userId === myId} />
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function Row({ row, highlight }: { row: Row; highlight?: boolean }) {
  return (
    <div
      className={
        "flex items-center gap-3 py-2 px-2 rounded " +
        (highlight
          ? "bg-yellow-50 dark:bg-yellow-950/30"
          : "hover:bg-slate-50 dark:hover:bg-slate-900")
      }
    >
      <div className="w-6 flex justify-center">{rankBadge(row.rank)}</div>
      {row.imageUrl ? (
        <img
          src={row.imageUrl}
          alt=""
          className="w-8 h-8 rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300">
          {row.displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{row.displayName}</div>
        <div className="text-xs text-slate-500 flex gap-3">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {row.knownCards}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {row.correctAnswers}
          </span>
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3" />
            {row.longestStreak}
          </span>
        </div>
      </div>
      <div className="font-bold text-lg text-yellow-600 dark:text-yellow-400">
        {row.xp.toLocaleString()}
        <span className="text-xs ml-1 font-normal text-slate-500">XP</span>
      </div>
    </div>
  );
}
