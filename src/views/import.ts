import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { parseApkg, type ApkgRaw } from "@/lib/apkg";
import { parseNoteTypes } from "@/lib/notetype";
import { buildCards } from "@/lib/render";
import { sanitizeCardHtml } from "@/lib/sanitize";
import { hashAll, uploadMissing, type HashedMedia, type MediaProgress } from "@/lib/media";
import { api } from "@/lib/api";
import { esc, messageOf } from "@/lib/html";
import type {
  DeckListEntry,
  ImportCard,
  ImportMode,
  ImportNoteType,
  ImportRequest,
  ImportResponse,
} from "@shared/types";

interface Prepared {
  deckName: string;
  notetypes: ImportNoteType[];
  cards: ImportCard[];
  media: HashedMedia[];
  unresolvedMedia: string[];
  existingDeck: DeckListEntry | null;
}

type State =
  | { kind: "idle" }
  | { kind: "parsing"; filename: string }
  | { kind: "preview"; prepared: Prepared }
  | { kind: "uploading_media"; prepared: Prepared; progress: MediaProgress }
  | { kind: "uploading_db"; prepared: Prepared }
  | { kind: "done"; result: ImportResponse; deckName: string; rejected: number }
  | { kind: "error"; message: string };

export function renderImport(container: HTMLElement): void {
  let state: State = { kind: "idle" };
  const update = (next: State) => {
    state = next;
    paint();
  };

  function paint(): void {
    container.innerHTML = `<main class="import">${viewFor(state)}</main>`;
    wireHandlers();
  }

  function wireHandlers(): void {
    const input = container.querySelector<HTMLInputElement>("#apkg-file");
    if (input) input.addEventListener("change", onFileChosen);

    const replaceBtn = container.querySelector<HTMLButtonElement>("#btn-replace");
    if (replaceBtn) replaceBtn.addEventListener("click", () => startUpload("replace"));

    const newBtn = container.querySelector<HTMLButtonElement>("#btn-new");
    if (newBtn) newBtn.addEventListener("click", () => startUpload("new"));

    const cancelBtn = container.querySelector<HTMLButtonElement>("#btn-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", () => update({ kind: "idle" }));

    const retryBtn = container.querySelector<HTMLButtonElement>("#btn-retry");
    if (retryBtn) retryBtn.addEventListener("click", () => update({ kind: "idle" }));
  }

  async function onFileChosen(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    update({ kind: "parsing", filename: file.name });
    try {
      const prepared = await prepare(file);
      update({ kind: "preview", prepared });
    } catch (err) {
      update({ kind: "error", message: messageOf(err) });
    }
  }

  async function startUpload(mode: ImportMode): Promise<void> {
    if (state.kind !== "preview") return;
    const prepared = state.prepared;

    if (mode === "replace" && !prepared.existingDeck) {
      update({ kind: "error", message: "no existing deck to replace" });
      return;
    }

    update({
      kind: "uploading_media",
      prepared,
      progress: { total: prepared.media.length, done: 0, uploading: [] },
    });

    try {
      await uploadMissing(prepared.media, (p) =>
        update({ kind: "uploading_media", prepared, progress: p }),
      );
      update({ kind: "uploading_db", prepared });

      const payload: ImportRequest = {
        mode,
        deck_name: prepared.deckName,
        notetypes: prepared.notetypes,
        cards: prepared.cards,
        ...(mode === "replace" && prepared.existingDeck
          ? { target_deck_id: prepared.existingDeck.id }
          : {}),
      };
      const result = await api.importDeck(payload);
      update({
        kind: "done",
        result,
        deckName: prepared.deckName,
        rejected: prepared.cards.length - result.cards_inserted,
      });
    } catch (err) {
      update({ kind: "error", message: messageOf(err) });
    }
  }

  paint();
}

async function prepare(file: File): Promise<Prepared> {
  // Kick off the deck listing in parallel with parsing — independent of file content.
  const decksPromise = api.listDecks();

  const raw: ApkgRaw = await parseApkg(file, { wasmUrl });
  const notetypeMap = parseNoteTypes(raw.col.models);

  const hashed = await hashAll(raw.media);
  const mediaMap = new Map(hashed.map((h) => [h.filename, h.sha256]));

  const built = buildCards(raw, notetypeMap, mediaMap);

  const cards: ImportCard[] = built.cards.map((c) => ({
    ...c,
    front_html: sanitizeCardHtml(c.front_html),
    back_html: sanitizeCardHtml(c.back_html),
  }));

  const allDecks = await decksPromise;
  const existingDeck = allDecks.find((d) => d.name === raw.deckName) ?? null;

  return {
    deckName: raw.deckName,
    notetypes: built.notetypes,
    cards,
    media: hashed,
    unresolvedMedia: built.unresolvedMedia,
    existingDeck,
  };
}

