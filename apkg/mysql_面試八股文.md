# MySQL 面試八股文

> 整理自網路常見的 MySQL 面試題，涵蓋儲存引擎、索引、事務、鎖、MVCC、日誌、主從複製、效能調校等。

---

## 一、基礎觀念

### Q1. MyISAM 與 InnoDB 的差別？
| 比較項 | MyISAM | InnoDB |
|--------|--------|--------|
| 事務 | 不支援 | 支援（ACID） |
| 鎖粒度 | 表鎖 | 行鎖 + 間隙鎖 |
| 外鍵 | 不支援 | 支援 |
| 索引結構 | B+ 樹（資料、索引分離） | 聚簇索引 |
| 崩潰恢復 | 不支援 | 透過 redo log |
| 全文索引 | 5.6 之前獨有，現都支援 | 5.6+ 支援 |

> 預設與生產建議使用 InnoDB。

### Q2. char 與 varchar 差別？
- `char(n)` 定長，不足補空白，適合長度固定欄位（如國碼）。
- `varchar(n)` 變長，需 1~2 byte 紀錄長度，n 為字元數而非 byte 數。

### Q3. MySQL 一條 SELECT 走過哪些模組？
連接器 → 查詢快取（8.0 移除）→ 分析器（語法/語意）→ 優化器（產生執行計畫）→ 執行器 → 儲存引擎。

### Q4. SQL 執行順序？
`FROM → ON → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT`。

---

## 二、索引

### Q5. 為什麼 InnoDB 用 B+ 樹而不是 B 樹或 Hash？
- 相比 B 樹，B+ 樹「非葉節點不存資料」可在同樣高度下放更多 key，IO 次數更少。
- 葉節點以雙向連結串列串接，支援高效範圍查詢。
- Hash 雖然 O(1)，但不支援範圍與排序，且雜湊衝突需處理。

### Q6. 聚簇索引 (clustered) 與非聚簇索引 (secondary) 差別？
- **聚簇索引**：索引與資料合一，葉節點儲存整列資料；InnoDB 預設使用主鍵建立。
- **非聚簇索引**：葉節點儲存「主鍵值」，需要回表才能拿到完整資料。

### Q7. 什麼是覆蓋索引？
查詢的欄位完全可由索引滿足，不需要回表，例如 `INDEX(a, b)` 上的 `SELECT a, b FROM t WHERE a=1`。

### Q8. 什麼是最左前綴原則？
複合索引 `(a, b, c)` 只能在 WHERE 中包含 `a`、`a, b`、`a, b, c` 時生效。`b=?` 或 `b=? AND c=?` 不會用到該索引。

### Q9. 哪些情況索引會失效？
- 對欄位做運算或函式：`WHERE YEAR(create_time) = 2025`。
- 隱式型別轉換：`WHERE phone = 13800000000`（phone 是字串）。
- 模糊查詢前置萬用字元：`LIKE '%abc'`。
- 使用 `OR` 且其中一邊無索引。
- 違反最左前綴。
- `!=`、`NOT IN`、`IS NULL`（視版本而定）。

### Q10. 主鍵為什麼建議自增？
自增主鍵插入時資料順序追加，B+ 樹葉節點順序寫入，避免分頁與隨機 IO；UUID 等亂序字串會造成頻繁分頁與索引膨脹。

### Q11. 索引下推 (Index Condition Pushdown, ICP) 是什麼？
5.6 開始 InnoDB 將部分 WHERE 條件下推到儲存引擎層，在索引遍歷階段就過濾，減少回表次數。

---

## 三、事務 / ACID / 隔離級別

### Q12. ACID 是什麼？
- **Atomicity 原子性**：事務內操作要嘛全成功要嘛全回滾，靠 undo log。
- **Consistency 一致性**：資料庫從一個一致狀態到另一個一致狀態。
- **Isolation 隔離性**：並發事務之間互不干擾，靠鎖 + MVCC。
- **Durability 持久性**：提交後資料持久化，靠 redo log。

