import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Milestone } from "@/lib/guestMilestones";
import { cn } from "@/lib/utils";

const COLOR_MAP = {
  amber: {
    bg: "from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/60 dark:via-yellow-950/50 dark:to-orange-950/40",
    border: "border-amber-300 dark:border-amber-700",
    badge: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200",
    btn: "bg-amber-500 hover:bg-amber-600 text-white",
    ring: "ring-amber-200 dark:ring-amber-800",
  },
  emerald: {
    bg: "from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/60 dark:via-green-950/50 dark:to-teal-950/40",
    border: "border-emerald-300 dark:border-emerald-700",
    badge: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200",
    btn: "bg-emerald-500 hover:bg-emerald-600 text-white",
    ring: "ring-emerald-200 dark:ring-emerald-800",
  },
  blue: {
    bg: "from-blue-50 via-indigo-50 to-sky-50 dark:from-blue-950/60 dark:via-indigo-950/50 dark:to-sky-950/40",
    border: "border-blue-300 dark:border-blue-700",
    badge: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200",
    btn: "bg-blue-500 hover:bg-blue-600 text-white",
    ring: "ring-blue-200 dark:ring-blue-800",
  },
  purple: {
    bg: "from-purple-50 via-violet-50 to-indigo-50 dark:from-purple-950/60 dark:via-violet-950/50 dark:to-indigo-950/40",
    border: "border-purple-300 dark:border-purple-700",
    badge: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200",
    btn: "bg-purple-500 hover:bg-purple-600 text-white",
    ring: "ring-purple-200 dark:ring-purple-800",
  },
  rose: {
    bg: "from-rose-50 via-pink-50 to-red-50 dark:from-rose-950/60 dark:via-pink-950/50 dark:to-red-950/40",
    border: "border-rose-300 dark:border-rose-700",
    badge: "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200",
    btn: "bg-rose-500 hover:bg-rose-600 text-white",
    ring: "ring-rose-200 dark:ring-rose-800",
  },
};

type Props = {
  milestone: Milestone;
  totalCards: number;
  onDismiss: () => void;
};

export function GuestMilestoneToast({ milestone, totalCards, onDismiss }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const c = COLOR_MAP[milestone.color];

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 9000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center pointer-events-none px-4 pb-6 sm:pb-0">
      <div
        className={cn(
          "pointer-events-auto relative w-full max-w-sm rounded-2xl border-2 bg-gradient-to-br p-5 shadow-2xl ring-4",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
          c.bg, c.border, c.ring,
        )}
        dir="rtl"
      >
        <button
          onClick={onDismiss}
          className="absolute top-3 left-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          <div className="text-5xl leading-none">{milestone.emoji}</div>

          <div>
            <div className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mb-2", c.badge)}>
              <Sparkles className="w-3 h-3" />
              {totalCards} بطاقة في هذه الجلسة
            </div>
            <h3 className="text-lg font-black leading-tight">{milestone.headline}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{milestone.sub}</p>
          </div>

          <div className="flex flex-col gap-2 w-full pt-1">
            <Link href="/sign-up" className="w-full" onClick={onDismiss}>
              <Button className={cn("w-full font-bold text-sm", c.btn)}>
                سجّل الآن وحافظ على تقدمك 🔒
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={onDismiss}
            >
              أكمل المذاكرة بدون تسجيل
            </Button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden">
          <div
            className={cn("h-full animate-[shrink_9s_linear_forwards]", c.btn)}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
