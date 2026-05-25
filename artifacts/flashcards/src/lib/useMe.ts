import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export type Me = {
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
    imageUrl: string | null;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
  };
};

export function useMe() {
  const { isSignedIn } = useAuth();
  return useQuery<Me | null>({
    queryKey: ["me", isSignedIn],
    enabled: Boolean(isSignedIn),
    queryFn: async () => {
      const r = await fetch(`${basePath}/api/me`, { credentials: "include" });
      if (!r.ok) return null;
      return r.json() as Promise<Me>;
    },
  });
}
