# Redis 面試八股文

> 整理自網路常見的 Redis 面試題，涵蓋資料結構、持久化、過期與淘汰、主從哨兵 / Cluster、分散式鎖、快取問題等。

---

## 一、基礎與資料結構

### Q1. Redis 是什麼？為什麼這麼快？
Redis 是基於 C 語言的開源記憶體型 key-value 資料庫。快的原因：
1. 純記憶體存取。
2. 單執行緒避免上下文切換與鎖競爭（網路 IO 在 6.0 後可多執行緒）。
3. IO 多路複用 (epoll)。
4. 高效資料結構（SDS、跳表、ziplist/listpack、quicklist）。
5. 自家實作的事件迴圈。

### Q2. Redis 有哪些常見資料型別？
String、List、Hash、Set、Sorted Set（ZSet）、Bitmap、HyperLogLog、Geo、Stream。

### Q3. String 底層是什麼？
SDS (Simple Dynamic String)，相比 C 字串：
- O(1) 取得長度（記錄 len）。
- 預分配與惰性釋放，減少記憶體重配。
- 二進位安全。

### Q4. List 在新版本怎麼實作？
- 早期：ziplist + linkedlist（quicklist 內部節點）。
- 7.0+：以 listpack 取代 ziplist，減少連鎖更新成本。

### Q5. ZSet 為什麼用跳表 (skip list)？
- 比平衡樹實作簡單，且查詢、插入、刪除平均 O(logN)。
- 範圍查詢（如 ZRANGEBYSCORE）友善，需要按分數順序遍歷。
- 與 dict 配合：dict 做 O(1) 反查 score，跳表做有序操作。

### Q6. Hash 底層結構？
- 元素少（且每元素小於 64 byte）→ listpack（舊版 ziplist）。
- 超過閾值 → hashtable。

---

## 二、持久化

### Q7. RDB 與 AOF 差別？
| 比較 | RDB | AOF |
|------|-----|-----|
| 形式 | 二進位快照 | 命令追加日誌 |
| 體積 | 小 | 大（可重寫壓縮） |
| 恢復速度 | 快 | 慢（重放命令） |
| 資料安全 | 兩次快照之間可能丟資料 | 取決於 fsync 策略，最差秒級 |
| 適用情境 | 災備、大量資料快速恢復 | 對資料完整性要求高 |

### Q8. AOF 三種 fsync 策略？
- `always`：每次寫都 fsync，最安全最慢。
- `everysec`（預設）：每秒 fsync，最差遺失一秒資料。
- `no`：交給作業系統決定，效能最高。

### Q9. AOF 重寫機制？
為避免 AOF 越寫越大，重寫會以當前資料庫狀態產生最小命令集合，並用 fork 子程序與 copy-on-write 完成。重寫期間新命令同時寫入 AOF rewrite buffer。

### Q10. 4.0 之後的混合持久化？
RDB + AOF：AOF 開頭是 RDB 快照，之後追加增量 AOF。兼具快速恢復與資料完整性。

---

## 三、過期與淘汰

### Q11. Redis 過期 key 的刪除策略？
- **惰性刪除**：訪問時才檢查過期。
- **定期刪除**：背景任務隨機抽樣 expire dict 並刪除過期 key。
- 兩者結合，避免過多過期 key 占記憶體又不會掃整個 dict。

### Q12. 記憶體淘汰策略 (maxmemory-policy)？
- `noeviction`（預設）：超過記憶體後寫入直接報錯。
- `allkeys-lru` / `allkeys-lfu`：所有 key 用 LRU/LFU 淘汰。
- `volatile-lru` / `volatile-lfu`：只在設過 expire 的 key 中淘汰。
- `allkeys-random` / `volatile-random`：隨機淘汰。
- `volatile-ttl`：優先淘汰剩餘存活時間短的。

### Q13. LRU 與 LFU 的差別？Redis 怎麼實作？
- LRU：最近最少使用。Redis 用近似 LRU（採樣 N 個 key，淘汰最舊的），減少維護鏈表成本。
- LFU：最少使用次數。Redis 用 logarithmic counter + 衰減時間，能更好處理「歷史熱點」與「真熱點」。

---

## 四、主從、哨兵、Cluster

### Q14. 主從複製流程？
1. Slave 發送 PSYNC。
2. 第一次或無法部分同步 → 全量同步：master `bgsave` 出 RDB + 寫 repl-buffer，傳給 slave。
3. 增量同步：基於 replication backlog 的 offset 與 replid。

