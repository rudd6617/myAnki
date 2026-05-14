// Browser-only HTML sanitizer for card content.
// Run once at import time on each rendered card.
//
// Trust model: user uploads their own .apkg. Threat is accidental XSS from a
// public deck — we don't try to defend against a determined attacker, but we
// strip obvious vectors (script, on* handlers).

import DOMPurify from "dompurify";

let configured = false;

function configure(): void {
  if (configured) return;
  configured = true;
  // Hook to drop on* attributes wholesale; DOMPurify's default already does
  // this but explicit configuration documents intent.
  DOMPurify.addHook("uponSanitizeAttribute", (_node, hookEvent) => {
    if (hookEvent.attrName.startsWith("on")) {
      hookEvent.keepAttr = false;
    }
  });
}

export function sanitizeCardHtml(html: string): string {
  configure();
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["style"], // Anki cards legitimately use inline <style>
    FORBID_TAGS: ["script", "iframe", "object", "embed"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    ALLOW_DATA_ATTR: true,
  });
}