### Q13. 四種事務隔離級別與會出現的問題？
| 隔離級別 | 髒讀 | 不可重複讀 | 幻讀 |
|----------|------|------------|------|
| Read Uncommitted | 可能 | 可能 | 可能 |
| Read Committed | 否 | 可能 | 可能 |
| Repeatable Read（MySQL 預設） | 否 | 否 | 可能（InnoDB 用 next-key lock 大幅避免） |
| Serializable | 否 | 否 | 否 |

### Q14. InnoDB 如何在 RR 下避免幻讀？
- 一致性讀（快照讀）靠 MVCC，不會看到新插入的資料。
- 當前讀（`SELECT ... FOR UPDATE` / `LOCK IN SHARE MODE` / 寫入）靠 **next-key lock**（行鎖 + 間隙鎖）阻止其他事務插入。

---

## 四、鎖

### Q15. InnoDB 有哪些鎖？
- **共享鎖 (S)** vs **排他鎖 (X)**。
- **意向鎖 (IS / IX)**：表級，協調表鎖與行鎖。
- **記錄鎖 (Record Lock)**：鎖定索引記錄。
- **間隙鎖 (Gap Lock)**：鎖記錄之間的間隙。
- **臨鍵鎖 (Next-Key Lock)**：記錄鎖 + 間隙鎖。
- **插入意向鎖 (Insert Intention Lock)**。
- **AUTO-INC 鎖**。

### Q16. select for update 與 lock in share mode 差別？
- `FOR UPDATE`：加排他鎖，其他事務不能讀寫該行（讀仍可走 MVCC 快照）。
- `LOCK IN SHARE MODE`：加共享鎖，其他事務可讀但不能寫。

### Q17. 如何排查死鎖？
- `SHOW ENGINE INNODB STATUS` 看 LATEST DETECTED DEADLOCK。
- `information_schema.INNODB_TRX` / `data_locks` / `data_lock_waits`。
- 檢查事務加鎖順序、索引設計、批次更新範圍。

---

## 五、MVCC 與日誌

### Q18. 什麼是 MVCC？
Multi-Version Concurrency Control。每行隱含 `DB_TRX_ID`、`DB_ROLL_PTR` 兩個欄位，更新時建立 undo log 形成版本鏈。讀操作根據 ReadView（活躍事務集合）找到對應快照版本，做到讀寫不互相阻塞。

### Q19. redo log、undo log、binlog 差別？
| 日誌 | 層級 | 用途 |
|------|------|------|
| redo log | InnoDB | 物理日誌，崩潰恢復、保證持久性 |
| undo log | InnoDB | 邏輯日誌，回滾、MVCC 版本鏈 |
| binlog | Server 層 | 邏輯日誌，主從複製、PITR 回復 |

### Q20. 什麼是兩階段提交 (2PC)？
為保證 redo log 與 binlog 一致：
1. InnoDB prepare：寫 redo log（prepare 狀態）。
2. Server 寫 binlog。
3. InnoDB commit：將 redo log 標為 commit。
若中途崩潰，可用 binlog 是否完整來決定 commit 或 rollback。

---

## 六、SQL 與優化

### Q21. EXPLAIN 中 type 欄位常見值與優劣？
`system > const > eq_ref > ref > range > index > ALL`。實務追求 `range` 以上，避免 `ALL`（全表掃描）。

### Q22. count(*)、count(1)、count(欄位) 差別？
- `count(*)`：統計所有列數，InnoDB 會選最小索引掃描，效能最佳，**不忽略 NULL**。
- `count(1)`：等同 `count(*)`。
- `count(col)`：忽略 col 為 NULL 的行。

### Q23. 為什麼 limit 大偏移量會慢？
`LIMIT 1000000, 10` 需要先掃描並丟棄 100 萬行。優化方式：
- 用「延遲關聯」：先只 SELECT 主鍵 LIMIT，再 JOIN 取整列。
- 用游標式分頁：`WHERE id > last_id LIMIT 10`。

