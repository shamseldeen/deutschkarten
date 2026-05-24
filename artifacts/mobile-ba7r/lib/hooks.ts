import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import { api, Level } from "./api";

export const KEYS = {
  stats: ["flashcard-stats"] as const,
  daily: (level?: Level) => ["daily-flashcards", level] as const,
  list: (params?: { level?: Level; limit?: number }) =>
    ["flashcards", params?.level, params?.limit] as const,
  workspaces: ["workspaces"] as const,
};

function invalidateWorkspaceScoped(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEYS.workspaces });
  qc.invalidateQueries({ queryKey: KEYS.stats });
  qc.invalidateQueries({ queryKey: ["flashcards"] });
  qc.invalidateQueries({ queryKey: ["daily-flashcards"] });
}

export function useWorkspaces() {
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: KEYS.workspaces,
    queryFn: () => api.listWorkspaces(),
    enabled: !!isSignedIn,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { secondaryLanguage: string; name?: string }) => api.createWorkspace(data),
    onSuccess: () => invalidateWorkspaceScoped(qc),
  });
}

export function useSwitchWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.switchWorkspace(id),
    onSuccess: () => invalidateWorkspaceScoped(qc),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteWorkspace(id),
    onSuccess: () => invalidateWorkspaceScoped(qc),
  });
}

export function useFlashcardStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn: () => api.getFlashcardStats(),
  });
}

export function useDailyFlashcards(level?: Level) {
  return useQuery({
    queryKey: KEYS.daily(level),
    queryFn: () => api.getDailyFlashcards(level ? { level } : {}),
  });
}

export function useFlashcards(params?: { level?: Level; limit?: number }) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => api.listFlashcards({ ...params }),
  });
}

export function useGenerateFlashcards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { level: Level; category?: string; count?: number }) =>
      api.generateFlashcards(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

export function useUpdateProgress() {
  const qc = useQueryClient();
  const { isSignedIn } = useAuth();
  return useMutation({
    mutationFn: async ({ id, known }: { id: number; known: boolean }) => {
      // Guests can study but cannot persist progress server-side (would
      // require mutating shared state). Resolve as a no-op locally so the
      // UI can still advance to the next card.
      if (!isSignedIn) return { id, known };
      return api.updateProgress(id, known);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      qc.invalidateQueries({ queryKey: KEYS.stats });
      qc.invalidateQueries({ queryKey: ["daily-flashcards"] });
    },
  });
}
