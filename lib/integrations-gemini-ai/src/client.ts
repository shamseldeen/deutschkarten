import { GoogleGenAI } from "@google/genai";

// Supports both Replit-managed proxy and a direct personal API key.
// Priority: Replit proxy vars → personal GEMINI_API_KEY → error.
const apiKey =
  process.env.AI_INTEGRATIONS_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;

const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL ?? undefined;

if (!apiKey) {
  throw new Error(
    "Gemini API key not found.\n" +
      "Set GEMINI_API_KEY in your environment variables.\n" +
      "Get a free key at: https://aistudio.google.com/apikey",
  );
}

export const ai = new GoogleGenAI({
  apiKey,
  ...(baseUrl ? { httpOptions: { apiVersion: "", baseUrl } } : {}),
});
