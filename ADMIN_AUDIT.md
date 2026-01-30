# Admin 後台盤點（Admin Audit）

本報告依「只讀分析」產出：僅掃描專案中的 HTML/CSS/JS 與 Cloudflare Functions 原始碼；未改動任何既有檔案內容。若遇到疑似金鑰/密碼/Token 等敏感值，本報告僅描述其「存在的環境變數名稱」並以 `***` 遮罩其值。

## 先行說明：本次掃描範圍

### 目錄
- `admin/`：後台頁面（靜態 HTML）
- `js/`：後台頁面腳本（`admin-*.inline-*.js`）、共用殼（`admin-shell.js`）、驗證（`admin-guard.js` / `auth.js`）
- `css/`：後台頁面樣式（`admin-*.inline-*.css`）
- `functions/`：Cloudflare Worker/Pages Functions（主要 API 與後台權限 gate）

### 檔案類型
- `*.html`, `*.css`, `*.js`
- Cloudflare Functions：`functions/[[path]].handler.js`, `functions/_scheduled.js`

---

## 1) 專案技術棧判定

### 前端框架 / 路由方案
- **路由**：以「多頁靜態 HTML」為主（例如 `admin/*.html`、`index.html`、`shop.html`），由瀏覽器以傳統 page navigation 方式切頁。
- **前端框架**：未發現 React/Vue/Next/Nuxt 等框架依賴（專案根目錄無 `package.json` / `next.config.*` / `vite.config.*` 等典型檔案）。
- **後台 UI**：每個後台頁面各自載入對應的 `js/admin-xxx.inline-2.js`，並由 `js/admin-shell.js` 注入側邊欄殼（Admin Shell）。

### UI library
- 未發現 AntD/MUI/Bootstrap/Tailwind 等明確 UI library。
- 後台 UI 主要靠自訂 CSS（`admin/admin-ui.css` + `css/admin-*.inline-1.css`）。
- Dashboard 圖表使用 **Chart.js**（透過 CDN `chart.js@4.4.1`）。

### 後端框架
- **Cloudflare Workers / Pages Functions**：`functions/[[path]].handler.js` 為單一大型 handler，內含路由分支處理（以 `pathname === '/api/...'` 判斷）。
- API 型態以 **REST**（JSON over HTTP）為主（例如 `/api/admin/dashboard`、`/api/products`、`/api/orders` 等）。

### 認證方式
- **管理員（Admin）**：
  - 使用 `admin_session` Cookie（HTTPOnly, Secure, SameSite=Lax）作為管理員 session。
  - Admin OAuth：`/api/auth/google/admin/start` → `/api/auth/google/admin/callback`。
  - 允許 **Header key**：`X-Admin-Key`（比對環境變數 `ADMIN_KEY`）作為替代 admin 驗證方式。
- Admin 白名單：`ADMIN_ALLOWED_EMAILS`（只允許特定 email 登入管理後台）。

---

## Owner Step-Up 2FA（TOTP）
- 設定 `ADMIN_OWNER_TOTP_SECRET_BASE32` 為 Base32 TOTP 密鑰（Authenticator App）。
- 可選：設定 `ADMIN_OWNER_EMAIL`，只針對該 email 強制 2FA。
- 預設有效時間 10 分鐘（可用 `ADMIN_2FA_TTL_SEC` 覆蓋）。
- 若 `ADMIN_OWNER_TOTP_SECRET_BASE32` 缺失，Owner 寫入會直接拒絕（fail-closed）。
  - Admin session secret：`ADMIN_JWT_SECRET` 或 `SESSION_SECRET`（值以 `***` 遮罩）。
- **一般會員（User）**：
  - 另有一般 Google/LINE 登入流程（`/api/auth/google/login`、`/api/auth/line/login` 等），本報告聚焦 admin 後台，僅描述存在。

### API 型態
- REST（JSON 回傳；部分 export/download 以檔案輸出）。

---

## 2) 後台入口與路由地圖（最重要）

### 後台 base path
- **Base path**：`/admin`
- Gate：`functions/[[path]].handler.js` 在 `GET/HEAD` 訪問 `/admin` 或 `/admin/*` 時會先 `isAdmin()`，未通過則 **302 轉向** `'/api/auth/google/admin/start?redirect=...'`。