### Q24. 如何排查慢 SQL？
1. 開啟 slow query log（`long_query_time`）。
2. `EXPLAIN`、`EXPLAIN ANALYZE` 看執行計畫。
3. 觀察 `Rows_examined`、`Using filesort`、`Using temporary`。
4. 加合適索引、調整 SQL 結構、避免函式包欄位。

### Q25. JOIN 演算法？
- **Nested Loop Join**：對外表每一行掃內表，內表有索引時可接受。
- **Block Nested Loop**：把外表分塊放 join buffer 減少內表掃描。
- **Hash Join (8.0.18+)**：等值 JOIN 且無可用索引時使用。

---

## 七、主從複製與高可用

### Q26. 主從複製原理？
1. 主庫寫 binlog。
2. 從庫的 IO thread 讀取主庫 binlog 寫到 relay log。
3. 從庫的 SQL thread 重放 relay log。
- 模式：Statement / Row / Mixed。Row 最安全但 binlog 較大。

### Q27. 主從延遲常見原因？
- 從庫單執行緒重放（5.7 後支援多執行緒）。
- 大事務、長交易。
- 從庫硬體較差或被讀流量壓滿。
- 網路延遲。
- DDL 與大量更新。

### Q28. 半同步複製 (semi-sync) 與全同步差別？
- 非同步：主庫提交即回應，效能最佳但可能丟資料。
- 半同步：等至少一台從庫收到 binlog 再回應，平衡點。
- 同步：等所有從庫應用完成，效能差但最安全。

### Q29. 分庫分表的策略？
- 垂直拆分：依業務拆表/拆庫。
- 水平拆分：依 range / hash / 一致性雜湊拆。
- 中介軟體：ShardingSphere、MyCat、Vitess。
- 注意全域 ID（雪花、號段）、跨庫 JOIN、分佈式事務。

---

## 八、其他常考

### Q30. drop、truncate、delete 差別？
| 操作 | 類別 | 是否回滾 | 自增 ID | 速度 |
|------|------|----------|---------|------|
| drop | DDL | 不可 | 表沒了 | 最快 |
| truncate | DDL | 不可 | 重置 | 快 |
| delete | DML | 可 | 不重置 | 慢 |

### Q31. 什麼時候會發生表鎖？
- MyISAM 全部寫入。
- InnoDB 沒有走索引時，行鎖會升級為表鎖（其實是鎖住所有掃描到的行）。
- DDL 操作（5.6 以後 Online DDL 仍有 metadata lock）。

### Q32. utf8 與 utf8mb4 差別？
MySQL 的 `utf8` 最大只儲存 3 byte，無法表示 4 byte 字元（emoji、部分罕用漢字）。`utf8mb4` 才是真正的 UTF-8，新建表一律使用。

### Q33. 為什麼推薦使用 not null + default？
- 索引在 NULL 上需要額外處理，影響統計與查詢計畫。
- 比較時 `= NULL` 永遠為 false，容易誤用。
- 增加儲存與運算成本。

### Q34. 大表加欄位怎麼做？
- 8.0 Instant Add Column（瞬時加欄位，不重建表）。
- 5.7 線上 DDL（`ALGORITHM=INPLACE, LOCK=NONE`）。
- gh-ost / pt-online-schema-change 影子表方案。

### Q35. 如何避免快取雪崩 / 穿透 / 擊穿？
- 雪崩：快取大量同時過期，作隨機 TTL、多級快取。
- 穿透：查不存在資料，作空值快取或 Bloom Filter。
- 擊穿：熱點 key 過期瞬間湧入 DB，作互斥鎖或邏輯永不過期。

---

---

## 九、儲存與緩衝

### Q36. Buffer Pool 是什麼？怎麼運作？
InnoDB 在記憶體裡保留資料頁與索引頁的緩衝區。
- 採用「改良式 LRU」：新讀入的頁先放在 old 區（中段），達到一定間隔仍被使用才移到 young 區，避免 full scan 把熱頁刷掉。
- 透過 `innodb_buffer_pool_size` 設定，建議是物理記憶體的 50~70%。

