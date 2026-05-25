import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Trophy,
  Target,
  Activity,
  Languages,
  Sparkles,
  Type,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Stats = {
  overall: {
    sessions: number;
    questions: number;
    correct: number;
    accuracy: number;
  };
  byMode: {
    mode: string;
    sessions: number;
    questions: number;
    correct: number;
    accuracy: number;
  }[];
};

type HistoryRow = {
  id: string;
  mode: string;
  level: string | null;
  totalQuestions: number;
  correctAnswers: number;
  finishedAt: string | null;
};

const MODE_META: Record<
  string,
  { label: string; icon: typeof Brain; color: string }
> = {
  "de-to-en": {
    label: "German → English",
    icon: Languages,
    color: "text-blue-500",
  },
  "en-to-de": {
    label: "English → German",
    icon: Languages,
    color: "text-purple-500",
  },
  article: { label: "Articles", icon: Sparkles, color: "text-amber-500" },
  typing: { label: "Typing", icon: Type, color: "text-emerald-500" },
};

export default function StatsPage() {
  const { isSignedIn, isLoaded } = useAuth();

  const { data: stats } = useQuery<Stats>({
    queryKey: ["quiz-stats"],
    enabled: Boolean(isSignedIn),
    queryFn: async () => {
      const r = await fetch(`${basePath}/api/me/quiz-stats`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const { data: history } = useQuery<HistoryRow[]>({
    queryKey: ["quiz-history"],
    enabled: Boolean(isSignedIn),
    queryFn: async () => {
      const r = await fetch(`${basePath}/api/me/quiz-history`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  if (isLoaded && !isSignedIn) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <Brain className="w-12 h-12 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Sign in to see your stats</h1>
          <p className="text-muted-foreground">
            Track quiz history, accuracy, and progress.
          </p>
          <Link href="/sign-in">
            <Button className="font-bold">Sign In</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const overall = stats?.overall ?? {
    sessions: 0,
    questions: 0,
    correct: 0,
    accuracy: 0,
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Your Stats 📊</h1>
          <p className="text-muted-foreground">
            How your German is coming along.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard
            icon={Trophy}
            label="Accuracy"
            value={`${overall.accuracy}%`}
            color="text-amber-500"
          />
          <StatCard
            icon={Brain}
            label="Quizzes"
            value={overall.sessions}
            color="text-purple-500"
          />
          <StatCard
            icon={Target}
            label="Questions"
            value={overall.questions}
            color="text-blue-500"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              By Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!stats?.byMode.length && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No quizzes yet.{" "}
                <Link href="/quiz">
                  <span className="text-primary font-semibold hover:underline">
                    Start your first quiz →
                  </span>
                </Link>
              </p>
            )}
            {stats?.byMode.map((m) => {
              const meta = MODE_META[m.mode] ?? {
                label: m.mode,
                icon: Brain,
                color: "text-foreground",
              };
              const Icon = meta.icon;
              return (
                <div key={m.mode} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 font-semibold">
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                      {meta.label}
                    </div>
                    <span className="text-muted-foreground">
                      {m.correct}/{m.questions} ·{" "}
                      <span className="font-bold text-foreground">
                        {m.accuracy}%
                      </span>
                    </span>
                  </div>
                  <Progress value={m.accuracy} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Quizzes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!history?.length && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No completed quizzes yet.
              </p>
            )}
            {history?.map((row) => {
              const meta = MODE_META[row.mode] ?? {
                label: row.mode,
                icon: Brain,
                color: "text-foreground",
              };
              const Icon = meta.icon;
              const pct =
                row.totalQuestions > 0
                  ? Math.round((row.correctAnswers / row.totalQuestions) * 100)
                  : 0;
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover-elevate"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                    <div>
                      <div className="font-semibold text-sm">
                        {meta.label}
                        {row.level ? ` · ${row.level}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.finishedAt
                          ? new Date(row.finishedAt).toLocaleString()
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{pct}%</div>
                    <div className="text-xs text-muted-foreground">
                      {row.correctAnswers}/{row.totalQuestions}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Link href="/quiz">
          <Button size="lg" className="w-full font-bold">
            <Brain className="w-5 h-5 mr-2" /> Start New Quiz
          </Button>
        </Link>
      </div>
    </Layout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Brain;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="py-5 flex items-center gap-3">
        <Icon className={`w-9 h-9 ${color}`} />
        <div>
          <div className="text-2xl font-black leading-tight">{value}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            {label}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
