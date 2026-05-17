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

```
[手機 PWA] → [CF Worker]
              ├ Workers Assets (SPA)
              ├ D1   (decks / notetypes / cards / reviews)
              └ R2   (media, key = sha256)
```

詳見 `docs/adr/0001-cloudflare-anki-mvp-architecture.md`、領域語言見 `CONTEXT.md`、技術棧見 `.claude/stack.md`。

## Prerequisites

- **Node ≥ 22**（wrangler 4 要求；建議 `nvm install 22 && nvm use 22`）
- Cloudflare 帳號 + `npx wrangler login` 完成授權

## First-time Setup

從零開始一個新環境時的步驟。已建好的 repo（含 `wrangler.jsonc` 已有資源 ID）跳到 [Daily commands](#daily-commands)。

### 1. 安裝依賴

```bash
npm install
```

### 2. 建立 Cloudflare 資源

```bash
npm run db:create    # 輸出 database_id，貼進 wrangler.jsonc 的 d1_databases[].database_id
npm run r2:create
```

### 3. 設定 OWNER_TOKEN

**本地**：
```bash
cp .dev.vars.example .dev.vars
# 產一個隨機 token：
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 把輸出貼到 .dev.vars 的 OWNER_TOKEN=
```

**線上**：
```bash
npx wrangler secret put OWNER_TOKEN
# 互動式輸入 token（建議另產一個，與本地分開）
```

### 4. 套用 D1 migrations

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

### 5. 首次部署

```bash
npm run deploy
```

部署後 URL：`https://my-anki.<your-account>.workers.dev`

要綁自訂網域：在 `wrangler.jsonc` 加 `routes` 欄位，或 dashboard → Workers → my-anki → Settings → Triggers。

---

## Daily commands

### 開發 / 驗證

| 用途 | 指令 |
|---|---|
| 起本地 dev server（vite + worker，含 D1/R2 mock） | `npm run dev` |
| Build（產 `dist/client/` + `dist/my_anki/`） | `npm run build` |
| 跑測試 | `npm test` |
| 測試 watch mode | `npm run test:watch` |
| TypeScript 型別檢查 | `npm run typecheck` |
| Dry-run 部署（不上線，驗證 config） | `npx wrangler deploy --dry-run` |

### 部署 / 線上維護

| 用途 | 指令 |
|---|---|
| 部署到 Cloudflare | `npm run deploy` |
| 看線上 logs（即時 tail） | `npx wrangler tail` |
| 列 deploy 歷史 | `npx wrangler deployments list` |
| Rollback 到上一版 | `npx wrangler rollback` |
| 換 OWNER_TOKEN | `npx wrangler secret put OWNER_TOKEN` |
| 列線上 secrets（只看 name） | `npx wrangler secret list` |
| 刪 secret | `npx wrangler secret delete OWNER_TOKEN` |

### 資源檢查

| 用途 | 指令 |
|---|---|
| 確認登入帳號 | `npx wrangler whoami` |
| 列所有 D1 | `npx wrangler d1 list` |
| 列所有 R2 bucket | `npx wrangler r2 bucket list` |
| 看 D1 待套用的 migrations | `npx wrangler d1 migrations list myanki-db --remote` |
| 直接對線上 D1 跑 SQL | `npx wrangler d1 execute myanki-db --remote --command "SELECT COUNT(*) FROM cards"` |
| 看 R2 物件 | `npx wrangler r2 object list myanki-media` |

### 打 API 測試（需 OWNER_TOKEN）

```bash
TOKEN="<your-prod-owner-token>"
URL="https://my-anki.<your-account>.workers.dev"

curl -H "Authorization: Bearer $TOKEN" $URL/api/ping
curl -H "Authorization: Bearer $TOKEN" $URL/api/decks
```

---

## Project Layout

```
shared/             Worker + client 共用純函式
  sm2.ts            簡化 SM-2（單一權威）
  types.ts          Domain types + wire payloads
  time.ts           epochDays helpers
  sha256.ts         Web Crypto helper
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
    html.ts         esc / messageOf
  views/            home / import / review
  styles/main.css
worker/
  index.ts          fetch handler + routing
  auth.ts           Bearer + timing-safe compare
  parse.ts          JSON body + guard helper
  types.ts          Env + json helper
  routes/           decks / media / import / review
migrations/         D1 SQL migrations
public/             manifest.json, icon.svg, sw.js
docs/adr/           Architecture Decision Records
```

## Test the golden path on iPhone

部署後：

1. Safari → worker URL → 輸入 token → 看到 Home
2. 點「Import .apkg」→ 選一個真實 .apkg → 預覽 → 匯入
3. 回 Home → 點該 deck 的「複習」→ 答幾張
4. 點該 deck 的「⋯」→ 試「重設 backlog」（若有過期卡）
5. Safari 分享 → 加到主畫面 → 從桌面 icon 開 app → 應該是全螢幕無瀏覽器 chrome

## Phase 2（刻意不在 MVP）

FSRS 升級 · 卡片編輯 · 完整離線同步 · 音檔 / 單字場景 · type-in · suspend · 統計圖表 · 跨 deck 混合複習 · 多用戶 · R2 媒體孤兒 GC。

理由與升級觸發條件見 ADR-0001。
