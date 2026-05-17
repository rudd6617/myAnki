# apkg/

把面試八股文 markdown 轉成 Anki `.apkg` 牌組的工作目錄。

## 內容

| 檔案 | 用途 |
|---|---|
| `md2apkg.py` | 通用轉換腳本：`<topic>_面試八股文.md` → `.apkg` |
| `*_面試八股文.md` | 各主題的題目原稿（手寫） |
| `*_面試八股文.apkg` | `md2apkg.py` 產出，可直接 import 進 myAnki / Anki desktop |
| `build_apkg.py` | 舊腳本（Python 八股文專用，題目硬編在程式裡），保留作歷史紀錄 |
| `Python八股文.apkg` / `Python八股文.txt` | 舊腳本的產出 |

## 快速使用

```bash
pip3 install --user genanki markdown
python3 md2apkg.py                          # 轉換所有 *_面試八股文.md
python3 md2apkg.py python_面試八股文.md      # 只轉指定檔案
```

輸出 `.apkg` 與輸入 `.md` 同目錄、同檔名（換副檔名）。

## Markdown 格式

```markdown
# Deck 顯示名稱

> 描述（會被忽略）

## 一、章節標題（會被忽略，僅作 markdown 閱讀分區）

### Q1. 第一題的問題？
答案 markdown，可以包含：

- 清單（前後要有空行，腳本會自動補）
- `行內 code`
- **粗體**

\`\`\`python
def example():
    pass
\`\`\`

| 表格 | 也 | 支援 |
|---|---|---|
| a | b | c |

### Q2. 下一題？
...

---

## 參考來源（最後一段也會被忽略）
```

**重要規則**：
- 題目行必須是 `### Q<數字>. <題目>` 開頭
- 答案接在題目之後，直到下一個 `###` / `## ` / `---` 為止
- `**答：**` 前綴會被自動移除
- 不支援圖片 / 音檔（純文字 + code + 表格）

## Stable GUIDs

每張卡的 Anki GUID 由 `genanki.guid_for(md_stem, question)` 生成：

- 同一份 md、同一個問題 → 相同 GUID
- 修改答案、重產 .apkg、重新 import 進 myAnki → **學習進度保留**（依 myAnki 的同 GUID 替換邏輯，見 `CONTEXT.md` 的 Card.guid 段）
- 修改問題文字 → GUID 變，會被視為新卡

Deck ID / Model ID 則由 SHA-1(檔名前綴) 派生，重跑同一份 md 不會產出衝突的 deck。

## 加新主題

1. 建 `<topic>_面試八股文.md`，按上面格式寫題目
2. `python3 md2apkg.py`
3. 把產出的 `.apkg` import 進 myAnki

## 故障排除

| 症狀 | 原因 / 解法 |
|---|---|
| 清單顯示為 `- xxx - xxx`（沒變 bullet） | 段落與清單之間缺空行；腳本已自動補，若仍出現代表段落內混進非標準 list 標記 |
| 表格沒渲染成表格 | 表格上下需各空一行；或 markdown 表格語法有誤（缺 `---` 分隔列） |
| 重 import 後學習進度丟失 | 問題文字被改過 → GUID 變了。若只想改答案，問題保持原樣 |
