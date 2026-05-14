---
name: grill
description: |
  Pre-implementation alignment via relentless interview.
  Walk down the design tree, resolving ambiguities one at a time.
  Use when requirements are fuzzy or before any non-trivial /plan.
disable-model-invocation: true
argument-hint: "[need or feature description]"
---

Grill: $ARGUMENTS

關於這個需求/設計，逐個 branch 質問直到我們達成共同理解。

## 規則

1. **一次問一題**，等回答再繼續。不批次列問題。
2. **每題附我的推薦答案**——不只是問「你想 X 還是 Y？」而是「我傾向 X，因為 Z；你？」
3. **可由代碼回答的問題，自己讀代碼**——不要把調查工作丟給用戶。
4. **走完設計樹**：解析每個分支的依賴順序。前面決定改變後面選項時，回頭重訪。
5. **拒絕模糊措辭**：用戶說「account」時逼問「Customer 還是 User？」
6. **用具體情境壓測**：邊界、極端、衝突情境。「若 A 和 B 同時發生，誰贏？」

## 何時停

當你能用一段話總結需求且不剩疑問點時。把總結給用戶確認再離開 grill。

## 與 /plan 的銜接

grill 結束後，若需求複雜到需要架構選擇，呼叫 `/plan` 進入收斂。簡單變更可直接動工。
