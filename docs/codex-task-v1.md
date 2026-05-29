# Codex Task V1

土地增值稅自動試算系統 V1 開發任務文件。

本文件供 Codex 依序開發使用。

## 重要修正與限制

### 1. API 驗證規則修正

`/api/auth/login` 不需要 sessionToken。

`/api/land-tax/pdf/download` 不使用 sessionToken，改用短效 download token 驗證。

其他 API 預設都需要：

Authorization: Bearer sessionToken

### 2. PDF download token

`GET /api/land-tax/pdf/download?token=xxx` 必須：

1. 驗證 token_hash
2. 檢查 expires_at
3. 檢查是否已過期
4. 回傳 PDF
5. 更新 downloaded_at
6. 可刪除該筆 temp_pdf_files

若 token 無效或過期，回傳：

- PDF_TOKEN_INVALID
- PDF_TOKEN_EXPIRED

### 3. 民國年月格式

所有稅務專用物價指數年月統一使用 5 碼文字格式：

YYYMM

規則：

- 民國年補滿 3 碼
- 月份補滿 2 碼

範例：

- 民國48年1月 → 04801
- 民國90年5月 → 09005
- 民國113年1月 → 11301
- 民國114年12月 → 11412

`year_month` 不得使用 integer。

### 4. 稅務專用物價指數 Excel 解析規則

sample 檔案：

sample-data/tax-price-index-source-sample.xls

檔案包含兩個 sheet：

- CPI
- 年增率

本系統只使用 `CPI` sheet，忽略 `年增率` sheet。

CPI sheet 結構：

- 第 2 列：標題與基期說明
- 第 3 列：欄位名稱
- A 欄：民國年
- B 欄至 M 欄：1 月至 12 月 index_value
- N 欄：累計平均，不匯入
- 第 4 列開始：正式資料

解析時：

1. 只解析第 4 列以後
2. A 欄必須是民國年
3. B~M 欄為每月 index_value
4. 空白月份不匯入
5. N 欄累計平均不匯入
6. 說明文字不匯入
7. index_value 是指數值，不是調整倍數

調整倍數在 calculate API 中計算：

taxIndexMultiplier = currentIndexValue / previousIndexValue

### 5. Supabase table 命名修正

因為本專案沿用既有 Supabase Project，為避免和既有銷售圖卡系統的資料表衝突，土地增值稅工具專用紀錄表請使用以下名稱：

- tax_price_indexes
- tax_price_indexes_staging
- tax_price_index_import_logs
- land_tax_usage_logs
- land_tax_error_logs
- land_tax_temp_pdf_files

不要建立或覆蓋既有：

- stores
- users
- usage_logs
- error_logs

除非確認既有 schema 可以共用。

### 6. 管理者上傳稅務指數限制

`POST /api/cpi/upload-excel` 是管理者功能。

請新增環境變數：

ADMIN_UPLOAD_TOKEN=

此 API 必須驗證：

X-Admin-Token: ADMIN_UPLOAD_TOKEN

未提供或不正確時，回傳 401。

未來可改為正式 admin 權限。

### 7. Session token 規則

`POST /api/auth/login` 成功後產生短效 sessionToken。

sessionToken 需包含：

- storeCode
- userCode
- expiresAt

後續 API 寫入 land_tax_usage_logs 或 land_tax_error_logs 時，storeCode 與 userCode 應優先從 sessionToken 取得，不應完全相信 request body。

### 8. Auth mock 限制

`validateStoreUser` 目前可先做 mock adapter，但只允許在以下情況使用：

- NODE_ENV !== "production"
- 或 AUTH_MOCK_MODE=true

若在 production 環境且尚未接上真實店家認證 table，login 必須失敗，不得放行。

請在 README 明確標示：

正式部署前必須補上既有店家認證 table 名稱與欄位對應。

### 9. 中文字型

PDF 動態欄位可能包含繁體中文，例如姓名、店名、地段。

`pdf-lib` 預設標準字型不支援繁體中文。

請使用：

- pdf-lib
- @pdf-lib/fontkit

並透過環境變數指定中文字型：

PDF_FONT_PATH=

限制：

1. 不要把字型檔 commit 到 repo。
2. README 需說明如何在部署環境提供中文字型。
3. 若 PDF_FONT_PATH 缺失，PDF API 應回傳明確錯誤，或只允許測試數字欄位。
4. 不得從不可信外部網址即時下載字型。

### 10. .env.example 需包含

請建立或更新 `.env.example`：

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APP_SECRET=
PDF_TOKEN_SECRET=
ADMIN_UPLOAD_TOKEN=
PDF_FONT_PATH=
AUTH_MOCK_MODE=false

