// Domain types shared by Worker and client.
// Match D1 schema in migrations/0001_init.sql.

export type CardState = "new" | "review";

export type NoteTypeKind = "basic" | "cloze" | "fallback";

export const Quality = {
  Again: 0,
  Hard: 3,
  Good: 4,
  Easy: 5,
} as const;
export type Quality = (typeof Quality)[keyof typeof Quality];

export function isQuality(n: number): n is Quality {
  return n === 0 || n === 3 || n === 4 || n === 5;
}

export interface Card {
  id: number;
  guid: string;
  deck_id: number;
  notetype_id: number | null;
  front_html: string;
  back_html: string;
  state: CardState;
  ease: number;
  interval_d: number;
  due: number; // epoch days
  reps: number;
  lapses: number;
  last_review: number | null; // epoch ms
  created_at: number; // epoch ms
}

export interface Deck {
  id: number;
  name: string;
  daily_new_limit: number;
  created_at: number;
  updated_at: number;
}

export interface DeckListEntry {
  id: number;
  name: string;
  total: number;
  due: number;
  new_count: number;
  overdue_7d: number;
}

export interface NoteType {
  id: number;
  deck_id: number;
  anki_id: string;
  name: string;
  css: string | null;
  kind: NoteTypeKind;
}

export interface Review {
  id: number;
  card_id: number;
  ts: number;
  quality: Quality;
  prev_interval: number;
  new_interval: number;
  prev_ease: number;
  new_ease: number;
}

// ---- Import payload (client → worker) ----

export type ImportMode = "new" | "replace";

export interface ImportNoteType {
  anki_id: string;
  name: string;
  kind: NoteTypeKind;
  css: string | null;
}

export interface ImportCard {
  guid: string; // "<note_guid>#<ord>"
  notetype_anki_id: string;
  front_html: string;
  back_html: string;
}

export interface ImportRequest {
  mode: ImportMode;
  target_deck_id?: number; // required when mode === 'replace'
  deck_name: string;
  notetypes: ImportNoteType[];
  cards: ImportCard[];
}

export interface ImportResponse {
  deck_id: number;
  cards_inserted: number;
  cards_state_inherited: number;
}

export interface MediaCheckRequest {
  hashes: string[];
}

export interface MediaCheckResponse {
  missing: string[];
}
