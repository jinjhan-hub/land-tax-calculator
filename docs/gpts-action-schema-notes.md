# GPTs Action Schema Notes

These notes summarize how GPTs Actions should use the wrapper API. Do not include real auth codes, session tokens, admin tokens, full PDF download URLs, PDF files, or test JSON in this document.

## Preferred Endpoints

GPTs Actions should use only:

- `POST /api/gpts/login`
- `POST /api/gpts/calculate`
- `POST /api/gpts/prepare-pdf`

## sessionToken Handoff

- `gptsLogin` returns `data.sessionToken`.
- `gptsCalculate` accepts either `Authorization: Bearer <sessionToken>` or body `sessionToken`.
- `gptsPreparePdf` accepts either `Authorization: Bearer <sessionToken>` or body `sessionToken`.
- Authorization header has priority.
- Body `sessionToken` is only a fallback for GPTs Actions that cannot pass Authorization headers reliably.
- If `gptsPreparePdf` returns `AUTH_FAILED`, GPTs must not retry blindly; ask the user to login again.
- Responses and errors must not echo the sessionToken.
- Examples must use only `SESSION_TOKEN_PLACEHOLDER`.

## Calculate Request

For user-facing prompts, do not ask for「本次移轉年月」. Ask for「公告土地現值年月」and map it to API field `currentTransferYearMonth`.

`taxIndexMultiplier` is `previousIndexValue / 100`. `currentIndexValue` is returned for reference only.

## Prepare PDF Request

`gptsPreparePdf` requires:

- `confirmedLandData`
- `calculationResult`
- optional `businessCardData`
- optional `sessionToken` fallback

`confirmedLandData` should include:

- `landCityDistrict`
- `landSection`
- `landNumber`
- `landArea`
- `ownershipRange`
- `landUrbanPlanningLabel`
- `previousTransferYearMonth`
- `currentTransferYearMonth`
- `previousDeclaredValuePerSqm`
- `currentDeclaredValuePerSqm`

Urban planning fields:

- `useDistrict` = 使用分區
- `landUseCategory` = 使用地類別
- `landUrbanPlanningLabel` = 都市計畫內 / 非都市計畫內

If `useDistrict` and `landUseCategory` are both blank, normalize to 都市計畫內. If either field has concrete text, normalize to 非都市計畫內. Urban planning type is for PDF display only and must not affect tax formulas.

## Transcript And Prompt Rules

- GPTs must not ask about hidden memory, preferences, restrictions, prior cases, hidden context, or reusing previous data.
- Land area must be read from the transcript 面積欄位 and may include a thousands comma, for example `1,073.77`.
- Do not lose the thousands comma and misread `1,073.77` as `107.77`.
- Calculate payload and prepare-pdf payload must use the same `landArea`.
- Current self-use result is only 「自用住宅優惠稅率 10% 情境試算」, not partial self-use compound-rate logic.
