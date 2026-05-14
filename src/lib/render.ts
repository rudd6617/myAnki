// Anki template → rendered front/back HTML, evaluated once at import time.
// Pure (no DOM); sanitize is a separate step (src/lib/sanitize.ts).
//
// Template syntax handled:
//   {{Field}}              field substitution
//   {{cloze:Field}}        cloze rendering of the named field
//   {{FrontSide}}          back-template re-references rendered front
//   {{#Field}}...{{/...}}  render block if field non-empty
//   {{^Field}}...{{/...}}  render block if field empty
//   {{type:Field}}         strip directive, leave field value (MVP)
//   {{hint:Field}}         strip directive, leave field value (MVP)
//
// Cloze syntax inside field values:
//   {{c1::answer}}  |  {{c1::answer::hint}}

import type { ImportCard, ImportNoteType } from "@shared/types";
import type { ApkgRaw, ApkgRawCard, ApkgRawNote } from "./apkg";
import type { ParsedNoteType } from "./notetype";

const FIELD_SEPARATOR = "\x1f"; // Anki joins fields with U+001F (Unit Separator)

export interface BuildOutput {
  notetypes: ImportNoteType[];
  cards: ImportCard[];
  /** Filenames referenced from card HTML that weren't found in the media manifest. */
  unresolvedMedia: string[];
}

export type MediaMap = Map<string, string>;

export function buildCards(
  raw: ApkgRaw,
  notetypes: Map<string, ParsedNoteType>,
  mediaMap: MediaMap,
): BuildOutput {
  const notesById = new Map<number, ApkgRawNote>();
  for (const n of raw.notes) notesById.set(n.id, n);

  const cards: ImportCard[] = [];
  const unresolved = new Set<string>();
  const usedNotetypeIds = new Set<string>();

  for (const card of raw.cards) {
    const note = notesById.get(card.nid);
    if (!note) continue;
    usedNotetypeIds.add(String(note.mid));
    const notetype = notetypes.get(String(note.mid));
    const rendered = renderOne(note, card, notetype, mediaMap, unresolved);
    if (rendered) cards.push(rendered);
  }

  const notetypePayload: ImportNoteType[] = [];
  for (const id of usedNotetypeIds) {
    const nt = notetypes.get(id);
    if (!nt) continue;
    notetypePayload.push({
      anki_id: nt.anki_id,
      name: nt.name,
      kind: nt.kind,
      css: nt.css || null,
    });
  }

  return { notetypes: notetypePayload, cards, unresolvedMedia: [...unresolved] };
}

function renderOne(
  note: ApkgRawNote,
  card: ApkgRawCard,
  notetype: ParsedNoteType | undefined,
  mediaMap: MediaMap,
  unresolved: Set<string>,
): ImportCard | null {
  const fieldValues = note.flds.split(FIELD_SEPARATOR);
  const guid = `${note.guid}#${card.ord}`;

  if (!notetype) return renderFallback(guid, fieldValues, "fallback", mediaMap, unresolved);

  const fields = new Map<string, string>();
  for (const f of notetype.fields) {
    fields.set(f.name, fieldValues[f.ord] ?? "");
  }

  // Basic-reversed uses templates[ord]; Cloze always uses templates[0] and
  // distinguishes cards via the cN group selected by ord.
  const tmpl =
    notetype.kind === "cloze"
      ? notetype.templates[0]
      : notetype.templates[card.ord] ?? notetype.templates[0];

  if (!tmpl || notetype.kind === "fallback") {
    return renderFallback(guid, fieldValues, notetype.anki_id, mediaMap, unresolved);
  }

  const front = applyTemplate(tmpl.qfmt, fields, card.ord, "front", null);
  const back = applyTemplate(tmpl.afmt, fields, card.ord, "back", front);

  return {
    guid,
    notetype_anki_id: notetype.anki_id,
    front_html: rewriteMedia(front, mediaMap, unresolved),
    back_html: rewriteMedia(back, mediaMap, unresolved),
  };
}

function renderFallback(
  guid: string,
  fieldValues: string[],
  notetypeAnkiId: string,
  mediaMap: MediaMap,
  unresolved: Set<string>,
): ImportCard {
  const both = rewriteMedia(
    fieldValues.filter((v) => v.trim()).join("<br>"),
    mediaMap,
    unresolved,
  );
  return { guid, notetype_anki_id: notetypeAnkiId, front_html: both, back_html: both };
}

function applyTemplate(
  tmpl: string,
  fields: Map<string, string>,
  ord: number,
  side: "front" | "back",
  frontRendered: string | null,
): string {
  let result = tmpl;

  if (side === "back" && frontRendered !== null) {
    result = result.replace(/\{\{FrontSide\}\}/g, frontRendered);
  }

  // Two passes lets a single-depth nesting of conditionals resolve. Deeper
  // nesting is rare in real decks and not supported by design.
  for (let pass = 0; pass < 2; pass++) {
    result = result.replace(
      /\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_, name: string, content: string) =>
        (fields.get(name.trim()) ?? "").trim() ? content : "",
    );
    result = result.replace(
      /\{\{\^([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_, name: string, content: string) =>
        (fields.get(name.trim()) ?? "").trim() ? "" : content,
    );
  }

  result = result.replace(/\{\{cloze:([^}]+)\}\}/g, (_, name: string) => {
    const value = fields.get(name.trim()) ?? "";
    return renderClozeField(value, ord + 1, side);
  });

  result = result.replace(
    /\{\{(?:type|hint):([^}]+)\}\}/g,
    (_, name: string) => fields.get(name.trim()) ?? "",
  );

  result = result.replace(/\{\{([^}#^/:]+)\}\}/g, (m, name: string) => {
    const n = name.trim();
    if (n === "FrontSide") return m;
    return fields.get(n) ?? "";
  });

  return result;
}

const CLOZE_REGEX = /\{\{c(\d+)::([\s\S]*?)\}\}/g;

export function renderClozeField(
  value: string,
  targetGroup: number,
  side: "front" | "back",
): string {
  return value.replace(CLOZE_REGEX, (_match, numStr: string, content: string) => {
    const groupNum = Number(numStr);
    const sepIdx = content.indexOf("::");
    const answer = sepIdx === -1 ? content : content.slice(0, sepIdx);
    const hint = sepIdx === -1 ? null : content.slice(sepIdx + 2);

    if (side === "front") {
      if (groupNum === targetGroup) {
        return `<span class="cloze">[${hint ?? "..."}]</span>`;
      }
      return answer;
    }
    if (groupNum === targetGroup) {
      return `<span class="cloze cloze-revealed">${answer}</span>`;
    }
    return answer;
  });
}

const IMG_SRC_REGEX = /<img([^>]*?)\ssrc=(['"])([^'"]+?)\2/gi;
const SOUND_REGEX = /\[sound:[^\]]+\]/g;

export function rewriteMedia(
  html: string,
  mediaMap: MediaMap,
  unresolved: Set<string>,
): string {
  let out = html.replace(SOUND_REGEX, "");

  out = out.replace(IMG_SRC_REGEX, (_match, pre: string, quote: string, filename: string) => {
    const decoded = decodeURIComponent(filename);
    const sha = mediaMap.get(decoded) ?? mediaMap.get(filename);
    if (!sha) {
      unresolved.add(decoded);
      return `<img${pre} src=${quote}${filename}${quote}`;
    }
    return `<img${pre} src="/media/${sha}"`;
  });

  return out;
}
