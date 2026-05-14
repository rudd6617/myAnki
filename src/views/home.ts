import { api } from "@/lib/api";
import { esc, messageOf } from "@/lib/html";
import type { DeckListEntry } from "@shared/types";

export function renderHome(container: HTMLElement): void {
  container.innerHTML = `
    <main class="home">
      <header class="home-header">
        <h1>myAnki</h1>
        <a href="/import" data-route class="button primary">Import .apkg</a>
      </header>
      <div id="deck-list"><p class="muted">載入中…</p></div>
    </main>
  `;
  void load(container);
}

async function load(container: HTMLElement): Promise<void> {
  const target = container.querySelector<HTMLElement>("#deck-list");
  if (!target) return;
  try {
    const decks = await api.listDecks();
    target.innerHTML = decks.length === 0 ? emptyView() : listView(decks);
    wire(target);
  } catch (err) {
    target.innerHTML = `<p class="danger">無法載入 deck：${esc(messageOf(err))}</p>`;
  }
}

function emptyView(): string {
  return `<p class="muted">尚無 deck。<a href="/import" data-route>上傳一個 .apkg</a> 開始。</p>`;
}

function listView(decks: DeckListEntry[]): string {
  return `<ul class="deck-list">${decks.map(deckRow).join("")}</ul>`;
}

function deckRow(d: DeckListEntry): string {
  const overdueChip =
    d.overdue_7d > 0
      ? `<span class="warn">⚠️ ${d.overdue_7d} 過期 &gt;7 天</span>`
      : "";

  const resetLine =
    d.overdue_7d > 0
      ? `<li>
           <button class="row-action danger" data-action="reset" data-deck="${d.id}" data-count="${d.overdue_7d}">
             重設 backlog (${d.overdue_7d})
           </button>
         </li>`
      : "";

  return `
    <li class="deck-row" data-deck="${d.id}">
      <div class="deck-name">${esc(d.name)}</div>
      <div class="deck-stats">
        <span>新 ${d.new_count}</span>
        <span>到期 ${d.due}</span>
        <span class="muted">共 ${d.total}</span>
        ${overdueChip}
      </div>
      <div class="deck-actions">
        <a href="/review/${d.id}" data-route class="button primary">複習</a>
        <details class="deck-menu">
          <summary>⋯</summary>
          <ul>
            ${resetLine}
            <li>
              <button class="row-action danger" data-action="delete" data-deck="${d.id}" data-name="${esc(d.name)}" data-total="${d.total}">
                刪除 deck
              </button>
            </li>
          </ul>
        </details>
      </div>
    </li>
  `;
}

function wire(container: HTMLElement): void {
  container.addEventListener("click", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest<HTMLButtonElement>(".row-action");
    if (!btn) return;

    const action = btn.dataset.action;
    const deckId = Number(btn.dataset.deck);
    if (!Number.isFinite(deckId)) return;

    if (action === "reset") {
      const count = Number(btn.dataset.count ?? 0);
      if (!confirm(`將 ${count} 張過期 >7 天的卡 due 改為今天？\nease / interval 不變。`)) return;
      try {
        await api.resetBacklog(deckId);
        location.reload();
      } catch (err) {
        alert(`重設失敗：${messageOf(err)}`);
      }
      return;
    }

    if (action === "delete") {
      const name = btn.dataset.name ?? "";
      const total = btn.dataset.total ?? "";
      if (!confirm(`刪除 deck「${name}」(${total} cards) 及其所有複習紀錄？\n此動作無法復原。`)) return;
      try {
        await api.deleteDeck(deckId);
        location.reload();
      } catch (err) {
        alert(`刪除失敗：${messageOf(err)}`);
      }
    }
  });
}
