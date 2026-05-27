import { describe, it } from "node:test";
import assert from "node:assert/strict";

const BASE = "http://localhost:80/ba7r-api";

async function get(path: string) {
  return fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
}
async function post(path: string, body: unknown) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Ba7r API — health", () => {
  it("GET /healthz → 200 with status ok", async () => {
    const res = await get("/healthz");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string };
    assert.equal(body.status, "ok");
  });
});

describe("Ba7r API — flashcards", () => {
  it("GET /api/flashcards → 200 paginated list", async () => {
    const res = await get("/api/flashcards?limit=5");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { items: unknown[]; total: number };
    assert.ok(Array.isArray(body.items), "items should be an array");
    assert.ok(body.items.length > 0, "should have at least 1 flashcard");
  });

  it("GET /api/flashcards/stats → level stats array", async () => {
    const res = await get("/api/flashcards/stats");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { level: string }[];
    assert.ok(Array.isArray(body), "should be an array");
    assert.ok(body.length > 0, "should have stats");
  });
});

describe("Ba7r API — leaderboard", () => {
  it("GET /leaderboard → { top, me } for anonymous", async () => {
    const res = await get("/leaderboard");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { top: unknown[]; me: unknown };
    assert.ok(Array.isArray(body.top), "top should be an array");
    assert.equal(body.me, null);
  });
});

describe("Ba7r API — quiz", () => {
  it("POST /api/quiz/start → 200 with questions", async () => {
    const res = await post("/api/quiz/start", {
      mode: "de-to-en",
      level: "A1",
      count: 5,
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { questions: unknown[] };
    assert.ok(Array.isArray(body.questions));
    assert.ok(body.questions.length > 0);
  });
});
