export * from "@workspace/content/ranks";
import type { Rank } from "@workspace/content/ranks";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
export const rankImageUrl = (r: Rank) => `${basePath}/ranks/${r.image}`;
