import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  hasGuestProgress,
  getGuestProgress,
  clearGuestProgress,
} from "./guestProgress";
import { getGetFlashcardStatsQueryKey } from "@workspace/api-client-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function useMigrateGuestProgress() {
  const { isSignedIn } = useAuth();
  const qc = useQueryClient();
  const migratedRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || migratedRef.current) return;
    if (!hasGuestProgress()) return;

    migratedRef.current = true;

    const progress = getGuestProgress();
    const knownEntries = progress.entries.filter((e) => e.known);
    if (knownEntries.length === 0) {
      clearGuestProgress();
      return;
    }

    (async () => {
      let migrated = 0;
      for (const entry of knownEntries) {
        try {
          const r = await fetch(`${basePath}/api/flashcards/${entry.cardId}/progress`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ known: true }),
          });
          if (r.ok) migrated++;
        } catch {}
      }
      if (migrated > 0) {
        clearGuestProgress();
        qc.invalidateQueries({ queryKey: getGetFlashcardStatsQueryKey() });
        qc.invalidateQueries({ queryKey: ["leaderboard"] });
        qc.invalidateQueries({ queryKey: ["me"] });
      }
    })();
  }, [isSignedIn, qc]);
}
