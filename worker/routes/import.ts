import { json, type Env } from "../types";
import { parseJson } from "../parse";
import { epochDays } from "@shared/time";
import type { CardState, ImportRequest, ImportResponse } from "@shared/types";

const QUERY_CHUNK = 50;
const INSERT_CHUNK = 50;

interface InheritedState {
  state: CardState;
  ease: number;
  interval_d: number;
  due: number;
  reps: number;
  lapses: number;
  last_review: number | null;
}

export async function importDeck(request: Request, env: Env): Promise<Response> {
  const body = await parseJson<ImportRequest>(request, (b) => {
    const r = b as ImportRequest;
    if (typeof r.deck_name !== "string" || !Array.isArray(r.cards)) return false;
    if (r.mode !== "new" && r.mode !== "replace") return false;
    if (r.mode === "replace" && typeof r.target_deck_id !== "number") return false;
    return true;
  });
  if (body instanceof Response) return body;

  const now = Date.now();
  const today = epochDays();

  const { cardsToInsert, inherited } = await resolveCardPlan(env, body);

  const deckIns = await env.DB.prepare(
    `INSERT INTO decks (name, daily_new_limit, created_at, updated_at) VALUES (?, 20, ?, ?)`,
  )
    .bind(body.deck_name, now, now)
    .run();
  const deck_id = Number(deckIns.meta.last_row_id);

  const notetypeIds = await insertNotetypes(env, deck_id, body);

  const stateInherited = await insertCards(env, deck_id, today, now, cardsToInsert, inherited, notetypeIds);

  const response: ImportResponse = {
    deck_id,
    cards_inserted: cardsToInsert.length,
    cards_state_inherited: stateInherited,
  };
  return json(response);
}

interface CardPlan {
  cardsToInsert: ImportRequest["cards"];
  inherited: Map<string, InheritedState>;
}

async function resolveCardPlan(env: Env, body: ImportRequest): Promise<CardPlan> {
  const inherited = new Map<string, InheritedState>();

  if (body.mode === "replace") {
    await snapshotDeckState(env, body.target_deck_id!, inherited);
    await env.DB.prepare(`DELETE FROM decks WHERE id = ?`).bind(body.target_deck_id!).run();
    return { cardsToInsert: body.cards, inherited };
  }

  const conflicting = await findConflictingGuids(env, body.cards.map((c) => c.guid));
  if (conflicting.size === 0) return { cardsToInsert: body.cards, inherited };
  return { cardsToInsert: body.cards.filter((c) => !conflicting.has(c.guid)), inherited };
}

async function insertNotetypes(
  env: Env,
  deck_id: number,
  body: ImportRequest,
): Promise<Map<string, number>> {
  if (body.notetypes.length === 0) return new Map();

  const stmt = env.DB.prepare(
    `INSERT INTO notetypes (deck_id, anki_id, name, css, kind) VALUES (?, ?, ?, ?, ?)`,
  );
  const batched = body.notetypes.map((nt) =>
    stmt.bind(deck_id, nt.anki_id, nt.name, nt.css ?? null, nt.kind),
  );
  const results = await env.DB.batch(batched);

  const ids = new Map<string, number>();
  body.notetypes.forEach((nt, i) => {
    ids.set(nt.anki_id, Number(results[i]!.meta.last_row_id));
  });
  return ids;
}

async function insertCards(
  env: Env,
  deck_id: number,
  today: number,
  now: number,
  cards: ImportRequest["cards"],
  inherited: Map<string, InheritedState>,
  notetypeIds: Map<string, number>,
): Promise<number> {
  let stateInherited = 0;
  const stmt = env.DB.prepare(
    `INSERT INTO cards
       (guid, deck_id, notetype_id, front_html, back_html, state, ease, interval_d, due, reps, lapses, last_review, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let current: D1PreparedStatement[] = [];
  for (const c of cards) {
    const inh = inherited.get(c.guid);
    if (inh) stateInherited++;
    const notetype_id = notetypeIds.get(c.notetype_anki_id) ?? null;
    current.push(
      stmt.bind(
        c.guid,
        deck_id,
        notetype_id,
        c.front_html,
        c.back_html,
        inh?.state ?? "new",
        inh?.ease ?? 2.5,
        inh?.interval_d ?? 0,
        inh?.due ?? today,
        inh?.reps ?? 0,
        inh?.lapses ?? 0,
        inh?.last_review ?? null,
        now,
      ),
    );
    if (current.length >= INSERT_CHUNK) {
      await env.DB.batch(current);
      current = [];
    }
  }
  if (current.length > 0) await env.DB.batch(current);

  return stateInherited;
}

async function snapshotDeckState(
  env: Env,
  deck_id: number,
  out: Map<string, InheritedState>,
): Promise<void> {
  const r = await env.DB.prepare(
    `SELECT guid, state, ease, interval_d, due, reps, lapses, last_review
       FROM cards
      WHERE deck_id = ?`,
  )
    .bind(deck_id)
    .all<InheritedState & { guid: string }>();
  for (const row of r.results) {
    const { guid, ...rest } = row;
    out.set(guid, rest);
  }
}

async function findConflictingGuids(env: Env, guids: string[]): Promise<Set<string>> {
  if (guids.length === 0) return new Set();
  const chunks: Promise<D1Result<{ guid: string }>>[] = [];
  for (let i = 0; i < guids.length; i += QUERY_CHUNK) {
    const chunk = guids.slice(i, i + QUERY_CHUNK);
    const placeholders = chunk.map(() => "?").join(",");
    chunks.push(
      env.DB.prepare(`SELECT guid FROM cards WHERE guid IN (${placeholders})`)
        .bind(...chunk)
        .all<{ guid: string }>(),
    );
  }
  const results = await Promise.all(chunks);
  const conflicting = new Set<string>();
  for (const r of results) for (const row of r.results) conflicting.add(row.guid);
  return conflicting;
}
