# V1.7.2 GPTs Production Test Script

This script verifies GPTs wrapper behavior, prompt behavior, PDF payload mapping, and PDF layout. Do not paste real auth codes, full session tokens, full download URLs, PDF files, or test JSON into Git.

Production server:

```text
https://land-tax-calculator-xi.vercel.app
```

Preferred GPTs endpoints:

1. `POST /api/gpts/login`
2. `POST /api/gpts/calculate`
3. `POST /api/gpts/prepare-pdf`

## Baseline

Use the V1.6 verified CPI index baseline:

- `tax_price_indexes count = 808`
- `first_year_month = 04801`
- `latest_year_month = 11504`
- sample Excel 範圍只到 `11504`，因此 `11505` 不應存在
- `previousIndexValue = 9.86`
- `currentIndexValue = 111.23`
- `taxIndexMultiplier = 0.0986`
- `taxIndexMultiplier` means previous tax price index divided by 100; do not calculate it as current index divided by previous index.

## Login Tests

### Login Success

Call `gptsLogin` with:

```json
{
  "storeCode": "CH006",
  "authCode": "DO_NOT_USE_REAL_AUTH_CODE"
}
```

Expected:

- `success = true`
- `data.sessionToken` exists
- `data.store.storeCode = CH006`
- store profile is present
- GPTs does not display the full `data.sessionToken`
- GPTs stores the sessionToken only for this conversation flow

### Login Failure

Call `gptsLogin` with an intentionally wrong auth code.

Expected:

- HTTP 401
- `success = false`
- `stage = login`
- `reason = invalid_auth_code` or another formal auth failure reason

## Prompt Cleanup Tests

After login succeeds and land data is incomplete, GPTs must not ask:

- 是否延續先前案件
- 是否有任何未顯示在目前對話中的先前案件
- 是否延續已登入分店資訊
- 是否延續既有土地資料
- 是否使用前案資料
- 是否沿用上一筆資料
- 是否有目前對話中未顯示的資料需要延續

GPTs must not require the user to understand:

- session
- 案件延續
- 前案
- 流程狀態
- 隱藏上下文
- 已登入狀態延續

Expected prompt when land data is incomplete:

```text
登入成功。接下來請提供土地資料，或直接上傳土地登記謄本，我可以協助判讀。

需要的資料如下：
- 土地面積（平方公尺）
- 權利範圍，例如 1/1、1/2
- 公告土地現值年月
- 公告土地現值（元／平方公尺）
- 前次移轉年月
- 前次移轉現值或原規定地價（元／平方公尺）

注意：不需要提供本次移轉日期、買賣日期或登記日期。
```

Expected:

- 缺少資料清單不得出現「本次移轉年月」。
- 缺少資料清單應使用「公告土地現值年月」。
- GPTs 應直接依目前可見資訊判斷登入狀態與資料缺口。
- 若已有謄本，GPTs 應先判讀謄本可取得欄位，再列出仍缺少欄位。

## Calculate Tests

### Calculate With Authorization Header

Call `gptsCalculate` with:

```text
Authorization: Bearer <sessionToken>
```

Use a payload within the verified CPI range:

```json
{
  "landArea": 107.77,
  "ownershipNumerator": 1,
  "ownershipDenominator": 1,
  "previousTransferYearMonth": "10210",
  "currentTransferYearMonth": "11501",
  "previousDeclaredValuePerSqm": 1619.6,
  "currentDeclaredValuePerSqm": 1900,
  "improvementCost": 0,
  "landReadjustmentCost": 0,
  "engineeringBenefitFee": 0
}
```

Expected:

- HTTP 200
- `success = true`
- `data.generalTaxResult`
- `data.selfUseTaxResult`
- `nextAction = prepare-pdf`

### Calculate With Body sessionToken

If GPTs Actions cannot send Authorization headers, call `gptsCalculate` with the same payload plus:

```json
{
  "sessionToken": "SESSION_TOKEN_PLACEHOLDER"
}
```

Expected:

- HTTP 200
- `success = true`
- response does not echo the sessionToken
- logs and errors do not expose the sessionToken

### Calculate Missing Token

Call `gptsCalculate` without Authorization header and without body `sessionToken`.

Expected:

- HTTP 401
- `success = false`
- `errorCode = AUTH_FAILED`
- `stage = calculate`

### TAX_INDEX_NOT_FOUND

Call `gptsCalculate` with `currentTransferYearMonth = 11505`.

Expected:

- `success = false`
- `errorCode = TAX_INDEX_NOT_FOUND`
- GPTs must not self-calculate or invent missing index data.

## Calculate Success To PDF Prompt Tests

After calculate succeeds, if no business card or contact info is available, GPTs must not say:

```text
回覆「產生 PDF」即可
```

Expected prompt:

```text
試算已完成。若要產生 PDF 試算報告，請先上傳名片，或提供以下聯絡資訊：
- 業務姓名
- 聯絡電話
- 店名

收到後我再幫你產生 PDF。
```

Expected behavior:

- 使用者只回覆「產生 PDF」但尚未提供名片或聯絡資訊時，GPTs 不得呼叫 `gptsPreparePdf`。
- 已有名片或聯絡資訊時，GPTs 才可呼叫 `gptsPreparePdf`。
- 名片／聯絡資訊只作為聯絡欄位，不得覆蓋官方 store profile。
- 不得要求使用者提供經紀業字號或經紀人字號來覆蓋後端 store profile。