### Q15. 哨兵 (Sentinel) 主要做什麼？
- 監控主從健康。
- 自動故障轉移：選出新主，重設拓撲。
- 通知客戶端新的 master 位址。
- 客戶端需透過 Sentinel 取得當前 master。

### Q16. Cluster 的分片機制？
- 16384 個 hash slot，`CRC16(key) mod 16384` 決定槽位。
- 每個節點負責一段 slot；客戶端命中錯節點會收到 MOVED 重定向。
- 高可用：每個分片配 replica，主節點故障由副本接管。

### Q17. Cluster 中 hash tag 的用途？
保證多個 key 落在同一節點，便於做 multi-key 操作或 pipeline／事務：`{user:100}:profile`、`{user:100}:cart`。

---

## 五、分散式鎖

### Q18. 用 Redis 做分散式鎖的最簡實作？
```bash
SET lock_key unique_value NX PX 30000
```
- `NX`：不存在才設定，保證互斥。
- `PX`：自動過期，避免 client 故障鎖死。
- 解鎖時要驗 value 一致再 DEL，避免誤刪別人的鎖。建議用 Lua 腳本：
```lua
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
else
    return 0
end
```

### Q19. 為什麼需要 unique_value 與 Lua？
若 client A 取鎖後因 GC 暫停超過 TTL，鎖被自動釋放並被 B 取走；A 醒來執行 DEL 會把 B 的鎖刪掉。透過 value 比對 + 原子刪除可以避免。

### Q20. Redlock 演算法簡述？
Antirez 提出，用 N 個獨立 master：
1. 取當前時間。
2. 依序向 N 個節點請求 lock，限制單次超時。
3. 取得鎖數量 ≥ N/2 + 1 且耗時 < TTL，視為成功。
4. 失敗時主動釋放所有節點。
> Martin Kleppmann 對 Redlock 有著名批評，業界多數場景仍以 Redisson + 主從 + 哨兵為實務方案。

### Q21. Redisson 的看門狗 (watchdog) 機制？
取鎖後啟動背景執行緒，每 1/3 TTL 對鎖續期，避免業務未完成就過期；當 client 釋放或進程結束時停止續期。

---

## 六、快取常見問題

### Q22. 快取穿透是什麼？怎麼解？
查詢 DB 也不存在的 key（攻擊或拼錯）。
- 快取空值並設較短 TTL。
- 用 Bloom Filter 阻擋不存在的 key。
- 限流與鑑權。

### Q23. 快取擊穿？
熱點 key 過期瞬間，大量請求湧進 DB。
- 互斥鎖（SETNX / Redisson）只放一個請求回填。
- 邏輯過期：永不真正過期，由背景非同步刷新。

### Q24. 快取雪崩？
大量 key 同時失效或 Redis 直接掛掉。
- TTL 加隨機抖動。
- 多級快取（本地 + Redis）。
- 高可用（哨兵 / Cluster）+ 降級策略。
- 預熱熱資料。

### Q25. 雙寫一致性怎麼處理？
常見策略：
- **Cache Aside（旁路快取）**：先更新 DB，再刪除快取。讀時 cache miss 才回填。
- **延遲雙刪**：寫後刪除快取 → 業務寫 DB → 一段時間後再刪一次。
- 訂閱 binlog（Canal）→ 異步刷快取，解耦。

### Q26. 為什麼是「刪快取」而不是「更新快取」？
- 更新計算成本高、容易與並發寫互相覆蓋。
- 刪除使下次讀觸發重新載入，總是最新版本。

---

## 七、進階與雜項

### Q27. Redis 為什麼是單執行緒還這麼快？
單執行緒省去鎖競爭與上下文切換；瓶頸在記憶體與網路而非 CPU。6.0 之後將「網路 IO」改成多執行緒，命令執行仍單執行緒。

### Q28. Big Key、Hot Key 怎麼處理？
- **Big Key**：拆分（hash 拆桶、list 分段），刪除用 `UNLINK` 非同步釋放。
- **Hot Key**：本地快取（Caffeine）、多副本散列、流量切割（如加隨機後綴 + 多 key）。

### Q29. 慢查詢怎麼排查？
- `SLOWLOG GET`、`SLOWLOG LEN` 查最近慢命令。
- `MONITOR` 即時觀察（謹慎，會造成壓力）。
- `LATENCY` 子命令找延遲熱點。
- 避免 `KEYS *`，改用 `SCAN`。

