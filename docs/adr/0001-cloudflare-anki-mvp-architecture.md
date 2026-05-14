# ADR-0001: Single-tenant Anki reviewer on Cloudflare with import-time prerender

- **Status**: Accepted
- **Date**: 2026-05-14

## Context

需求是一個個人面試準備用的閃卡複習 Web 服務，主要刷軟體面試八股 + LeetCode，部署在 Cloudflare。動機是練手 + 想要乾淨的瀏覽器手機體驗（沒試過 AnkiWeb，已知會與其重疊）。

關鍵約束：
- **單人自用**，不開放他人註冊
- **MVP 範圍刻意收緊**：8-12 天 part-time 能跑完
- **手機優先**，但不做離線
- 既有的 .apkg 是內容來源；卡片創作仍在 Anki desktop 上做

待決定的大問題：多租戶、SRS 演算法、.apkg 解析位置、卡型支援、卡片渲染策略、編輯能力、前端框架、Cloudflare 各服務角色、媒體儲存方式、import 原子性。

## Decision

**單租戶（Bearer token auth） + SM-2 簡化版 + Client-side .apkg 解析 + Import 時預渲染為 HTML 字串 + Workers Assets + D1 + R2（sha256 content-addressed） + Vanilla TS + Vite + 完全 read-only 編輯。**

### 架構

```
[手機 PWA-shell] → [CF Worker] ├→ Workers Assets (SPA)
                                ├→ D1   (decks/notetypes/cards/reviews)
                                └→ R2   (media, key = sha256)
```

### 核心決策矩陣

| 維度 | 決定 | 替代方案 |
|---|---|---|
| 多租戶 | 單人，Bearer token | 多用戶 + auth flow |
| SRS | SM-2 簡化版（無 learning steps） | FSRS / Leitner / 純隨機 |
| 跨 import 狀態保留 | Anki note GUID 全域唯一 | 重新開始 / deck-local id |
| .apkg 解析 | Client-side（sql.js + JSZip） | Worker 端 / 混合 |
| 卡片渲染 | Import 時預渲染 → 存 front_html/back_html | 運行時模板引擎 |
| 卡型 | Basic / Basic-reversed / Cloze；其他 fallback | 全 Anki notetype 支援 |
| 媒體 | R2 + sha256 dedup；孤兒 GC phase 2 | 內嵌 base64 / 本地 IndexedDB |
| 編輯 | Web 完全 read-only | 完整編輯器 / suspend-only 例外 |
| Review 按鈕 | 4 個（Again/Hard/Good/Easy）| 2 個（記得/忘了） |
| Queue | 到期 + 新卡（per-deck limit 20）混合 shuffle | 分段 / 純到期 |
| Again 行為 | 回今日 queue 末尾，interval=0 | Anki learning steps（1m/10m/1d ladder） |
| Backlog | 過期 > 7 天的卡可一鍵把 due 設為今天 | 自動 cap / 自動分散 / reset 成 new |
| Re-import 同名 deck | 詢問「替換 / 匯入為新」 | 自動 replace / 自動新增 |
| 離線 | 不做；只做 PWA 殼（manifest + asset cache） | 完整離線 + sync |
| 前端 | Vanilla TS + Vite，lib/views/router 分層 | SvelteKit / React / HTMX |
| Tests | vitest 測 sm2 + apkg parser | 全 e2e / 零測試 |
| 部署 | wrangler deploy，無 CI | GitHub Actions / 手動 |

## Alternatives Considered

### A. 完整 AnkiWeb 對等（多用戶 + 編輯 + 離線同步 + 全 notetype）
為什麼沒選：違背「練手 MVP」的範圍宣告。AnkiWeb 已經存在，重做一遍是 6 個月工程，且贏不過。

### B. FSRS 而非 SM-2
為什麼沒選：FSRS 需要從 python-fsrs 移植到 TS，且需要每張卡的歷史回顧記錄才能發揮。MVP 沒這些資料。但保留升級路徑：每次答題寫入 `reviews` 表，未來 FSRS 升級時能 backfill。

### C. 運行時模板引擎（按 Anki 規格實作 `{{Field}}` / `{{cloze:}}` / `{{type:}}` / 條件分支）
為什麼沒選：~500 LOC + 持續對齊 Anki upstream 行為。預渲染把這個複雜度前移到 import 一次，運行時就是 innerHTML。代價是改 CSS bug 要重 import；對單人專案可接受。

### D. Server-side .apkg 解析（Worker 端跑 sql.js + JSZip）
為什麼沒選：Worker 128MB 記憶體 + CPU 限制，遇到大 deck 容易 OOM/timeout。Client-side 在手機 Safari 也跑得動 sql.js，且失敗回饋更即時（解析中進度條 vs Worker 轉圈 30 秒後 500）。

### E. Pages + Pages Functions（而非 Workers Assets）
為什麼沒選：Workers Assets 是 Cloudflare 2024 後主推路徑，同一個 Worker serve SPA + API、一次 deploy。Pages 是歷史包袱。

### F. SvelteKit / React 框架
為什麼沒選：三個 view（Home / Import / Review）的 app，框架收益打不過 bundle 體積成本。但 lib/views/router 結構為日後遷移留路（lib/ 原封不動搬走，views 改寫為 .svelte）。

### G. 編輯能力（至少能 suspend / 改 typo）
為什麼沒選：滑坡。一旦能改字下一步就是改格式、改 cloze、改 tag、改 media。原則：Anki desktop 是創作工具，本 app 是 reviewer。看到錯字記下來，回 desktop 改、re-import。

### H. 完整離線 + 多裝置 sync
為什麼沒選：~1-2 週工程量（IndexedDB schema、SW 更新策略、衝突解決、optimistic 答題排隊）。Cloudflare 在台灣延遲 < 50ms，online-only 體感接近 native。「沒訊號的場景」（飛機）本來就不會刷面試題。

## Consequences

**正面**：
- 範圍可預測，能在 8-12 天 part-time 跑完並真實使用
- 架構複雜度匹配練手 MVP 的問題嚴重性
- 每個元件都有教學價值（sql.js / Workers Assets / R2 content-addressing / Anki 模板解析 / SM-2 / PWA shell）
- 升級路徑明確：review log → FSRS / R2 → 音檔 / lib/views → Svelte / Bearer token → 多用戶

**負面**：
- 卡片內容變更必須回 Anki desktop 改 + re-import（流程斷裂）
- 預渲染綁定當時的 notetype CSS / HTML 結構，改渲染要重 import deck
- 無離線；通訊不穩時體驗差
- 單一 OWNER_TOKEN 沒有 logout 機制，token 洩漏需要 server-side 換掉並通知所有裝置
- R2 媒體可能累積孤兒（被 import 上傳但無卡引用）；MVP 不處理

**觸發重評估的條件**：
- 用三個月後覺得 SM-2 排程「不夠聰明」→ 升 FSRS（用累積的 review log backfill）
- 開始想分享給朋友用 → 加 user_id 欄位 + 完整 auth
- 開始想刷單字 → 補音檔 `[sound:]` 渲染 + autoplay 處理
- 通勤無訊號比例變高 → 加 PWA 離線（IndexedDB mirror + 答題佇列）
- Bundle 體積 / 開發體驗痛 → 遷移到 SvelteKit