### 路由樹狀結構（頁面）

- `/admin`（總覽 Dashboard）
  - 檔案：`admin/index.html`
  - JS：`js/admin-index.inline-2.js`、殼：`js/admin-shell.js`
  - 主要 API：`/api/admin/dashboard`、`/api/admin/track-stats`、`/api/admin/food-stats`、`/api/admin/temple-stats`

- `/admin/orders`（訂單管理）
  - 檔案：`admin/orders.html`
  - JS：`js/admin-orders.inline-2.js`
  - 主要 API：`/api/orders`、`/api/order/status`、`/api/orders/export`、`/api/order/qna`、`/api/admin/qna/unread`、`/api/admin/cron/release-holds`

- `/admin/products`（商品管理）
  - 檔案：`admin/products.html`
  - JS：`js/admin-products.inline-2.js`
  - 主要 API：`/api/products`、`/api/products/:id`、`/api/upload`、`/api/deleteFile`

- `/admin/service-orders`（服務訂單）
  - 檔案：`admin/service-orders.html`
  - JS：`js/admin-service-orders.inline-2.js`
  - 主要 API：`/api/service/orders`、`/api/service/order/status`、`/api/service/orders/export`、`/api/service/order/result-photo`、`/api/upload`

- `/admin/service-products`（服務商品）
  - 檔案：`admin/service-products.html`
  - JS：`js/admin-service-products.inline-2.js`
  - 主要 API：`/api/service/products`、`/api/upload`

- `/admin/members`（會員管理）
  - 檔案：`admin/members.html`
  - JS：`js/admin-members.inline-2.js`
  - 主要 API：`/api/admin/users`、`/api/admin/users/reset-guardian`、`/api/admin/users/delete`、`/api/admin/users/creator-invite`、`/api/admin/creator/invite`

- `/admin/coupons`（優惠券）
  - 檔案：`admin/coupons.html`
  - JS：`js/admin-coupons.inline-2.js`
  - 主要 API：`/api/coupons/issue`、`/api/coupons/issue-batch`、`/api/coupons/list`

- `/admin/code-viewer`（留言管理）
  - 檔案：`admin/code-viewer.html`
  - JS：`js/admin-code-viewer.inline-2.js`
  - 主要 API：`/api/stories?code=...`（含 `_method=DELETE` 刪除留言）、`/api/products`、`/api/service/products`

### 路由樹狀結構（後台相關 API）

後台 API 主要集中在 `functions/[[path]].handler.js`：
- `/api/auth/google/admin/start`
- `/api/auth/google/admin/callback`
- `/api/auth/admin/me`
- `/api/admin/dashboard`
- `/api/admin/track-stats`
- `/api/admin/food-stats`
- `/api/admin/temple-stats`
- `/api/admin/users`
- `/api/admin/users/reset-guardian`
- `/api/admin/users/delete`
- `/api/admin/users/creator-invite`
- `/api/admin/creator/invite`
- `/api/admin/qna/unread`
- `/api/admin/cron/update-dashboard`
- `/api/admin/cron/release-holds`

完整樹狀結構已輸出至 `routes.json`。

---

## 3) 功能模組盤點（電商常見模組）

### Orders（訂單）
- 主要頁面
  - `/admin/orders` → `admin/orders.html`
- 主要 API 呼叫點
  - 前端：`js/admin-orders.inline-2.js`
  - 後端：`functions/[[path]].handler.js`
  - API：
    - `GET /api/orders?limit=...`
    - `POST /api/order/status`（更新狀態）
    - `GET /api/orders/export?ids=...`（匯出）
    - `GET/POST /api/order/qna`（訂單問答）
    - `POST /api/admin/cron/release-holds`（釋放保留單/維運）
    - `POST /api/admin/qna/unread`（未讀數更新/清零）
- 功能推定（依前端程式）
  - 列表、狀態更新、問答、proof/收據/照片檢視（`/api/proof*`）
  - 匯出（下載）
- 高風險操作
  - 狀態更新（付款/出貨/完成）
  - 匯出（個資/交易資料）
  - cron 操作（釋放保留單）

