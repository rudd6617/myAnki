# Nginx 面試八股文

> 整理自網路常見的 Nginx 面試題，涵蓋架構、反向代理、負載均衡、效能、安全與運維實務。

---

## 一、概念與架構

### Q1. Nginx 是什麼？主要用途有哪些？
Nginx 是一款高效能的開源 HTTP / 反向代理 / 郵件代理伺服器，具有低記憶體佔用、高併發能力。常用作：
1. Web 伺服器（靜態資源服務）。
2. 反向代理 + 負載均衡。
3. API Gateway / SSL Termination。
4. 動靜分離與快取。
5. TCP/UDP 四層代理（stream 模組）。

### Q2. 為什麼 Nginx 能支援高併發？
- **事件驅動 + 非阻塞 IO**：基於 epoll/kqueue 的事件迴圈，一個 worker 同時處理數萬連線。
- **多 worker 程序**：每個 worker 綁定 CPU，避免上下文切換。
- **記憶體池與零拷貝 (sendfile)**。
- **異步寫日誌、AIO**。

### Q3. Master / Worker 架構？
- **Master**：讀取設定、管理 worker、負責訊號處理（reload、stop）。
- **Worker**：實際處理請求；數量通常設為 CPU 核心數。
- Worker 之間透過共享記憶體與互斥鎖協調 accept。

### Q4. Nginx 與 Apache 差別？
| 項目 | Nginx | Apache |
|------|-------|--------|
| 模型 | 事件驅動、非同步 | 一連線一程序/執行緒（prefork/worker） |
| 高併發 | 強 | 弱 |
| 動態模組 | 主流以靜態編譯為主，1.9.11+ 支援 dynamic module | 強，動態載入 |
| 靜態資源 | 極快 | 較慢 |
| .htaccess | 不支援 | 支援 |

---

## 二、反向代理與負載均衡

### Q5. 正向代理與反向代理差別？
- **正向代理**：代理「客戶端」，常見於翻牆、企業出口。伺服器看到的是 proxy。
- **反向代理**：代理「伺服器」，客戶端只認得 proxy（如 Nginx），由 proxy 將請求分配到後端。

### Q6. Nginx 負載均衡有哪些演算法？
- `round-robin`（預設）：依序輪詢。
- `weight`：加權輪詢。
- `ip_hash`：以 client IP 雜湊，固定路由（解決 session）。
- `least_conn`：分配給當前連線最少的後端。
- `hash $key consistent`：一致性雜湊（需 1.7.2+）。
- 商業版/第三方：`fair`（依後端回應時間）、`url_hash`。

```nginx
upstream backend {
    least_conn;
    server 10.0.0.1:8080 weight=3;
    server 10.0.0.2:8080;
}
```

### Q7. 反向代理常用設定？
```nginx
location /api/ {
    proxy_pass http://backend/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_read_timeout 60s;
}
```

### Q8. proxy_pass 後面有沒有斜線差別？
- `proxy_pass http://backend;`（無 `/`）：保留原始 URI 全部轉發。
- `proxy_pass http://backend/;`（有 `/`）：location 匹配的部分被替換為 `/`。

例：location `/api/`，請求 `/api/users` →
- 無斜線 → `http://backend/api/users`
- 有斜線 → `http://backend/users`

### Q9. 後端如何拿到真實 IP？
透過 `X-Forwarded-For` / `X-Real-IP` 標頭；後端應用可解析或在 Nginx 上設 `set_real_ip_from` + `real_ip_header X-Forwarded-For;`。

### Q10. 如何處理 WebSocket？
```nginx
location /ws/ {
    proxy_pass http://ws_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
}
```

---

## 三、location 與匹配

### Q11. location 的匹配優先順序？
1. `=`：精確匹配，命中即止。
2. `^~`：前綴匹配，命中即止（不再做正則）。
3. 正則：`~`（區分大小寫）、`~*`（不區分），按設定順序匹配。
4. 普通前綴：最長前綴匹配，若已被 `^~` 命中則不繼續正則。

### Q12. try_files 用途？
按順序嘗試檔案，找不到則跳到最後參數（通常為內部 location 或回傳 404）。SPA 常見：
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Q13. rewrite 與 return 差別？
- `return`：直接結束處理並回應狀態碼或重導向，效能高。
- `rewrite`：URL 改寫，可選 `last`（重新進 location 流程）、`break`（停在當前 location）、`redirect`、`permanent`。

---

