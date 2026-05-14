// Simplified SM-2. See docs/adr/0001-cloudflare-anki-mvp-architecture.md and CONTEXT.md.
//
// Departures from canonical SM-2:
// - No Anki "learning steps" ladder (1m / 10m / 1d).
// - Again resets interval to 0 (today). Re-queueing within session is a client concern.
// - Quality values restricted to {0, 3, 4, 5} (Again / Hard / Good / Easy).

import { Quality, type Card, type CardState } from "./types";

const EASE_FLOOR = 1.3;
const EASE_DELTA_HARD = -0.15;
const EASE_DELTA_EASY = 0.15;
const HARD_MULTIPLIER = 1.2;
const EASY_MULTIPLIER = 1.3;

// First-time intervals (days) when transitioning from 'new' to 'review'.
// Again still lands on 0 days (today); other choices give a real interval.
const NEW_CARD_INTERVAL: Record<Quality, number> = {
  [Quality.Again]: 0,
  [Quality.Hard]: 1,
  [Quality.Good]: 1,
  [Quality.Easy]: 4,
};

export interface GradeOutput {
  state: CardState;
  ease: number;
  interval_d: number;
  due: number; // epoch days
  reps: number;
  lapses: number;
  last_review: number; // epoch ms
}

export interface GradeContext {
  todayEpochDay: number;
  nowMs: number;
}

export function grade(card: Card, quality: Quality, ctx: GradeContext): GradeOutput {
  if (card.state === "new") return gradeNew(card, quality, ctx);
  return gradeReview(card, quality, ctx);
}

function gradeNew(card: Card, quality: Quality, ctx: GradeContext): GradeOutput {
  const intervalDays = NEW_CARD_INTERVAL[quality];
  return {
    state: "review",
    ease: card.ease, // default 2.5, unchanged on first review
    interval_d: intervalDays,
    due: ctx.todayEpochDay + intervalDays,
    reps: card.reps + 1,
    lapses: quality === Quality.Again ? card.lapses + 1 : card.lapses,
    last_review: ctx.nowMs,
  };
}

function gradeReview(card: Card, quality: Quality, ctx: GradeContext): GradeOutput {
  if (quality === Quality.Again) {
    return {
      state: "review",
      ease: card.ease, // ease floor not touched on Again per simplified spec
      interval_d: 0,
      due: ctx.todayEpochDay,
      reps: card.reps + 1,
      lapses: card.lapses + 1,
      last_review: ctx.nowMs,
    };
  }

  const nextEase = computeNextEase(card.ease, quality);
  const nextInterval = computeNextInterval(card.interval_d, card.ease, quality);

  return {
    state: "review",
    ease: nextEase,
    interval_d: nextInterval,
    due: ctx.todayEpochDay + nextInterval,
    reps: card.reps + 1,
    lapses: card.lapses,
    last_review: ctx.nowMs,
  };
}

function computeNextEase(ease: number, quality: Quality): number {
  if (quality === Quality.Hard) return Math.max(EASE_FLOOR, ease + EASE_DELTA_HARD);
  if (quality === Quality.Easy) return ease + EASE_DELTA_EASY;
  return ease; // Good: unchanged
}

function computeNextInterval(prev: number, ease: number, quality: Quality): number {
  if (quality === Quality.Hard) return Math.max(1, Math.round(prev * HARD_MULTIPLIER));
  if (quality === Quality.Good) return Math.max(1, Math.round(prev * ease));
  // Easy
  return Math.max(1, Math.round(prev * ease * EASY_MULTIPLIER));
}
