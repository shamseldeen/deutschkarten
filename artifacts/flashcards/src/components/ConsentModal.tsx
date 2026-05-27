import { useState } from "react";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { ShieldCheck, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "dk_consent_v1";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function hasConsented(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}
function markConsented() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
}

export function useConsentNeeded() {
  const { isSignedIn } = useAuth();
  // Only prompt registered users, and only once
  return isSignedIn && !hasConsented();
}

export function ConsentModal({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);

  const accept = async () => {
    if (!checked) return;
    markConsented();
    // Best-effort: record on server
    try {
      await fetch(`${basePath}/api/me/consent`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in">
        {/* Header */}
        <div className="bg-primary/10 px-6 py-5 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary shrink-0" />
          <div>
            <h2 className="font-black text-lg">Before you continue</h2>
            <p className="text-xs text-muted-foreground">Please read and accept our terms</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Warning box */}
          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-700 rounded-lg p-3 text-xs text-orange-800 dark:text-orange-300 space-y-1">
            <p className="font-bold">⚠️ Important — please read:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Your <strong>display name and XP rank</strong> are visible to other users on the leaderboard.</li>
              <li>Community posts you write are <strong>publicly visible</strong> to all registered users.</li>
              <li><strong>Do not share personal, private, or sensitive information</strong> anywhere in the App.</li>
              <li>Your usage data may be used to <strong>improve the App and AI models</strong> in anonymized form.</li>
              <li>Administrators may access your data for moderation purposes.</li>
            </ul>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What you get by registering:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["🏆", "Leaderboard ranking"],
                ["🔥", "Daily streaks"],
                ["👥", "Friend groups"],
                ["💬", "Community access"],
                ["⭐", "XP & achievements"],
                ["☁️", "Sync across devices"],
              ].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary shrink-0"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              I have read and agree to the{" "}
              <Link href="/terms" className="underline text-primary font-medium" target="_blank">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="underline text-primary font-medium" target="_blank">Privacy Policy</Link>.
              {" "}I understand that community posts are visible to other users and I should not share personal or confidential information.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <Button
            className="w-full font-bold"
            disabled={!checked}
            onClick={accept}
          >
            I Agree — Continue
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            You can review these policies anytime from the footer.
          </p>
        </div>
      </div>
    </div>
  );
}
