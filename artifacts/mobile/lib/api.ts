let BASE_URL = "";
let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setApiBaseUrl(url: string) {
  BASE_URL = url;
  // Log loudly so the resolved URL is visible in Metro / device logs.
  // eslint-disable-next-line no-console
  console.log(`[api] base URL set to: ${url || "(empty)"}`);
}

export function getApiBaseUrl(): string {
  return BASE_URL;
}

// Resolve the absolute base URL at call time. React Native (iOS/Android) and
// some WebKit-based runtimes throw "The string did not match the expected
// pattern." when fetch() receives a relative URL with no origin. On web we
// fall back to window.location.origin so the app still works when the
// EXPO_PUBLIC_DOMAIN / EXPO_PUBLIC_API_BASE_URL env vars were not baked in
// at build time (which is the case for the static production build served
// at /mobile/ alongside the API).
export function resolveBaseUrl(): string {
  if (BASE_URL) return BASE_URL;
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return window.location.origin;
  }
  // On native we cannot fall back to a relative URL — fetch() throws an
  // opaque "The string did not match the expected pattern." that React Query
  // then swallows, leaving the UI stuck on loading/empty forever. Surface a
  // clear, actionable error instead.
  throw new Error(
    "API base URL is not configured. EXPO_PUBLIC_DOMAIN or EXPO_PUBLIC_API_BASE_URL " +
      "must be set when the bundle is built. Reload the app after the dev server restarts.",
  );
}

export function setAuthTokenGetter(fn: () => Promise<string | null>) {
  authTokenGetter = fn;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (authTokenGetter) {
    const token = await authTokenGetter();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const { headers: _ignored, ...rest } = init ?? {};
  return fetch(`${resolveBaseUrl()}${path}`, { ...rest, headers });
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (authTokenGetter) {
    const token = await authTokenGetter();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const { headers: _ignored, ...rest } = init ?? {};
  const res = await fetch(`${resolveBaseUrl()}${path}`, { ...rest, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error((body as any).error ?? res.statusText), { status: res.status, body });
  }
  return res.json() as Promise<T>;
}

export type Level = "A1" | "A2" | "B1" | "B2" | "C1";

export type Flashcard = {
  id: number;
  word: string;
  article: string | null;
  baseWord: string;
  level: Level;
  category: string;
  englishTranslation: string;
  arabicTranslation: string;
  exampleSentenceDe: string;
  exampleSentenceEn: string;
  exampleSentenceAr: string;
  translations?: Record<string, string> | null;
  exampleTranslations?: Record<string, string> | null;
  createdBy?: string | null;
  imageUrl: string | null;
  known: boolean;
  createdAt: string;
};

export type FlashcardList = {
  items: Flashcard[];
  total: number;
  offset: number;
  limit: number;
};

export type LevelStats = {
  level: string;
  total: number;
  known: number;
  unknown: number;
  percentage: number;
};

export const api = {
  listFlashcards: (params?: { level?: Level; category?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.level) q.set("level", params.level);
    if (params?.category) q.set("category", params.category);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return fetchJson<FlashcardList>(`/api/flashcards?${q}`);
  },

  getFlashcard: (id: number) => fetchJson<Flashcard>(`/api/flashcards/${id}`),

  getDailyFlashcards: (params?: { level?: Level }) => {
    const q = new URLSearchParams();
    if (params?.level) q.set("level", params.level);
    return fetchJson<Flashcard[]>(`/api/flashcards/daily?${q}`);
  },

  getFlashcardStats: () => fetchJson<LevelStats[]>("/api/flashcards/stats"),

  generateFlashcards: (data: { level: Level; category?: string; count?: number }) =>
    fetchJson<Flashcard[]>("/api/flashcards/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProgress: (id: number, known: boolean) =>
    fetchJson<Flashcard>(`/api/flashcards/${id}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ known }),
    }),

  listWorkspaces: () => fetchJson<WorkspaceList>("/api/me/workspaces"),

  createWorkspace: (data: { secondaryLanguage: string; name?: string }) =>
    fetchJson<Workspace>("/api/me/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  switchWorkspace: (id: string) =>
    fetchJson<{ currentId: string | null }>(`/api/me/workspaces/${id}/switch`, {
      method: "POST",
    }),

  deleteWorkspace: (id: string) =>
    fetchJson<{ deleted: string }>(`/api/me/workspaces/${id}`, { method: "DELETE" }),
};

export type Workspace = {
  id: string;
  name: string;
  secondaryLanguage: string;
  isDefault: boolean;
  isCurrent: boolean;
};
export type WorkspaceList = {
  currentId: string | null;
  max: number;
  workspaces: Workspace[];
};
