# PostgreSQL 面試八股文

> 整理自網路常見的 PostgreSQL 面試題，涵蓋核心架構、MVCC、索引、事務、複製與運維實務。

---

## 一、基礎概念

### Q1. PostgreSQL 是什麼？有什麼特色？
PostgreSQL（簡稱 PG）是開源的物件-關聯式資料庫管理系統 (ORDBMS)，特色：
1. 完整 ACID 與事務 DDL（DDL 可被回滾）。
2. 多種索引類型（B-Tree、Hash、GiST、SP-GiST、GIN、BRIN）。
3. 強型別與豐富資料型別（JSONB、Array、HSTORE、Range、UUID、自訂型別）。
4. MVCC 多版本並發控制。
5. 強大的擴充能力（擴展機制、PL/pgSQL、PL/Python、PostGIS、TimescaleDB）。
6. 視窗函式、CTE、Recursive Query、Materialized View、邏輯複製。

### Q2. PostgreSQL 與 MySQL 的差異？
| 比較 | PostgreSQL | MySQL |
|------|-----------|-------|
| 設計哲學 | 學術 / 標準合規 | 簡單實用 |
| 事務 DDL | 支援 | 大多 DDL 不可回滾 |
| 預設隔離級別 | Read Committed | Repeatable Read |
| MVCC 實作 | 表內多版本（多份 row） | undo log + 版本鏈 |
| JSON | JSONB（二進位、可索引） | JSON（解析較慢） |
| 索引類型 | 多種 | B+Tree 為主 |
| 複製 | Streaming + Logical | Binlog-based |
| 全文檢索 | 內建 tsvector/tsquery | 較弱 |

---

## 二、儲存與架構

### Q3. PostgreSQL 程序模型？
PG 採「每連線一程序 (process per connection)」：
- **Postmaster**：主程序，負責 fork 子程序。
- **Backend**：每個用戶端連線對應一個 backend 程序。
- 背景程序：`bgwriter`、`checkpointer`、`walwriter`、`autovacuum launcher/worker`、`logical replication launcher`。
- 因為每連線吃資源，常需用 PgBouncer 之類的連線池。

### Q4. 一張表在磁碟上是怎麼組織的？
- 每張表為一個 heap file，由多個 8KB 的 page 組成。
- Page 內部包含 page header、line pointer、tuple data。
- TOAST：超過 page 約 2KB 的欄位會被壓縮 / 拆分到關聯的 TOAST 表。

### Q5. 何謂 WAL (Write-Ahead Log)？
所有資料修改先寫 WAL 再寫資料頁，崩潰恢復時重放 WAL，達成 durability。WAL 也是 streaming replication 與 PITR 的基礎。

---

## 三、MVCC 與 VACUUM

### Q6. PostgreSQL 的 MVCC 怎麼實作？
- 每個 row 隱含 `xmin`（建立事務 ID）與 `xmax`（刪除事務 ID）。
- 更新 = 在表內插入新版本並標記舊版本 `xmax`。
- 讀取時依事務快照 (snapshot) 與可見性規則，決定看到哪一版本。
- 與 MySQL InnoDB 不同：PG 把舊版本留在原表中，不靠 undo log。

### Q7. 為什麼需要 VACUUM？
舊版本 row（dead tuples）必須在無事務需要看到時被回收，否則：
- 表體積膨脹 (bloat)。
- 索引也膨脹。
- xid 即將耗盡時若未 freeze 會發生 wraparound，全庫停機。

### Q8. VACUUM 與 VACUUM FULL 差別？
- `VACUUM`：標記空間可重用，**不會**回傳磁碟空間給 OS，也不需要 EXCLUSIVE LOCK，可線上執行。
- `VACUUM FULL`：重寫整張表，回傳磁碟空間，但需要 ACCESS EXCLUSIVE LOCK，會阻塞讀寫。

### Q9. autovacuum 怎麼運作？
背景程序根據 `autovacuum_vacuum_threshold` + `autovacuum_vacuum_scale_factor * reltuples` 判定需 vacuum，會自動執行 VACUUM 與 ANALYZE。可針對表設定 `ALTER TABLE ... SET (autovacuum_vacuum_scale_factor = 0.05)` 微調。

### Q10. 什麼是 transaction id wraparound？
xid 為 32-bit 循環，老到一定程度的 row 必須被 freeze 標記為「可見所有事務」。若 autovacuum 跟不上，xid 用盡會強制資料庫停機。觀察 `datfrozenxid`、`pg_stat_all_tables.last_autovacuum` 並設好 `autovacuum_freeze_max_age`。