# Codex Task V1｜土地增值稅自動試算系統 Skeleton

## Repository

https://github.com/jinjhan-hub/land-tax-calculator

## 任務目標

請建立土地增值稅自動試算系統 V1 Skeleton。

本階段只做：

1. Next.js + TypeScript 專案架構
2. Supabase migration
3. API Routes 骨架
4. 稅務專用物價指數匯入架構
5. PDF 固定模板填入架構
6. 短效 PDF 下載連結
7. usage_logs / error_logs 架構
8. README 更新

本階段不要做：

1. GPTs Actions schema
2. OCR
3. 多筆土地
4. 人物照
5. 名片圖片處理
6. 政府 CPI 自動同步
7. 完整正式土地增值稅公式驗證

---

## 現有檔案

請保留既有檔案，不要覆蓋：

```text
public/branding/pacific/logo.png
public/templates/land-tax/pacific-v1.pdf
src/templates/land-tax/pacific-v1.fields.ts
src/templates/land-tax/pacific-v1.fields.json
sample-data/tax-price-index-source-sample.xls
README.md
```

如果檔名略有不同，請先檢查 repo 內實際檔名，再沿用現有檔案。

---

## 技術要求

使用：

```text
Next.js
TypeScript
Vercel API Routes
Supabase
pdf-lib
xlsx
```

PDF 產製：

```text
使用固定 PDF 模板填入
不得使用 Puppeteer
不得使用 Chromium
不得做動態排版
不得處理人物照
```

---

## 環境變數

