import { Heart, Server } from "lucide-react";

const PAYPAL_BASE = "https://paypal.me/shamseldeen2050";

type Props = { compact?: boolean };

export function DonationCard({ compact = false }: Props) {
  return (
    <div
      className={
        "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden " +
        (compact ? "" : "shadow-sm")
      }
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-primary" fill="currentColor" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground leading-tight">
              Support Shams DeutschKarten
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              This app is free. Donations keep it running and make it faster.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <a
            href={`${PAYPAL_BASE}/5`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-1 p-4 rounded-xl border border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" fill="currentColor" />
              <span className="font-bold text-foreground">
                Support the Creator
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Thank the developer for building and maintaining this app.
            </p>
            <span className="text-sm font-semibold text-pink-600 mt-2 group-hover:underline">
              Donate via PayPal →
            </span>
          </a>

          <a
            href={`${PAYPAL_BASE}/10`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-1 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-foreground">
                Upgrade the AI & Servers
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Help us add faster AI, more storage, and quicker responses.
            </p>
            <span className="text-sm font-semibold text-blue-600 mt-2 group-hover:underline">
              Donate via PayPal →
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
