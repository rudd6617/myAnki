---
name: plan
description: |
  Propose an implementation plan for architecture changes or multi-file modifications.
  Use when planning significant code changes after requirements are aligned.
disable-model-invocation: true
argument-hint: "[description of the change]"
---

Plan the implementation for: $ARGUMENTS

## 前置條件

需求須已對齊。若仍有歧義，先呼叫 `/grill`。

## 思考方式

Use "think hard" to evaluate alternatives. Pick the simplest approach.

## 輸出格式

## 數據結構
最關鍵的數據關係與流向。

## 複雜度
可以消除的複雜性。如果沒有，說明為什麼當前方案已是最簡。

## 風險點
最大的破壞性風險。列出受影響的現有功能。

## 核心判斷
✅ 值得做 / ❌ 不值得做 — 附原因。
如果不值得做，指出真正的問題是什麼。
