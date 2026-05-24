import { Layout } from "@/components/layout";
import { useUser, useClerk } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Flame, Trophy } from "lucide-react";
import { DonationCard } from "@/components/DonationCard";

type Me = {
  user: { id: string; email: string | null; displayName: string | null; imageUrl: string | null };
  streak: { currentStreak: number; longestStreak: number; lastActiveDate: string | null };
};

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [me, setMe] = useState<Me | null>(null);

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

        <DonationCard />

        <Button variant="outline" className="w-full" onClick={() => signOut({ redirectUrl: basePath || "/" })}>
          Sign Out
        </Button>
      </div>
    </Layout>
  );
}