## 四、限流、快取、安全

### Q14. Nginx 限流有哪些方式？
- **連線數限流** `limit_conn_zone` / `limit_conn`：限制同 IP 同時連線數。
- **請求速率限流** `limit_req_zone` / `limit_req`：基於漏桶演算法。
- 結合 `burst` 與 `nodelay` 可允許突發。
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
location /api/ {
    limit_req zone=api burst=20 nodelay;
}
```

### Q15. 漏桶與令牌桶差別？
- **漏桶 (Leaky Bucket)**：以固定速率出水，超出緩衝直接拒絕。Nginx `limit_req` 採用此模型。
- **令牌桶 (Token Bucket)**：固定速率放令牌，桶裡有令牌就可消耗，能應付突發。

### Q16. 開啟 Gzip 壓縮？
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1k;
gzip_comp_level 5;
gzip_vary on;
```
亦可改用 brotli (`ngx_brotli` 模組)。

### Q17. Nginx 快取怎麼配？
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=mycache:10m max_size=1g inactive=60m;
location / {
    proxy_cache mycache;
    proxy_cache_valid 200 302 10m;
    proxy_cache_valid 404 1m;
    proxy_cache_use_stale error timeout updating http_500;
    add_header X-Cache-Status $upstream_cache_status;
    proxy_pass http://backend;
}
```

### Q18. 如何處理 HTTPS / TLS？
```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    ssl_certificate /etc/ssl/fullchain.pem;
    ssl_certificate_key /etc/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```
HTTP 自動跳轉 HTTPS：`return 301 https://$host$request_uri;`。

### Q19. 防 DDoS / CC 的常見手段？
- 限流 (`limit_req` / `limit_conn`)。
- 黑名單 (`deny`)、IP 白名單。
- 結合 fail2ban 自動封禁。
- WAF（ModSecurity、NAXSI）。
- 開啟 `tcp_nodelay`、`accept-mutex`、調整 `worker_connections`。
- 上游接 CDN / 雲端清洗。

---

## 五、效能調校

### Q20. worker_processes 與 worker_connections 怎麼設？
- `worker_processes auto;`：等於 CPU 核心數。
- `worker_connections 10240;`：單個 worker 可承載連線數。
- 最大併發 ≈ `worker_processes * worker_connections`，但要算上後端反向代理會雙倍佔用。

### Q21. 怎樣關掉不必要的 access log？
- 整體：`access_log off;`。
- 條件：`map` + `access_log` 過濾健康檢查路徑。
- 改為 buffered 寫入：`access_log /var/log/nginx/access.log main buffer=32k flush=5s;`。

### Q22. sendfile、tcp_nopush、tcp_nodelay 的用途？
- `sendfile on;`：零拷貝送檔，省 CPU。
- `tcp_nopush on;`：搭配 sendfile，將檔案頭與內容合併送出。
- `tcp_nodelay on;`：對 keep-alive 連線啟用 Nagle 關閉，降低延遲。

### Q23. keepalive 設定？
```nginx
keepalive_timeout 65;
keepalive_requests 1000;
upstream backend {
    server 10.0.0.1;
    keepalive 32;  # 對後端的長連線池
}
```
搭配 `proxy_http_version 1.1; proxy_set_header Connection "";` 才能真正復用後端連線。

---

## 六、健康檢查與灰度

### Q24. 開源版 Nginx 怎麼做健康檢查？
- 被動檢查：`max_fails`、`fail_timeout`，請求失敗達閾值即標記不可用。
- 主動檢查：需 `nginx_upstream_check_module` 或 NGINX Plus / Tengine。

### Q25. 灰度發布 (canary) 怎麼做？
- 依 weight 把少量流量導到新版本。
- 透過 `map` + cookie / header 將特定使用者導向新後端。
- 結合 `split_clients` 按比例分流。
```nginx
split_clients "${remote_addr}AAA" $variant {
    10%     "v2";
    *       "v1";
}
```

---

## 七、運維與故障排查

### Q26. reload 與 restart 差別？
- `nginx -s reload`：master 收到 SIGHUP，產出新 worker 處理新請求，舊 worker 完成後退出，零停機。
- `restart`：完全停止再啟動，會中斷連線。

### Q27. 設定檢查與安全 reload？
```bash
nginx -t          # 檢查語法
nginx -T          # 印出完整配置
nginx -s reload   # 平滑重載
```