### Q28. Redis 6.0 多執行緒？
僅針對網路 IO（讀取/寫回 socket、解析協議）多執行緒，命令執行仍是主執行緒，因此資料結構不需要鎖。

### Q30. Pipeline 與事務 (MULTI/EXEC) 差別？
- Pipeline：純粹批次傳輸，減少 RTT；命令彼此不保證原子。
- MULTI/EXEC：服務端排隊命令，EXEC 一次原子執行（不支援回滾）。
- Lua 腳本：服務端原子執行整段邏輯，可實作條件分支。

### Q31. Stream 與 Pub/Sub 差別？
- Pub/Sub：訊息即時廣播，無持久化，離線就丟。
- Stream（5.0+）：類似 Kafka，有持久化、消費組、ack、replay。

### Q32. 部署 Redis 時記憶體配置注意事項？
- `maxmemory` 與淘汰策略明確。
- 設定 `maxmemory-policy` 與監控告警。
- 開啟 swap 風險高，建議避免。
- THP (Transparent Huge Pages) 建議關閉，避免 fork 時 latency 飆高。

---

---

## 八、進階資料結構應用

### Q33. Bitmap 適用情境？
每位元 1bit，適合做布林狀態的大規模統計。例如：
- 簽到 (`SETBIT user:sign:202605 day 1`)。
- 活躍用戶（user_id 為 offset，O(1) 標記）。
- 線上狀態。
查詢用 `BITCOUNT`、`BITOP AND/OR`。

### Q34. HyperLogLog 是什麼？
基數估計演算法，固定 12KB 即可估計 2^64 個不同元素，誤差約 0.81%。常用於 UV 統計：
```bash
PFADD page:home:uv user_id_1 user_id_2 ...
PFCOUNT page:home:uv
PFMERGE total_uv day1 day2 day3
```

### Q35. RedisBloom（Bloom Filter）的用途？
用於快速判斷「一定不存在」或「可能存在」，常見於：
- 防止快取穿透（先過濾不存在的 key）。
- 黑名單、URL 去重、爬蟲。
- 缺點：不支援刪除（除非用 Counting Bloom Filter）。

### Q36. GeoHash 怎麼用？
```bash
GEOADD pos 121.5 25.0 taipei
GEORADIUS pos 121.5 25.0 50 km
GEOSEARCH pos FROMMEMBER taipei BYRADIUS 50 km ASC
```
底層仍是 ZSet，把經緯度雜湊成 score 儲存，可做附近查詢。

### Q37. Stream 怎麼實作消息隊列？
```bash
XADD stream * field1 val1
XGROUP CREATE stream grp1 0 MKSTREAM
XREADGROUP GROUP grp1 consumer1 COUNT 10 BLOCK 5000 STREAMS stream >
XACK stream grp1 <id>
```
支援多消費組、ack、claim、replay。

---

## 九、限流與排行榜實作

### Q38. 用 Redis 實作固定窗口限流？
```bash
INCR rate:user:123:202605151200
EXPIRE rate:user:123:202605151200 60
# 取值 > limit 即拒絕
```
缺點是窗口邊界突發。

### Q39. 滑動窗口限流怎麼做？
用 ZSet 把每次請求時間戳作為 score：
```bash
ZADD rate:user:123 <ts> <ts>
ZREMRANGEBYSCORE rate:user:123 -inf <ts-window>
ZCARD rate:user:123
```
搭配 Lua 腳本保持原子性。

### Q40. 令牌桶限流？
存「上次取令牌時間」與「當前令牌數」於 hash，請求時 Lua 計算補充與消耗，原子化更新。Resilience4j、Guava 也是同樣思路。

### Q41. 排行榜常見實作？
- ZSet：`ZADD board score user`、`ZREVRANGE board 0 9 WITHSCORES`、`ZREVRANK board user`。
- 周/月榜：以時間 key 切分，定時聚合。
- 大量更新可用「批次 + Pipeline」減壓。

---

## 十、客戶端與部署

### Q42. Jedis、Lettuce、Redisson 差別？
- Jedis：同步阻塞，連線需 pool。
- Lettuce：基於 Netty 的非阻塞客戶端，支援響應式 API（Spring Boot 2 預設）。
- Redisson：高階分散式工具集（鎖、Map、Queue、Topic），語意接近 Java collection。

