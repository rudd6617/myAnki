import { api } from "./api";
import { sha256Hex } from "@shared/sha256";
import type { ApkgMediaEntry } from "./apkg";

const CONCURRENCY = 6;
const MAX_RETRIES = 3;

export interface HashedMedia extends ApkgMediaEntry {
  sha256: string;
  contentType: string;
}

export interface MediaProgress {
  total: number;
  done: number;
  uploading: string[];
}

export async function hashAll(items: ApkgMediaEntry[]): Promise<HashedMedia[]> {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      sha256: await sha256Hex(item.data),
      contentType: guessContentType(item.filename),
    })),
  );
}

export async function uploadMissing(
  items: HashedMedia[],
  onProgress: (p: MediaProgress) => void,
): Promise<void> {
  const uniqueHashes = [...new Set(items.map((i) => i.sha256))];
  const { missing } = await api.checkMedia(uniqueHashes);
  const missingSet = new Set(missing);

  const toUpload = new Map<string, HashedMedia>();
  for (const item of items) {
    if (missingSet.has(item.sha256)) toUpload.set(item.sha256, item);
  }

  const queue = [...toUpload.values()];
  const total = queue.length;
  let done = 0;
  const inFlight = new Set<string>();
  const tick = () => onProgress({ total, done, uploading: [...inFlight] });
  tick();

  await runPool(queue, CONCURRENCY, async (item) => {
    inFlight.add(item.filename);
    tick();
    try {
      await uploadOne(item);
    } finally {
      inFlight.delete(item.filename);
      done++;
      tick();
    }
  });
}

async function uploadOne(item: HashedMedia): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await api.putMedia(item.sha256, item.data, item.contentType);
      return;
    } catch (e) {
      lastError = e;
      if (attempt < MAX_RETRIES) await sleep(2 ** (attempt - 1) * 500);
    }
  }
  throw new Error(
    `media upload failed after ${MAX_RETRIES} attempts: ${item.filename} (${item.sha256})`,
    { cause: lastError },
  );
}

async function runPool<T>(
  items: T[],
  size: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let idx = 0;
  const runners: Promise<void>[] = [];
  for (let i = 0; i < Math.min(size, items.length); i++) {
    runners.push(
      (async () => {
        while (idx < items.length) {
          const cur = idx++;
          await worker(items[cur]!);
        }
      })(),
    );
  }
  await Promise.all(runners);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function guessContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".wav")) return "audio/wav";
  return "application/octet-stream";
}
