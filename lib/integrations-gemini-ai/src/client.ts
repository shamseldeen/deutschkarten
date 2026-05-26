import { GoogleGenAI } from "@google/genai";

// Lazy singleton — resolved on first use so the module can be imported safely
// even when the env vars are not set (e.g. Railway cold-start before env injection).
let _ai: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
  if (_ai) return _ai;

  const apiKey =
    process.env.AI_INTEGRATIONS_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Gemini API key not found.\n" +
        "Set GEMINI_API_KEY in your environment variables.\n" +
        "Get a free key at: https://aistudio.google.com/apikey",
    );
  }

  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL ?? undefined;

  _ai = new GoogleGenAI({
    apiKey,
    ...(baseUrl ? { httpOptions: { apiVersion: "", baseUrl } } : {}),
  });

  return _ai;
}

export const ai = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    return (getAi() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
