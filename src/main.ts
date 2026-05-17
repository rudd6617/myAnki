import { registerRoute, start } from "./router";
import { bootstrapTokenFromUrl } from "./lib/api";
import { renderHome } from "./views/home";
import { renderImport } from "./views/import";
import { renderReview } from "./views/review";
import "./styles/main.css";

bootstrapTokenFromUrl();

registerRoute(/^\/$/, (container) => renderHome(container));
registerRoute(/^\/import$/, (container) => renderImport(container));
registerRoute(/^\/review\/(\d+)$/, (container, params) => renderReview(container, params));

start();

// Register service worker (PWA shell). Skip during Vite dev where /sw.js
// isn't served by the dev server in a way that's friendly to debugging.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration failed:", err);
    });
  });
}
