import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const REASONS = [
  { value: "incorrect_translation", label: "Incorrect translation" },
  { value: "offensive", label: "Offensive content" },
  { value: "duplicate", label: "Duplicate card" },
  { value: "low_quality_image", label: "Low-quality image" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
] as const;

type Props = { cardId: number; word: string };

export function ReportCardButton({ cardId, word }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | "ok" | "err" | "auth">(null);

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/ba7r-api/flashcards/${cardId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason, note: note.trim() || undefined }),
      });
      if (r.status === 401) {
        setDone("auth");
        return;
      }
      if (!r.ok) {
        setDone("err");
        return;
      }
      setDone("ok");
      setTimeout(() => {
        setOpen(false);
      }, 1200);
    } catch {
      setDone("err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setReason("");
          setNote("");
          setDone(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground/60 hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10"
          title="Report this card"
          aria-label="Report this card"
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Report this card</DialogTitle>
          <DialogDescription>
            Help us keep the library accurate. Tell us what&apos;s wrong with{" "}
            <span className="font-semibold">{word}</span>.
          </DialogDescription>
        </DialogHeader>

        {done === "ok" ? (
          <p className="py-6 text-center text-sm text-green-600">
            Thanks — we&apos;ll review it.
          </p>
        ) : done === "auth" ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Please sign in to report cards.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Reason
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={
                      "px-3 py-2 text-sm rounded-md border text-left transition-colors " +
                      (reason === r.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border hover:bg-muted")
                    }
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="report-note"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                Note (optional)
              </Label>
              <Textarea
                id="report-note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="Anything else we should know?"
                rows={3}
              />
            </div>
            {done === "err" && (
              <p className="text-sm text-destructive">
                Couldn&apos;t submit. Please try again.
              </p>
            )}
          </div>
        )}

        {!done && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!reason || busy}>
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit report"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
