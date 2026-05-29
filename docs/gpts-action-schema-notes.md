# GPTs Action Schema 注意事項

## Base URL

正式站：

```text
https://land-tax-calculator-xi.vercel.app
```

Action schema 應以 HTTPS 正式站為 base URL。不要把 localhost、測試 token、完整 download URL 或 secret 寫進 schema。

## Endpoint 清單

### POST `/api/auth/login`

用途：店家登入。

Request body：

```json
{
  "storeCode": "CH006",
  "authCode": "<redacted>"
}
```

Response body：

```json
{
  "success": true,
  "sessionToken": "<redacted>",
  "store": {
    "storeCode": "CH006",
    "storeName": "員林站前店",
    "brokerageName": "九意開發有限公司",
    "brokerName": "曾群丞",
    "brokerLicenseNo": "111年彰縣字00383號",
    "watermarkText": "員林站前店 土地增值稅試算",
    "expiresAt": "2099-08-26"
  }
}
```

失敗 response：

```json
{
  "success": false,
  "errorCode": "AUTH_FAILED",
  "reason": "invalid_auth_code"
}
```

Action schema 注意：

- `authCode` 應標示為敏感欄位。
- 不要要求 `userCode`，後端固定使用 `STORE`。
- `sessionToken` 需由 GPTs 暫存於本輪流程，不應對使用者完整顯示。

### POST `/api/land-tax/calculate`

用途：正式試算。

Headers：

```text
Authorization: Bearer <sessionToken>
```

Request body：

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

Response body：

```json
{
  "success": true,
  "formulaVersion": "land-tax-v1.0.0",
  "previousIndexValue": 100,
  "currentIndexValue": 110,
  "taxIndexMultiplier": 1.1,
  "currentTotalValue": 150000,
  "adjustedPreviousTotalValue": 110000,
  "taxableIncrement": 40000,
  "generalTaxResult": {
    "estimatedTax": 8000,
    "rateNote": "..."
  },
  "selfUseTaxResult": {
    "estimatedTax": 4000,
    "rateNote": "..."
  }
}
```

Action schema 注意：

- 民國年月欄位應描述為 `YYYMM` 字串。
- 權利範圍以分子、分母兩個數字表示。
- optional costs 可省略，省略時後端視為 0。
- 不要加入 `isSelfUseResidential`。

### POST `/api/land-tax/pdf`

用途：產生 PDF 並建立短效下載 token。

Headers：

```text
Authorization: Bearer <sessionToken>
```

Request body 範例：

```json
{
  "confirmedLandData": {
    "landCityDistrict": "彰化縣員林市",
    "landSection": "測試段",
    "landNumber": "123-1",
    "landArea": 100,
    "ownershipRange": "1/1",
    "previousTransferYearMonth": "11301",
    "currentTransferYearMonth": "11401",
    "previousDeclaredValuePerSqm": 1000,
    "currentDeclaredValuePerSqm": 1500
  },
  "calculationResult": {
    "formulaVersion": "land-tax-v1.0.0",
    "taxIndexMultiplier": 1.1,
    "deductibleCosts": 0,
    "adjustedPreviousTotalValue": 110000,
    "taxableIncrement": 40000,
    "generalTaxResult": {
      "estimatedTax": 8000,
      "rateNote": "一般用地稅率"
    },
    "selfUseTaxResult": {
      "estimatedTax": 4000,
      "rateNote": "自用住宅用地稅率"
    }
  },
  "businessCardData": {
    "agentName": "測試經紀人",
    "phone": "0900-000-000",
    "storeName": "測試分店"
  }
}
```

Response body：

```json
{
  "success": true,
  "downloadUrl": "<redacted>",
  "expiresInMinutes": 15
}
```

Action schema 注意：

- `downloadUrl` 是短效 URL，只交給使用者下載，不寫入長期 log。
- 不要在 request body 設計店家揭露資訊欄位。
- `businessCardData` 只代表聯絡卡資料，不代表正式店家揭露資料。
- 禁止暴露或傳送 image/base64 類欄位。

### GET `/api/land-tax/pdf/download`

用途：下載已產生 PDF。

Query：

```text
token=<download-token>
```

Response：

```text
application/pdf
```

Action schema 注意：

- 這個 endpoint 不是 JSON response。
- download token 逾期會回傳 410。
- GPTs 若無法直接下載 binary，可把 `downloadUrl` 交給使用者。

### POST `/api/usage-log`

用途：記錄 GPTs 使用行為。

Headers：

```text
Authorization: Bearer <sessionToken>
```

Request body：

```json
{
  "toolName": "land_tax_gpts",
  "actionName": "generate_pdf",
  "success": true,
  "formulaVersion": "land-tax-v1.0.0"
}
```

注意：店家代碼由 session 決定，不信任 request body。

### POST `/api/error-log`

用途：記錄 GPTs 錯誤。

Headers：

```text
Authorization: Bearer <sessionToken>
```

