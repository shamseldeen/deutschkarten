import { Layout } from "@/components/layout";
import { useUser, useClerk } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { Flame, Trophy, Languages, Github } from "lucide-react";
import { DonationCard } from "@/components/DonationCard";
import { SUPPORTED_LANGS } from "@/lib/languages";
import { useLangPrefs } from "@/lib/useLangPrefs";
import { useGetFlashcardStats } from "@workspace/api-client-react";
import { computeRank, rankImageUrl, RANKS } from "@/lib/ranks";

type Me = {
  user: { id: string; email: string | null; displayName: string | null; imageUrl: string | null };
  streak: { currentStreak: number; longestStreak: number; lastActiveDate: string | null };
};

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [me, setMe] = useState<Me | null>(null);
  const { data: stats } = useGetFlashcardStats();
  const totalKnown = stats?.reduce((s, l) => s + l.known, 0) ?? 0;
  const c1Known = stats?.find((s) => s.level === "C1")?.known ?? 0;
  const rank = computeRank(totalKnown, c1Known);

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch(`${basePath}/api/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => {});
  }, [isLoaded, user, basePath]);

  if (!isLoaded) return null;
  if (!user) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-12">
          <p className="text-muted-foreground mb-4">Please sign in to view your profile.</p>
          <Button onClick={() => (window.location.href = `${basePath}/sign-in`)}>Sign In</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            {user.imageUrl ? (
              <img src={user.imageUrl} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                {(user.firstName?.[0] ?? user.emailAddresses?.[0]?.emailAddress?.[0] ?? "U").toUpperCase()}
              </div>
            )}
            <div>
              <CardTitle className="text-2xl">
                {user.firstName || user.username || user.emailAddresses?.[0]?.emailAddress || "User"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{user.emailAddresses?.[0]?.emailAddress}</p>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="overflow-hidden border-2"
          style={{ borderColor: `${rank.current.accent}55` }}
        >
          <CardContent className="pt-6 flex items-center gap-5">
            <img
              src={rankImageUrl(rank.current)}
              alt={rank.current.title}
              className="w-24 h-24 rounded-2xl shadow-md shrink-0"
              style={{ background: `${rank.current.accent}15` }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
                Rank {rank.current.tier} of {RANKS.length}
              </div>
              <div className="text-2xl font-black leading-tight" style={{ color: rank.current.accent }}>
                {rank.current.title}
              </div>
              <div className="text-sm text-muted-foreground italic">{rank.current.legend}</div>
              <div className="text-sm text-foreground/80 mt-1">{rank.current.blurb}</div>

              <div className="mt-3 space-y-1">
                {rank.next ? (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                      <span>{totalKnown} words mastered</span>
                      <span>
                        {rank.toNext > 0 ? (
                          <>{rank.toNext} to <span className="font-bold text-foreground">{rank.next.title}</span></>
                        ) : rank.nextBlockedBy === "c1" ? (
                          <span className="font-bold text-foreground">Learn 1 C1 card to unlock {rank.next.title}</span>
                        ) : (
                          <span className="font-bold text-foreground">Ready for {rank.next.title}!</span>
                        )}
                      </span>
                    </div>
                    <Progress value={rank.progressPct} className="h-2" />
                  </>
                ) : (
                  <div className="text-xs font-bold text-primary">
                    👑 Top rank reached — {totalKnown} words mastered.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Flame className="w-8 h-8 mx-auto text-orange-500 mb-2" />
              <div className="text-3xl font-black">{me?.streak.currentStreak ?? 0}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Current Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
              <div className="text-3xl font-black">{me?.streak.longestStreak ?? 0}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Longest Streak</div>
            </CardContent>
          </Card>
        </div>

        <LanguageSettingsCard />

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Github className="w-4 h-4" /> Open Source & Community
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              DeutschKarten is a community library — every flashcard you generate becomes
              free for every learner. Translations you request are cached and shared.
            </p>
            <a
              href="https://github.com/shamseldeen"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Github className="w-4 h-4" /> View source on GitHub
            </a>
          </CardContent>
        </Card>

        <DonationCard />

        <Button variant="outline" className="w-full" onClick={() => signOut({ redirectUrl: basePath || "/" })}>
          Sign Out
        </Button>
      </div>
    </Layout>
  );
}

function LanguageSettingsCard() {
  const { prefs, save, loading } = useLangPrefs();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Languages className="w-4 h-4" /> Translation Languages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Pick the languages you want to see alongside each German word. Translations
          are generated on-demand and shared with the whole community.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Primary</label>
            <select
              className="w-full border border-border rounded-md bg-background px-2 py-2 text-sm"
              disabled={loading}
              value={prefs.primaryLang}
              onChange={(e) => save({ ...prefs, primaryLang: e.target.value })}
            >
              {SUPPORTED_LANGS.map((l) => (
                <option key={l.code} value={l.code}>{l.name} — {l.nativeName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Secondary</label>
            <select
              className="w-full border border-border rounded-md bg-background px-2 py-2 text-sm"
              disabled={loading}
              value={prefs.secondaryLang ?? "none"}
              onChange={(e) => save({ ...prefs, secondaryLang: e.target.value === "none" ? null : e.target.value })}
            >
              <option value="none">— None —</option>
              {SUPPORTED_LANGS.filter((l) => l.code !== prefs.primaryLang).map((l) => (
                <option key={l.code} value={l.code}>{l.name} — {l.nativeName}</option>
              ))}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
