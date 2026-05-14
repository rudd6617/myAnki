# Domain Context

本專案是個人面試準備用的閃卡複習 Web 服務，沿用 Anki 的核心領域語言。下列術語在本 codebase 與 Anki 中**意義一致但有刻意收緊**，請以本文件為準。

## Glossary

### Deck
- **定義**：使用者上傳的一份 .apkg 在本系統中對應的容器；包含多張卡片、若干 notetype、相關媒體
- **邊界**：Deck 是「import 單位」，不是「複習單位」。複習單位是 Card。
- **與 Anki 差異**：本系統的 Deck 不可巢狀（Anki 支援 `parent::child` 層級），同名 Deck 可共存（透過 re-import 流程使用者選擇替換或新增）

### Note
- **定義**：Anki 中「一筆事實 + 多個欄位」的單位。例 cloze note：`React 中，{{c1::useState}} 用於 {{c2::管理狀態}}`
- **邊界**：本系統**不持久化 Note**。Import 時讀出 Note 內容，套上 NoteType 模板後直接產生 Card 的 front_html / back_html，丟掉原始 Note。
- **關聯**：一個 Note 經模板套用後可產生多張 Card（Cloze 每個 c-group 一張、Basic-reversed 兩張）

### Card
- **定義**：一張可被複習的具體面，含 front_html / back_html + SM-2 狀態（ease / interval / due 等）
- **邊界**：Card 是本系統的核心實體。它**不是** Anki 概念中「Note 的一個視角」，而是已經渲染好的最終呈現
- **GUID**：`<note_guid>#<ord>`，跨 import 穩定。Note GUID 來自 Anki（全域唯一），ord 來自 Anki 內部 cards.ord（cloze c1 = ord 0, c2 = ord 1...）

### NoteType
- **定義**：Anki 的 note 模板定義，含 qfmt（front 模板）/ afmt（back 模板）/ css / kind
- **邊界**：本系統只持久化 NoteType 的 metadata（name, css, kind），**不持久化模板字串**。理由：模板已在 import 時被「跑過」，產出寫進 Card 的 *_html
- **支援的 kind**：`basic` / `cloze` / `fallback`。其他 Anki notetype（image occlusion、custom）一律歸 `fallback`，渲染策略：所有欄位 dump 成 front + back

### Ord
- **定義**：Anki `cards.ord` 欄位，表示這張 card 是 note 的第幾個 template instance
- **使用**：本系統用 (note_guid, ord) 組成 Card.guid。Cloze c1 是 ord 0、c2 是 ord 1，依此類推

### Cloze
- **定義**：Anki 的挖空語法 `{{c1::答案::提示}}`。同一個 c-number 屬於同一 group
- **拆卡規則**：一個 Cloze note 有 N 個不同 c-number → 產生 N 張 Card。第 i 張 Card 把 c(i+1) 群挖空（顯示 `[...]` 或 hint），其他 c-group 顯示答案
- **邊界**：Cloze 巢狀、Cloze 內含 HTML 屬 edge case，by design 不保證 Anki 完美對齊；以實際面試 deck 跑通為驗收基準

### SM-2
- **定義**：SuperMemo 2 演算法，本系統採用的**簡化版**間隔重複排程
- **本系統的簡化**：
  - **不做** Anki 的 learning steps（1min → 10min → 1d ladder）
  - **Again** 直接回今日 queue 末尾，interval=0，ease 不動
  - 4 個按鈕對應 quality：Again=0 / Hard=3 / Good=4 / Easy=5
  - Ease floor = 1.3
- **狀態欄位**：`ease`（REAL, default 2.5）/ `interval_d`（INTEGER, days）/ `due`（INTEGER, epoch days）/ `reps` / `lapses` / `state`（'new' | 'review'）

### Queue
- **定義**：一次 review session 中要刷的卡片有序集合
- **組法**：到期卡（state='review' AND due ≤ 今天） + 新卡（state='new' LIMIT daily_new_limit）→ client 端 shuffle
- **生命週期**：Queue 不持久化在 server，每次進 review 頁時重新組
- **Again 行為**：在 client 端把該 card 重新插到 queue 末尾

### Backlog
- **定義**：到期超過 7 天未複習的卡（`due < today - 7d AND state = 'review'`）
- **Reset 語意**：per-deck 一個按鈕，將 backlog 中所有卡的 `due` 設為今天，**ease / interval 不變**。不重置學習進度。

### Daily New Limit
- **定義**：每個 Deck 每日進 queue 的新卡上限，預設 20
- **欄位**：`decks.daily_new_limit INT DEFAULT 20`
- **行為**：Queue 組成時 `SELECT * FROM cards WHERE state='new' AND deck_id=? LIMIT daily_new_limit`

### Media
- **定義**：.apkg 中嵌入的圖檔、音檔等二進位檔案
- **儲存**：R2，key = `media/<sha256>`，**內容定址**（content-addressed），自動跨 deck dedup
- **引用**：Card.front_html / back_html 中已改寫為 `<img src="/media/<sha256>">`
- **GC**：MVP 不處理孤兒（被上傳但無卡引用的 media）；phase 2 加 cron worker

### OWNER_TOKEN
- **定義**：本系統的唯一 auth 憑證，Worker 啟動時注入的環境變數
- **流程**：Client 首次開 → 輸入 token → 存 localStorage → 後續 fetch 帶 `Authorization: Bearer ${TOKEN}`
- **無 logout**：清 localStorage = logout。Token 洩漏 → `wrangler secret put OWNER_TOKEN` 換掉 → 所有裝置失效需重新輸入

## Bounded Contexts

單 context 專案。所有領域邏輯集中在 client 端的 `lib/`（sm2 / apkg / render / api）+ Worker 的 API handler。
