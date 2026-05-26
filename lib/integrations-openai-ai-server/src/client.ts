import OpenAI from "openai";

const apiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;

const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? undefined;

// Lazy client — only throws when actually called, so servers start fine
// without an OpenAI key. Gemini is the primary AI; OpenAI is optional.
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    if (!apiKey) {
      throw new Error(
        "OpenAI API key not set. Add OPENAI_API_KEY to use this feature, " +
          "or the app will use Gemini instead.",
      );
    }
    const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
    return (client as any)[prop];
  },
});