// ---- Views ----

function viewFor(state: State): string {
  switch (state.kind) {
    case "idle":
      return idleView();
    case "parsing":
      return parsingView(state.filename);
    case "preview":
      return previewView(state.prepared);
    case "uploading_media":
      return mediaProgressView(state.progress);
    case "uploading_db":
      return uploadingDbView(state.prepared.cards.length);
    case "done":
      return doneView(state);
    case "error":
      return errorView(state.message);
  }
}

function idleView(): string {
  return `
    <header><a href="/" data-route>← Home</a></header>
    <h1>Import .apkg</h1>
    <label class="file-drop">
      <input type="file" id="apkg-file" accept=".apkg" />
      <span>選擇或拖入 .apkg 檔</span>
    </label>
  `;
}

function parsingView(filename: string): string {
  return `<h1>解析中…</h1><p class="muted">${esc(filename)}</p>`;
}

function previewView(p: Prepared): string {
  const conflictBanner = p.existingDeck
    ? `<div class="warn">
         ⚠️ 既存 deck「${esc(p.existingDeck.name)}」(${p.existingDeck.total} cards) 偵測到。
       </div>`
    : "";

  const unresolved =
    p.unresolvedMedia.length > 0
      ? `<details><summary>${p.unresolvedMedia.length} 個媒體檔在 .apkg 內無對應</summary>
         <pre>${esc(p.unresolvedMedia.slice(0, 20).join("\n"))}${p.unresolvedMedia.length > 20 ? "\n…" : ""}</pre>
       </details>`
      : "";

  const actions = p.existingDeck
    ? `<button id="btn-replace" class="primary">替換 deck（保留同 GUID 卡的學習狀態）</button>
       <button id="btn-new">匯入為新 deck</button>
       <button id="btn-cancel">取消</button>`
    : `<button id="btn-new" class="primary">匯入</button>
       <button id="btn-cancel">取消</button>`;

  return `
    <header><a href="/" data-route>← Home</a></header>
    <h1>Import 預覽</h1>
    <dl class="stats">
      <dt>Deck 名稱</dt><dd>${esc(p.deckName)}</dd>
      <dt>Notetypes</dt><dd>${p.notetypes.length}</dd>
      <dt>Cards</dt><dd>${p.cards.length}</dd>
      <dt>Media</dt><dd>${p.media.length}</dd>
    </dl>
    ${conflictBanner}
    ${unresolved}
    <div class="actions">${actions}</div>
  `;
}

function mediaProgressView(p: MediaProgress): string {
  const pct = p.total === 0 ? 100 : Math.round((p.done / p.total) * 100);
  const uploading =
    p.uploading.length > 0 ? esc(p.uploading.slice(0, 3).join(", ")) : "";
  return `
    <h1>上傳媒體…</h1>
    <p>${p.done} / ${p.total} (${pct}%)</p>
    <div class="progress"><div class="bar" style="width:${pct}%"></div></div>
    <p class="muted">${uploading}</p>
  `;
}

function uploadingDbView(cardCount: number): string {
  return `<h1>寫入 D1…</h1><p>${cardCount} cards</p>`;
}

function doneView(state: {
  result: ImportResponse;
  deckName: string;
  rejected: number;
}): string {
  const inheritedLine =
    state.result.cards_state_inherited > 0
      ? `<p>繼承狀態：${state.result.cards_state_inherited} 張卡</p>`
      : "";
  const rejectedLine =
    state.rejected > 0
      ? `<p class="warn">⚠️ ${state.rejected} 張卡因 GUID 衝突被跳過</p>`
      : "";
  return `
    <h1>完成 ✓</h1>
    <p>「${esc(state.deckName)}」共 ${state.result.cards_inserted} 張卡已匯入</p>
    ${inheritedLine}
    ${rejectedLine}
    <div class="actions">
      <a href="/" data-route class="button primary">回 Home</a>
    </div>
  `;
}

function errorView(message: string): string {
  return `
    <h1 class="danger">匯入失敗</h1>
    <pre>${esc(message)}</pre>
    <div class="actions">
      <button id="btn-retry">回到開始</button>
    </div>
  `;
}
