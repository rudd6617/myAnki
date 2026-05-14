import { json, type Env } from "../types";
import { epochDays } from "@shared/time";

const BACKLOG_THRESHOLD_DAYS = 7;

interface DeckListRow {
  id: number;
  name: string;
  total: number;
  due: number;
  new_count: number;
  overdue_7d: number;
}

export async function listDecks(env: Env): Promise<Response> {
  const today = epochDays();
  const overdueCutoff = today - BACKLOG_THRESHOLD_DAYS;

  const result = await env.DB.prepare(
    `SELECT
       d.id,
       d.name,
       COUNT(c.id)                                                     AS total,
       SUM(CASE WHEN c.state = 'review' AND c.due <= ?           THEN 1 ELSE 0 END) AS due,
       SUM(CASE WHEN c.state = 'new'                              THEN 1 ELSE 0 END) AS new_count,
       SUM(CASE WHEN c.state = 'review' AND c.due <  ?           THEN 1 ELSE 0 END) AS overdue_7d
     FROM decks d
     LEFT JOIN cards c ON c.deck_id = d.id
     GROUP BY d.id
     ORDER BY d.updated_at DESC`,
  )
    .bind(today, overdueCutoff)
    .all<DeckListRow>();

  return json(result.results);
}

export async function deleteDeck(env: Env, id: number): Promise<Response> {
  // ON DELETE CASCADE handles notetypes / cards / reviews.
  const result = await env.DB.prepare(`DELETE FROM decks WHERE id = ?`).bind(id).run();
  if (result.meta.changes === 0) return json({ error: "not found" }, 404);
  return new Response(null, { status: 204 });
}

export async function resetBacklog(env: Env, id: number): Promise<Response> {
  const today = epochDays();
  const cutoff = today - BACKLOG_THRESHOLD_DAYS;

  const result = await env.DB.prepare(
    `UPDATE cards
        SET due = ?
      WHERE deck_id = ?
        AND state = 'review'
        AND due < ?`,
  )
    .bind(today, id, cutoff)
    .run();

  return json({ updated: result.meta.changes });
}
