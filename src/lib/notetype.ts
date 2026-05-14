// Parse Anki's notetype definitions out of `col.models` JSON.
// Only the legacy form is supported in MVP; Anki desktop's .apkg export still
// emits this for backwards compatibility, which covers the vast majority of
// shared decks in the wild.

import type { NoteTypeKind } from "@shared/types";

export interface ParsedField {
  name: string;
  ord: number;
}

export interface ParsedTemplate {
  ord: number;
  name: string;
  qfmt: string;
  afmt: string;
}

export interface ParsedNoteType {
  anki_id: string;
  name: string;
  kind: NoteTypeKind;
  css: string;
  fields: ParsedField[];
  templates: ParsedTemplate[];
}

interface RawModel {
  id: number;
  name: string;
  type: 0 | 1; // 0 = standard, 1 = cloze
  css?: string;
  flds: Array<{ name: string; ord: number }>;
  tmpls: Array<{ name: string; ord: number; qfmt: string; afmt: string }>;
}

export function parseNoteTypes(modelsJson: string): Map<string, ParsedNoteType> {
  const raw = JSON.parse(modelsJson) as Record<string, RawModel>;
  const out = new Map<string, ParsedNoteType>();

  for (const [id, model] of Object.entries(raw)) {
    out.set(id, {
      anki_id: id,
      name: model.name,
      kind: detectKind(model),
      css: model.css ?? "",
      fields: model.flds.map((f) => ({ name: f.name, ord: f.ord })).sort((a, b) => a.ord - b.ord),
      templates: model.tmpls
        .map((t) => ({ ord: t.ord, name: t.name, qfmt: t.qfmt, afmt: t.afmt }))
        .sort((a, b) => a.ord - b.ord),
    });
  }

  return out;
}

function detectKind(model: RawModel): NoteTypeKind {
  if (model.type === 1) return "cloze";
  // type=0 with single front/back template: classic Basic
  // type=0 with multiple templates: still rendered with per-template logic, treat as basic
  return "basic";
}
