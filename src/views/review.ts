import { api } from "@/lib/api";
import { esc, messageOf } from "@/lib/html";
import { isQuality, Quality, type Card } from "@shared/types";

interface SessionState {
  queue: Card[];
  index: number;
  revealed: boolean;
  deckId: number;
}

type View =
  | { kind: "loading" }
  | { kind: "session"; session: SessionState }
  | { kind: "done" }
  | { kind: "error"; message: string };

export function renderReview(container: HTMLElement, params: string[]): void {
  const deckId = Number(params[0]);
  if (!Number.isFinite(deckId)) {
    container.innerHTML = `<main class="error"><h1>404</h1></main>`;
    return;
  }

  let state: View = { kind: "loading" };
  const setState = (next: View) => {
    state = next;
    paint();
  };

  function paint(): void {
    container.innerHTML = `<main class="review">${render()}</main>`;
    wire();
  }

  function render(): string {
    if (state.kind === "loading") return `<p class="muted">載入 queue…</p>`;
    if (state.kind === "error")
      return `<h1 class="danger">無法載入</h1><pre>${esc(state.message)}</pre><a href="/" data-route>← Home</a>`;
    if (state.kind === "done")
      return `<h1>今日複習完成</h1><div class="actions"><a href="/" data-route class="button primary">回 Home</a></div>`;

    const s = state.session;
    const card = s.queue[s.index];
    if (!card)
      return `<h1>今日複習完成</h1><div class="actions"><a href="/" data-route class="button primary">回 Home</a></div>`;

    return cardView(card, s);
  }

  function cardView(card: Card, s: SessionState): string {
    const remaining = s.queue.length - s.index;
    return `
      <header>
        <a href="/" data-route>← Home</a>
        <span class="muted">剩餘 ${remaining}</span>
      </header>
      <section class="card-stage" id="stage">
        <article class="card-face card-front">${card.front_html}</article>
        ${s.revealed ? `<hr><article class="card-face card-back">${card.back_html}</article>` : ""}
      </section>
      ${
        s.revealed
          ? `<div class="grade-row">
              <button data-q="${Quality.Again}" class="grade again">Again</button>
              <button data-q="${Quality.Hard}" class="grade hard">Hard</button>
              <button data-q="${Quality.Good}" class="grade good">Good</button>
              <button data-q="${Quality.Easy}" class="grade easy">Easy</button>
            </div>`
          : `<div class="grade-row">
              <button id="reveal" class="primary wide">Show Answer</button>
            </div>`
      }
    `;
  }

  function wire(): void {
    if (state.kind !== "session") return;

    const reveal = container.querySelector<HTMLButtonElement>("#reveal");
    if (reveal) reveal.addEventListener("click", onReveal);

    const stage = container.querySelector<HTMLElement>("#stage");
    if (stage && !state.session.revealed) stage.addEventListener("click", onReveal);

    container.querySelectorAll<HTMLButtonElement>(".grade[data-q]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const q = Number(btn.dataset.q);
        if (isQuality(q)) onGrade(q);
      }),
    );
  }

  function onReveal(): void {
    if (state.kind !== "session") return;
    setState({ kind: "session", session: { ...state.session, revealed: true } });
  }

  async function onGrade(quality: Quality): Promise<void> {
    if (state.kind !== "session") return;
    const s = state.session;
    const card = s.queue[s.index];
    if (!card) return;

    try {
      await api.postReview(card.id, quality);

      if (quality === Quality.Again) {
        // Recycle to today's queue tail. SM-2 state is authoritative on server;
        // we keep the same card object since front_html/back_html don't change.
        const newQueue = [...s.queue];
        const [recycled] = newQueue.splice(s.index, 1);
        newQueue.push(recycled!);
        if (s.index >= newQueue.length) {
          setState({ kind: "done" });
          return;
        }
        setState({ kind: "session", session: { ...s, queue: newQueue, revealed: false } });
        return;
      }

      const nextIndex = s.index + 1;
      if (nextIndex >= s.queue.length) {
        setState({ kind: "done" });
        return;
      }
      setState({
        kind: "session",
        session: { ...s, index: nextIndex, revealed: false },
      });
    } catch (err) {
      setState({ kind: "error", message: messageOf(err) });
    }
  }

  async function load(): Promise<void> {
    try {
      const queue = await api.getQueue(deckId);
      shuffleInPlace(queue);
      if (queue.length === 0) {
        setState({ kind: "done" });
        return;
      }
      setState({ kind: "session", session: { queue, index: 0, revealed: false, deckId } });
    } catch (err) {
      setState({ kind: "error", message: messageOf(err) });
    }
  }

  paint();
  load();
}

function shuffleInPlace<T>(xs: T[]): void {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
}
