import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Level } from "./api";

export const KEYS = {
  stats: ["flashcard-stats"] as const,
  daily: (level?: Level) => ["daily-flashcards", level] as const,
  list: (params?: { level?: Level; limit?: number }) =>
    ["flashcards", params?.level, params?.limit] as const,
};

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
  return useMutation({
    mutationFn: ({ id, known }: { id: number; known: boolean }) =>
      api.updateProgress(id, known),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      qc.invalidateQueries({ queryKey: KEYS.stats });
      qc.invalidateQueries({ queryKey: ["daily-flashcards"] });
    },
  });
}
