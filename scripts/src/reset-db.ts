/**
 * Drop + re-create + seed the database for tests and local dev.
 *
 * Refuses to run when NODE_ENV=production OR when DATABASE_URL points
 * at a non-local host without RESET_DB_I_KNOW_WHAT_IM_DOING=1.
 *
 * Run: `pnpm run reset-db`
 *
 * lint-no-console-disable-file — CLI script: intentional stdout/stderr prints.
 */
import { execSync } from "node:child_process";
import pg from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to reset-db with NODE_ENV=production");
  }
  const host = new URL(url).hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".replit.dev");
  if (!isLocal && process.env.RESET_DB_I_KNOW_WHAT_IM_DOING !== "1") {
    throw new Error(
      `Refusing to reset non-local DB host "${host}". ` +
        `Set RESET_DB_I_KNOW_WHAT_IM_DOING=1 to override.`,
    );
  }

  const pool = new pg.Pool({ connectionString: url });
  try {
    console.log(`reset-db: dropping schemas public + ba7r on ${host}`);
    await pool.query(`DROP SCHEMA IF EXISTS ba7r CASCADE`);
    await pool.query(`DROP SCHEMA IF EXISTS public CASCADE`);
    await pool.query(`CREATE SCHEMA public`);
    await pool.query(`CREATE SCHEMA ba7r`);
  } finally {
    await pool.end();
  }

  console.log("reset-db: pushing drizzle schema to public...");
  execSync("pnpm --filter @workspace/db run push", { stdio: "inherit" });

  console.log("reset-db: pushing drizzle schema to ba7r...");
  execSync("pnpm --filter @workspace/db run push", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: appendSearchPath(url, "ba7r,public"),
    },
  });

  console.log("reset-db: seeding both tenants...");
  execSync("pnpm --filter @workspace/scripts run seed", { stdio: "inherit" });
  console.log("reset-db: done.");
}

function appendSearchPath(url: string, sp: string): string {
  const u = new URL(url);
  const existing = u.searchParams.get("options") ?? "";
  const withoutSp = existing
    .split(" ")
    .filter((o) => !/^-c\s*search_path=/i.test(o))
    .join(" ")
    .trim();
  u.searchParams.set(
    "options",
    [withoutSp, `-csearch_path=${sp}`].filter(Boolean).join(" "),
  );
  return u.toString();
}

main().catch((err) => {
  console.error("reset-db failed:", err);
  process.exit(1);
});
