# V1.7.4 GPTs Production Test Script

This script verifies GPTs prompt cleanup, sessionToken handoff, transcript area parsing, urban planning type parsing, simplified tax samples, and PDF display. Do not paste real auth codes, full session tokens, full download URLs, PDF files, or test JSON into Git.

Production server:

```text
https://land-tax-calculator-xi.vercel.app
```

Preferred GPTs endpoints:

1. `POST /api/gpts/login`
2. `POST /api/gpts/calculate`
3. `POST /api/gpts/prepare-pdf`

## Prompt Cleanup

GPTs must not ask:

- 是否有未顯示於目前對話中的個人記憶？
- 是否有偏好或限制會影響本次試算？
- 是否延續先前案件？
- 是否沿用上一筆資料？
- 是否有隱藏資料需要我使用？

Before login, GPTs should say:

```text
請提供分店代碼與分店驗證碼，我會先完成登入。
```

After login when land data is incomplete, GPTs should directly list missing fields and use「公告土地現值年月」, not「本次移轉年月」.

## Simplified Formula Samples

Shared values:

- `previousTransferYearMonth = 10210`
- `currentTransferYearMonth = 11501`
- `previousDeclaredValuePerSqm = 1619.6`
- `currentDeclaredValuePerSqm = 1900`
- `previousIndexValue = 94.66`
- `taxIndexMultiplier = 0.9466`

Case A:

- `landArea = 107.77`
- expected general land estimated tax ≈ `7,908`
- expected self-use 10% scenario ≈ `3,954`

Case B:

- `landArea = 1,073.77`
- expected general land estimated tax ≈ `78,790`
- expected self-use 10% scenario ≈ `39,395`

If the user expects about `78,790` but the PDF shows `landArea = 107.77`, GPTs should ask the user to confirm the land area. GPTs must not generate PDF while land area is uncertain.

## Land Area Parsing

Validate:

1. 土地面積必須從謄本「面積：****數字 平方公尺」欄位判讀。
2. 面積可能包含千分位逗號，例如 `1,073.77`。
3. GPTs 不得漏讀千分位逗號，導致 `1,073.77` 誤判為 `107.77`。
4. calculate payload and prepare-pdf payload must use the same `landArea`.
5. PDF 顯示土地面積必須與 calculate 使用的 `landArea` 一致。

## Urban Planning Type Parsing

Validate:

1. 謄本中「使用分區：特定農業區」「使用地類別：農牧用地」應判讀為非都市計畫內。
2. 謄本中「使用分區：（空白）」「使用地類別：（空白）」應判讀為都市計畫內。
3. GPTs prepare-pdf payload 應帶入 `landUrbanPlanningLabel`。
4. PDF 土地基本資料區應顯示都市計畫別。
5. 都市計畫別不得影響土地增值稅公式。
6. 若無法判讀都市計畫別，GPTs 應要求使用者補充。
7. PDF 新增都市計畫別欄位後，不得造成土地基本資料區溢出、重疊或欄位空白。

## Prepare PDF AUTH_FAILED

Validate:

1. 呼叫 `gptsPreparePdf` 時必須使用目前登入成功後取得的 sessionToken。
2. 若 Authorization header 不可用，必須把 sessionToken 放入 request body `sessionToken`。
3. 若 `gptsPreparePdf` 回 `AUTH_FAILED`，不得重複亂試或自動產生 PDF。
4. GPTs should ask the user to login again.
5. 重新登入後，必須確認仍有 calculate 結果、土地基本資料、都市計畫別、名片／聯絡資訊，才能再次 prepare-pdf。
6. 不得把 sessionToken 顯示給使用者。

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

PDF visible labels should use:

- 公告土地現值年月 in GPTs prompts
- 公告現值年月 in compact PDF tables
- 自用住宅優惠稅率 10% 情境試算

PDF and GPTs must not show「本次移轉年月」as a user-facing field.

## Cleanup

- Do not commit test PDF files.
- Do not commit test JSON files.
- Do not paste full sessionToken values.
- Do not paste full PDF download URLs.
