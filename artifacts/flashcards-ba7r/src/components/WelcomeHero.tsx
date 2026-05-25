import { useMemo } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Quote, Sparkles, BookOpen } from "lucide-react";
import { pickMotivationOfTheDay } from "@/lib/motivation";

const GREETINGS = ["Guten Morgen", "Guten Tag", "Guten Abend", "Schönen Tag"];

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return GREETINGS[0]!;
  if (h < 17) return GREETINGS[1]!;
  if (h < 21) return GREETINGS[2]!;
  return GREETINGS[3]!;
}

export function WelcomeHero({ name }: { name?: string | null }) {
  const m = useMemo(() => pickMotivationOfTheDay(), []);
  const greet = useMemo(() => timeGreeting(), []);

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      {/* decorative sun rays */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-12 w-64 h-64 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary/80 text-sm font-semibold">
            <Sparkles className="w-4 h-4" /> Motivation des Tages
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground font-serif">
              {greet}
              {name ? `, ${name}` : ""}!
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Every German word you learn brings a new world closer.
            </p>
          </div>

          <blockquote className="relative pl-6 border-l-4 border-primary/60">
            <Quote className="absolute -left-3 -top-2 w-5 h-5 text-primary/70 bg-background rounded-full p-0.5" />
            <p className="text-lg md:text-xl font-bold italic text-foreground leading-snug">
              &ldquo;{m.de}&rdquo;
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {m.en}
              <span className="mx-2 opacity-50">·</span>
              <span dir="rtl" className="font-medium">
                {m.ar}
              </span>
            </p>
          </blockquote>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/daily">
              <Button size="lg" className="font-bold">
                <Sparkles className="w-4 h-4 mr-2" />
                Start today&rsquo;s practice
              </Button>
            </Link>
            <Link href="/roadmap">
              <Button size="lg" variant="outline" className="font-bold">
                <BookOpen className="w-4 h-4 mr-2" />
                What to master
              </Button>
            </Link>
          </div>
        </div>

        {/* ocean emblem (themed) */}
        <div className="hidden md:flex items-center justify-center">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/70 to-primary shadow-xl shadow-primary/20" />
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/40 to-primary/70" />
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 w-1.5 h-6 bg-primary/80 rounded-full origin-bottom"
                style={{
                  transform: `translate(-50%, -110%) rotate(${i * 30}deg) translateY(-26px)`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
