import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

const BASE = "http://localhost:80/api";

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

describe("Shams API — health", () => {
  it("GET /healthz → 200 with status ok", async () => {
    const res = await get("/healthz");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string };
    assert.equal(body.status, "ok");
  });
});

describe("Shams API — flashcards", () => {
  it("GET /flashcards → 200 paginated list", async () => {
    const res = await get("/flashcards?limit=5");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { items: unknown[]; total: number };
    assert.ok(Array.isArray(body.items), "items should be an array");
    assert.ok(body.items.length > 0, "should have at least 1 flashcard");
    assert.ok(typeof body.total === "number", "total should be a number");
  });

  it("GET /flashcards?level=A1 → only A1 cards", async () => {
    const res = await get("/flashcards?level=A1&limit=10");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { items: { level: string }[] };
    for (const card of body.items) {
      assert.equal(card.level, "A1");
    }
  });

  it("GET /flashcards/stats → array of level stats", async () => {
    const res = await get("/flashcards/stats");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { level: string; total: number }[];
    assert.ok(Array.isArray(body), "should be an array");
    assert.ok(body.length > 0, "should have level stats");
    const levels = body.map((s) => s.level);
    assert.ok(levels.includes("A1"), "should have A1");
    assert.ok(levels.includes("C1"), "should have C1");
  });

  it("GET /flashcards/daily → array of cards", async () => {
    const res = await get("/flashcards/daily");
    assert.equal(res.status, 200);
    const body = (await res.json()) as unknown[];
    assert.ok(Array.isArray(body), "daily should be an array");
  });

  it("GET /flashcards/:id → single card or 404", async () => {
    const listRes = await get("/flashcards?limit=1");
    const list = (await listRes.json()) as { items: { id: number }[] };
    const id = list.items[0]?.id;
    assert.ok(id, "need at least one card");

    const res = await get(`/flashcards/${id}`);
    assert.equal(res.status, 200);
    const card = (await res.json()) as { id: number; word: string };
    assert.equal(card.id, id);
    assert.ok(card.word, "card should have a word");
  });

  it("GET /flashcards/9999999 → 404", async () => {
    const res = await get("/flashcards/9999999");
    assert.equal(res.status, 404);
  });
});

describe("Shams API — leaderboard", () => {
  it("GET /leaderboard → { top: [...], me: null } for anonymous", async () => {
    const res = await get("/leaderboard");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { top: unknown[]; me: unknown };
    assert.ok(Array.isArray(body.top), "top should be an array");
    assert.equal(body.me, null, "me should be null for anonymous");
  });
});

describe("Shams API — quiz", () => {
  it("POST /quiz/start → 200 with questions", async () => {
    const res = await post("/quiz/start", {
      mode: "de-to-en",
      level: "A1",
      count: 5,
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      questions: unknown[];
      sessionId: unknown;
    };
    assert.ok(Array.isArray(body.questions), "questions should be an array");
    assert.ok(body.questions.length > 0, "should have at least 1 question");
  });

  it("POST /quiz/start with bad mode → 400", async () => {
    const res = await post("/quiz/start", { mode: "invalid-mode" });
    assert.equal(res.status, 400);
  });

  it("POST /quiz/finish with empty answers → 200", async () => {
    const res = await post("/quiz/finish", { sessionId: null, answers: [] });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { saved: boolean };
    assert.equal(body.saved, false, "anonymous finish should not save");
  });
});

describe("Shams API — auth validation", () => {
  it("POST /auth/sign-in with bad email → 400", async () => {
    const res = await post("/auth/sign-in", {
      email: "notanemail",
      password: "password123",
    });
    assert.equal(res.status, 400);
  });

  it("POST /auth/sign-in with wrong creds → 401", async () => {
    const res = await post("/auth/sign-in", {
      email: "nobody@example.com",
      password: "password123",
    });
    assert.equal(res.status, 401);
  });
});
