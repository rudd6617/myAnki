import { describe, it, expect } from "vitest";
import { grade } from "./sm2";
import { Quality, type Card } from "./types";

const TODAY = 20_000; // arbitrary epoch day
const NOW = TODAY * 86_400_000;
const CTX = { todayEpochDay: TODAY, nowMs: NOW };

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    guid: "g#0",
    deck_id: 1,
    notetype_id: 1,
    front_html: "",
    back_html: "",
    state: "new",
    ease: 2.5,
    interval_d: 0,
    due: TODAY,
    reps: 0,
    lapses: 0,
    last_review: null,
    created_at: NOW,
    ...overrides,
  };
}

describe("grade() — new card", () => {
  it("Again on new card: lapses+1, due today, ease unchanged", () => {
    const r = grade(makeCard(), Quality.Again, CTX);
    expect(r.state).toBe("review");
    expect(r.interval_d).toBe(0);
    expect(r.due).toBe(TODAY);
    expect(r.lapses).toBe(1);
    expect(r.ease).toBe(2.5);
    expect(r.reps).toBe(1);
  });

  it("Hard on new card: 1 day interval, ease unchanged", () => {
    const r = grade(makeCard(), Quality.Hard, CTX);
    expect(r.interval_d).toBe(1);
    expect(r.due).toBe(TODAY + 1);
    expect(r.ease).toBe(2.5);
    expect(r.lapses).toBe(0);
  });

  it("Good on new card: 1 day interval", () => {
    const r = grade(makeCard(), Quality.Good, CTX);
    expect(r.interval_d).toBe(1);
    expect(r.due).toBe(TODAY + 1);
  });

  it("Easy on new card: 4 day interval", () => {
    const r = grade(makeCard(), Quality.Easy, CTX);
    expect(r.interval_d).toBe(4);
    expect(r.due).toBe(TODAY + 4);
  });
});

describe("grade() — review card", () => {
  const reviewing = makeCard({ state: "review", interval_d: 10, ease: 2.5, reps: 3 });

  it("Again on review: interval 0, lapse+1, ease unchanged", () => {
    const r = grade(reviewing, Quality.Again, CTX);
    expect(r.interval_d).toBe(0);
    expect(r.due).toBe(TODAY);
    expect(r.lapses).toBe(1);
    expect(r.ease).toBe(2.5);
  });

  it("Hard on review: interval × 1.2, ease −0.15", () => {
    const r = grade(reviewing, Quality.Hard, CTX);
    expect(r.interval_d).toBe(12); // 10 × 1.2
    expect(r.ease).toBeCloseTo(2.35, 5);
  });

  it("Good on review: interval × ease, ease unchanged", () => {
    const r = grade(reviewing, Quality.Good, CTX);
    expect(r.interval_d).toBe(25); // 10 × 2.5
    expect(r.ease).toBe(2.5);
  });

  it("Easy on review: interval × ease × 1.3, ease +0.15", () => {
    const r = grade(reviewing, Quality.Easy, CTX);
    expect(r.interval_d).toBe(33); // round(10 × 2.5 × 1.3) = 32.5 → 33
    expect(r.ease).toBeCloseTo(2.65, 5);
  });

  it("ease has floor of 1.3", () => {
    const lowEase = makeCard({ state: "review", interval_d: 5, ease: 1.4 });
    const r = grade(lowEase, Quality.Hard, CTX);
    expect(r.ease).toBe(1.3); // 1.4 − 0.15 = 1.25 → floored to 1.3
  });

  it("interval floor of 1 for non-Again grades", () => {
    const tiny = makeCard({ state: "review", interval_d: 0, ease: 2.5 });
    const r = grade(tiny, Quality.Good, CTX);
    expect(r.interval_d).toBe(1); // 0 × 2.5 = 0 → floored to 1
  });
});

describe("grade() — reps counter", () => {
  it("reps increments on every grade", () => {
    let card = makeCard({ state: "review", interval_d: 1, reps: 5 });
    card = { ...card, ...grade(card, Quality.Good, CTX) };
    expect(card.reps).toBe(6);
    card = { ...card, ...grade(card, Quality.Again, CTX) };
    expect(card.reps).toBe(7);
  });
});
