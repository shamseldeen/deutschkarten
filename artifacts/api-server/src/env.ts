/**
 * Startup environment validation for the Shams API server.
 *
 * Imported by `index.ts` before the HTTP server boots so missing or
 * malformed configuration fails fast with a clear, aggregated error
 * instead of producing cryptic downstream failures (e.g. an undefined
 * Clerk key surfacing as a 500 inside a route handler).
 */
import { z } from "zod/v4";

const envSchema = z.object({
  // Provided by the Replit workflow.
  PORT: z
    .string()
    .regex(/^\d+$/, "PORT must be a positive integer")
    .refine((s) => {
      const n = Number(s);
      return n > 0 && n <= 65535;
    }, "PORT must be in 1..65535"),
  // Required for DB access.
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  // Required for Clerk auth in both prod and dev.
  CLERK_PUBLISHABLE_KEY: z.string().min(1, "CLERK_PUBLISHABLE_KEY is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  // Required for session cookies.
  SESSION_SECRET: z
    .string()
    .min(16, "SESSION_SECRET must be at least 16 chars"),
  // Optional — comma-separated Clerk user IDs allowed into /api/admin/*.
  ADMIN_USER_IDS: z.string().optional(),
  // Optional — Gemini AI key; enables /api/flashcards/generate.
  GEMINI_API_KEY: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ✗ ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    const msg = [
      "",
      "╔══════════════════════════════════════════════════════════════╗",
      "║   STARTUP FAILED — missing or invalid environment variables  ║",
      "╚══════════════════════════════════════════════════════════════╝",
      "",
      "Missing / invalid variables:",
      issues,
      "",
      "Required variables for this service (set in Railway → Variables):",
      "  DATABASE_URL       — PostgreSQL connection string (e.g. from Neon)",
      "  CLERK_PUBLISHABLE_KEY — from Clerk dashboard → API Keys",
      "  CLERK_SECRET_KEY      — from Clerk dashboard → API Keys",
      "  SESSION_SECRET        — any random string, at least 16 characters",
      "",
      "Optional variables:",
      "  GEMINI_API_KEY  — enables /api/flashcards/generate",
      "  ADMIN_USER_IDS  — comma-separated Clerk user IDs for /api/admin/*",
      "",
    ].join("\n");
    throw new Error(msg);
  }
  return parsed.data;
}
