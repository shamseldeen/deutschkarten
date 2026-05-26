import OpenAI from "openai";

// Supports both Replit-managed proxy and a direct personal API key.
// Priority: Replit proxy vars → personal OPENAI_API_KEY → error.
const apiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;

const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? undefined;

if (!apiKey) {
  throw new Error(
    "OpenAI API key not found.\n" +
      "Set OPENAI_API_KEY in your environment variables.\n" +
      "Get a key at: https://platform.openai.com/api-keys",
  );
}

export const openai = new OpenAI({
  apiKey,
  ...(baseURL ? { baseURL } : {}),
});
