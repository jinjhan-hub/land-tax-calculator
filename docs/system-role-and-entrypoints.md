# 系統定位與入口

## 核心定位

土地增值稅自動試算系統的正式核心是 Vercel API。系統負責店家驗證、土地增值稅試算、PDF 產生、短效 PDF 下載，以及必要的使用紀錄與錯誤紀錄。

主要互動入口是「土地增值稅試算 GPTs」。GPTs 應透過 Actions 呼叫正式 API，並把使用者提供的土地資料整理成 API payload。使用者不應直接操作資料庫，也不應自行組合店家揭露資訊。

## 入口分工

### GPTs

GPTs 是正式使用情境的主要互動入口。

用途：

- 引導使用者輸入分店代碼與分店驗證碼。
- 呼叫登入 API 取得短效 `sessionToken`。
- 整理土地資料並呼叫試算 API。
- 使用試算結果與土地資料呼叫 PDF API。
- 回傳 PDF 下載連結給使用者。
- 依 API `errorCode` 或 login `reason` 提供可理解的修正提示。

不能做：

- 不得自行計算或覆寫土地增值稅公式。
- 不得信任使用者手動輸入的店家揭露資訊。
- 不得要求或保存 authCode 明碼。
- 不得顯示完整 `sessionToken`。
- 不得顯示完整 PDF `downloadUrl` 於紀錄或 debug 內容。
- 不得呼叫管理用 CPI upload API。

### Vercel API

Vercel API 是正式計算與 PDF 產生核心。

用途：

- `/api/auth/login` 驗證 `storeCode + authCode`。
- `/api/land-tax/calculate` 依正式公式與 CPI 指數試算。
- `/api/land-tax/pdf` 產生 PDF，並由後端根據 session 查詢店家 profile。
- `/api/land-tax/pdf/download` 使用短效下載 token 下載 PDF。
- `/api/usage-log` 與 `/api/error-log` 紀錄 GPTs 使用狀況。

不能做：

- 不得公開 service role key、PDF token secret、APP secret。
- 不得接受前端或 GPTs 傳入的店家揭露資訊作為 PDF 正式來源。
- 不得讓未授權 session 呼叫計算、PDF 或 log API。
- 不得把 authCode 明碼寫入資料庫。

### 前端頁面

前端頁面是人工測試、驗收、備用操作入口，不是主要產品介面。

用途：

- 人工驗收登入流程。
- 人工確認店家 profile 回傳。
- 緊急時作為 API 行為檢查入口。

不能做：

- 不應被定位成店家日常作業主入口。
- 不應承載 GPTs 才應處理的對話流程。
- 不應保存或顯示敏感 token。

### 本機 scripts

`scripts/upsert-store-users.mjs` 是私有營運工具，用於從本機 gitignored CSV 產生 scrypt hash 並 upsert `public.store_users`。

不能做：

- 不得內建 authCode 明碼。
- 不得寫死 Supabase service role key。
- 不得提交 credentials CSV。
- 不得將 authCode 明碼寫入 migration、seed 或 GitHub。