---

## 四、索引

### Q11. PostgreSQL 提供哪些索引類型？
- **B-Tree**：預設，等值與範圍查詢。
- **Hash**：等值查詢，10+ 後支援 WAL，可用於複製。
- **GiST**：通用搜尋樹，支援幾何、全文、範圍等。
- **SP-GiST**：分區搜尋樹，適合非平衡資料。
- **GIN**：倒排索引，適合 array、JSONB、tsvector。
- **BRIN**：區塊範圍索引，適合大表且資料按物理順序排列（時序資料）。

### Q12. 部分索引 (partial index) 與表達式索引 (expression index)？
- 部分索引：`CREATE INDEX ON orders (created_at) WHERE status = 'open';`，只索引部分行，省空間。
- 表達式索引：`CREATE INDEX ON users (lower(email));`，可加速 `WHERE lower(email) = ?`。

### Q13. 為什麼 PG 的索引必須要 VACUUM？
索引項目指向 heap tuple 位置，舊版本被回收後索引項也要清理。VACUUM 會清理對應 dead index entries；HOT (Heap-Only Tuple) 更新可避免大部分索引更新，但只在被更新欄位均不在索引時才生效。

### Q14. CREATE INDEX 與 CREATE INDEX CONCURRENTLY 差別？
- 一般 CREATE INDEX 會持有寫鎖，阻塞 DML。
- CONCURRENTLY 不阻塞讀寫，需要兩次掃描表，較慢；中途失敗會留下 INVALID 索引，需重建。

---

## 五、事務與隔離

### Q15. PostgreSQL 的事務隔離級別？
- **Read Uncommitted**：實際與 Read Committed 等同（PG 不會讀到未提交資料）。
- **Read Committed**（預設）：每個語句都拿新快照。
- **Repeatable Read**：整個事務一個快照，避免不可重複讀與幻讀（透過 MVCC，無需間隙鎖）。
- **Serializable**：使用 Serializable Snapshot Isolation (SSI)，自動偵測序列化衝突並回滾。

### Q16. SSI 與 MySQL 的 SERIALIZABLE 差別？
- MySQL：對讀加共享鎖，影響並發。
- PG：使用 SSI，不加讀鎖；運行時追蹤讀寫依賴，發現可能違反序列化時回滾事務（會收到 `40001`）。

### Q17. SAVEPOINT 與子事務？
PG 支援 `SAVEPOINT name; ROLLBACK TO name;`，每個 savepoint 對應一個子事務。但子事務多時 xid 消耗加快，會影響效能。

---

## 六、JSONB、Array 等進階型別

### Q18. JSON 與 JSONB 差別？
- `JSON`：保留原始文字、序文與重複 key，每次查詢需解析。
- `JSONB`：二進位、去除空白與重複 key、可索引（GIN），查詢較快、寫入略慢。
- 建議使用 JSONB。

### Q19. 怎麼為 JSONB 建立索引？
```sql
-- 通用：支援所有 ? @> ?| ?& 操作
CREATE INDEX ON docs USING gin (data);
-- 路徑/包含查詢更快但僅支援 @> @? @@：
CREATE INDEX ON docs USING gin (data jsonb_path_ops);
-- 對特定欄位的表達式索引：
CREATE INDEX ON docs ((data->>'user_id'));
```

### Q20. Array 的常見用法？
```sql
SELECT * FROM tags WHERE 'rust' = ANY(tags_arr);
CREATE INDEX ON tags USING gin (tags_arr);
```

---

## 七、複製與高可用

### Q21. Streaming Replication 與 Logical Replication 差別？
- **Streaming (Physical)**：實體層複製整個 WAL，主從版本與架構需一致；常用於 standby、HA。
- **Logical**：以邏輯解碼將變更轉成 INSERT/UPDATE/DELETE，可選表複製，跨版本/跨 schema 容易；用於資料整合、CDC。

### Q22. 同步、非同步、Quorum 複製？
- 非同步：主庫提交不等待 standby，可能丟失最新交易。
- 同步：等待至少一個 sync standby 收到 WAL。
- Quorum (`synchronous_standby_names = ANY n (...)`)：指定 N 個 standby 中至少 n 個確認。

