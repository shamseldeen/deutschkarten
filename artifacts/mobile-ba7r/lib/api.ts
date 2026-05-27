let BASE_URL = "";
let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setApiBaseUrl(url: string) {
  BASE_URL = url;
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
  if (
    typeof window !== "undefined" &&
    window.location &&
    window.location.origin
  ) {
    return window.location.origin;
  }
  throw new Error(
    "API base URL is not configured. EXPO_PUBLIC_DOMAIN or EXPO_PUBLIC_API_BASE_URL " +
      "must be set when the bundle is built. Reload the app after the dev server restarts.",
  );
}

export function setAuthTokenGetter(fn: () => Promise<string | null>) {
  authTokenGetter = fn;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
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
    throw Object.assign(new Error((body as any).error ?? res.statusText), {
      status: res.status,
      body,
    });
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
  listFlashcards: (params?: {
    level?: Level;
    category?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.level) q.set("level", params.level);
    if (params?.category) q.set("category", params.category);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return fetchJson<FlashcardList>(`/ba7r-api/flashcards?${q}`);
  },

  getFlashcard: (id: number) =>
    fetchJson<Flashcard>(`/ba7r-api/flashcards/${id}`),

  getDailyFlashcards: (params?: { level?: Level }) => {
    const q = new URLSearchParams();
    if (params?.level) q.set("level", params.level);
    return fetchJson<Flashcard[]>(`/ba7r-api/flashcards/daily?${q}`);
  },

  getFlashcardStats: () =>
    fetchJson<LevelStats[]>("/ba7r-api/flashcards/stats"),

  generateFlashcards: (data: {
    level: Level;
    category?: string;
    count?: number;
  }) =>
    fetchJson<{ cards: Flashcard[]; skipped: number; message?: string }>(
      "/ba7r-api/flashcards/generate",
      { method: "POST", body: JSON.stringify(data) },
    ),

  updateProgress: (id: number, known: boolean) =>
    fetchJson<Flashcard>(`/ba7r-api/flashcards/${id}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ known }),
    }),

  listWorkspaces: () => fetchJson<WorkspaceList>("/ba7r-api/me/workspaces"),

  createWorkspace: (data: { secondaryLanguage: string; name?: string }) =>
    fetchJson<Workspace>("/ba7r-api/me/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  switchWorkspace: (id: string) =>
    fetchJson<{ currentId: string | null }>(
      `/ba7r-api/me/workspaces/${id}/switch`,
      {
        method: "POST",
      },
    ),

  deleteWorkspace: (id: string) =>
    fetchJson<{ deleted: string }>(`/ba7r-api/me/workspaces/${id}`, {
      method: "DELETE",
    }),
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

export type CommunityStats = {
  totalCards: number;
  members: number;
  languages: number;
  contributors: number;
};

export type CommunityPost = {
  id: number;
  content: string;
  likeCount: number;
  createdAt: string;
  userId: string;
  displayName: string | null;
  imageUrl: string | null;
  isOwn: boolean;
  liked: boolean;
};

export const communityApi = {
  getStats: () => fetchJson<CommunityStats>("/ba7r-api/community/stats"),
  getPosts: () => fetchJson<CommunityPost[]>("/ba7r-api/community/posts"),
  createPost: (content: string) =>
    fetchJson<CommunityPost>("/ba7r-api/community/posts", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  likePost: (id: number) =>
    fetchJson<{ liked: boolean; likeCount: number }>(
      `/ba7r-api/community/posts/${id}/like`,
      { method: "POST" },
    ),
  deletePost: (id: number) =>
    fetchJson<{ deleted: number }>(`/ba7r-api/community/posts/${id}`, {
      method: "DELETE",
    }),
  acceptConsent: () =>
    fetchJson<{ ok: boolean }>("/ba7r-api/me/consent", { method: "POST" }),
};
