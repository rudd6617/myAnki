-- Initial schema. See docs/adr/0001-cloudflare-anki-mvp-architecture.md.
-- All timestamps are epoch milliseconds. `due` is epoch days (UTC midnight).

PRAGMA foreign_keys = ON;

CREATE TABLE decks (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,
  daily_new_limit   INTEGER NOT NULL DEFAULT 20,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

CREATE TABLE notetypes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id     INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  anki_id     TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  css         TEXT,
  kind        TEXT    NOT NULL CHECK (kind IN ('basic', 'cloze', 'fallback'))
);
CREATE INDEX idx_notetypes_deck ON notetypes(deck_id);

CREATE TABLE cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  guid          TEXT    NOT NULL UNIQUE,
  deck_id       INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  notetype_id   INTEGER REFERENCES notetypes(id) ON DELETE SET NULL,
  front_html    TEXT    NOT NULL,
  back_html     TEXT    NOT NULL,
  state         TEXT    NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'review')),
  ease          REAL    NOT NULL DEFAULT 2.5,
  interval_d    INTEGER NOT NULL DEFAULT 0,
  due           INTEGER NOT NULL,
  reps          INTEGER NOT NULL DEFAULT 0,
  lapses        INTEGER NOT NULL DEFAULT 0,
  last_review   INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_cards_deck_due   ON cards(deck_id, due);
CREATE INDEX idx_cards_deck_state ON cards(deck_id, state);

CREATE TABLE reviews (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id        INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  ts             INTEGER NOT NULL,
  quality        INTEGER NOT NULL CHECK (quality IN (0, 3, 4, 5)),
  prev_interval  INTEGER NOT NULL,
  new_interval   INTEGER NOT NULL,
  prev_ease      REAL    NOT NULL,
  new_ease       REAL    NOT NULL
);
CREATE INDEX idx_reviews_card_ts ON reviews(card_id, ts);