### Q28. 如何排查 502 / 504？
- **502 Bad Gateway**：後端拒絕或崩潰，檢查後端服務、socket、防火牆。
- **504 Gateway Timeout**：後端逾時，調整 `proxy_read_timeout`、`proxy_connect_timeout`，或檢查後端慢 SQL。
- 看 `error.log`、`upstream_response_time`、`upstream_status`。

### Q29. Nginx 變數 $remote_addr、$proxy_add_x_forwarded_for、$http_x_forwarded_for 差別？
- `$remote_addr`：直接連線 Nginx 的 IP（前面若有 LB，此即 LB IP）。
- `$http_x_forwarded_for`：上游 LB 已帶的 XFF 內容。
- `$proxy_add_x_forwarded_for`：把 `$remote_addr` 追加到 XFF 後面。

### Q30. 動靜分離怎麼配？
```nginx
location ~* \.(jpg|png|css|js|woff2)$ {
    root /var/www/static;
    expires 30d;
    access_log off;
}
location / {
    proxy_pass http://app_backend;
}
```

### Q31. 何時用 OpenResty？
需要在 Nginx 裡跑 Lua 邏輯時：自定義鑑權、複雜限流、動態路由、API Gateway。OpenResty 整合 LuaJIT、ngx_lua、cosocket，可寫高效能應用閘道（Kong、APISIX 都基於它）。

---

---

## 八、請求處理流程

### Q32. Nginx 請求處理有哪些 phase？
依序：`POST_READ → SERVER_REWRITE → FIND_CONFIG → REWRITE → POST_REWRITE → PREACCESS → ACCESS → POST_ACCESS → PRECONTENT → CONTENT → LOG`。各 phase 可由模組註冊 handler；常見指令對應：
- `set / rewrite`：rewrite phase。
- `allow / deny`：access phase。
- `proxy_pass / fastcgi_pass`：content phase。

### Q33. set 在 rewrite phase 的特性？
`set $var value;` 在請求進入 location 之前就會執行，因此即使指令順序排在後面，變數仍可能在更早被計算；想做條件設定可結合 `if` 或 `map`。

### Q34. map / geo / split_clients 用途？
- `map $src $dst { default x; "a" "y"; }`：建立查表變數。
- `geo $remote_addr $is_internal { default 0; 10.0.0.0/8 1; }`：根據 IP 段設變數。
- `split_clients "$cookie_uid" $bucket { 10% "A"; * "B"; }`：流量切分，常用於 A/B 測試。

