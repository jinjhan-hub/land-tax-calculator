# V1.7.5 GPTs Production Test Script

This script verifies GPTs prompt cleanup, sessionToken handoff, transcript parsing, simplified tax samples, PDF display, and PDF download behavior. Do not paste real auth codes, full session tokens, admin tokens, full PDF download URLs, PDF files, or test JSON into Git.

Production server:

```text
https://land-tax-calculator-xi.vercel.app
```

Preferred GPTs endpoints:

1. `POST /api/gpts/login`
2. `POST /api/gpts/calculate`
3. `POST /api/gpts/prepare-pdf`

## Prompt Cleanup

Before login, GPTs should say:

```text
請提供分店代碼與分店驗證碼，我會先完成登入。
```

GPTs must not ask users whether it should use hidden or external context, including:

- 是否需要依賴目前對話以外的個人記憶來試算土地增值稅？
- 是否有未顯示於目前對話中的個人記憶？
- 是否有偏好或限制會影響本次試算？
- 是否延續先前案件？
- 是否沿用上一筆資料？
- 是否有隱藏資料需要我使用？

Land tax calculations may use only currently visible conversation data, data supplied in this turn, uploaded transcript content, and API responses.

After login when land data is incomplete, GPTs should directly list missing fields and use `公告土地現值年月`:

```text
登入成功。接下來請提供土地資料，或直接上傳土地登記謄本，我可以協助判讀。

需要的資料如下：
- 土地面積（平方公尺）
- 權利範圍，例如 1/1、1/2
- 公告土地現值年月
- 公告土地現值（元／平方公尺）
- 前次移轉年月
- 前次移轉現值或原規定地價（元／平方公尺）

注意：不需要提供買賣日期、登記日期或送件日期。
```

## Simplified Formula Samples

Do not add or validate against the invalid `10605` Ministry sample with `landArea = 260.63` and `ownershipRange = 1/1`. That source has multiple ownership holders, so it is not a confirmed single-holder sample.

Shared values for the simplified samples:

- `previousTransferYearMonth = 10210`
- `currentTransferYearMonth = 11501`
- `previousDeclaredValuePerSqm = 1619.6`
- `currentDeclaredValuePerSqm = 1900`
- `previousIndexValue = 94.66`
- `taxIndexMultiplier = 0.9466`

Case A:

- `landArea = 107.77`
- expected general land estimated tax: about `7,908`
- expected self-use 10% scenario: about `3,954`

Case B:

- `landArea = 1,073.77`
- expected general land estimated tax: about `78,790`
- expected self-use 10% scenario: about `39,395`

If the user expects about `78,790` but the PDF shows `landArea = 107.77`, GPTs should ask the user to confirm the land area. GPTs must not generate a PDF while land area is uncertain.

## Transcript Parsing Validation

Validate:

1. Land area must be read from the transcript field `面積：****數字 平方公尺`.
2. Land area may include a thousands comma, for example `1,073.77`.
3. GPTs must not drop the thousands comma and misread `1,073.77` as `107.77`.
4. Calculate payload and prepare-pdf payload must use the same `landArea`.
5. PDF displayed land area must match the `landArea` used for calculation.
6. If the transcript shows multiple ownership holders, different ownership ranges, or multiple ownership sections, GPTs must ask which ownership holder is being transferred and what ownership range applies.
7. GPTs must not use the whole parcel area with `1/1` to judge a multi-owner case.

Suggested multi-owner prompt:

```text
這筆土地看起來有多位持分人。請確認本次要試算哪一位持分人的移轉，並提供該持分人的權利範圍，例如 1/2、1/3 或 1/1。我會依該持分比例分開試算。
```

## Urban Planning Type Validation

Validate:

1. Transcript `使用分區：特定農業區` and `使用地類別：農牧用地` should parse as `非都市計畫內`.
2. Transcript blank `使用分區` and blank `使用地類別` should parse as `都市計畫內`.
3. GPTs prepare-pdf payload should include `landUrbanPlanningLabel`.
4. PDF land basic data section should display `都市計畫別`.
5. Urban planning type must not affect tax formulas.
6. If urban planning type cannot be parsed, GPTs should ask the user to supplement it.
7. The new PDF urban planning field must not cause overflow, overlap, or blank land basic data fields.

## Prepare PDF AUTH_FAILED

Validate:

1. `gptsPreparePdf` must use the currently valid sessionToken from the successful login.
2. If Authorization header is unavailable, GPTs must put the token in request body `sessionToken`.
3. If `gptsPreparePdf` returns `AUTH_FAILED`, GPTs must not retry blindly or auto-generate a PDF.
4. GPTs should ask the user to login again.
5. After a new login, GPTs must still confirm calculation result, land basic data, and contact-card information before calling prepare-pdf again.
6. GPTs must not display the sessionToken to the user.

## Prepare PDF Payload

Minimum `confirmedLandData` for PDF:

```json
{
  "landCityDistrict": "CITY_DISTRICT_PLACEHOLDER",
  "landSection": "LAND_SECTION_PLACEHOLDER",
  "landNumber": "LAND_NUMBER_PLACEHOLDER",
  "landArea": 1073.77,
  "ownershipRange": "1/1",
  "landUrbanPlanningLabel": "非都市計畫內",
  "previousTransferYearMonth": "10210",
  "currentTransferYearMonth": "11501",
  "previousDeclaredValuePerSqm": 1619.6,
  "currentDeclaredValuePerSqm": 1900
}
```

PDF and GPTs visible labels should use:

- `公告土地現值年月` in GPTs prompts
- `公告現值年月` in compact PDF tables
- `自用住宅優惠稅率 10% 情境試算`

Do not present the API field `currentTransferYearMonth` as a user-facing label.

## PDF Download Behavior

When prepare-pdf succeeds, GPTs must provide a clickable markdown link in the current conversation:

```text
[下載 PDF 試算報告](downloadUrl)
```

Validation rules:

1. Use the API-returned `downloadUrl` only as the markdown link target in the current user conversation.
2. Do not show a naked full URL.
3. Tell the user that the link expires in 15 minutes.
4. Do not write the full URL into documents, commits, test records, summaries, logs, or public records.

## Self-Use Scope

Current behavior supports:

- general land calculation
- self-use residential 10% scenario calculation

Current behavior does not support partial self-use compound-rate calculation. GPTs must not describe the current result as partial self-use.

## Cleanup

- Do not commit test PDF files.
- Do not commit test JSON files.
- Do not paste full sessionToken values.
- Do not paste full PDF download URLs.
