---
name: deepen
description: |
  Find deepening opportunities in a codebase: shallow→deep modules,
  better seams, improved testability and locality.
  Use when reviewing architecture or looking for refactor opportunities at codebase scale.
disable-model-invocation: true
argument-hint: "[area or module to examine]"
---

Deepen: $ARGUMENTS

找架構深化機會。針對 codebase 級回顧，不是單檔審查（那是 /review）。

## 詞彙

- **Module** — 任何「介面 + 實作」的東西
- **Interface** — 呼叫方必須知道的：型別、不變式、錯誤模式、順序、設定
- **Depth** — 介面槓桿。Deep = 介面遠小於實作；Shallow = 介面幾乎等於實作
- **Seam** — 介面所在處，可在不修原處的前提下改變行為
- **Locality** — 維護方獲得：變更、bug、知識集中於一處

## 三個診斷工具

1. **Deletion test**：刪掉這個 module，複雜度會消失，還是擴散到所有呼叫方？消失 = 真的有用；擴散 = 至少有用；只是換個位置 = shallow
2. **Two-adapter rule**：只有一個 adapter = 假 seam，過度抽象。兩個以上 adapter = 真 seam
3. **Locality vs purity 衝突**：為了測試把 pure function 抽出，但 bug 發生在「呼叫模式」中——抽象反而傷除錯。weighing 兩端

## 流程

### 1. Explore
（若存在）讀 `CONTEXT.md`（repo root）與 `docs/adr/`（repo root）。用 Agent (subagent_type=Explore) 走 codebase。記摩擦點：
- 理解一個概念要在多個小 module 間跳轉
- Module 太淺（介面幾乎等於實作）
- 為測試抽 pure function，但真 bug 藏在呼叫鏈裡（locality 差）
- 緊耦合 module 跨 seam 滲漏
- 難測或未測區段

對嫌疑的 shallow module 套 **deletion test**。

### 2. Present Candidates
列編號的深化機會。每項：
- **Files** — 涉及檔案
- **Problem** — 架構摩擦
- **Solution** — 白話說改什麼
- **Benefits** — 用 locality / leverage / 可測性說明

不要先提介面設計。問用戶：「哪幾個你想推進？」

### 3. Drill
進入對選定候選的細節討論。新概念加入 `CONTEXT.md`（若存在）。被否決且有 load-bearing 理由的，提議寫 ADR 防止未來再被建議。