### Q35. if 為什麼不建議在 location 中使用？
`if` 在 rewrite phase 執行，與其他指令的互動有不少坑（[“if is evil”](https://www.nginx.com/resources/wiki/start/topics/depth/ifisevil/)）。多用 `map` 或 `try_files` 取代，必要時只用 `if (-f $file)` 等簡單檢查。

---

## 九、日誌與觀測

### Q36. access_log 自定格式？
```nginx
log_format main '$remote_addr - $remote_user [$time_local] '
                '"$request" $status $body_bytes_sent '
                '"$http_referer" "$http_user_agent" '
                'rt=$request_time uct="$upstream_connect_time" '
                'urt="$upstream_response_time" us="$upstream_status"';
access_log /var/log/nginx/access.log main buffer=64k flush=5s;
```
觀察 `$upstream_response_time` 可區分 Nginx 自身與上游耗時。

### Q37. 怎麼把日誌送到集中化平台？
- 直接寫檔，由 Filebeat / Fluent Bit 收集到 ELK / Loki。
- syslog：`access_log syslog:server=...`。
- JSON 格式（escape=json）方便結構化解析。

### Q38. 常見 metric 怎麼採集？
- 內建 `stub_status` 模組：active connections、accepts、handled、requests。
- VTS / nginx-exporter：細到 upstream / location 的 RPS、延遲、錯誤率。
- OpenResty + Prometheus exporter。

### Q39. 開啟 debug log 怎麼做？
編譯時需 `--with-debug`；設定：
```nginx
error_log /var/log/nginx/debug.log debug;
events { debug_connection 1.2.3.4; }
```
僅針對特定 client 開 debug，避免日誌爆量。

---

## 十、HTTP/2、HTTP/3 與 SSL

### Q40. HTTP/2 的好處？
- 二進位分幀、多路復用，避免 head-of-line blocking。
- 標頭壓縮 (HPACK)。
- Server Push（已被多數瀏覽器棄用）。
- Nginx：`listen 443 ssl http2;`。

### Q41. HTTP/3（QUIC）與 HTTP/2 差別？
- 基於 UDP + QUIC，內建 TLS 1.3。
- 解決 TCP 層的 HOL blocking、連線遷移。
- Nginx 從 1.25 起內建 quic 模組：`listen 443 quic reuseport;` + `add_header Alt-Svc 'h3=":443"';`。

### Q42. SSL 效能優化？
- 啟用 session cache / session ticket：`ssl_session_cache shared:SSL:50m; ssl_session_tickets on;`。
- OCSP Stapling：`ssl_stapling on; ssl_stapling_verify on;`。
- 選擇現代 cipher：禁用 SSLv3/TLSv1/1.1。
- 採用 ECDSA + RSA 雙憑證。

### Q43. mTLS 怎麼設定？
```nginx
ssl_client_certificate /etc/ssl/ca.pem;
ssl_verify_client on;
proxy_set_header X-Client-Subject $ssl_client_s_dn;
```
常用於內部服務或 IoT 認證。

---

## 十一、上游連線與超時

### Q44. upstream 的 keepalive 連線怎麼正確使用？
```nginx
upstream api {
    server 10.0.0.1:8080;
    keepalive 64;
    keepalive_timeout 60s;
    keepalive_requests 1000;
}
location / {
    proxy_pass http://api;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
}
```
若不清掉 `Connection` header，會以 close 模式發送無法復用。

### Q45. proxy_buffering on / off 差別？
- `on`（預設）：Nginx 緩衝整個回應再轉客戶端，後端可早早關閉連線。
- `off`：適合 SSE、流式回應、長下載；同時要評估慢客戶端佔用 worker。

### Q46. 大檔案上傳常見設定？
```nginx
client_max_body_size 100m;
client_body_buffer_size 1m;
client_body_temp_path /var/cache/nginx/upload;
proxy_request_buffering off;  # 邊接邊轉，省磁碟
```

---

## 十二、進階主題與生態

### Q47. Tengine、OpenResty、APISIX、Kong 差別？
- Tengine：阿里基於 Nginx 的擴展（健康檢查、動態 upstream）。
- OpenResty：Nginx + LuaJIT，可用 Lua 寫業務。
- APISIX：基於 OpenResty 的雲原生 API Gateway，etcd 配置中心。
- Kong：另一款開源 API Gateway，亦基於 OpenResty。

### Q48. 怎樣動態變更 upstream（不 reload）？
- 商業版 NGINX Plus：API + DNS resolver。
- 開源方案：Tengine `dyups`、`ngx_upstream_jdomain`、Consul + consul-template、APISIX/Kong 的 upstream API。

### Q49. 灰度 / 金絲雀 / 藍綠部署在 Nginx 怎麼實作？
- weight 加權路由。
- header / cookie 透過 `map` 切分流量。
- 兩個 upstream，慢慢調整比例。
- DNS / SLB 再加一層做藍綠切換。

### Q50. CDN 與 Nginx 反向代理的關係？
CDN 通常是「邊緣節點 + 回源 Nginx」。Nginx 在源站可：
- 設快取規則減少回源頻率。
- 管理證書、限流、WAF。
- 統計訪問日誌。

### Q51. 為什麼自簽憑證在瀏覽器會警告但 curl -k 可以？
瀏覽器需信任憑證鏈到根憑證，`curl -k`（insecure）跳過驗證。對內部服務可建立私有 CA 並把根憑證部署到客戶端信任庫。

---

## 參考來源
- [淺談 Nginx 基本配置、負載均衡、緩存和反向代理 - Max 行銷誌](https://www.maxlist.xyz/2020/06/18/flask-nginx/)
- [一篇文章搞定 Nginx 反向代理與負載均衡 - 部落格園](https://www.cnblogs.com/mrhelloworld/p/nginx.html)
- [Nginx 是什麼？認識反向代理、負載平衡 - kucw.io](https://kucw.io/blog/nginx/)
- [Nginx 常見的面試題 - 知乎](https://zhuanlan.zhihu.com/p/272859061)
- [40 道 Nginx 精選面試題 - 二哥的 Java 進階之路](https://javabetter.cn/interview/nginx-40.html)
- [深入理解 http 反向代理（Nginx） - 知乎](https://zhuanlan.zhihu.com/p/464965616)
- [NGINX 高級負載均衡器、Web 伺服器、反向代理 - 部落格園](https://www.cnblogs.com/liugp/p/17950931)
