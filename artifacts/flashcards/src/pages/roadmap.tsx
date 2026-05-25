import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLevelColor } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { ROADMAP, STUDY_HABITS } from "@/lib/roadmap";
import {
  Calendar,
  Mic,
  Tag,
  Headphones,
  Repeat,
  Edit3,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const ICONS = {
  calendar: Calendar,
  mic: Mic,
  tag: Tag,
  headphones: Headphones,
  repeat: Repeat,
  "edit-3": Edit3,
} as const;

export default function RoadmapPage() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5" /> Learning Roadmap
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight font-serif">
            What you need to master
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A clear path from absolute beginner to advanced. Each CEFR level
            shows what you should be able to do, the grammar to master, and a
            realistic vocab goal.
          </p>
        </header>

        {/* CEFR level cards */}
        <section className="space-y-6">
          {ROADMAP.map((lv, i) => {
            const colorClasses = getLevelColor(lv.level).split(" ");
            const bgColor = colorClasses[0] ?? "bg-primary";
            const textColor = colorClasses[1] ?? "text-primary";
            return (
              <Card key={lv.level} className="overflow-hidden">
                <div className={cn("h-1.5 w-full", bgColor)} />
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-lg font-black px-3 py-1",
                            textColor,
                          )}
                        >
                          {lv.level}
                        </Badge>
                        <CardTitle className="text-2xl">{lv.title}</CardTitle>
                      </div>
                      <p className="text-muted-foreground mt-2">
                        {lv.description}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <div className={cn("text-2xl font-black", textColor)}>
                        {lv.vocabGoal.toLocaleString()}
                      </div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        words
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ≈ {lv.hoursEstimate}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> You can…
                    </h4>
                    <ul className="space-y-1.5 text-sm">
                      {lv.canDo.map((c) => (
                        <li key={c} className="flex gap-2">
                          <span
                            className={cn(
                              "mt-1 w-1.5 h-1.5 rounded-full shrink-0",
                              bgColor,
                            )}
                          />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Grammar to master
                    </h4>
                    <ul className="space-y-1.5 text-sm">
                      {lv.grammar.map((g) => (
                        <li key={g} className="flex gap-2">
                          <span
                            className={cn(
                              "mt-1 w-1.5 h-1.5 rounded-full shrink-0",
                              bgColor,
                            )}
                          />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Vocabulary themes
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {lv.topics.map((t) => (
                        <span
                          key={t}
                          className={cn(
                            "text-xs font-medium px-2 py-1 rounded-md border",
                            textColor,
                            "border-current/30 bg-current/5",
                          )}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <Link href={`/study/${lv.level}`} className="block mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full font-semibold"
                      >
                        Study {lv.level} cards{" "}
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
                {i < ROADMAP.length - 1 && (
                  <div className="flex justify-center pb-3 -mt-1">
                    <ArrowRight className="w-5 h-5 text-muted-foreground/40 rotate-90" />
                  </div>
                )}
              </Card>
            );
          })}
        </section>

        {/* Study habits */}
        <section>
          <h2 className="text-2xl font-bold mb-4 font-serif">
            Habits that actually work
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STUDY_HABITS.map((h) => {
              const Icon = ICONS[h.icon as keyof typeof ICONS] ?? Sparkles;
              return (
                <Card key={h.title} className="hover-elevate">
                  <CardContent className="pt-6 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base">{h.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {h.desc}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-8 text-center space-y-4">
            <h3 className="text-2xl font-bold">Ready to start?</h3>
            <p className="text-muted-foreground">
              Pick today&rsquo;s practice or take a placement quiz to see where
              you stand.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/daily">
                <Button size="lg" className="font-bold">
                  Start Daily Practice
                </Button>
              </Link>
              <Link href="/quiz">
                <Button size="lg" variant="outline" className="font-bold">
                  Take a placement quiz
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
