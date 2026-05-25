/**
 * Idempotent seed for both tenant schemas.
 *
 * Reads `lib/db/src/fixtures/flashcards.json` (the canonical baseline
 * corpus) and inserts any missing rows into `public.flashcards`
 * (Shams) and `ba7r.flashcards` (Ba7r). Safe to re-run on every deploy
 * and on fresh environments where both schemas may be empty.
 *
 * Run: `pnpm run seed`
 *
 * lint-no-console-disable-file — CLI script: intentional stdout/stderr prints.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(
  __dirname,
  "../../lib/db/src/fixtures/flashcards.json",
);

type FixtureRow = {
  id: number;
  word: string;
  article: string | null;
  base_word: string;
  level: string;
  category: string;
  english_translation: string;
  arabic_translation: string;
  example_sentence_de: string;
  example_sentence_en: string;
  example_sentence_ar: string;
  translations: Record<string, string>;
  example_translations: Record<string, string>;
  created_by: string | null;
  image_url: string | null;
  known: boolean;
  hidden_at: string | null;
  created_at: string;
};

const COLS = [
  "id",
  "word",
  "article",
  "base_word",
  "level",
  "category",
  "english_translation",
  "arabic_translation",
  "example_sentence_de",
  "example_sentence_en",
  "example_sentence_ar",
  "translations",
  "example_translations",
  "created_by",
  "image_url",
  "known",
  "hidden_at",
  "created_at",
] as const;

async function seedSchema(pool: pg.Pool, schema: string, rows: FixtureRow[]) {
  // Pre-flight: schema + table must exist. On a fresh environment a
  // missing ba7r schema is the most common cause of failure here.
  const exists = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = 'flashcards'
     ) AS exists`,
    [schema],
  );
  if (!exists.rows[0]?.exists) {
    console.warn(
      `seed[${schema}]: SKIP — ${schema}.flashcards does not exist. ` +
        `Run \`pnpm run reset-db\` (dev) or push the Drizzle schema for ` +
        `the ${schema} tenant before seeding.`,
    );
    return;
  }

  const before = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${schema}.flashcards`,
  );
  const beforeN = Number(before.rows[0]?.count ?? "0");

  let inserted = 0;
  for (const r of rows) {
    const values = COLS.map((c) => {
      const v = (r as Record<string, unknown>)[c];
      return typeof v === "object" && v !== null ? JSON.stringify(v) : v;
    });
    const placeholders = COLS.map((_, i) => `$${i + 1}`).join(", ");
    const result = await pool.query(
      `INSERT INTO ${schema}.flashcards (${COLS.join(", ")})
       VALUES (${placeholders})
       ON CONFLICT (id) DO NOTHING`,
      values,
    );
    inserted += result.rowCount ?? 0;
  }

  // Keep the serial sequence in sync with the largest inserted id so
  // future user-created cards don't collide.
  await pool.query(
    `SELECT setval(
       pg_get_serial_sequence('${schema}.flashcards', 'id'),
       GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${schema}.flashcards), 1)
     )`,
  );

  const after = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${schema}.flashcards`,
  );
  const afterN = Number(after.rows[0]?.count ?? "0");

  console.log(
    `seed[${schema}]: inserted ${inserted} rows (was ${beforeN}, now ${afterN}).`,
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  if (!fs.existsSync(FIXTURE_PATH)) {
    console.error(`Fixture not found at ${FIXTURE_PATH}`);
    process.exit(1);
  }
  const rows = JSON.parse(
    fs.readFileSync(FIXTURE_PATH, "utf8"),
  ) as FixtureRow[];
  console.log(`seed: loaded ${rows.length} fixture rows from ${FIXTURE_PATH}`);

  const pool = new pg.Pool({ connectionString: url });
  try {
    await seedSchema(pool, "public", rows);
    await seedSchema(pool, "ba7r", rows);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
