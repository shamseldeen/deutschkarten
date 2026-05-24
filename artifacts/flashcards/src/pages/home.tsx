import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { useGetFlashcardStats, useGetDailyFlashcards } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLevelColor } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { BrainCircuit, Play, TrendingUp } from "lucide-react";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetFlashcardStats();
  const { data: dailyCards, isLoading: dailyLoading } = useGetDailyFlashcards();

  const totalCards = stats?.reduce((acc, curr) => acc + curr.total, 0) || 0;
  const knownCards = stats?.reduce((acc, curr) => acc + curr.known, 0) || 0;
  const overallProgress = totalCards > 0 ? (knownCards / totalCards) * 100 : 0;

  return (
    <Layout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground font-serif">Willkommen zurück!</h1>
            <p className="text-muted-foreground mt-2">Ready to level up your German vocabulary today?</p>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-primary/20 bg-primary/5 shadow-md shadow-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-primary">
                <BrainCircuit className="w-5 h-5" />
                Overall Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-4xl font-black text-foreground">{knownCards} <span className="text-xl text-muted-foreground font-medium">/ {totalCards} words</span></span>
                    <span className="text-lg font-bold text-primary">{Math.round(overallProgress)}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-3" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Daily Set
              </CardTitle>
              <CardDescription>Your curated review stack</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              {dailyLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="text-center py-4">
                  <span className="text-5xl font-black text-foreground">{dailyCards?.length || 0}</span>
                  <p className="text-sm text-muted-foreground mt-2">cards ready for review</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Link href="/daily" className="w-full">
                <Button className="w-full font-bold" size="lg" disabled={!dailyCards?.length}>
                  <Play className="w-4 h-4 mr-2" fill="currentColor" />
                  Start Daily Practice
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <section>
          <h2 className="text-2xl font-bold mb-4 font-serif">Levels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statsLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
            ) : stats?.length ? (
              stats.map((stat) => (
                <Card key={stat.level} className="overflow-hidden hover:border-primary/50 transition-colors hover-elevate">
                  <div className={cn("h-2 w-full", getLevelColor(stat.level).split(" ")[0])} />
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                      <span className={cn("text-xl font-bold", getLevelColor(stat.level).split(" ")[1])}>{stat.level}</span>
                      <span className="text-sm font-medium text-muted-foreground">{stat.percentage}%</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <Progress value={stat.percentage} className="h-2 mb-3" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{stat.known} known</span>
                      <span>{stat.total - stat.known} to learn</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Link href={`/study/${stat.level}`} className="w-full">
                      <Button variant="secondary" className="w-full font-medium" disabled={stat.total === 0}>
                        Study {stat.level}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground">No cards generated yet.</p>
                <Link href="/generate">
                  <Button variant="link" className="mt-2 text-primary font-bold">Generate your first cards →</Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
