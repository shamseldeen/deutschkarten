import { useCallback, useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cancelDailyReminder,
  ensurePermission,
  scheduleDailyReminder,
} from "./notifications";

const KEY = "deutschkarten.reminder";

export type ReminderPrefs = {
  enabled: boolean;
  hour: number;
  minute: number;
};
export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "permission-denied" | "error" };

const DEFAULT: ReminderPrefs = { enabled: false, hour: 19, minute: 0 };

let state: ReminderPrefs = DEFAULT;
let hydrationStarted = false;
let userHasWritten = false; // set true once save() succeeds; blocks late hydration overwrite
let saveChain: Promise<unknown> = Promise.resolve(); // mutex for save()
const subscribers = new Set<() => void>();

function setState(next: ReminderPrefs) {
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
  if (hydrationStarted) return;
  hydrationStarted = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    // If the user already wrote during hydration, do not clobber.
    if (userHasWritten) return;
    if (!raw) return;
    const p = JSON.parse(raw);
    setState({
      enabled: !!p.enabled,
      hour: typeof p.hour === "number" ? p.hour : 19,
      minute: typeof p.minute === "number" ? p.minute : 0,
    });
  } catch {
    /* ignore */
  }
}

async function doSave(next: ReminderPrefs): Promise<SaveResult> {
  try {
    if (next.enabled) {
      const ok = await ensurePermission();
      if (!ok) return { ok: false, reason: "permission-denied" };
      await scheduleDailyReminder(next.hour, next.minute);
    } else {
      await cancelDailyReminder();
    }
    userHasWritten = true;
    setState(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export function useReminderPrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void hydrateFromStorage();
  }, []);

  const save = useCallback((next: ReminderPrefs): Promise<SaveResult> => {
    // Serialize: chain off the previous save so updates never interleave.
    const run = saveChain.then(() => doSave(next));
    saveChain = run.catch(() => undefined);
    return run;
  }, []);

  return { prefs, save };
}
