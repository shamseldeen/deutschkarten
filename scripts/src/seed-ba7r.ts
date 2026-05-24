/**
 * Seed the Ba7r tenant schema with a baseline set of flashcards.
 *
 * Idempotent: only inserts cards whose `id` is not already present in
 * `ba7r.flashcards`. Safe to re-run on every deploy.
 *
 * Source rows come from `public.flashcards` (the Shams baseline corpus).
 * Run via: `pnpm --filter @workspace/scripts run seed-ba7r`
 */
import pg from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url });
  try {
    const before = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM ba7r.flashcards",
    );
    const beforeN = Number(before.rows[0]?.count ?? "0");

    const ins = await pool.query(`
      INSERT INTO ba7r.flashcards
      SELECT s.*
      FROM public.flashcards s
      WHERE NOT EXISTS (
        SELECT 1 FROM ba7r.flashcards b WHERE b.id = s.id
      )
    `);

    const after = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM ba7r.flashcards",
    );
    const afterN = Number(after.rows[0]?.count ?? "0");

    console.log(
      `seed-ba7r: inserted ${ins.rowCount ?? 0} rows ` +
        `(was ${beforeN}, now ${afterN}).`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("seed-ba7r failed:", err);
  process.exit(1);
});
