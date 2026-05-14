import { json } from "./types";

export async function parseJson<T>(
  request: Request,
  guard: (body: unknown) => boolean,
): Promise<T | Response> {
  const body = await request.json().catch(() => null);
  if (body === null || !guard(body)) return json({ error: "bad request" }, 400);
  return body as T;
}
