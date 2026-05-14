# Tech Stack

## Runtime

- **Browser**: iOS Safari 15+ / Android Chrome 100+。MVP 不管 IE / 舊 Android
- **Edge**: Cloudflare Workers（V8 isolate）
- **Storage**:
  - D1（Cloudflare 託管 SQLite）
  - R2（Cloudflare S3-compatible object storage）

## Build / Dev

- **TypeScript**: 5.x，`strict: true`
- **Vite**: 5.x，作為 SPA bundler 與 dev server
- **Wrangler**: 3.x，CF Worker 開發 / 部署 CLI
- **Vitest**: lib/ 純函式 unit tests

## 前端

- **Framework**: 無（Vanilla TS）
- **Router**: hand-rolled History API，~20 行
- **State**: 單一 `app.ts` 持有，無外部狀態庫
- **CSS**: 原生 CSS + CSS variables，無 Tailwind / CSS-in-JS
- **架構分層**：
  - `shared/` — Worker 與 client 都可 import 的純函式（sm2 / time / types）
  - `src/lib/` — Browser-only 純函式（apkg / render / api / media）；遷移到 Svelte 時整包搬走
  - `src/views/` — 三個 view (home / import / review)，各 export `render(container, state)`
  - `src/router.ts` / `src/main.ts` — 啟動點與路由
  - `worker/` — Cloudflare Worker：fetch handler + auth + routes/

## 主要依賴

| 用途 | 套件 | 為何選 |
|---|---|---|
| .apkg zip 解壓 | `jszip` | 老牌、純 JS、瀏覽器即跑 |
| SQLite in browser | `sql.js` | wasm + 成熟、Anki 社群驗證 |
| HTML sanitize | `dompurify` | 業界標準，配置簡單 |
| SHA-256 (browser) | Web Crypto API (`crypto.subtle.digest`) | 內建，無第三方 |
| 測試 | `vitest` | Vite 原生整合，速度快 |

不引：React / Vue / Svelte / Tailwind / Lodash / Zod（單人專案 + Vanilla 為原則）

## Cloudflare 服務 binding

| 服務 | binding 名 | 用途 |
|---|---|---|
| Workers Assets | （wrangler.toml `assets`） | serve SPA |
| D1 | `DB` | 結構化資料 |
| R2 | `MEDIA` | 媒體檔 |
| Secrets | `OWNER_TOKEN` | auth |

## Commands

| 用途 | 指令 |
|------|------|
| 本地開發 | `npm run dev`（vite dev for SPA + wrangler dev for Worker；或合併用 wrangler 的 Vite plugin） |
| 單元測試 | `npm test` |
| 型別檢查 | `npm run typecheck`（`tsc --noEmit`） |
| 建置 SPA | `npm run build`（vite build → `dist/`） |
| 本地 Worker | `wrangler dev --local` |
| 部署 | `wrangler deploy` |
| D1 migration | `wrangler d1 migrations apply <DB_NAME>` |
| 設 secret | `wrangler secret put OWNER_TOKEN` |
