---
name: grill-with-docs
description: |
  Heavy-duty alignment that grills against existing CONTEXT.md vocabulary,
  cross-references with code, and updates CONTEXT/ADR inline as decisions crystallise.
  Use when stress-testing a plan against domain language and documented decisions.
disable-model-invocation: true
argument-hint: "[plan or design topic]"
---

Grill-with-docs: $ARGUMENTS

延伸 `/grill` 的對齊規則，加上文件層交互。

## 開場

讀完 `CONTEXT.md`（若存在，repo root）和 `docs/adr/`（若存在，repo root）再開始質問。把已知的領域詞彙與既有決策納入問答上下文。

## /grill 規則之外的擴展

### 對照 glossary
用戶用的術語衝突於 `CONTEXT.md` 既有定義時，**立即點出**：「你的 glossary 把 cancellation 定義為 X，但你似乎指 Y——是哪個？」

### 銳化模糊術語
用戶說「account」→ 逼問「Customer 還是 User？這是兩個不同 entity」。提議精準的標準術語。

### 對照代碼
用戶描述某機制如何運作時，檢查代碼是否同意。發現矛盾立刻 surface：「你的代碼整單取消 Order，但你剛說可以部分取消——哪個是對的？」

### 即時更新 CONTEXT.md
術語解析時**當下**更新 `CONTEXT.md`（repo root），不批次累積。只放領域專家關心的概念，不放實作細節。

### 觸發 ADR（節制）
僅在三條件**全部成立**時提議建 ADR：
1. **Hard to reverse** — 改回去成本高
2. **Surprising without context** — 未來讀者會問「為什麼這樣做」
3. **Real trade-off** — 真有替代方案

任一不成立，跳過。格式見 `docs/ADR-FORMAT.md`，新增 ADR 寫入 `docs/adr/NNNN-*.md`。

## 何時停

需求對齊 + CONTEXT/ADR 更新落地後。產出總結給用戶確認。
