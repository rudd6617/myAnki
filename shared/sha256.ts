// SHA-256 hex via Web Crypto. Works in browser + Node 20+.

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  // Cast to BufferSource — TS 5.6+ narrows Uint8Array by ArrayBufferLike variant,
  // but Web Crypto accepts any of them at runtime.
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return bytesToHex(new Uint8Array(digest));
}

export function isValidSha256Hex(s: string): boolean {
  return /^[a-f0-9]{64}$/.test(s);
}

function bytesToHex(bytes: Uint8Array): string {
  const out: string[] = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i]!.toString(16).padStart(2, "0");
  }
  return out.join("");
}