### Products（商品）
- 主要頁面
  - `/admin/products` → `admin/products.html`
- 主要 API 呼叫點
  - 前端：`js/admin-products.inline-2.js`
  - 後端：`functions/[[path]].handler.js`（`/api/products` 路由）
  - API：
    - `GET /api/products`
    - `POST /api/products`
    - `GET/PUT/PATCH/DELETE /api/products/:id`
    - `POST /api/upload`、`POST /api/deleteFile`
- 功能推定
  - 列表、編輯、庫存/價格、上傳圖片、刪除商品
- 高風險操作
  - 商品刪除/修改、檔案刪除

### Service Orders（服務訂單）
- 主要頁面
  - `/admin/service-orders` → `admin/service-orders.html`
- 主要 API 呼叫點
  - 前端：`js/admin-service-orders.inline-2.js`
  - API：
    - `GET /api/service/orders`
    - `POST /api/service/order/status`
    - `GET /api/service/orders/export`
    - `POST /api/service/order/result-photo`
    - `POST /api/upload`
- 高風險操作
  - 更新狀態、匯出、上傳結果照片

### Service Products（服務商品）
- 主要頁面
  - `/admin/service-products` → `admin/service-products.html`
- 主要 API 呼叫點
  - 前端：`js/admin-service-products.inline-2.js`
  - API：`/api/service/products`（含刪除）、`/api/upload`
- 高風險操作
  - 服務商品刪除/修改

### Content（內容/留言）
- 主要頁面
  - `/admin/code-viewer` → `admin/code-viewer.html`
- 主要 API 呼叫點
  - 前端：`js/admin-code-viewer.inline-2.js`
  - API：`GET /api/stories?code=...`、`...&_method=DELETE`（刪除）
- 高風險操作
  - 內容刪除（對外展示與信任影響）

### Customers（會員/顧客）
- 主要頁面
  - `/admin/members` → `admin/members.html`
- 主要 API 呼叫點
  - 前端：`js/admin-members.inline-2.js`
  - API：`/api/admin/users*`
- 高風險操作
  - 刪除會員、重置守護神、創作者邀請（權限邊界）

### Marketing（優惠券/促銷）
- 主要頁面
  - `/admin/coupons` → `admin/coupons.html`
- 主要 API 呼叫點
  - 前端：`js/admin-coupons.inline-2.js`
  - API：`/api/coupons/issue`、`/api/coupons/issue-batch`、`/api/coupons/list`
- 高風險操作
  - 發券/批次發券（營收風險）

### Analytics（報表/監控）
- 主要頁面
  - `/admin` → Dashboard（含多種 trend chart）
- 主要 API 呼叫點
  - `/api/admin/dashboard`
  - `/api/admin/track-stats`
  - `/api/admin/food-stats`
  - `/api/admin/temple-stats`
- 高風險操作
  - 匯出/下載型報表（若後續新增）

### Settings（系統設定）
- 後台目前未看到獨立的 settings 頁面（例如金流/物流設定 UI）。
- 設定多集中在 **環境變數**（Cloudflare Workers env）中，由程式讀取（例如 OAuth、Admin Key、CORS origins、Cron secret 等）。

---

## 4) 權限與驗證現況（RBAC 現況）

### 是否存在 role/permission 資料結構？
- 後台是「單一 admin 角色」模型：
  - `ADMIN_ALLOWED_EMAILS` 白名單
  - `admin_session` 驗證後視為 admin
  - 部分寫入 API 使用 `requireAdminWrite()`（同時驗證 admin 身分 + origin）
- 未看到資料層上的 **RBAC（角色/權限矩陣）**（例如 roles/permissions 表或 ACL 設計）。

### 權限檢查出現在哪裡？
- 後端（強制）：
  - `functions/[[path]].handler.js`：
    - `isAdmin()`：cookie 或 `X-Admin-Key`
    - `requireAdminWrite()`：admin + origin 限制
    - `/admin*` 的 GET/HEAD gate（未登入即 redirect）
- 前端（輔助）：
  - `js/admin-guard.js`：在頁面載入後呼叫 `/api/auth/admin/me`，未通過則導去 admin OAuth start。
  - `js/admin-shell.js`：純 UI 殼，不負責權限。
  - `js/auth.js`：同時維護一般使用者與 admin 的狀態（包含 `refreshAdmin()` 呼叫 `/api/auth/admin/me`）。