### Q23. 常見高可用方案？
- **Patroni** + etcd / Consul：自動故障轉移。
- **repmgr**、**Stolon**。
- **PgBouncer / HAProxy**：流量路由。
- 雲端代管（RDS、Cloud SQL、Aurora 等，但 Aurora 不是純粹的 PG 架構）。

### Q24. PITR (Point-In-Time Recovery)？
基於 base backup + WAL 連續歸檔，可恢復到任意時刻。常用工具：`pgBackRest`、`Barman`、`wal-g`。

---

## 八、效能與運維

### Q25. EXPLAIN 與 EXPLAIN ANALYZE 差別？
- `EXPLAIN`：印出計畫但不執行（部分節點仍可能執行如 CTE）。
- `EXPLAIN ANALYZE`：實際執行並印出實際時間/行數，便於對照估計值。
- 加 `BUFFERS, VERBOSE, FORMAT JSON` 可拿到更多資訊。

### Q26. 統計資訊不準會發生什麼？
優化器估計行數錯誤 → 可能選錯 plan（順序錯、索引未用）。解法：
- `ANALYZE` 更新統計。
- 對大表設 `ALTER TABLE ... ALTER COLUMN col SET STATISTICS 1000;` 提高採樣。
- 多欄位相關性差時用 `CREATE STATISTICS`（10+）。

### Q27. 慢查詢怎麼排查？
- 開啟 `pg_stat_statements` 看頻率與耗時。
- `auto_explain` 自動記錄慢查詢計畫。
- 看 `pg_stat_activity`、`pg_locks` 找鎖等。
- `pgBadger` 分析日誌。

### Q28. 為什麼 PostgreSQL 建議用連線池？
每連線是一個 process，記憶體（大概 5~10MB）與 fork 成本高；長時間維持上千連線會耗盡資源。常用 PgBouncer (transaction pooling) 或 Pgpool。

### Q29. shared_buffers、work_mem、maintenance_work_mem 怎麼調？
- `shared_buffers`：通常設為 RAM 的 25%。
- `work_mem`：每個排序/雜湊節點可用記憶體；過大會在多連線下放大用量。
- `maintenance_work_mem`：VACUUM、CREATE INDEX 用，可調大。
- `effective_cache_size`：估計 OS + DB 可用快取，給 planner 參考。

### Q30. 表分割 (partitioning) 有哪些方式？
- **RANGE**：依時間/數值範圍。
- **LIST**：依離散值。
- **HASH**：按雜湊均勻分布。
- 11+ 後支援宣告式分區、子分區與分區剪枝。

