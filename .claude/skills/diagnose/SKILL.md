---
name: diagnose
description: |
  Systematic diagnosis for hard bugs and performance regressions.
  Reproduce → minimise → hypothesise → instrument → fix → regression-test.
  Use when investigating bugs, unexpected behavior, test failures, or performance regressions.
argument-hint: "[bug description]"
---

Diagnose: $ARGUMENTS

跳過任一階段必須明示理由。

## Phase 1 — 建立 feedback loop

**這就是技能本身**。有快速、deterministic、agent-runnable 的 pass/fail 訊號，bug 就找得到；沒有，看再多代碼也救不了。不擇手段建立。

依序試：
1. Failing test 在能觸及 bug 的 seam（unit / integration / e2e）
2. Curl / HTTP script 打 dev server
3. CLI + fixture input + diff snapshot
4. Headless browser script（Playwright / Puppeteer）
5. Replay captured trace（HAR / payload / event log）
6. Throwaway harness — 最小子集 + 一個函數呼叫
7. Property / fuzz loop — 「有時錯」跑 1000 隨機 input
8. Bisection harness — 自動化 git bisect run
9. Differential loop — 同 input 跑舊版 vs 新版
10. **HITL bash script** — 最後手段。把人類點擊步驟包成可重複腳本，讓人類照腳本執行，輸出回流到你

把 loop 當產品迭代：更快、更鋒利、更 deterministic。2 秒 deterministic loop 是除錯超能力。

非確定性 bug 目標是**提高重現率**，不是乾淨重現。1% flake 不行，先拉到 50%。

真的建不出：明說，列已試方法，要重現環境 / artifact / production instrumentation 許可。**沒 loop 不進 Phase 2。**

## Phase 2 — 重現

跑 loop。確認：(a) 失敗是用戶描述的那個（錯 bug = 錯修法）、(b) 多次重現、(c) 捕獲確切症狀。

## Phase 3 — 假設

**先列 3–5 個排序假設**再測。每個必須**可證偽**：「若 X 是因，改 Y 會消失 / 改 Z 會更糟」。說不出預測 = 直覺，丟掉。

**把排序給用戶看再測**——用戶常瞬間重排或排除選項。AFK 就自己排序進行。

## Phase 4 — Instrument

每個探針對應 Phase 3 的特定預測。**一次改一個變因。**

工具優先序：(1) debugger / REPL > (2) 目標 log > (3) 不要 log everything 再 grep。

**所有 debug log 加唯一前綴**：`[DEBUG-a4f2]`。清理時一個 grep 解決。

**效能分支**：log 通常是錯的。建 baseline 測量 → 二分。先量再修。

## Phase 5 — Fix + regression test

**Test 先寫，再寫 fix**——前提是有**正確 seam**。

正確 seam = test 觸發的是 bug 在呼叫端發生的真實 pattern。seam 太淺 = 假信心。

**沒正確 seam 是本身的發現**。記下，Phase 6 處理。

有正確 seam：失敗 test → 套修法 → pass → 對原始情境重跑 Phase 1 loop。

## Phase 6 — Cleanup + post-mortem

- [ ] 原始重現已消（重跑 Phase 1 loop）
- [ ] Regression test pass（或無 seam 已記錄）
- [ ] `[DEBUG-...]` 全清（grep 確認）
- [ ] 拋棄 prototype 已刪
- [ ] 正確假設寫進 commit / PR 訊息

**然後問：什麼能預防這個 bug？** 涉及架構（無好 seam / 隱藏耦合）交給 `/deepen`。修完才建議，不是修前。