Request body：

```json
{
  "toolName": "land_tax_gpts",
  "sessionId": "short-session-label",
  "stage": "pdf",
  "errorCode": "PDF_GENERATION_FAILED",
  "errorMessage": "short sanitized message",
  "gptsNote": "short sanitized note"
}
```

注意：不要記錄 authCode、完整 sessionToken、完整 downloadUrl 或 secret。

### POST `/api/cpi/upload-excel`

用途：管理員上傳 CPI 資料。

這不是 GPTs 公開流程，Action schema 不應暴露給一般 GPTs 使用者。

需要：

- `Authorization: Bearer <sessionToken>`
- `X-Admin-Token`
- raw file body

## 不應暴露的敏感資訊

- Supabase URL 以外的任何 key，尤其 service role key。
- `APP_SECRET`
- `PDF_TOKEN_SECRET`
- `ADMIN_UPLOAD_TOKEN`
- authCode 明碼。
- authCode hash。
- 完整 `sessionToken`。
- 完整 PDF `downloadUrl`。
- Supabase internal table details。

## 對 GPTs Action Schema 不友善處

- PDF download endpoint 回傳 binary，不是 JSON；GPTs 可能只能把連結交給使用者。
- `/api/land-tax/pdf` request body 是彈性物件，Action schema 需要自行定義清楚欄位。
- `/api/land-tax/calculate` 失敗時有 `errorCode`，但欄位層級錯誤沒有逐欄 detail。
- login 失敗 reason 與一般 `errorCode` 分離，schema 描述要同時包含兩者。
# V1.4 GPTs Wrapper Endpoints

V1.4 adds JSON-friendly wrapper endpoints for GPTs Actions. These wrappers are the preferred endpoints for GPTs schemas:

- `POST /api/gpts/login`
- `POST /api/gpts/calculate`
- `POST /api/gpts/prepare-pdf`

The wrappers do not replace the existing production APIs. They call the existing APIs internally and normalize the response shape for GPTs.

## `POST /api/gpts/login`

Wraps:

```text
POST /api/auth/login
```

Request:

```json
{
  "storeCode": "CH006",
  "authCode": "DO_NOT_USE_REAL_AUTH_CODE"
}
```

Success response:

```json
{
  "success": true,
  "data": {
    "sessionToken": "SESSION_TOKEN_PLACEHOLDER",
    "store": {
      "storeCode": "CH006",
      "storeName": "STORE_NAME_PLACEHOLDER",
      "brokerageName": "BROKERAGE_NAME_PLACEHOLDER",
      "brokerName": "BROKER_NAME_PLACEHOLDER",
      "brokerLicenseNo": "BROKER_LICENSE_PLACEHOLDER",
      "watermarkText": "WATERMARK_TEXT_PLACEHOLDER",
      "expiresAt": "2099-08-26"
    }
  },
  "nextAction": "calculate"
}
```

## `POST /api/gpts/calculate`

Wraps:

```text
POST /api/land-tax/calculate
```

The wrapper requires:

```text
Authorization: Bearer <sessionToken>
```

The tax formula remains inside the existing calculation API. GPTs should not compute tax by itself.

## `POST /api/gpts/prepare-pdf`

Wraps:

```text
POST /api/land-tax/pdf
```

The wrapper requires:

```text
Authorization: Bearer <sessionToken>
```

Success response:

```json
{
  "success": true,
  "data": {
    "downloadUrl": "PDF_DOWNLOAD_URL_PLACEHOLDER",
    "expiresInMinutes": 15,
    "storeProfileSummary": {
      "storeCode": "CH006",
      "storeName": "STORE_NAME_PLACEHOLDER",
      "brokerageName": "BROKERAGE_NAME_PLACEHOLDER",
      "brokerName": "BROKER_NAME_PLACEHOLDER",
      "brokerLicenseNo": "BROKER_LICENSE_PLACEHOLDER",
      "watermarkText": "WATERMARK_TEXT_PLACEHOLDER",
      "expiresAt": "2099-08-26"
    }
  },
  "nextAction": "download"
}
```

The wrapper does not generate PDF download tokens by itself. It uses the existing PDF API result. It also does not return binary PDF content.

## Wrapper Error Shape

Wrapper errors use:

```json
{
  "success": false,
  "errorCode": "AUTH_FAILED",
  "reason": "invalid_auth_code",
  "stage": "login",
  "sourceStatus": 401
}
```

`reason` is primarily expected for login failures. For calculate and PDF errors, GPTs should rely on `errorCode` and `stage`.

## Existing Endpoints Still Exist

The original endpoints remain available for frontend, manual smoke tests, and compatibility:

- `POST /api/auth/login`
- `POST /api/land-tax/calculate`
- `POST /api/land-tax/pdf`
- `GET /api/land-tax/pdf/download`

GPTs should prefer `/api/gpts/*` unless a specific binary PDF download action is required.