### Q37. Change Buffer 是什麼？
針對「非唯一索引」的 INSERT/UPDATE/DELETE，當對應頁不在 buffer pool 時，先把變更暫存到 change buffer，等真正讀取該頁時再合併寫入，減少隨機 IO。對唯一索引無效（必須讀頁判斷重複）。

### Q38. 為什麼有 doublewrite buffer？
為避免「partial page write」造成資料毀損：頁先寫入 doublewrite 區（順序寫），再寫到實際位置；崩潰恢復時可從 doublewrite 區還原。代價是寫放大 2 倍。SSD/Cloud 上可考慮關閉並依靠 atomic write。

### Q39. log buffer 與 redo log 的關係？
事務寫入 redo 先進 log buffer，依 `innodb_flush_log_at_trx_commit` 策略決定何時刷到 redo log file：
- `1`（預設、最安全）：每次 commit 都 fsync。
- `2`：每次 commit 寫到 OS cache，每秒 fsync。
- `0`：每秒寫一次並 fsync。

---

## 十、字符集與時區

### Q40. utf8mb4 預設排序規則差別？
- `utf8mb4_general_ci`：較舊、不支援所有語言規則，速度稍快。
- `utf8mb4_unicode_ci`：依 Unicode CLDR 規則，準確度高。
- `utf8mb4_0900_ai_ci`（8.0 預設）：使用 Unicode 9.0，支援更廣字符且效能改善。

### Q41. MySQL 時區怎麼處理？
- 系統層：`@@global.time_zone`、`@@session.time_zone`。
- `TIMESTAMP`：寫入時轉 UTC，讀取時轉 session 時區。
- `DATETIME`：純文字，不做轉換。
- 建議統一以 UTC 儲存、應用層轉換。

---

## 十一、視圖、預存程序、觸發器、事件

### Q42. View 的優缺點？
- 優：簡化複雜查詢、提供權限隔離。
- 缺：可能阻擋優化器、複雜 view 不可更新；MERGE 與 TEMPTABLE 兩種演算法。

### Q43. 預存程序 (stored procedure) 在 MySQL 中常見嗎？
較少。優點是減少網路 RTT、集中業務邏輯；缺點是版本管理困難、跨資料庫遷移不易，且 MySQL 的程序語法不如 PG/Oracle 完備，業務邏輯一般放在應用層。

### Q44. 觸發器 (trigger) 該不該用？
能做審計、衍生欄位同步，但會隱藏副作用、難以除錯且影響效能；許多團隊改用 binlog（Canal / Debezium）做變更捕獲。

### Q45. Event Scheduler 的應用？
排程資料清理、統計表更新等，相當於資料庫內的 cron。記得開啟 `event_scheduler=ON` 並監控錯誤日誌。

---

## 十二、分區表與大表處理

### Q46. MySQL 分區類型？
RANGE、LIST、HASH、KEY、COLUMNS（RANGE COLUMNS / LIST COLUMNS）。注意：
- 分區表的所有 unique key（含主鍵）必須包含分區鍵。
- 分區裁剪 (partition pruning) 才能加速；查詢條件需與分區鍵相關。
- 跨分區 JOIN 不會更快。

### Q47. 大表歸檔常見策略？
- 按時間 RANGE 分區後 `ALTER TABLE ... DROP PARTITION` 歸檔。
- 用 `pt-archiver` 分批搬遷。
- 應用層雙寫到歸檔庫。
- 注意外鍵與索引壓力。

---

## 十三、死鎖與並發案例

### Q48. 兩個事務反向更新造成死鎖怎麼解？
T1: `UPDATE A; UPDATE B;`
T2: `UPDATE B; UPDATE A;`
解法：
- 統一加鎖順序（按主鍵升序）。
- 一次鎖完整集合（`SELECT ... FOR UPDATE` 帶完整 IN 列表）。
- 縮小事務範圍。
- 使用 `innodb_lock_wait_timeout` 控制等待時間。

