/**
 * Startup environment validation for the Ba7r API server.
 * Mirrors @workspace/api-server's env contract; Ba7r reuses the same
 * Clerk + session config but runs on its own PORT and `ba7r` schema
 * (search_path is set by preload.ts).
 */
import { z } from "zod/v4";

const envSchema = z.object({
  PORT: z
    .string()
    .regex(/^\d+$/, "PORT must be a positive integer")
    .refine((s) => {
      const n = Number(s);
      return n > 0 && n <= 65535;
    }, "PORT must be in 1..65535"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, "CLERK_PUBLISHABLE_KEY is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  SESSION_SECRET: z
    .string()
    .min(16, "SESSION_SECRET must be at least 16 chars"),
  ADMIN_USER_IDS: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
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
