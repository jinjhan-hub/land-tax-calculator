# GPTs Action Schema Notes

These notes summarize how GPTs Actions should use the wrapper API. Do not include real auth codes, session tokens, admin tokens, full PDF download URLs, PDF files, or test JSON in this document.

## Preferred Endpoints

GPTs Actions should use only:

- `POST /api/gpts/login`
- `POST /api/gpts/calculate`
- `POST /api/gpts/prepare-pdf`

The older endpoints remain backend implementation details or production smoke-test tools:

- `POST /api/auth/login`
- `POST /api/land-tax/calculate`
- `POST /api/land-tax/pdf`
- `GET /api/land-tax/pdf/download`

## sessionToken Handoff

- `gptsLogin` returns `data.sessionToken`.
- `gptsCalculate` accepts either `Authorization: Bearer <sessionToken>` or body `sessionToken`.
- `gptsPreparePdf` accepts either `Authorization: Bearer <sessionToken>` or body `sessionToken`.
- Authorization header has priority.
- Body `sessionToken` is only a fallback for GPTs Actions that cannot pass Authorization headers reliably.
- Responses must not echo the sessionToken.
- Errors must not include the sessionToken.
- Docs and examples must use only `SESSION_TOKEN_PLACEHOLDER`.

## OpenAPI Requirements

- `servers[0].url` must be `https://land-tax-calculator-xi.vercel.app`.
- Include operation IDs `gptsLogin`, `gptsCalculate`, and `gptsPreparePdf`.
- Keep `gptsCalculate` and `gptsPreparePdf` descriptions under 300 characters.
- Include optional `sessionToken` in `CalculateRequest`.
- Include optional `sessionToken` in `PdfPrepareRequest`.
- Do not require GPTs to parse binary PDF content.

## Login Response

`gptsLogin` returns:

- `success`
- `data.sessionToken`
- `data.store`
- `nextAction = calculate`

Do not display the full sessionToken to the user.

## Calculate Request

`gptsCalculate` requires the calculation fields used by the backend formula:

- `landArea`
- `ownershipNumerator`
- `ownershipDenominator`
- `previousTransferYearMonth`
- `currentTransferYearMonth`
- `previousDeclaredValuePerSqm`
- `currentDeclaredValuePerSqm`
- optional costs
- optional `sessionToken` fallback

For user-facing prompts, do not ask for「本次移轉年月」. Ask for「公告土地現值年月」and map it to API field `currentTransferYearMonth`.

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
- `previousTransferYearMonth`
- `currentTransferYearMonth`
- `previousDeclaredValuePerSqm`
- `currentDeclaredValuePerSqm`

The PDF API rejects requests that would leave these PDF display fields blank:

- `landCityDistrict`
- `landSection`
- `landNumber`
- `landArea`
- `ownershipRange`

GPTs must not call `gptsPreparePdf` until those fields are known. Do not use fake data to fill missing fields.

## Prepare PDF Response

`gptsPreparePdf` returns JSON only:

- `success`
- `data.downloadUrl`
- `data.expiresInMinutes`
- `data.storeProfileSummary`
- `nextAction = download`

The download URL is short-lived. Show it to the user for download, but do not save it, summarize it, or paste it into docs.

## Contact Data And Store Profile

- `businessCardData` is only for contact fields on the PDF.
- Official store disclosure and watermark must come from backend store profile.
- User-provided contact data must not override official brokerage name, broker name, broker license number, or watermark text.

## Transcript Parsing Summary

Detailed rules live in `docs/transcript-parsing-rules.md`. GPTs Instructions must still contain the core rules directly.

Key Action-related reminders:

- Transcript title like `北斗鎮新生段 0318-0000地號` should map to `landSection` and `landNumber`, and to district when county can be verified.
- County may be inferred only from same-page explicit county text, land office text, or address text. Do not guess.
- `權利範圍：全部` should map to `ownershipRange = 1/1` or be displayed as `全部`.
- `公告土地現值年月` maps to API field `currentTransferYearMonth`.
- `公告土地現值` maps to API field `currentDeclaredValuePerSqm`.
- `當期申報地價` must not be used as either announced land value or previous transfer value.
- Registration date, sale date, filing date, and transfer date must not be used as `currentTransferYearMonth`.

## Error Handling

- `AUTH_FAILED`: ask the user to login again.
- `LAND_FIELD_MISSING`: ask for the missing land display fields.
- `TAX_INDEX_NOT_FOUND`: explain that the year-month is not available in production index data; do not self-calculate.
- `PDF_GENERATION_FAILED`: tell the user PDF generation failed and can be retried after checking input.

## V1.6 Production Baseline

- `tax_price_indexes count = 808`
- `first_year_month = 04801`
- `latest_year_month = 11504`
- `11505` should not exist in the sample production dataset
- `previousIndexValue = 9.86`
- `currentIndexValue = 111.23`
- `taxIndexMultiplier = 0.0986`
- `taxIndexMultiplier` means previous tax price index divided by 100; `currentIndexValue` is returned for reference only.