### Q49. 唯一索引插入造成的「插入意向鎖」死鎖？
多個 session 並行插入相同唯一鍵時，皆等待對方釋放，常見於 INSERT ON DUPLICATE KEY UPDATE。改善：
- 預先 SELECT 是否存在再決定 INSERT/UPDATE。
- 走「先 INSERT 失敗再 UPDATE」策略。
- 控制熱點鍵的並發度。

### Q50. AUTO-INC 鎖模式有哪些？
- `innodb_autoinc_lock_mode=0`：傳統，整段插入持表鎖。
- `1`（預設 5.7）：simple insert 不需鎖；bulk insert 仍需。
- `2`（預設 8.0）：全部不加表鎖，效能最佳；但 binlog 必須是 ROW 格式才能保證主從一致。

---

## 十四、效能監控

### Q51. performance_schema 與 sys schema 差別？
- `performance_schema`：底層儀錶，記錄事件、等待、IO 等原始資料。
- `sys`：基於 P_S 的視圖與函式，提供易讀的分析（如 `sys.user_summary`、`sys.statements_with_full_table_scans`）。

### Q52. 常見排查工具？
- `pt-query-digest`（解析 slow log / general log / tcpdump）。
- `mysqldumpslow`。
- `EXPLAIN ANALYZE`（8.0.18+）顯示實際執行成本。
- `SHOW PROCESSLIST`、`SHOW ENGINE INNODB STATUS`。

### Q53. 線上修改 schema 的安全做法？
- `ALGORITHM=INSTANT`（8.0+ 加欄位、改 default、改字符集等）。
- `ALGORITHM=INPLACE, LOCK=NONE` 線上 DDL。
- 巨大表用 `gh-ost` / `pt-online-schema-change`，避免長時間鎖。
- 評估 binlog 增量影響。

---

## 十五、資料一致性與分散式

### Q54. 分散式事務方案？
- XA：兩階段提交，效能差但強一致。
- TCC（Try-Confirm-Cancel）：應用層補償。
- Saga：長交易拆成多個本地交易 + 補償。
- 訊息表 / 事務型 outbox：搭配 MQ 確保至少一次送達。

### Q55. 怎麼保證高可用 ID 全域唯一？
- 雪花算法 (Snowflake)：時間戳 + 機器 ID + 序列號。
- 號段模式（號段服務批次發號）。
- 資料庫自增（不適合多寫）。
- UUID（不利索引）。

### Q56. 主從讀寫分離常見問題？
- 主從延遲導致「寫後讀不到」。
- 解法：強制主庫讀（key 路由）、寫後一段時間內讀主庫、半同步。
- 應用層 fallback：先讀從庫，找不到再讀主庫。

---

## 參考來源
- [MySQL 八股文連環 45 問（背誦版） - 知乎](https://zhuanlan.zhihu.com/p/403656116)
- [最全 MySQL 面試 60 題和答案 - GitHub](https://github.com/caokegege/Interview/blob/master/db/%E6%9C%80%E5%85%A8MySQL%E9%9D%A2%E8%AF%9560%E9%A2%98%E5%92%8C%E7%AD%94%E6%A1%88.md)
- [八股文騷套路之 MySQL - GitHub](https://github.com/csguide-dabai/interview-guide/blob/main/%E5%85%AB%E8%82%A1%E6%96%87%E9%AA%9A%E5%A5%97%E8%B7%AF%E4%B9%8BMySQL.md)
- [MySQL 面試題終極總結 - 每日頭條](https://kknews.cc/zh-tw/code/qgklr3b.html)
- [2 萬字的 MySQL 八股文背誦版](https://javamana.com/2021/08/20210826012849352o.html)
- [MySQL 數據庫面試題（2020 最新版） - CSDN](https://blog.csdn.net/ThinkWon/article/details/104778621)
- [三天吃透 MySQL 面試八股文 - 知乎](https://zhuanlan.zhihu.com/p/677797581)
