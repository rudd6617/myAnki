import type {
  Card,
  DeckListEntry,
  ImportRequest,
  ImportResponse,
  MediaCheckRequest,
  MediaCheckResponse,
  Quality,
} from "@shared/types";

const TOKEN_KEY = "owner_token";

// One-shot: if URL has `#t=<token>`, store it and strip the fragment so the
// next reload doesn't re-leak via history / screenshots. Call at app boot.
export function bootstrapTokenFromUrl(): void {
  if (!location.hash.startsWith("#t=")) return;
  const t = decodeURIComponent(location.hash.slice(3));
  if (!t) return;
  localStorage.setItem(TOKEN_KEY, t);
  history.replaceState(null, "", location.pathname + location.search);
}

export function getToken(): string {
  let t = localStorage.getItem(TOKEN_KEY) ?? "";
  if (!t) {
    t = prompt("OWNER_TOKEN:") ?? "";
    if (t) localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${getToken()}`);
  if (init.body && !headers.has("content-type") && typeof init.body === "string") {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    throw new ApiError(401, "unauthorized — token cleared, please reload");
  }
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return res;
}

async function errorMessage(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === "string") return `${res.status} ${parsed.error}`;
  } catch {
    // not JSON
  }
  return `${res.status} ${text}`;
}

export const api = {
  async ping(): Promise<{ ok: boolean; time: number }> {
    const r = await call("/api/ping");
    return r.json();
  },

  async listDecks(): Promise<DeckListEntry[]> {
    const r = await call("/api/decks");
    return r.json();
  },

  async deleteDeck(id: number): Promise<void> {
    await call(`/api/decks/${id}`, { method: "DELETE" });
  },

  async resetBacklog(id: number): Promise<{ updated: number }> {
    const r = await call(`/api/decks/${id}/reset-backlog`, { method: "POST" });
    return r.json();
  },

  async getQueue(deckId: number): Promise<Card[]> {
    const r = await call(`/api/decks/${deckId}/queue`);
    return r.json();
  },

  async postReview(cardId: number, quality: Quality): Promise<void> {
    await call(`/api/cards/${cardId}/review`, {
      method: "POST",
      body: JSON.stringify({ quality }),
    });
  },

  async checkMedia(hashes: string[]): Promise<MediaCheckResponse> {
    const body: MediaCheckRequest = { hashes };
    const r = await call("/api/media/check", { method: "POST", body: JSON.stringify(body) });
    return r.json();
  },

  async putMedia(sha256: string, data: ArrayBuffer | Uint8Array, contentType: string): Promise<void> {
    await call(`/api/media/${sha256}`, {
      method: "PUT",
      headers: { "content-type": contentType },
      body: data as BodyInit,
    });
  },

  async importDeck(payload: ImportRequest): Promise<ImportResponse> {
    const r = await call("/api/decks/import", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return r.json();
  },
};
