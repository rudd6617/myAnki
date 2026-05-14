import { json, type Env } from "./types";

export function requireAuth(request: Request, env: Env): Response | null {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token || !timingSafeEqual(token, env.OWNER_TOKEN)) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
