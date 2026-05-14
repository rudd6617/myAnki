// Browser-side .apkg reader: unzip + read Anki SQLite + collect media manifest.
//
// .apkg layout (zip):
//   collection.anki2  | collection.anki21    SQLite database
//   media                                    JSON: { "0": "cat.jpg", "1": ... }
//   0, 1, 2, ...                             numeric-named media blobs

import JSZip from "jszip";
import initSqlJs, { type Database } from "sql.js";

export interface ApkgRawNote {
  id: number;
  guid: string;
  mid: number;
  flds: string;
  tags: string;
}

export interface ApkgRawCard {
  id: number;
  nid: number;
  did: number;
  ord: number;
}

export interface ApkgRawCollection {
  models: string;
  decks: string;
}

export interface ApkgMediaEntry {
  filename: string;
  data: Uint8Array;
}

export interface ApkgRaw {
  deckName: string;
  notes: ApkgRawNote[];
  cards: ApkgRawCard[];
  col: ApkgRawCollection;
  media: ApkgMediaEntry[];
}

export interface ApkgParseOptions {
  wasmUrl: string;
}

export async function parseApkg(
  source: File | Blob | ArrayBuffer | Uint8Array,
  opts: ApkgParseOptions,
): Promise<ApkgRaw> {
  const zip = await JSZip.loadAsync(source);

  const sqliteEntry = zip.file("collection.anki21") ?? zip.file("collection.anki2");
  if (!sqliteEntry) throw new Error("invalid .apkg: missing collection.anki2(1)");
  const sqliteBytes = await sqliteEntry.async("uint8array");

  const SQL = await initSqlJs({ locateFile: () => opts.wasmUrl });
  const db = new SQL.Database(sqliteBytes);
  try {
    const col = readCol(db);
    const notes = readNotes(db);
    const cards = readCards(db);
    const media = await readMedia(zip);
    const deckName = extractDeckName(col.decks);
    return { deckName, col, notes, cards, media };
  } finally {
    db.close();
  }
}

function readCol(db: Database): ApkgRawCollection {
  const stmt = db.prepare("SELECT models, decks FROM col LIMIT 1");
  if (!stmt.step()) throw new Error("invalid .apkg: empty col table");
  const row = stmt.getAsObject() as { models: string; decks: string };
  stmt.free();
  return { models: row.models, decks: row.decks };
}

function readNotes(db: Database): ApkgRawNote[] {
  const stmt = db.prepare("SELECT id, guid, mid, flds, tags FROM notes");
  const out: ApkgRawNote[] = [];
  while (stmt.step()) {
    out.push(stmt.getAsObject() as unknown as ApkgRawNote);
  }
  stmt.free();
  return out;
}

function readCards(db: Database): ApkgRawCard[] {
  const stmt = db.prepare("SELECT id, nid, did, ord FROM cards");
  const out: ApkgRawCard[] = [];
  while (stmt.step()) {
    out.push(stmt.getAsObject() as unknown as ApkgRawCard);
  }
  stmt.free();
  return out;
}

async function readMedia(zip: JSZip): Promise<ApkgMediaEntry[]> {
  const mediaJsonEntry = zip.file("media");
  if (!mediaJsonEntry) return [];

  const manifestText = await mediaJsonEntry.async("string");
  const manifest = JSON.parse(manifestText) as Record<string, string>;

  const out: ApkgMediaEntry[] = [];
  for (const [numericName, originalName] of Object.entries(manifest)) {
    const blobEntry = zip.file(numericName);
    if (!blobEntry) continue;
    out.push({ filename: originalName, data: await blobEntry.async("uint8array") });
  }
  return out;
}

// Anki's "Default" deck (id=1) is always present; the user's actual deck is the
// first non-default named deck. Fall back to any named deck, else a static
// label so import still proceeds with broken metadata.
function extractDeckName(decksJson: string): string {
  const decks = JSON.parse(decksJson) as Record<string, { id: number; name: string }>;
  const named = Object.values(decks).filter((d) => d.id !== 1 && d.name);
  if (named.length > 0) return named[0]!.name;
  const any = Object.values(decks).find((d) => d.name);
  return any?.name ?? "Imported";
}