### Q43. 連線池設計重點？
- `maxTotal` / `maxIdle` / `minIdle` 比例。
- `testOnBorrow`、`testWhileIdle` 避免拿到失效連線。
- 監控 `Pool exhausted` 與等待時間。
- Lettuce 因單連線多路復用，通常不需要大連線池。

### Q44. 客戶端怎麼處理 Cluster MOVED / ASK？
- MOVED：永久搬遷，更新本地 slot map 再重發。
- ASK：搬遷中，臨時轉發到目標節點，本地 slot map 不更新。

---

## 十一、運維與調優

### Q45. RDB / AOF / fork 在大記憶體下要注意什麼？
- fork 會 copy-on-write 父程序記憶體；雖共享頁面，但寫入時複製仍可能讓 RSS 翻倍。
- 關閉 THP（Transparent Huge Pages），避免 TLB 失效造成延遲尖峰。
- 設 `vm.overcommit_memory=1` 避免 fork 失敗。

### Q46. 為何不要用 KEYS *？
KEYS 是 O(N) 阻塞掃整個 keyspace，可能凍結伺服器秒級。改用 SCAN 增量遍歷：
```bash
SCAN 0 MATCH user:* COUNT 1000
```

### Q47. 如何安全清空資料？
- `FLUSHDB ASYNC` / `FLUSHALL ASYNC`（4.0+）背景非阻塞釋放。
- 大 key 用 `UNLINK` 取代 `DEL`。

### Q48. 快取預熱怎麼做？
上線前由背景任務或腳本灌入熱資料，避免上線瞬間 cache miss 全打 DB。可分批分時段，避免一次性壓垮。

### Q49. 怎麼安全升級 Redis 版本？
- 主備切換：先升級從庫，再 failover 由從變主，最後升級舊主。
- Cluster：節點輪流 reshard + 升級。
- 注意命令相容性與淘汰策略差異。

---

## 十二、實戰常見坑

### Q50. 緩存與資料庫雙寫產生不一致的場景？
- A：寫 DB → 刪 cache 失敗 → 後續讀到舊值。
- B：A 讀 cache miss → 查 DB → 此時 B 寫 DB 並刪 cache → A 把舊值寫回 cache。
解法：延遲雙刪、binlog 補刀、版本號比對。

### Q51. 為何要避免在 Redis 上跑複雜 Lua？
單執行緒會被 Lua 阻塞，整體吞吐下降；過長腳本可能觸發 `BUSY` 狀態。建議：
- 控制腳本執行時間。
- 拆分為多次小腳本。
- 重 IO 邏輯放回應用層。

### Q52. 大 key 的判斷與危害？
- 數百 KB ~ 數 MB 的 String、上萬元素的 Hash/List/ZSet 即視為大 key。
- 危害：傳輸延遲、del/migrate 阻塞、記憶體分配抖動。
- 工具：`redis-cli --bigkeys`、`MEMORY USAGE key`。

### Q53. 熱點 key 的處理？
- 本地 cache（多級緩存）。
- key 散列（加隨機後綴 + 多個物理 key 聚合）。
- 提前過期 + 後台刷新。

### Q54. Redis 與 Memcached 比較？
| 比較 | Redis | Memcached |
|------|-------|-----------|
| 資料結構 | 多種 | 純 KV string |
| 持久化 | 支援 | 不支援 |
| 複製/集群 | 內建 | 客戶端分片 |
| 多執行緒 | 6.0 IO 多執行緒 | 多執行緒 |
| 適用 | 多元場景 | 純高速 KV 緩存 |

---

## 參考來源
- [Redis 面試題，57 道 Redis 八股文 - 二哥的 Java 進階之路](https://javabetter.cn/sidebar/sanfene/redis.html)
- [Redis 常見面試題 - 小林 Coding](https://www.xiaolincoding.com/redis/base/redis_interview.html)
- [使用 Redis 來進行分散式鎖 - HackMD](https://hackmd.io/@UTRxSLfpRa6ds1oeI2U7Lw/HyMSe5Tco)
- [Redis 常見面試題總結 - JavaGuide](https://javaguide.cn/database/redis/redis-questions-01.html)
- [面試八股文——Redis 篇 - 知乎](https://zhuanlan.zhihu.com/p/419224864)
- [Redis 面試題（2020 最新版）- CSDN](https://blog.csdn.net/ThinkWon/article/details/103522351)
- [史上最全 Redis 面試題及答案（2024 最新版）- mikechen](https://mikechen.cc/3313.html)
