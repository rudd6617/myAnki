# myAnki

個人面試準備用的閃卡複習 Web 服務。手機優先、部署在 Cloudflare。

> 私人專案：單人自用，Bearer token auth。**不開放他人使用**。

## What it does

- 上傳 `.apkg`（瀏覽器端解析，不送原始檔給 server）
- 4 按鈕 SM-2 排程（Again / Hard / Good / Easy）
- Basic / Basic-reversed / Cloze 卡型（其他 fallback 渲染）
- 重複 import 同名 deck 時，依 Anki note GUID 保留學習狀態
- 一鍵 reset 過期 backlog（>7 天的卡 due → 今天）
- PWA shell：可加到手機主畫面，但 **online-only**（不離線）

## Architecture

詳見 `docs/adr/0001-cloudflare-anki-mvp-architecture.md`、領域語言見 `CONTEXT.md`、技術棧見 `.claude/stack.md`。

```
[手機 PWA] → [CF Worker]
              ├ Workers Assets (SPA)
              ├ D1   (decks / notetypes / cards / reviews)
              └ R2   (media, key = sha256)
```

## Setup

### 1. 安裝依賴

```bash
npm install
```

### 2. 建立 Cloudflare 資源

需要登入 Wrangler（`npx wrangler login` 一次）。

```bash
npm run db:create     # 輸出 database_id，複製下來
npm run r2:create
```

把 `wrangler.jsonc` 內的 `REPLACE_WITH_OUTPUT_OF_npm_run_db:create` 換成實際的 `database_id`。

### 3. 設定 OWNER_TOKEN

本地：
```bash
cp .dev.vars.example .dev.vars
# 編輯 .dev.vars，填一個長隨機字串（至少 32 字元）
```

正式環境：
```bash
npx wrangler secret put OWNER_TOKEN
# 貼上同一個字串
```

### 4. 套用 D1 migrations

```bash
npm run db:migrate:local      # local dev
npm run db:migrate:remote     # production
```

### 5. 開發

```bash
npm run dev
```

訪問 http://localhost:5173 → 第一次會彈出輸入 OWNER_TOKEN → 之後存在 localStorage。

### 6. 部署

```bash
npm run deploy
```

部署後在 `https://myanki.<your-account>.workers.dev`。要綁自訂網域：在 Cloudflare dashboard 的 Workers & Pages → myanki → Settings → Triggers 加 Custom Domain。

## Commands

| 用途 | 指令 |
|------|------|
| 開發（Worker + SPA） | `npm run dev` |
| 測試 | `npm test` |
| 型別檢查 | `npm run typecheck` |
| Build SPA + Worker | `npm run build` |
| 部署 | `npm run deploy` |

## Project Layout

```
shared/             Worker + client 共用純函式
  sm2.ts            簡化 SM-2
  types.ts          Domain types
  time.ts           epochDays helpers
src/
  main.ts           SPA entry
  router.ts         History API minimal router
  lib/              Browser-only 純函式
    apkg.ts         JSZip + sql.js → ApkgRaw
    notetype.ts     parse col.models JSON
    render.ts       field substitution + cloze split + media rewrite
    sanitize.ts     DOMPurify wrapper
    media.ts        sha256 + bounded-concurrency upload
    api.ts          fetch wrapper
    sha256.ts       Web Crypto helper
  views/            home / import / review
  styles/main.css
worker/
  index.ts          fetch handler + routing
  auth.ts           Bearer + timing-safe compare
  types.ts          Env + json helper
  routes/           decks / media / import / review
migrations/         D1 SQL migrations
public/             manifest.json, icon.svg, sw.js
docs/adr/           Architecture Decision Records
```

## Test the golden path on iPhone

After deploy:

1. Safari → your worker URL → 輸入 token → 看到 Home
2. 點「Import .apkg」→ 選一個真實 .apkg → 預覽 → 匯入
3. 回 Home → 點該 deck 的「複習」→ 答幾張
4. 點該 deck 的「⋯」→ 試「重設 backlog」（若有過期卡）
5. Safari 分享 → 加到主畫面 → 從桌面 icon 開 app → 應該是全螢幕無瀏覽器 chrome

## Phase 2 (deliberately not in MVP)

FSRS 升級 · 卡片編輯 · 完整離線同步 · 音檔 / 單字場景 · type-in · suspend · 統計圖表 · 跨 deck 混合複習 · 多用戶 · R2 媒體孤兒 GC。

理由與升級觸發條件見 ADR-0001。
