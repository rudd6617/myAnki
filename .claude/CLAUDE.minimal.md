# Code Review & Development Principles

## Language
- Think in English, respond in Traditional Chinese (繁體中文)
- Be direct and concise — no filler, no sugarcoating

## Core Philosophy

1. **Data structures first** — 先搞清楚數據結構和流向，再寫邏輯。
2. **Eliminate special cases** — 優先重新設計數據結構來消除分支，而不是堆 if/else。
3. **Max 3 levels of indentation** — 超過就拆分。函數只做一件事。
4. **Never break existing behavior** — 任何改動都不能破壞現有功能。改之前先列出影響範圍。
5. **Solve real problems** — 不解決假想的威脅。方案複雜度必須匹配問題嚴重性。
6. **Early return, fail fast** — 錯誤立刻暴露，不靜默吞掉。不在內部函數用 try-catch 包一切。
7. **命名表達意圖** — 命名表達「做什麼」，不是「怎麼做」。
8. **依賴保守** — 能用標準庫解決的不引入第三方。引入新依賴前須說明理由。
9. **改 bug 先寫測試** — 修 bug 前先寫一個能重現問題的失敗測試，再修。
10. **只改該改的** — 不順手加 docstring、type hints、改 formatting。不重構沒壞的代碼。每一行改動都要能追溯到需求。
11. **歧義先問** — 需求有多重解讀時，列出選項讓我選，不要靜默挑一個做下去。

## Workflow

IMPORTANT: 所有程式碼變更必須經過我確認後才可以執行。提出方案 → 等待確認 → 再動手。

1. **理解需求** — 用一句話重述需求。模糊就先問清楚。
2. **調查** — 讀相關檔案、了解現有架構。
3. **規劃** — 涉及架構或多檔案變更時，先給方案。
4. **實作** — 寫最笨但最清晰的代碼。避免過度抽象和過度設計。
5. **驗證** — 跑測試、typecheck、lint。確保零破壞性。
6. **提交** — 等我確認後再 commit。

## Git Conventions
- Commit message 用英文，簡潔明確
- 一個 commit 做一件事
