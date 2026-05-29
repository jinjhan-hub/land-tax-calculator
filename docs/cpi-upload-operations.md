# V1.6 tax_price_indexes 正式資料匯入與管理

本文件用於土地增值稅自動試算系統 V1.6，管理 public.tax_price_indexes 正式稅務用物價指數資料匯入、驗證與 smoke test。

本階段只處理稅務用物價指數資料，不修改土地增值稅公式，不修改 PDF 版型，不修改 GPTs wrapper 流程。

## 1. 適用範圍

適用 endpoint：
- POST /api/cpi/upload-excel
- POST /api/land-tax/calculate
- POST /api/gpts/calculate

相關資料表：
- public.tax_price_indexes
- public.tax_price_indexes_staging
- public.tax_price_index_import_logs

不處理：
- 不修改土地增值稅公式
- 不新增 agents 表
- 不修改 real-estate-card-api
- 不提交 authCode、sessionToken、downloadUrl、PDF 或測試 JSON

## 2. tax_price_indexes 正式表

正式計算 API 只查 public.tax_price_indexes。

主要欄位：
- year_month：民國年月 5 碼文字，格式 YYYMM，例如 04801、11001、11505
- roc_year：民國年
- month：月份，1 到 12
- index_value：稅務用物價指數
- source_file_name：匯入來源檔名
- source_file_hash：匯入來源檔案 SHA-256
- source_note：來源備註，目前 API 寫入 admin_upload
- imported_at：匯入時間

year_month 有 unique constraint，因此同一年月只會有一筆正式資料。

## 3. Excel 格式

目前 parser 使用 xlsx 讀取 Excel。

必要格式：
- sheet 名稱必須為 CPI
- 第 1 列：標題或說明
- 第 2 列：欄位名稱
- 第 3 列開始：正式資料
- A 欄：民國年
- B 到 M 欄：1 到 12 月指數
- N 欄：累計平均，不匯入

目前 sample 檔案：sample-data/tax-price-index-source-sample.xls.xls

sample 檔案解析範圍：04801 到 11504，共 808 筆。

## 4. 匯入 API

endpoint：POST /api/cpi/upload-excel

必要 headers：
- Authorization: Bearer <sessionToken>
- X-Admin-Token: <ADMIN_UPLOAD_TOKEN>
- X-File-Name: <source-file-name>

request body：Excel 檔案 raw bytes。

注意：此 API 不接 JSON。bodyParser 已關閉，必須直接送 Excel 檔案本體。

## 5. 匯入流程

API 流程：
requireSession -> requireAdminUploadToken -> readRawBody -> calculate sourceFileHash -> generate batchId -> parseTaxPriceIndexWorkbook -> insert tax_price_indexes_staging -> upsert tax_price_indexes on year_month -> insert tax_price_index_import_logs

正式表使用 upsert：
- 同一 year_month 已存在：更新
- 同一 year_month 不存在：新增

因此正式匯入可重跑，不需要先清空 tax_price_indexes。

## 6. Production 匯入前檢查

在 Supabase SQL Editor 先查：

select count(*) as total_count from public.tax_price_indexes;

select year_month, index_value, source_file_name, imported_at from public.tax_price_indexes order by year_month;

select * from public.tax_price_index_import_logs order by created_at desc limit 5;

目前 V1.5 production 已知只有測試資料：
- 11001 = 100
- 11505 = 110

匯入前應保留查詢結果截圖或匯出 CSV。

## 7. 匯入操作摘要

先用 POST /api/auth/login 取得 sessionToken。

再用 POST /api/cpi/upload-excel 匯入 Excel，headers 必須包含 Authorization、X-Admin-Token、X-File-Name。

預期 sample 匯入結果：
- success = True
- rowCount = 808
- latestYearMonth = 11504

## 8. 匯入後 SQL 驗證

select count(*) as total_count from public.tax_price_indexes;

select min(year_month) as first_year_month, max(year_month) as latest_year_month from public.tax_price_indexes;

select year_month, index_value, source_file_name, imported_at from public.tax_price_indexes where year_month in ('04801', '04812', '04901', '11001', '11504', '11505') order by year_month;

select * from public.tax_price_index_import_logs order by created_at desc limit 5;

注意：如果正式 Excel 只到 11504，則 11505 可能仍保留 V1.5 測試資料。正式匯入前應確認是否要保留或清除 11505 測試資料。

## 9. tax index smoke test

匯入前若 production 只有 11001 與 11505：
- 11001 -> 11505：成功
- 11001 -> 11301：TAX_INDEX_NOT_FOUND
- 04801 -> 11504：TAX_INDEX_NOT_FOUND

匯入後若正式 Excel 匯入 04801 到 11504：
- 04801 -> 11504：成功
- 04901 -> 11504：成功
- 11001 -> 11504：成功
- 11001 -> 11301：成功
- 99912 -> 11504：TAX_INDEX_NOT_FOUND

## 10. TAX_INDEX_NOT_FOUND GPTs 回覆規則

當 /api/gpts/calculate 回傳 errorCode = TAX_INDEX_NOT_FOUND 時，GPTs 不可繼續呼叫 prepare-pdf。

建議回覆：
目前無法完成試算，因為系統查不到指定年月的稅務用物價指數。請確認前次移轉年月與本次移轉年月是否正確；若年月正確，代表後台尚未匯入該月份指數資料。這不是土地增值稅公式錯誤，而是物價指數資料尚未建檔。

## 11. 安全注意事項

禁止提交到 Git：
- authCode
- sessionToken
- ADMIN_UPLOAD_TOKEN
- downloadUrl
- PDF 檔案
- production 測試 JSON
- 含敏感資訊的匯入檔案

正式匯入前務必確認：
- Excel 來源為稅務用物價指數
- 不是一般新聞 CPI
- 不是年增率 sheet
- CPI sheet 名稱正確
- A 欄民國年正確
- B 到 M 欄月份指數正確
- N 欄累計平均不匯入

## 12. V1.6 驗收條件

- parseTaxPriceIndexWorkbook 可解析 sample Excel 04801 到 11504
- 本機 npm.cmd test 通過
- 本機 npm.cmd run build 通過
- production 匯入後 tax_price_indexes 筆數正確
- tax_price_index_import_logs 有成功紀錄
- /api/land-tax/calculate 可使用非測試年月成功計算
- /api/gpts/calculate 可使用非測試年月成功計算
- TAX_INDEX_NOT_FOUND 仍能正確回傳
