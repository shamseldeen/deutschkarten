import pg from "pg";

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const run = async (q: string) => {
    await client.query(q);
    console.log("OK:", q.slice(0, 80));
  };

  // public schema
  await run("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz");
  await run(`CREATE TABLE IF NOT EXISTS public.community_posts (
    id serial PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    hidden_at timestamptz,
    like_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await run("CREATE INDEX IF NOT EXISTS community_posts_user_idx ON public.community_posts(user_id)");
  await run("CREATE INDEX IF NOT EXISTS community_posts_created_idx ON public.community_posts(created_at)");
  await run(`CREATE TABLE IF NOT EXISTS public.community_post_likes (
    post_id integer NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
  )`);
  await run("CREATE INDEX IF NOT EXISTS community_post_likes_post_idx ON public.community_post_likes(post_id)");

  // ba7r schema
  await run("ALTER TABLE ba7r.users ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz");
  await run(`CREATE TABLE IF NOT EXISTS ba7r.community_posts (
    id serial PRIMARY KEY,
    user_id text NOT NULL REFERENCES ba7r.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    hidden_at timestamptz,
    like_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await run("CREATE INDEX IF NOT EXISTS ba7r_community_posts_user_idx ON ba7r.community_posts(user_id)");
  await run("CREATE INDEX IF NOT EXISTS ba7r_community_posts_created_idx ON ba7r.community_posts(created_at)");
  await run(`CREATE TABLE IF NOT EXISTS ba7r.community_post_likes (
    post_id integer NOT NULL REFERENCES ba7r.community_posts(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES ba7r.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
  )`);
  await run("CREATE INDEX IF NOT EXISTS ba7r_community_post_likes_post_idx ON ba7r.community_post_likes(post_id)");

  await client.end();
  console.log("✅ All community migrations applied");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
