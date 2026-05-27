import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { Zap, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGuestXp, hasGuestProgress } from "@/lib/guestProgress";

type BannerVariant = "soft" | "warning";

export function GuestProgressBanner({ variant = "soft", sessionXp = 0 }: { variant?: BannerVariant; sessionXp?: number }) {
  const { isSignedIn } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isSignedIn && hasGuestProgress()) setVisible(true);
  }, [isSignedIn]);

  if (isSignedIn || dismissed || !visible) return null;

  const totalXp = getGuestXp();

  if (variant === "warning") {
    return (
      <div className="w-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-orange-800 dark:text-orange-300 text-sm">
              تقدمك غير محفوظ
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
              كسبت <span className="font-bold">{totalXp} XP</span> و{" "}
              ستُفقد شاراتك وإنجازاتك عند إغلاق المتصفح.
            </p>
          </div>
          <button onClick={() => setDismissed(true)} className="text-orange-400 hover:text-orange-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <Link href="/sign-up" className="flex-1">
            <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              حفظ تقدمي الآن
            </Button>
          </Link>
          <Link href="/sign-in" className="flex-1">
            <Button size="sm" variant="outline" className="w-full border-orange-300 text-orange-700">
              تسجيل الدخول
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border border-cyan-200 dark:border-cyan-800 rounded-xl p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-cyan-400/20 flex items-center justify-center shrink-0">
        <Zap className="w-4 h-4 text-cyan-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-cyan-900 dark:text-cyan-200">
          كسبت <span className="font-bold">{sessionXp > 0 ? sessionXp : totalXp} XP</span> — سجّل لحفظه
        </p>
        <p className="text-xs text-cyan-700 dark:text-cyan-400">
          سيُنقل تقدمك كاملاً إلى حسابك
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Link href="/sign-up">
          <Button size="sm" className="h-7 text-xs px-3 bg-cyan-500 hover:bg-cyan-600 text-white">
            سجّل
          </Button>
        </Link>
        <button onClick={() => setDismissed(true)} className="text-cyan-400 hover:text-cyan-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