## Prepare PDF Tests

### Required confirmedLandData

Before calling `gptsPreparePdf`, GPTs must verify:

- `landCityDistrict`
- `landSection`
- `landNumber`
- `landArea`
- `ownershipRange`
- `previousTransferYearMonth`
- `currentTransferYearMonth`
- `previousDeclaredValuePerSqm`
- `currentDeclaredValuePerSqm`

If any PDF display field is missing, GPTs must not call `gptsPreparePdf`. It should ask the user to supplement the missing field.

### Prepare PDF Success With Authorization Header

Call `gptsPreparePdf` with:

```text
Authorization: Bearer <sessionToken>
```

Payload shape:

```json
{
  "confirmedLandData": {
    "landCityDistrict": "彰化縣北斗鎮",
    "landSection": "新生段",
    "landNumber": "0318-0000",
    "landArea": 107.77,
    "ownershipRange": "1/1",
    "previousTransferYearMonth": "10210",
    "currentTransferYearMonth": "11501",
    "previousDeclaredValuePerSqm": 1619.6,
    "currentDeclaredValuePerSqm": 1900
  },
  "calculationResult": {
    "success": true,
    "formulaVersion": "land-tax-v1.0.0",
    "previousIndexValue": 100,
    "currentIndexValue": 100,
    "taxIndexMultiplier": 1,
    "currentTotalValue": 0,
    "adjustedPreviousTotalValue": 0,
    "taxableIncrement": 0,
    "generalTaxResult": {
      "estimatedTax": 0,
      "rateNote": "一般用地稅率試算；正式級距與長期持有減徵待驗證／級距說明"
    },
    "selfUseTaxResult": {
      "estimatedTax": 0,
      "rateNote": "自用住宅用地稅率試算；正式級距與長期持有減徵待驗證／級距說明"
    }
  },
  "businessCardData": {
    "agentName": "AGENT_NAME_PLACEHOLDER",
    "phone": "PHONE_PLACEHOLDER",
    "storeName": "CONTACT_STORE_NAME_PLACEHOLDER"
  }
}
```

Expected:

- HTTP 200
- `success = true`
- `data.downloadUrl` exists
- `data.expiresInMinutes` exists
- `data.storeProfileSummary` exists
- Do not paste or save the full `downloadUrl`.

### Prepare PDF With Body sessionToken

If GPTs Actions cannot send Authorization headers, call `gptsPreparePdf` with the same payload plus:

```json
{
  "sessionToken": "SESSION_TOKEN_PLACEHOLDER"
}
```

Expected:

- HTTP 200
- `success = true`
- response does not echo the sessionToken
- logs and errors do not expose the sessionToken

### Prepare PDF Missing Token

Call `gptsPreparePdf` without Authorization header and without body `sessionToken`.

Expected:

- HTTP 401
- `success = false`
- `errorCode = AUTH_FAILED`
- `stage = prepare-pdf`

### Prepare PDF Missing Land Display Field

Call `gptsPreparePdf` with a missing `landCityDistrict`, `landSection`, `landNumber`, `landArea`, or `ownershipRange`.

Expected:

- HTTP 400
- `success = false`
- `errorCode = LAND_FIELD_MISSING`
- GPTs must ask the user to supplement missing fields.
- GPTs must not generate a PDF with blank land basic fields.

## Transcript Parsing Tests

Given transcript title:

```text
北斗鎮新生段 0318-0000地號
```

Expected:

- 行政區：北斗鎮
- 地段：新生段
- 地號：0318-0000

Given same page text:

```text
彰化縣北斗地政事務所
```

Expected:

- `landCityDistrict = 彰化縣北斗鎮`

If only `北斗鎮` is visible and no county source is visible:

- use `北斗鎮`, or ask the user to supplement the county
- do not guess the county

Other transcript checks:

1. 謄本出現 `****` 不得直接判定遮蔽或無法辨識。
2. 「公告土地現值」應讀取同一行民國年月與金額。
3. 「前次移轉現值或原規定地價」應讀取下一行。
4. 「當期申報地價」不得作為公告土地現值。
5. 「當期申報地價」不得作為前次移轉現值。
6. 登記日期、買賣日期、送件日期不得作為公告土地現值年月。
7. 權利範圍「全部」應轉換或顯示為 `1/1` / `全部`。
8. 若已上傳謄本，GPTs 應優先判讀，不應重複要求填寫已可從謄本取得的欄位。

## PDF Visual Checks

After downloading the PDF for manual verification, delete the test PDF and do not commit it.

Expected:

- 縣市/行政區不空白
- 地段不空白
- 地號不空白
- 土地面積不空白
- 權利範圍不空白
- PDF 官方店家揭露仍以 store profile 為準
- 名片／聯絡資訊只顯示在聯絡欄位，不覆蓋官方揭露資料
- PDF 浮水印為登入分店 watermark text
- 稅率／級距說明不得超出框線
- 一般用地與自用住宅結果區塊排版都要檢查

## Cleanup

- Do not commit test PDF files.
- Do not commit test JSON files.
- Do not paste full sessionToken values.
- Do not paste full PDF download URLs.
