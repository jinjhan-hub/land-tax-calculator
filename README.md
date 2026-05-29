# 土地增值稅自動試算系統 V1 Skeleton

本專案是土地增值稅自動試算系統的 V1 骨架，提供 Next.js API Routes、Supabase migration、稅務專用物價指數匯入、固定 PDF 模板填入、短效 PDF 下載連結、usage/error log 架構。

## 技術架構

- Next.js + TypeScript
- Vercel API Routes
- Supabase service role server-side client
- `xlsx` 解析稅務專用物價指數 Excel
- `pdf-lib` + `@pdf-lib/fontkit` 填入固定 PDF 模板

本階段不包含 GPTs Actions schema、OCR、多筆土地、人物照、名片圖片處理、政府 CPI 自動同步、完整正式土地增值稅公式驗證。

## 環境變數

請參考 `.env.example`：

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APP_SECRET=
PDF_TOKEN_SECRET=
ADMIN_UPLOAD_TOKEN=
PDF_FONT_PATH=
AUTH_MOCK_MODE=false
```

所有 secret 只從 environment variables 讀取，不寫入 repo。正式部署前必須補上既有店家認證 table 名稱與欄位對應；目前 `validateStoreUser` 只允許在 `NODE_ENV !== "production"` 或 `AUTH_MOCK_MODE=true` 時使用 mock。

## Supabase migration

migration 位於：

```text
supabase/migrations/20260529000000_land_tax_v1_skeleton.sql
```

建立的土地增值稅專用資料表：

- `tax_price_indexes`
- `tax_price_indexes_staging`
- `tax_price_index_import_logs`
- `land_tax_usage_logs`
- `land_tax_error_logs`
- `land_tax_temp_pdf_files`

不建立或覆蓋既有 `stores`、`users`、`usage_logs`、`error_logs`。

## 稅務專用物價指數匯入

API：

```text
POST /api/cpi/upload-excel
Authorization: Bearer sessionToken
X-Admin-Token: ADMIN_UPLOAD_TOKEN
X-File-Name: tax-price-index-source-sample.xls
```

request body 直接放 `.xls` / `.xlsx` / `.csv` 檔案 bytes。系統使用 `xlsx` 讀取 `CPI` sheet，忽略 `年增率` sheet，只解析第 4 列以後、A 欄民國年與 B 到 M 欄 1 至 12 月 index value，N 欄累計平均不匯入。

`year_month` 一律是 5 碼文字 `YYYMM`，例如 `04801`、`09005`、`11301`、`11412`，不得使用 integer。

本 repo 的 sample 檔案目前為：

```text
sample-data/tax-price-index-source-sample.xls.xls
```

## API 測試

登入不需要 session token：

```text
POST /api/auth/login
```

成功後取得短效 `sessionToken`。除 `/api/auth/login` 與 `/api/land-tax/pdf/download?token=...` 外，其他 API 預設都需要：

```text
Authorization: Bearer sessionToken
```

主要 API：

- `POST /api/land-tax/calculate`
- `POST /api/land-tax/pdf`
- `GET /api/land-tax/pdf/download?token=xxx`
- `POST /api/usage-log`
- `POST /api/error-log`

PDF download 不使用 session token，僅驗證短效 download token 的 hash 與 `expires_at`。

## PDF 模板

既有檔案已保留：

```text
public/branding/pacific/logo.png
public/templates/land-tax/pacific-v1.pdf
src/templates/land-tax/pacific-v1.fields.ts
src/templates/land-tax/pacific-v1.fields.json
```

調整座標時修改 `src/templates/land-tax/pacific-v1.fields.ts` 與對應 JSON。PDF 只使用固定模板填入，不使用 Puppeteer、Chromium 或動態排版。

動態欄位可能包含繁體中文，部署環境需透過 `PDF_FONT_PATH` 指定可信任的 CJK 字型檔路徑。不要把字型檔 commit 到 repo，也不要從不可信外部網址即時下載字型。

## Vercel 部署

1. 在 Vercel 設定 `.env.example` 中列出的環境變數。
2. 確認 Supabase migration 已執行。
3. 將 CJK 字型放在部署環境可讀取的位置，並設定 `PDF_FONT_PATH`。
4. 執行 `npm install` 與 `npm run build`。

## 後續待補

- 既有店家認證 table 名稱與欄位對應
- 正式土地增值稅公式與長期持有減徵驗證案例
- GPTs Actions schema
- 政府 Excel 自動同步
