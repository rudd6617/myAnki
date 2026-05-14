# Architecture Decision Records

本目錄記錄專案中**值得留下原因**的架構決策。

## 何時建立 ADR

三條件**全部成立**才建：
1. **Hard to reverse** — 改回去成本高
2. **Surprising without context** — 未來讀者會問「為什麼這樣做」
3. **Real trade-off** — 真有替代方案被排除，不是顯而易見的選擇

任一條件不成立，不建。

## 命名規則

`NNNN-short-kebab-name.md`，編號連續遞增，不重用編號。

## 格式

見 [../ADR-FORMAT.md](../ADR-FORMAT.md)。

## 狀態流轉

- `Proposed` → `Accepted` → （需要時）`Superseded by ADR-XXXX`
- 不刪舊 ADR；廢止的標 Superseded，於 Status 註記取代它的 ADR 編號。
