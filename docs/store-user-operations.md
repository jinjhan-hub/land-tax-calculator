# 店家帳號營運

## 原則

正式店家登入採一店一帳號：

- `store_code`：分店代碼。
- `user_code`：固定為 `STORE`。
- `authCode`：只給店家登入使用，不存明碼。
- `auth_code_hash`：資料庫實際保存欄位，格式為 `scrypt$<salt>$<derivedKey>`。

不得：

- 不得把 authCode 明碼寫進程式碼。
- 不得把 authCode 明碼寫進 migration。
- 不得提交 credentials CSV。
- 不得在 GitHub、issue、PR、log 或聊天紀錄貼完整 authCode。
- 不得回傳 `auth_code_hash` 給前端或 GPTs。

## 店家資料欄位

`public.store_users` 應包含：

- `store_code`
- `user_code`
- `auth_code_hash`
- `store_name`
- `brokerage_name`
- `broker_name`
- `broker_license_no`
- `watermark_text`
- `expires_at`
- `is_active`
- `is_test_account`

唯一索引：

```sql
store_code, user_code
```

正式店家帳號的 `user_code` 應為 `STORE`。

## 新增店家帳號

建議流程：

1. 在本機建立 gitignored credentials CSV。
2. CSV 內暫放 authCode 明碼，只限本機短期使用。
3. 使用 `scripts/upsert-store-users.mjs` 產生 scrypt hash 並 upsert Supabase。
4. 匯入完成後刪除或安全保存本機 credentials CSV。
5. 驗證 login API。
6. 驗證 PDF 揭露資訊與浮水印。

`.gitignore` 已涵蓋常見敏感 CSV pattern：

```text
store-user-credentials-*.csv
store-users-private-*.csv
credentials-*.csv
*.credentials.csv
```

## CSV 欄位

建議 CSV header：

```csv
store_code,user_code,authCode,store_name,brokerage_name,broker_name,broker_license_no,watermark_text,expires_at,is_active,is_test_account
```

注意：

- `authCode` 欄位只供 script 產生 hash。
- 若 `user_code` 空白，script 預設使用 `STORE`。
- `watermark_text` 建議明確填入 `{分店名稱} 土地增值稅試算`，避免 fallback 文字因編碼或環境差異出錯。
- `expires_at` 使用 `YYYY-MM-DD`。
- `is_active` 空白時 script 視為啟用。
- `is_test_account` 只有明確填 `true` 時才視為測試帳號。

## script 使用方式

必要環境變數：

```powershell
$env:SUPABASE_URL = "<redacted>"
$env:SUPABASE_SERVICE_ROLE_KEY = "<redacted>"
```

執行方式：

```powershell
node scripts/upsert-store-users.mjs .\store-user-credentials-private.csv
```

或：

```powershell
$env:STORE_USERS_CSV = ".\store-user-credentials-private.csv"
node scripts/upsert-store-users.mjs
```

script 行為：

- 從 CSV 讀取店家資料。
- 對每筆 `authCode` 產生 scrypt hash。
- upsert 到 `public.store_users`。
- 不把 authCode 明碼寫入資料庫。
- 不保存 CSV 副本。

## authCode 重設

重設流程：

1. 產生新的 authCode。
2. 更新本機 gitignored CSV 中該店資料。
3. 執行 upsert script。
4. 通知店家新 authCode。
5. 要求店家使用新 authCode 驗證登入。
6. 刪除或安全保存本機 CSV。

不要：

- 不要查詢或回收舊 authCode 明碼。
- 不要在 Slack、Email 或聊天紀錄貼完整 authCode。
- 不要保留含 authCode 明碼的 seed 檔。

## 到期管理

`expires_at` 控制帳號有效期限。

登入規則：

- `expires_at` 為空：不因日期過期。
- `expires_at >= 今天`：可登入。
- `expires_at < 今天`：登入失敗，reason 為 `store_user_expired`。

延長期限時，只需 upsert 同一 `store_code + user_code` 並更新 `expires_at`。

## 停用帳號

設定：

```text
is_active = false
```

效果：

- login 回傳 401。
- reason 為 `store_user_inactive`。
- 不刪除既有資料。

停用適用於：

- 店家暫停合作。
- authCode 疑似外洩。
- 到期後仍需保留歷史資料。

## 舊測試帳號

若保留舊測試帳號，例如同一 `store_code` 下的非 `STORE` user code，正式登入流程仍不使用它。V1.1 後登入固定查詢：

```text
user_code = STORE
```

不要依賴舊測試帳號做正式驗收。