### Q31. PostgreSQL 怎麼做行級權限 (RLS)？
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::int);
```
搭配連線時 `SET app.tenant_id = '123';`。

### Q32. 邏輯解碼 (logical decoding) / CDC 怎麼做？
建立 logical replication slot，使用 `pgoutput`、`wal2json`、`decoderbufs` 等 plugin 取出變更串流，再餵給 Debezium / Kafka 等。

### Q33. 哪些操作會佔用 ACCESS EXCLUSIVE LOCK？
`VACUUM FULL`、`CLUSTER`、`REINDEX`（不加 CONCURRENTLY）、許多 `ALTER TABLE`（型別變更、重建索引）。生產環境應評估是否能改用 CONCURRENTLY 變體或工具（pg_repack）。

### Q34. pg_repack 是什麼？
線上重建表/索引以消除膨脹的工具，相比 VACUUM FULL，重建期間幾乎不阻塞 DML。

### Q35. 常見效能殺手？
- 缺索引、誤用 functional index 導致 sequential scan。
- 大事務或長交易阻擋 VACUUM，造成 bloat。
- 過多連線且未用連線池。
- autovacuum 設定保守，跟不上更新量。
- 無 partial index 卻索引整張大表。
- TOAST 欄位被頻繁讀取但沒被 covered。

---

---

## 九、TOAST 與大欄位

### Q36. TOAST 是什麼？
The Oversized-Attribute Storage Technique。當 row 超過 page 約 2KB 時，PG 會把可變長度欄位壓縮、拆分到對應的 TOAST 表（`pg_toast.pg_toast_<oid>`）。
- 策略：`PLAIN`、`EXTENDED`（壓縮 + 外存，預設）、`EXTERNAL`、`MAIN`。
- 可用 `ALTER TABLE t ALTER COLUMN col SET STORAGE EXTERNAL;` 調整。

### Q37. 為什麼 SELECT * 可能比想像中慢？
觸發 TOAST detoast、欄位序列化都要付代價；只取需要欄位能避免不必要 IO 與 CPU。

### Q38. JSONB 大欄位有什麼陷阱？
- 高度更新會觸發整個 TOAST 重寫。
- GIN 索引維護開銷大，寫入慢。
- 建議常查欄位拆出成獨立欄位或表達式索引。

---

## 十、ctid、xid 與系統欄位

### Q39. 什麼是 ctid？
每個 row 的物理位置 `(block_no, item_no)`。VACUUM、UPDATE 後可能改變；不可作為穩定主鍵。

### Q40. xmin / xmax / cmin / cmax 是什麼？
- `xmin`：建立此版本的事務 ID。
- `xmax`：刪除/更新此版本的事務 ID。
- `cmin / cmax`：同一事務內的命令 ID，用於同事務內可見性。
- `tableoid`：所屬表的 OID，分區表常用。

### Q41. xid 與 64-bit xid（FullTransactionId）？
原生 xid 為 32-bit 循環值，需 freeze 處理；內部追蹤用 `FullTransactionId`（含 epoch）避免 wraparound。

---

## 十一、備份與還原

### Q42. pg_dump、pg_dumpall、pg_basebackup 差別？
- `pg_dump`：邏輯備份單個資料庫，可選 plain / custom / directory / tar 格式。
- `pg_dumpall`：邏輯備份整個 cluster（含 roles、tablespaces）。
- `pg_basebackup`：物理備份，適合 PITR 與 standby 初始化。

### Q43. 邏輯備份與物理備份比較？
| 比較 | 邏輯 (pg_dump) | 物理 (pg_basebackup) |
|------|----------------|--------------------|
| 速度 | 慢 | 快 |
| 跨版本 | 容易 | 主版本內 |
| 體積 | 小 | 大 |
| 還原粒度 | 單庫 / 單表 | 整個 cluster |
| 配合 PITR | 否 | 是 |

### Q44. PITR 流程？
1. 開啟歸檔：`archive_mode=on, archive_command='cp %p ...'`。
2. 取 base backup（pg_basebackup）。
3. 持續歸檔 WAL。
4. 恢復時準備 base backup + recovery 設定 + WAL 路徑，啟動後 PG 會重放至指定時間/LSN。

---

## 十二、擴展與生態

### Q45. 常用擴展 (extensions) 有哪些？
- `pg_stat_statements`：彙總 SQL 執行統計，必裝。
- `pg_repack`：線上重建表索引。
- `pgcrypto`：雜湊、對稱加密。
- `postgis`：地理空間。
- `timescaledb`：時間序列。
- `citus`：水平擴展。
- `pgvector`：向量檢索（AI / Embeddings）。
- `pg_partman`：分區管理。
- `hstore`、`uuid-ossp`、`ltree`、`tablefunc`。

### Q46. CREATE EXTENSION 如何運作？
依擴展套件中的 SQL 腳本建立 schema 物件；多數需 superuser。版本透過 `ALTER EXTENSION ... UPDATE` 升級。

---

## 十三、運維與安全

### Q47. PostgreSQL 角色與權限？
- 角色 (role) 同時涵蓋 user 與 group。
- 權限：`GRANT SELECT ON t TO r;`、`GRANT USAGE ON SCHEMA s TO r;`。
- 預設權限：`ALTER DEFAULT PRIVILEGES`。
- 可登入 = `LOGIN` 屬性 + `pg_hba.conf` 允許。

### Q48. pg_hba.conf 是什麼？
連線授權規則，欄位：`type, database, user, address, method`。method 常見：`trust`（無密碼）、`md5`、`scram-sha-256`（推薦）、`peer`、`cert`。

### Q49. SCRAM-SHA-256 與 md5 比較？
SCRAM 抗重放、抗離線攻擊，安全性高，10+ 起預設。需確保客戶端 driver 支援。

### Q50. 為什麼推薦使用 prepared statement？
- 計畫快取、避免重複解析。
- 自然防 SQL Injection。
- 但 PG 在第 6 次後才轉為「通用計畫」，若參數分布不均可能效能變差，可用 `plan_cache_mode=force_custom_plan`。

---

## 十四、進階查詢與功能

### Q51. CTE (WITH) 在 PG 12 前後的差異？
- 12 之前 CTE 是「優化柵欄 (optimization fence)」，必定物化，可能影響效能。
- 12+ 預設可被內聯；用 `WITH q AS MATERIALIZED (...)` 可強制物化、`NOT MATERIALIZED` 強制內聯。

### Q52. 視窗函式 (window function) 怎麼用？
```sql
SELECT user_id, amount,
       SUM(amount) OVER (PARTITION BY user_id ORDER BY created_at
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM orders;
```
適合滾動統計、排名 (`ROW_NUMBER`、`RANK`、`DENSE_RANK`)。

### Q53. UPSERT 怎麼寫？
```sql
INSERT INTO t (id, val) VALUES (1, 'a')
ON CONFLICT (id) DO UPDATE SET val = EXCLUDED.val;
```
`EXCLUDED` 是被嘗試插入但未成功的那一行。

### Q54. RETURNING 子句的好處？
DML 直接回傳影響的列，免再 SELECT：
```sql
INSERT INTO orders(...) VALUES (...) RETURNING id, created_at;
UPDATE accounts SET balance = balance - 100 WHERE id = 1 RETURNING balance;
```

### Q55. LISTEN / NOTIFY 是什麼？
PG 內建的 pub/sub。應用：
```sql
LISTEN ch1;
NOTIFY ch1, 'payload';
```
適合輕量訊息（同 cluster），訊息不持久化；高吞吐需求應改用 Kafka 等。

### Q56. Materialized View 與 View 差別？
- View：每次查詢即時計算。
- Materialized View：實體化儲存，需 `REFRESH MATERIALIZED VIEW [CONCURRENTLY]` 更新；CONCURRENTLY 需要唯一索引。

---

## 十五、常見陷阱

### Q57. NULL 與三值邏輯？
`a = NULL` 永遠是 UNKNOWN，要用 `IS NULL`。聚合函式預設忽略 NULL（`COUNT(col)` vs `COUNT(*)`）。`UNIQUE` 索引允許多筆 NULL（除非 15+ 用 `NULLS NOT DISTINCT`）。

### Q58. 序列 (sequence) 不會回滾？
`nextval` 即使在事務 rollback 後也不會回退，這是設計如此（避免並發瓶頸）。所以不要依賴 ID 連續。

### Q59. 大表加 NOT NULL 為什麼會卡？
舊版需全表掃描驗證並重寫。11+ 可在加欄位時 `DEFAULT value NOT NULL`，不重寫；對既有欄位加 NOT NULL 仍需驗證，可先 `ADD CONSTRAINT ... NOT VALID` 再 `VALIDATE CONSTRAINT` 分開鎖。

### Q60. 浮點與 numeric 怎麼選？
- `real / double precision`：IEEE 浮點，速度快但有精度誤差。
- `numeric`：任意精度，金融與會計類型必選。
- `money`：依本機 locale，跨環境不可靠，少用。

### Q61. timestamp 與 timestamptz 差別？
- `timestamp`：不帶時區的「本地時間字串」。
- `timestamptz`：寫入時轉 UTC，讀取時依 session 時區。應用建議統一用 `timestamptz`。

### Q62. text 與 varchar 哪個好？
PG 內部實作完全相同，沒有 `varchar(n)` 比 `text` 快的道理。除非有業務長度限制，建議直接用 `text`。

### Q63. 索引膨脹監控指標？
- `pgstattuple` extension：`pgstatindex`、`pgstattuple` 顯示死元組比例。
- 觀察 `pg_stat_user_indexes.idx_scan = 0` 找從未使用的索引。
- 用 `pg_repack` 定期重建。

---

## 參考來源
- [數據庫面試題（6）PostgreSQL 基礎 - 倾城架构](https://www.codingbrick.com/archives/1458.html)
- [關於 PostgreSQL 的 20 道面試題 - CSDN](https://blog.csdn.net/weixin_41312759/article/details/138367411)
- [《PostgreSQL 面試題集錦》學習與回答 - CSDN](https://blog.csdn.net/Hehuyi_In/article/details/128885660)
- [深入理解 PostgreSQL 中的 MVCC 機制 - 騰訊雲](https://cloud.tencent.com/developer/article/2405841)
- [PostgreSQL 和 MySQL 的 MVCC 實現機制差異 - 知乎](https://zhuanlan.zhihu.com/p/107993134)
- [2022 年最常見的 15 道 PostgreSQL 面試題 - 墨天輪](https://www.modb.pro/db/475533)
- [大廠 PostgreSQL 面試題 100 道及參考答案 - CSDN](https://blog.csdn.net/linweidong/article/details/138141752)
- [DBA 面試題目 - HackMD](https://hackmd.io/@mobiletest015/B1Qfc404o)
