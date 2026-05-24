let BASE_URL = "";
let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setApiBaseUrl(url: string) {
  BASE_URL = url;
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
  return fetch(`${BASE_URL}${path}`, { ...rest, headers });
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
  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers });
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
};
