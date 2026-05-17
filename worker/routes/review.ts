import { json, type Env } from "../types";
import { parseJson } from "../parse";
import { epochDays } from "@shared/time";
import { grade } from "@shared/sm2";
import { isQuality, type Card, type Quality } from "@shared/types";

const CARD_COLUMNS = `
  id, guid, deck_id, notetype_id, front_html, back_html,
  state, ease, interval_d, due, reps, lapses, last_review, created_at
`;

interface QueueParams {
  deckId: number;
}

export async function getQueue(env: Env, p: QueueParams): Promise<Response> {
  const today = epochDays();

  const [deck, due, fresh] = await Promise.all([
    env.DB.prepare(`SELECT daily_new_limit FROM decks WHERE id = ?`)
      .bind(p.deckId)
      .first<{ daily_new_limit: number }>(),
    env.DB.prepare(
      `SELECT ${CARD_COLUMNS}
         FROM cards
        WHERE deck_id = ? AND state = 'review' AND due <= ?
        ORDER BY due ASC`,
    )
      .bind(p.deckId, today)
      .all<Card>(),
    // The new-card LIMIT depends on daily_new_limit, but we don't have it yet.
    // Fetch a generous batch and trim once `deck` resolves; saves one round-trip
    // in the common case (deck exists). Trimming below.
    env.DB.prepare(
      `SELECT ${CARD_COLUMNS}
         FROM cards
        WHERE deck_id = ? AND state = 'new'
        ORDER BY id ASC
        LIMIT 100`,
    )
      .bind(p.deckId)
      .all<Card>(),
  ]);

  if (!deck) return json({ error: "not found" }, 404);

  return json([...due.results, ...fresh.results.slice(0, deck.daily_new_limit)]);
}

export async function postReview(
  request: Request,
  env: Env,
  cardId: number,
): Promise<Response> {
  const body = await parseJson<{ quality: Quality }>(request, (b) => {
    const q = (b as { quality?: unknown }).quality;
    return typeof q === "number" && isQuality(q);
  });
  if (body instanceof Response) return body;

  const card = await env.DB.prepare(
    `SELECT ${CARD_COLUMNS} FROM cards WHERE id = ?`,
  )
    .bind(cardId)
    .first<Card>();
  if (!card) return json({ error: "not found" }, 404);

  const ctx = { todayEpochDay: epochDays(), nowMs: Date.now() };
  const next = grade(card, body.quality, ctx);

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE cards
          SET state = ?, ease = ?, interval_d = ?, due = ?,
              reps = ?, lapses = ?, last_review = ?
        WHERE id = ?`,
    ).bind(
      next.state,
      next.ease,
      next.interval_d,
      next.due,
      next.reps,
      next.lapses,
      next.last_review,
      cardId,
    ),
    env.DB.prepare(
      `INSERT INTO reviews (card_id, ts, quality, prev_interval, new_interval, prev_ease, new_ease)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      cardId,
      ctx.nowMs,
      body.quality,
      card.interval_d,
      next.interval_d,
      card.ease,
      next.ease,
    ),
  ]);

  return new Response(null, { status: 204 });
}
