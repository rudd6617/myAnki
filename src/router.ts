// Minimal History API router. Anchor tags with `data-route` trigger
// client-side navigation instead of full page loads.

export type RouteHandler = (container: HTMLElement, params: string[]) => void;

interface Route {
  pattern: RegExp;
  handler: RouteHandler;
}

const routes: Route[] = [];

export function registerRoute(pattern: RegExp, handler: RouteHandler): void {
  routes.push({ pattern, handler });
}

export function navigate(path: string): void {
  history.pushState({}, "", path);
  render();
}

export function start(): void {
  window.addEventListener("popstate", render);
  document.addEventListener("click", interceptClicks);
  render();
}

function render(): void {
  const container = document.getElementById("app");
  if (!container) return;
  const path = location.pathname;
  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      route.handler(container, match.slice(1));
      return;
    }
  }
  container.innerHTML = `<main class="error"><h1>404</h1><a href="/" data-route>Home</a></main>`;
}

function interceptClicks(e: MouseEvent): void {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const target = e.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest("a[data-route]");
  if (!anchor) return;
  const href = anchor.getAttribute("href");
  if (!href) return;
  e.preventDefault();
  navigate(href);
}