請建立 `.env.example`：

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APP_SECRET=
PDF_TOKEN_SECRET=
```

注意：

1. 不要把任何 secret 寫進 repo
2. 不要要求我提供 service role key
3. Vercel 已有 `SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY`
4. 程式直接讀取：

```ts
process.env.SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY
```

---

## Supabase Project

目前沿用既有 Supabase Project：

```text
https://wzwkosbcvfnafusnnngx.supabase.co
```

但不要把這個寫死在程式裡。
只能從環境變數讀取。

---

## Supabase Migration

請新增 migration。

不要建立新的 `stores` / `users` table。
本專案未來要沿用既有店家認證資料。

請新增以下 tables：

### tax_price_indexes

欄位：

```text
id
year_month text unique not null
roc_year integer not null
month integer not null
index_value numeric(12,4) not null
source_file_name text
source_file_hash text
source_note text
imported_at timestamptz
created_at timestamptz
updated_at timestamptz
```

注意：

```text
year_month 使用民國年月，例如 11301、11302、11412
index_value 是消費者物價指數值
不是調整倍數
```

調整倍數由 calculate API 用：

```text
currentIndexValue / previousIndexValue
```

計算得出。

---

### tax_price_indexes_staging

欄位：

```text
id
batch_id text not null
year_month text not null
roc_year integer not null
month integer not null
index_value numeric(12,4) not null
source_file_name text
source_file_hash text
created_at timestamptz
```

---

### cpi_sync_logs

欄位：

```text
id
batch_id text
sync_type text
source_file_name text
source_file_hash text
row_count integer
latest_year_month text
success boolean
error_message text
created_at timestamptz
```

---

### usage_logs

欄位：

```text
id
store_code text
user_code text
tool_name text
action_name text
success boolean
formula_version text
used_at timestamptz
```

限制：

```text
不得保存土地資料
不得保存名片資料
不得保存圖片
不得保存 PDF
```

---

### error_logs

欄位：

```text
id
store_code text
user_code text
tool_name text
session_id text
stage text
error_code text
error_message text
gpts_note text
created_at timestamptz
```

限制：

```text
不得保存土地地址
不得保存地號
不得保存姓名
不得保存手機
不得保存名片內容
不得保存圖片
不得保存 PDF
gpts_note 最多 300 字
stage 與 error_code 使用固定白名單
```

---

### temp_pdf_files

欄位：

```text
id
token_hash text unique not null
encrypted_pdf_data text not null
expires_at timestamptz not null
created_at timestamptz
downloaded_at timestamptz
```

限制：

```text
PDF 只保存 15 分鐘
下載後可刪除
過期資料可清除
不永久保存 PDF
不保存土地資料明文
不保存名片資料明文
```

---

## 店家認證 Adapter

請建立：

```text
src/lib/auth/store-auth.ts
```

內容建立：

```ts
validateStoreUser({
  storeCode,
  userCode,
  authCode
})
```

目前不要猜測既有 Supabase 店家認證 table 名稱。
先做成 TODO adapter 或 mock adapter。

README 需註明：

```text
後續需補上既有店家認證 table 名稱與欄位對應。
```

---

## API Routes

請建立以下 API：

```text
POST /api/auth/login
POST /api/cpi/upload-excel
POST /api/land-tax/calculate
POST /api/land-tax/pdf
GET  /api/land-tax/pdf/download
POST /api/usage-log
POST /api/error-log
```

除 `/api/auth/login` 外，其他 API 都要驗證：

```text
Authorization: Bearer sessionToken
```

---

## POST /api/auth/login

輸入：

```json
{
  "storeCode": "CH006",
  "userCode": "USER001",
  "authCode": "xxxx"
}
```

成功回傳：

```json
{
  "success": true,
  "sessionToken": "short-lived-token",
  "expiresAt": "ISO datetime",
  "storeCode": "CH006",
  "userCode": "USER001"
}
```

目前 `validateStoreUser` 可以先 mock，但架構要完整。

---

## POST /api/cpi/upload-excel

用途：

上傳稅務專用物價指數 Excel / CSV。

支援：

```text
.xls
.xlsx
.csv
```

本 repo 內有 sample 檔：

```text
sample-data/tax-price-index-source-sample.xls
```

解析規則：

1. 使用 `xlsx` 套件
2. 讀取 `CPI` sheet
3. 忽略 `年增率` sheet
4. 解析「消費者物價指數銜接表」
5. 指數基期為民國 110 年 = 100
6. 第一欄是民國年
7. 第 1 月至第 12 月為每月 `index_value`
8. 空白月份不要匯入
9. 說明文字不要匯入
10. `year_month` 格式為民國年 + 月份兩碼，例如：

```text
11301
11302
11412
```

匯入流程：

```text
讀取 Excel
→ 解析 CPI sheet
→ 寫入 tax_price_indexes_staging
→ 驗證格式
→ 驗證成功後 upsert 到 tax_price_indexes
→ 寫入 cpi_sync_logs
```

驗證條件：

```text
year_month 格式正確
index_value 為正數
不重複年月
至少有一筆資料
```

不得把原始 Excel 永久保存到 Supabase。

---

## POST /api/land-tax/calculate

輸入：

```json
{
  "landArea": 0,
  "ownershipNumerator": 1,
  "ownershipDenominator": 1,
  "previousTransferYearMonth": "11301",
  "currentTransferYearMonth": "11401",
  "previousDeclaredValuePerSqm": 0,
  "currentDeclaredValuePerSqm": 0,
  "improvementCost": 0,
  "landReadjustmentCost": 0,
  "engineeringBenefitFee": 0
}
```

不可接收：

```text
isSelfUseResidential
```

API 需查 `tax_price_indexes`：

```text
previousIndexValue
currentIndexValue
```

計算：

```text
taxIndexMultiplier = currentIndexValue / previousIndexValue
```

土地漲價總數額概念：

```text
currentTotalValue
- adjustedPreviousTotalValue
- improvementCost
- landReadjustmentCost
- engineeringBenefitFee
```

如果：

```text
taxableIncrement <= 0
```

稅額回傳 0。

請將計算邏輯獨立在：

```text
src/lib/land-tax/calculate.ts
```

回傳格式：

```json
{
  "success": true,
  "formulaVersion": "land-tax-v1.0.0",
  "previousIndexValue": 0,
  "currentIndexValue": 0,
  "taxIndexMultiplier": 0,
  "taxableIncrement": 0,
  "generalTaxResult": {
    "estimatedTax": 0,
    "rateNote": "一般用地稅率試算"
  },
  "selfUseTaxResult": {
    "estimatedTax": 0,
    "rateNote": "自用住宅優惠稅率 10% 情境試算"
  }
}
```

注意：

正式一般稅率與長期持有減徵規則如果無法完全確認，請用 TODO 標示。
不要自行猜測稅務規則。
但請保留 module、input、output、單元測試架構。

---

## POST /api/land-tax/pdf

用途：

使用固定 PDF 模板填入資料，產生短效下載連結。

模板路徑：

```text
public/templates/land-tax/pacific-v1.pdf
```

欄位座標：

```text
src/templates/land-tax/pacific-v1.fields.ts
```

輸入：

```json
{
  "confirmedLandData": {},
  "calculationResult": {},
  "businessCardData": {
    "agentName": "",
    "phone": "",
    "storeName": ""
  }
}
```

PDF 不放人物照。

PDF API 不得接收：

```text
圖片
base64
名片圖片 URL
openaiFileIdRefs
portraitAvailable
portraitCropArea
```

PDF 產出後不要直接回傳 binary。

回傳：

```json
{
  "success": true,
  "downloadUrl": "https://your-domain.vercel.app/api/land-tax/pdf/download?token=xxxx",
  "expiresInMinutes": 15
}
```

PDF 暫存在 `temp_pdf_files`。

要求：

```text
PDF 加密保存
15 分鐘過期
下載後可刪除
不永久保存 PDF
不保存土地資料明文
不保存名片資料明文
```

---

## GET /api/land-tax/pdf/download

格式：

```text
GET /api/land-tax/pdf/download?token=xxx
```

功能：

1. 驗證 token
2. 檢查是否過期
3. 回傳 PDF
4. 下載成功後更新 `downloaded_at`
5. 可刪除該筆 `temp_pdf_files`

若 token 過期或不存在，回傳錯誤。

---

## POST /api/usage-log

輸入：

```json
{
  "storeCode": "CH006",
  "userCode": "USER001",
  "toolName": "land_tax_calculator",
  "actionName": "calculate_land_tax",
  "success": true,
  "formulaVersion": "land-tax-v1.0.0"
}
```

不得輸入土地資料、名片資料、圖片或 PDF。

actionName 範例：

```text
login
upload_tax_price_index
calculate_land_tax
generate_pdf
```

---

## POST /api/error-log

輸入：

```json
{
  "storeCode": "CH006",
  "userCode": "USER001",
  "toolName": "land_tax_calculator",
  "sessionId": "xxx",
  "stage": "CALCULATE",
  "errorCode": "TAX_INDEX_NOT_FOUND",
  "errorMessage": "查無稅務專用物價指數。",
  "gptsNote": "前次移轉年月查無資料。"
}
```

限制：

```text
不得保存土地資料
不得保存地址
不得保存地號
不得保存姓名
不得保存手機
不得保存名片內容
不得保存圖片
不得保存 PDF
```

---

## PDF 填入要求

使用 `pdf-lib`。

不得使用 Puppeteer / Chromium。

動態欄位：

土地資料：

```text
landSection
landNumber
landArea
ownershipRange
```

試算依據：

```text
previousTransferYearMonth
previousDeclaredValuePerSqm
currentDeclaredValuePerSqm
taxIndexMultiplier
```

試算結果：

```text
taxableIncrement
generalEstimatedTax
selfUseEstimatedTax
```

聯絡資訊：

```text
agentName
phone
storeName
```

其他：

```text
generatedAt
```

注意：

1. 模板已有靜態中文標題
2. 動態中文文字需要載入支援繁體中文的字型
3. 不要把字型檔 commit 到 repo
4. README 需說明部署時如何提供中文字型

---

## 錯誤代碼

建立固定錯誤代碼：

```text
AUTH_FAILED
TAX_INDEX_UPLOAD_FAILED
TAX_INDEX_PARSE_FAILED
TAX_INDEX_NOT_FOUND
LAND_FIELD_MISSING
CALCULATION_FAILED
PDF_GENERATION_FAILED
PDF_TOKEN_EXPIRED
PDF_TOKEN_INVALID
VERCEL_API_TIMEOUT
UNKNOWN_ERROR
```

使用者選擇不產生 PDF 不算錯誤，不要寫入 `error_logs`。

---

## README 更新

請更新 README，包含：

1. 專案目標
2. 技術架構
3. 環境變數
4. Supabase migration 執行方式
5. 稅務專用物價指數 .xls / .xlsx / .csv 匯入方式
6. API 測試方式
7. PDF 模板欄位座標修改方式
8. Vercel 部署方式
9. 後續待補項目：

   * 既有店家認證 table 名稱與欄位
   * 正式土地增值稅公式驗證案例
   * GPTs Actions schema
   * 政府 Excel 自動同步

---

## 驗收標準

完成後需達成：

1. 專案可 `npm install`
2. 專案可 `npm run build`
3. 保留現有 PDF 模板與座標設定
4. 可匯入 `.xls` 稅務專用物價指數
5. 匯入後資料寫入 `tax_price_indexes`
6. calculate API 可依 `previousTransferYearMonth` 與 `currentTransferYearMonth` 查 `index_value`
7. calculate API 可計算 `taxIndexMultiplier`
8. calculate API 回傳一般用地與自用住宅情境兩組結果
9. PDF API 可使用固定模板填入資料
10. PDF API 回傳短效 `downloadUrl`
11. PDF download API 可下載 PDF
12. usage_logs 不保存土地資料或名片資料
13. error_logs 不保存土地資料、名片內容、圖片或 PDF
14. 不建立或覆蓋既有店家認證資料表
15. 所有 secrets 都只從 environment variables 讀取，不寫入 repo
