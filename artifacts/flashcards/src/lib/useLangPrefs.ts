import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useUser, useAuth } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const LS_KEY = "deutschkarten.langPrefs";

export type LangPrefs = { primaryLang: string; secondaryLang: string | null };

const DEFAULT: LangPrefs = { primaryLang: "en", secondaryLang: "ar" };

function readLocal(): LangPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw);
    return {
      primaryLang: typeof p.primaryLang === "string" ? p.primaryLang : "en",
      secondaryLang:
        p.secondaryLang === null
          ? null
          : typeof p.secondaryLang === "string"
            ? p.secondaryLang
            : "ar",
    };
  } catch {
    return DEFAULT;
  }
}

function writeLocal(p: LangPrefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

// ── Module-level singleton store ─────────────────────────────────────────────
// All <Flashcard /> instances share one state + one /api/me/settings fetch.
let state: LangPrefs = readLocal();
const subscribers = new Set<() => void>();
let inFlightFetch: Promise<void> | null = null;
let lastSignedIn: boolean | null = null;

function setState(next: LangPrefs) {
  state = next;
  for (const s of subscribers) s();
}

function subscribe(cb: () => void) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function getSnapshot() {
  return state;
}

async function loadFromServer(getToken: () => Promise<string | null>) {
  if (inFlightFetch) return inFlightFetch;
  inFlightFetch = (async () => {
    try {
      const token = await getToken();
      const r = await fetch(`${basePath}/api/me/settings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) return;
      const s = await r.json();
      const next: LangPrefs = {
        primaryLang: s.primaryLang ?? "en",
        secondaryLang: s.secondaryLang ?? null,
      };
      writeLocal(next);
      setState(next);
    } finally {
      inFlightFetch = null;
    }
  })();
  return inFlightFetch;
}

export function useLangPrefs() {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (isSignedIn === lastSignedIn) return;
    lastSignedIn = isSignedIn ?? null;
    if (isSignedIn) {
      void loadFromServer(getToken);
    } else {
      setState(readLocal());
    }
  }, [isSignedIn, getToken]);

  const save = useCallback(
    async (next: LangPrefs) => {
      writeLocal(next);
      setState(next);
      if (!isSignedIn) return;
      const token = await getToken();
      await fetch(`${basePath}/api/me/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          primaryLang: next.primaryLang,
          secondaryLang: next.secondaryLang ?? "none",
        }),
      });
    },
    [isSignedIn, getToken],
  );

  return { prefs, save, loading: false };
}
