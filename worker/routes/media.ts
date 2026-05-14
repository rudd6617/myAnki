import { json, type Env } from "../types";
import type { MediaCheckRequest } from "@shared/types";
import { isValidSha256Hex, sha256Hex } from "@shared/sha256";
import { parseJson } from "../parse";

export async function checkMedia(request: Request, env: Env): Promise<Response> {
  const body = await parseJson<MediaCheckRequest>(request, (b) =>
    Array.isArray((b as MediaCheckRequest).hashes),
  );
  if (body instanceof Response) return body;

  const checks = await Promise.all(
    body.hashes.map(async (h) => {
      if (!isValidSha256Hex(h)) return { h, present: false };
      const head = await env.MEDIA.head(`media/${h}`);
      return { h, present: head !== null };
    }),
  );

  return json({ missing: checks.filter((c) => !c.present).map((c) => c.h) });
}

export async function uploadMedia(
  request: Request,
  env: Env,
  sha256: string,
): Promise<Response> {
  if (!isValidSha256Hex(sha256)) return json({ error: "invalid sha256" }, 400);

  const bytes = await request.arrayBuffer();
  if ((await sha256Hex(bytes)) !== sha256) {
    return json({ error: "sha256 mismatch" }, 400);
  }

  await env.MEDIA.put(`media/${sha256}`, bytes, {
    httpMetadata: {
      contentType: request.headers.get("content-type") ?? "application/octet-stream",
    },
  });
  return new Response(null, { status: 204 });
}
