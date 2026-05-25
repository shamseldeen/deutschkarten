import { useCallback, useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@clerk/expo";
import { apiFetch } from "./api";

const KEY = "deutschkarten.langPrefs";

export type LangPrefs = { primaryLang: string; secondaryLang: string | null };
const DEFAULT: LangPrefs = { primaryLang: "en", secondaryLang: "ar" };

let state: LangPrefs = DEFAULT;
let hydrated = false;
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

async function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      setState({
        primaryLang: typeof p.primaryLang === "string" ? p.primaryLang : "en",
        secondaryLang:
          p.secondaryLang === null
            ? null
            : typeof p.secondaryLang === "string"
              ? p.secondaryLang
              : "ar",
      });
    }
  } catch {
    /* ignore */
  }
}

async function loadFromServer() {
  if (inFlightFetch) return inFlightFetch;
  inFlightFetch = (async () => {
    try {
      const r = await apiFetch("/api/me/settings");
      if (!r.ok) return;
      const s = await r.json();
      const next: LangPrefs = {
        primaryLang: s.primaryLang ?? "en",
        secondaryLang: s.secondaryLang ?? null,
      };
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      setState(next);
    } finally {
      inFlightFetch = null;
    }
  })();
  return inFlightFetch;
}

export function useLangPrefs() {
  const { isSignedIn } = useUser();
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void hydrateFromStorage();
  }, []);

  useEffect(() => {
    if (isSignedIn === lastSignedIn) return;
    lastSignedIn = isSignedIn ?? null;
    if (isSignedIn) void loadFromServer();
  }, [isSignedIn]);

  const save = useCallback(
    async (next: LangPrefs) => {
      setState(next);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      if (!isSignedIn) return;
      await apiFetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryLang: next.primaryLang,
          secondaryLang: next.secondaryLang ?? "none",
        }),
      });
    },
    [isSignedIn],
  );

  return { prefs, save, loading: false };
}
