const STORAGE_KEY = "dk_guest_progress";

export type GuestCardEntry = {
  cardId: number;
  level: string;
  known: boolean;
  xp: number;
  ts: number;
};

export type GuestProgress = {
  entries: GuestCardEntry[];
  totalXp: number;
  sessionXp: number;
  startedAt: number;
};

function load(): GuestProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as GuestProgress;
  } catch {}
  return { entries: [], totalXp: 0, sessionXp: 0, startedAt: Date.now() };
}

function save(p: GuestProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

export function recordGuestCard(cardId: number, level: string, known: boolean, xp: number) {
  const p = load();
  const existing = p.entries.findIndex((e) => e.cardId === cardId);
  const entry: GuestCardEntry = { cardId, level, known, xp, ts: Date.now() };
  if (existing >= 0) {
    p.entries[existing] = entry;
  } else {
    p.entries.push(entry);
  }
  if (known) {
    p.totalXp += xp;
    p.sessionXp += xp;
  }
  save(p);
}

export function getGuestProgress(): GuestProgress {
  return load();
}

export function clearGuestProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasGuestProgress(): boolean {
  const p = load();
  return p.entries.length > 0;
}

export function getGuestKnownIds(): number[] {
  return load().entries.filter((e) => e.known).map((e) => e.cardId);
}

export function getGuestXp(): number {
  return load().totalXp;
}
