/**
 * Unit tests for the shared content library.
 *
 * Uses node:test (ships with Node 24) — no extra dev deps needed.
 * Run via `pnpm --filter @workspace/content run test`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeRank, RANKS } from "./ranks";
import { MOTIVATIONS, pickMotivationOfTheDay } from "./motivation";
import { ROADMAP, STUDY_HABITS } from "./roadmap";

describe("computeRank", () => {
  it("starts at tier 1 (Tide Pool Crab) for a brand-new learner", () => {
    const { current, next, progressPct } = computeRank(0, 0);
    assert.equal(current.tier, 1);
    assert.equal(next?.tier, 2);
    assert.equal(progressPct, 0);
  });

  it("advances through tiers as knownCards grows", () => {
    assert.equal(computeRank(24, 0).current.tier, 1);
    assert.equal(computeRank(25, 0).current.tier, 2);
    assert.equal(computeRank(150, 0).current.tier, 4);
    assert.equal(computeRank(2750, 1).current.tier, 9);
  });

  it("caps the top rank at C1-gated progress", () => {
    // Threshold met but no C1 cards known → blocked, capped at 99%
    const blocked = computeRank(5000, 0);
    assert.equal(blocked.current.tier, 9);
    assert.equal(blocked.next?.tier, 10);
    assert.equal(blocked.nextBlockedBy, "c1");
    assert.ok(blocked.progressPct < 100);

    // Threshold met AND C1 known → top rank
    const unlocked = computeRank(5000, 1);
    assert.equal(unlocked.current.tier, 10);
    assert.equal(unlocked.next, null);
    assert.equal(unlocked.progressPct, 100);
  });

  it("never returns a rank above tier 10", () => {
    const massive = computeRank(1_000_000, 999);
    assert.equal(massive.current.tier, 10);
    assert.equal(massive.next, null);
  });

  it("has 10 ranks with strictly increasing thresholds", () => {
    assert.equal(RANKS.length, 10);
    for (let i = 1; i < RANKS.length; i++) {
      assert.ok(
        RANKS[i]!.threshold > RANKS[i - 1]!.threshold,
        `tier ${i + 1} threshold must be > tier ${i}`,
      );
    }
  });
});

describe("pickMotivationOfTheDay", () => {
  it("returns a non-empty motivation", () => {
    const m = pickMotivationOfTheDay();
    assert.ok(m.de.length > 0);
    assert.ok(m.en.length > 0);
    assert.ok(m.ar.length > 0);
  });

  it("returns the same motivation on the same day", () => {
    const d = new Date("2026-01-15T10:00:00Z");
    assert.deepEqual(pickMotivationOfTheDay(d), pickMotivationOfTheDay(d));
  });

  it("rotates across the full pool over MOTIVATIONS.length days", () => {
    const seen = new Set<string>();
    for (let i = 0; i < MOTIVATIONS.length; i++) {
      const d = new Date(2026, 0, 1 + i);
      seen.add(pickMotivationOfTheDay(d).de);
    }
    assert.equal(seen.size, MOTIVATIONS.length);
  });
});

describe("ROADMAP", () => {
  it("covers all 5 CEFR levels in order", () => {
    assert.deepEqual(
      ROADMAP.map((l) => l.level),
      ["A1", "A2", "B1", "B2", "C1"],
    );
  });

  it("has strictly increasing vocabulary goals", () => {
    for (let i = 1; i < ROADMAP.length; i++) {
      assert.ok(ROADMAP[i]!.vocabGoal > ROADMAP[i - 1]!.vocabGoal);
    }
  });

  it("study habits all use known icon names", () => {
    const valid = new Set([
      "calendar",
      "mic",
      "tag",
      "headphones",
      "repeat",
      "edit-3",
    ]);
    for (const h of STUDY_HABITS) {
      assert.ok(valid.has(h.icon), `unknown icon: ${h.icon}`);
    }
  });
});
