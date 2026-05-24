export * from "@workspace/content/ranks";
import type { Rank } from "@workspace/content/ranks";
import { resolveBaseUrl } from "./api";

// Mobile loads the badges over HTTP from the API server (which also serves
// the web app's /ranks/*.png static files). resolveBaseUrl() is the same
// helper the rest of the mobile fetch layer uses.
export function rankImageUrl(r: Rank): string {
  const base = resolveBaseUrl().replace(/\/$/, "");
  return `${base}/flashcards/ranks/${r.image}`;
}
