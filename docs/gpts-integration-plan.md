# GPTs 串接計畫

## 整體流程

GPTs 的正式流程固定為：

1. `login`
2. `calculate`
3. `pdf`
4. `download`

GPTs 應先取得合法 `sessionToken`，再呼叫所有需要授權的 API。PDF 產出時，店家揭露資訊與浮水印由後端根據 session 查詢，不由 GPTs 或使用者提供。

## Step 1：登入

Endpoint：

```text
POST /api/auth/login
```

Request body：

```json
{
  "storeCode": "CH006",
  "authCode": "<redacted>"
}
```

成功後 GPTs 可保存於本輪對話上下文：

- `sessionToken`
- `store.storeCode`
- `store.storeName`
- `store.brokerageName`
- `store.brokerName`
- `store.brokerLicenseNo`
- `store.watermarkText`
- `store.expiresAt`

使用原則：

- `authCode` 只用於登入，不得再回顯。
- `sessionToken` 短效，預設 30 分鐘。
- `sessionToken` 不應出現在使用者可見訊息、log 或錯誤回報中。
- 若收到 `AUTH_FAILED` 或 login `reason`，GPTs 應要求使用者重新登入。

## Step 2：試算

Endpoint：

```text
POST /api/land-tax/calculate
Authorization: Bearer <sessionToken>
```

Request body 由 GPTs 整理土地資料後送出。必要欄位依目前 `LandTaxCalculationInput`：

```json
{
  "landArea": 100,
  "ownershipNumerator": 1,
  "ownershipDenominator": 1,
  "previousTransferYearMonth": "11301",
  "currentTransferYearMonth": "11401",
  "previousDeclaredValuePerSqm": 1000,
  "currentDeclaredValuePerSqm": 1500,
  "improvementCost": 0,
  "landReadjustmentCost": 0,
  "engineeringBenefitFee": 0
}
```

注意：

- `previousTransferYearMonth` 與 `currentTransferYearMonth` 使用民國年月 `YYYMM`。
- 不要傳 `isSelfUseResidential`，目前 API 會視為不合法欄位。
- GPTs 不得自行覆寫稅額公式，應以 API 回傳結果為準。

## Step 3：產生 PDF

Endpoint：

```text
POST /api/land-tax/pdf
Authorization: Bearer <sessionToken>
```

PDF body 可包含：

- `confirmedLandData`
- `calculationResult`
- `businessCardData`

原則：

- `confirmedLandData` 放入使用者確認後要顯示於 PDF 的土地資訊。
- `calculationResult` 使用 `/api/land-tax/calculate` 回傳結果。
- `businessCardData` 可放聯絡資訊，但不可當作正式店家揭露資料來源。
- 正式店家揭露資訊與浮水印由 PDF API 後端查詢 store profile。

禁止欄位：

- `image`
- `base64`
- `businessCardImageUrl`
- `openaiFileIdRefs`
- `portraitAvailable`
- `portraitCropArea`

## Step 4：下載 PDF

PDF API 成功後會回傳短效 `downloadUrl` 與 `expiresInMinutes`。GPTs 可以把下載連結交給使用者，但不得把完整 URL 寫入長期 log 或公開除錯內容。

下載 endpoint：

```text
GET /api/land-tax/pdf/download?token=<download-token>
```

下載 token 與 session token 不同。下載 token 預設 15 分鐘有效，逾期應重新呼叫 PDF API。

## Store Profile 原則

GPTs 可以把 login response 中的 store profile 顯示給使用者確認，但 PDF 正式輸出必須以後端查詢結果為準。

GPTs 不得接受使用者手動輸入以下欄位作為 PDF 揭露資訊正式來源：

- 使用分店
- 經紀業名稱
- 經紀人
- 經紀人字號
- PDF 浮水印

若使用者指出店家資訊錯誤，GPTs 應要求後台營運人員更新 `public.store_users`，而不是在本次 payload 中覆寫。

## 錯誤處理規則

建議 GPTs 對常見錯誤採取以下行為：

- `AUTH_FAILED`：要求重新登入。
- `missing_credentials`：提示輸入分店代碼與分店驗證碼。
- `invalid_auth_code`：提示驗證碼錯誤。
- `store_user_inactive`：提示帳號已停用，請聯絡管理者。
- `store_user_expired`：提示帳號已到期，請聯絡管理者。
- `TAX_INDEX_NOT_FOUND`：提示指定年月的物價指數不存在，請確認年月或通知管理者補資料。
- `LAND_FIELD_MISSING`：提示缺少或格式錯誤的土地資料。
- `PDF_GENERATION_FAILED`：提示 PDF 產生失敗，可稍後重試或回報管理者。
- `PDF_TOKEN_EXPIRED`：提示下載連結已過期，需要重新產生 PDF。

## 測試案例

基本成功路徑：

1. 正確 `storeCode + authCode` 登入成功。
2. login response 有 store profile。
3. calculate 回傳 `success=true` 與試算結果。
4. pdf 回傳 `success=true`、`downloadUrl`、`expiresInMinutes`。
5. 下載 PDF 成功。
6. PDF 中文正常。
7. PDF 底部店家揭露資訊正確。
8. PDF 浮水印正確。

錯誤路徑：

- 錯誤 authCode 回傳 401。
- 過期或停用帳號回傳 401 與 reason。
- 缺少土地必要欄位回傳 `LAND_FIELD_MISSING`。
- CPI 年月不存在回傳 `TAX_INDEX_NOT_FOUND`。
- PDF download token 過期回傳 410。
