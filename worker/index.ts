import { requireAuth } from "./auth";
import { json, type Env } from "./types";
import { listDecks, deleteDeck, resetBacklog } from "./routes/decks";
import { checkMedia, uploadMedia } from "./routes/media";
import { importDeck } from "./routes/import";
import { getQueue, postReview } from "./routes/review";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Media GET — no auth. The sha256 hex IS the credential (256 bits of entropy).
    // Card HTML references `<img src="/media/<sha>">` so requiring an Authorization
    // header would force JS-based loading and break the simple HTML path.
    const mediaGet = path.match(/^\/media\/([a-f0-9]{64})$/);
    if (mediaGet && request.method === "GET") {
      return serveMedia(env, mediaGet[1]!);
    }

    if (path.startsWith("/api/")) {
      return handleApi(request, env, ctx, url);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function handleApi(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  url: URL,
): Promise<Response> {
  const unauthorized = requireAuth(request, env);
  if (unauthorized) return unauthorized;

  const { method } = request;
  const path = url.pathname;

  if (path === "/api/ping" && method === "GET") return json({ ok: true, time: Date.now() });

  if (path === "/api/decks" && method === "GET") return listDecks(env);
  if (path === "/api/decks/import" && method === "POST") return importDeck(request, env);

  const deckId = path.match(/^\/api\/decks\/(\d+)$/);
  if (deckId && method === "DELETE") return deleteDeck(env, Number(deckId[1]));

  const reset = path.match(/^\/api\/decks\/(\d+)\/reset-backlog$/);
  if (reset && method === "POST") return resetBacklog(env, Number(reset[1]));

  const queue = path.match(/^\/api\/decks\/(\d+)\/queue$/);
  if (queue && method === "GET") return getQueue(env, { deckId: Number(queue[1]) });

  const review = path.match(/^\/api\/cards\/(\d+)\/review$/);
  if (review && method === "POST") return postReview(request, env, Number(review[1]));

  if (path === "/api/media/check" && method === "POST") return checkMedia(request, env);

  const mediaPut = path.match(/^\/api\/media\/([a-f0-9]{64})$/);
  if (mediaPut && method === "PUT") return uploadMedia(request, env, mediaPut[1]!);

  return json({ error: "not found" }, 404);
}

async function serveMedia(env: Env, sha256: string): Promise<Response> {
  const obj = await env.MEDIA.get(`media/${sha256}`);
  if (!obj) return new Response("not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
}

export type { Env };
