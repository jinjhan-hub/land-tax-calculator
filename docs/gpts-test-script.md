# GPTs Action 測試腳本

本文件用於測試 GPTs Actions 是否能依序完成 login、calculate、PDF prepare 與 downloadUrl 處理。不要在測試紀錄貼完整 authCode、sessionToken 或 downloadUrl。

## 前置條件

- GPTs Action schema 已匯入。
- 正式站 server 為 `https://land-tax-calculator-xi.vercel.app`。
- 測試店家帳號已存在且未過期。
- 測試者掌握 authCode，但不得提交或貼入文件。

## 1. Login 成功測試

對 GPTs 說：

```text
我要登入土地增值稅試算系統。分店代碼是 CH006，分店驗證碼我會私下輸入。
```

期望 GPTs 行為：

- 呼叫 `loginStore`。
- request body 僅包含 `storeCode` 與 `authCode`。
- 不傳 `userCode`。
- 登入成功後不顯示完整 `sessionToken`。
- 顯示或確認店家 profile 摘要。

驗收：

- `success=true`。
- store profile 存在。
- `storeCode` 正確。
- `storeName`、`brokerageName`、`brokerName`、`brokerLicenseNo`、`watermarkText`、`expiresAt` 有合理值。

## 2. Login 失敗測試

對 GPTs 說：

```text
我要測試錯誤驗證碼。分店代碼 CH006，驗證碼 wrong-code。
```

期望 GPTs 行為：

- 呼叫 `loginStore`。
- 收到 401 時說明驗證失敗。
- 若 reason 為 `invalid_auth_code`，提示重新確認分店驗證碼。
- 不猜測正確 authCode。

驗收：

- HTTP 401。
- `errorCode=AUTH_FAILED`。
- `reason=invalid_auth_code`。

## 3. Calculate 成功測試

登入成功後，對 GPTs 提供：

```text
土地面積 100 平方公尺。
權利範圍 1/1。
前次移轉年月 11301。
本次移轉年月 11401。
前次現值單價 1000。
本次現值單價 1500。
改良費用、重劃費用、工程受益費都為 0。
```

期望 GPTs 行為：

- 整理成 `calculateLandTax` payload。
- 使用 `Authorization: Bearer <sessionToken>`。
- 不傳 `isSelfUseResidential`。
- 不自行計算取代 API。

驗收：

- `success=true`。
- `formulaVersion` 有值。
- `generalTaxResult.estimatedTax` 有值。
- `selfUseTaxResult.estimatedTax` 有值。
- GPTs 用 API 結果向使用者摘要。

## 4. 缺欄位測試

對 GPTs 說：

```text
土地面積 100，其他資料我還沒準備。
```

期望 GPTs 行為：

- 先追問缺少欄位。
- 不急著呼叫 calculate。
- 若已呼叫且 API 回 `LAND_FIELD_MISSING`，應引導補齊資料。

驗收：

- GPTs 能指出缺少權利範圍、年月、前次/本次單價等欄位。

## 5. PDF prepare 成功測試

Calculate 成功後，對 GPTs 說：

```text
請產生 PDF。PDF 上土地位置顯示彰化縣員林市，地段測試段，地號 123-1。聯絡人顯示測試經紀人，電話 0900-000-000，聯絡店名測試分店。
```

期望 GPTs 行為：

- 呼叫 `prepareLandTaxPdf`。
- request body 包含 `confirmedLandData`、`calculationResult`、`businessCardData`。
- 不在 request body 中加入正式店家揭露資訊。
- 不加入 image/base64 類禁止欄位。

驗收：

- `success=true`。
- `expiresInMinutes=15`。
- 有 `downloadUrl`。
- GPTs 不在 log 或摘要中貼完整 `downloadUrl`。

## 6. PDF downloadUrl 處理

期望 GPTs 行為：

- 若 GPTs 可以處理 binary download，嘗試使用 `downloadLandTaxPdf`。
- 若 GPTs 無法處理 binary response，直接把短效下載連結交給使用者。
- 告知連結有效時間。
- 不把完整 URL 寫入長期紀錄。

驗收：

- 使用者可下載 PDF。
- 若 token 過期，GPTs 重新呼叫 PDF prepare，而不是要求使用者修改 token。

## 7. 店家揭露資料檢查

打開 PDF 後檢查：

- 使用分店正確。
- 經紀業名稱正確。
- 經紀人正確。
- 經紀人字號正確。
- 浮水印為登入店家的 `watermarkText`。

重要：

- GPTs 不應要求使用者手動輸入這些正式揭露欄位。
- 若資料錯誤，應回報管理者更新 `public.store_users`。

## 8. 中文內容檢查

PDF 中應正確顯示：

- 土地行政區，例如 `彰化縣員林市`。
- 地段，例如 `測試段`。
- rateNote 中文。
- 聯絡人，例如 `測試經紀人`。
- 聯絡店名，例如 `測試分店`。
- 店家揭露資訊。
- 浮水印。

不應出現：

```text
???
```

## 9. 測試清理

- 不提交測試 PDF。
- 不提交測試 JSON。
- 不在文件中保存 authCode。
- 不在文件中保存完整 sessionToken。
- 不在文件中保存完整 downloadUrl。
# V1.4 Wrapper Endpoint Test Flow

GPTs Actions should now prefer the JSON-friendly wrapper endpoints:

- `POST /api/gpts/login`
- `POST /api/gpts/calculate`
- `POST /api/gpts/prepare-pdf`

## Wrapper login

Call `gptsLogin` with:

```json
{
  "storeCode": "CH006",
  "authCode": "DO_NOT_USE_REAL_AUTH_CODE"
}
```

Expected:

- `success=true`
- `data.sessionToken` exists
- `data.store` exists
- `nextAction=calculate`

Do not display the full `data.sessionToken`.

## Wrapper calculate

Call `gptsCalculate` with the same land input used by the existing calculate test and:

```text
Authorization: Bearer <sessionToken>
```

Expected:

- `success=true`
- `data.success=true`
- `data.formulaVersion` exists
- `data.generalTaxResult.estimatedTax` exists
- `data.selfUseTaxResult.estimatedTax` exists
- `nextAction=prepare-pdf`

## Wrapper prepare PDF

Call `gptsPreparePdf` with:

- `confirmedLandData`
- `calculationResult` from `data`
- optional `businessCardData`

Expected:

- `success=true`
- `data.downloadUrl` exists
- `data.expiresInMinutes=15`
- `data.storeProfileSummary` exists
- `nextAction=download`

The wrapper returns JSON only. It does not download binary PDF content.

## Wrapper error handling

For login failure, expect:

```json
{
  "success": false,
  "errorCode": "AUTH_FAILED",
  "reason": "invalid_auth_code",
  "stage": "login",
  "sourceStatus": 401
}
```

For expired sessions, expect `AUTH_FAILED` with the related stage.

## PDF download handling

After `gptsPreparePdf`, GPTs should present `data.downloadUrl` to the user as a short-lived link. If a GPTs Action cannot consume binary PDF responses, do not call the binary download endpoint from the schema.