### 常見權限關鍵字與關鍵檔案（Top 10）
- `functions/[[path]].handler.js`（admin gate、isAdmin、requireAdminWrite、admin OAuth）
- `js/admin-guard.js`（後台頁 guard）
- `js/admin-shell.js`（後台殼與導覽）
- `js/auth.js`（前台/後台登入狀態整合）
- `js/admin-members.inline-2.js`（會員管理高風險操作 UI）
- `js/admin-products.inline-2.js`（商品 CRUD）
- `js/admin-orders.inline-2.js`（訂單狀態/匯出）
- `js/admin-coupons.inline-2.js`（發券/批次發券）
- `js/admin-service-orders.inline-2.js`（服務訂單狀態/匯出）
- `js/admin-code-viewer.inline-2.js`（刪除留言/故事）

### 若要導入 RBAC，最適合插入的位置（漸進式）
- **後端優先**：`functions/[[path]].handler.js` 的 `requireAdminWrite()` / `isAdmin()` 後面加一層 `requirePermission(action)`：
  - 先用「email → permissions」mapping（env 或 KV），不改 DB schema 也能漸進落地。
  - 再逐步把敏感 API（delete/export/status）掛上更細的 permission。
- **前端輔助**：`js/admin-shell.js` 根據 `/api/auth/admin/me` 回傳的 claims（若未來擴充）顯示/隱藏入口（但不能取代後端檢查）。

---

## 5) 高風險操作清單（後端必須強制權限）

已整理於 `risk_actions.json`，涵蓋：
- delete（商品/會員/內容）
- export/download（訂單匯出）
- order_mgmt（狀態更新）
- file_upload/delete（上傳與刪檔）
- marketing（發券/批次發券）
- cron/維運（update-dashboard、release-holds）
- settings/auth（admin key、admin OAuth、cron key）

---

## 6) 可漸進式重構切入點（不影響現有功能）

### 建議方式：沿用既有「Admin Shell」作為包殼
此專案已存在 `js/admin-shell.js`（注入 sidebar/topbar），最小風險路線：
- 先把「頁面視覺一致性 / 導覽一致性」集中在 Shell
- 各頁功能暫不動（維持現有 inline scripts）

### 可先做「包殼 UI」不動功能的頁面
1) `/admin` Dashboard：把卡片、圖表區塊、Loading/error presentation 先標準化
2) `/admin/orders`、`/admin/products`：把列表 toolbar/filter/pagination 的 UI 統一（不碰 API）
3) `/admin/members`：把危險按鈕（刪除/重置）加上同版型的二次確認 UI（不改 API）

### 適合優先重寫（通常收益最高）
1) Orders list：filter/search、狀態批次更新、匯出與審計
2) Products list：批次上下架、庫存/價格編輯、媒體管理
3) Users/Permissions：如果未來要多人管理，RBAC 與操作審計是核心
4) Dashboard widgets：集中化資料讀取與 chart config，避免每頁各寫一套

### 回滾策略（快速切回舊後台）
因為目前是靜態頁：
- 最快回滾：保留舊版 HTML/JS，透過 `_redirects` 或 Cloudflare 版控切換入口路由指向（例如 `/admin` 指到 `/admin-legacy`）。
- 逐步上線：以 query flag 或 cookie 決定載入新版 shell（例如 `?shell=v2`），若出問題可立即停用。
- API 端：維持相同 endpoint，不改 contract，確保 UI 回退不影響資料。

---

## 不確定性與缺口

- 未找到後台的「Settings（金流/物流）」專頁；推測多以環境變數/程式內設定為主，沒有 UI 管理介面。
- 未找到 `fortune-stats` 的後台頁面檔案（`admin/fortune-stats.html` 不存在），但後端仍存在 `/api/admin/fortune-stats` endpoint（可能是舊功能殘留）。
- 專案未提供 package manager 設定（無 `package.json`），因此無法判定是否曾經使用 bundler/TS；目前觀察為手寫 Vanilla JS 與 Cloudflare Functions。
