// lint-no-console-disable-file
import pg from "pg";

const { Pool } = pg;

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_API_KEY) {
  console.error("PEXELS_API_KEY not set");
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function fetchImage(query: string): Promise<string | null> {
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`;
    const resp = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY! },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      photos: { src: { medium: string } }[];
    };
    return data.photos?.[0]?.src?.medium ?? null;
  } catch {
    return null;
  }
}

async function backfillSchema(pool: pg.Pool, schema: string) {
  const { rows } = await pool.query<{
    id: number;
    english_translation: string;
  }>(
    `SELECT id, english_translation FROM ${schema}.flashcards WHERE image_url IS NULL ORDER BY id`,
  );

  console.log(`\n[${schema}] ${rows.length} cards without images`);
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const imageUrl = await fetchImage(row.english_translation);
    if (imageUrl) {
      await pool.query(
        `UPDATE ${schema}.flashcards SET image_url = $1 WHERE id = $2`,
        [imageUrl, row.id],
      );
      console.log(`  ✓ [${row.id}] ${row.english_translation}`);
      updated++;
    } else {
      console.log(`  ✗ [${row.id}] ${row.english_translation} — no result`);
      skipped++;
    }
    // Respect Pexels rate limits (~4/sec)
    await new Promise((r) => setTimeout(r, 260));
  }

  console.log(`[${schema}] Done — updated: ${updated}, skipped: ${skipped}`);
}

async function run() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    await backfillSchema(pool, "public");
    await backfillSchema(pool, "ba7r");
  } finally {
    await pool.end();
  }
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
