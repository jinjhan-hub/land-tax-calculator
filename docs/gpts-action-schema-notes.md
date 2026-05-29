# GPTs Action Schema Notes

These notes summarize how GPTs Actions should use the wrapper API. Do not include real auth codes, session tokens, admin tokens, full PDF download URLs, PDF files, or test JSON in this document.

## Preferred Endpoints

GPTs Actions should use only:

- `POST /api/gpts/login`
- `POST /api/gpts/calculate`
- `POST /api/gpts/prepare-pdf`

Older endpoints are backend implementation details or production smoke-test tools. GPTs Actions should not call them directly.

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

For user prompts, ask for `公告土地現值年月` and map it to API field `currentTransferYearMonth`.

`taxIndexMultiplier` is `previousIndexValue / 100`. `currentIndexValue` is returned for reference only and must not be used as the adjustment multiplier.

Do not add or validate against the unconfirmed `10605` Ministry sample. That source has multiple ownership holders and is not a confirmed single-owner `1/1` formula sample.

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

If `useDistrict` and `landUseCategory` are both blank, normalize to `都市計畫內`. If either field has concrete text, normalize to `非都市計畫內`. Urban planning type is for PDF display only and must not affect tax formulas.

## PDF Download Response

`gptsPreparePdf` returns `data.downloadUrl` and `data.expiresInMinutes`.

GPTs should provide the link in the current conversation as:

```text
[下載 PDF 試算報告](downloadUrl)
```

Use the API-returned URL as the markdown target, do not display a naked full URL, and tell the user that the link expires in 15 minutes. Do not store or write the full URL into docs, commits, summaries, logs, or test records.

## Transcript And Prompt Rules

- GPTs must not ask about hidden memory, preferences, restrictions, prior cases, hidden context, or reusing previous data.
- Land tax calculations may use only currently visible conversation data, user-provided data, uploaded transcript content, and API responses.
- Land area must be read from the transcript `面積` field and may include a thousands comma, for example `1,073.77`.
- Do not lose the thousands comma and misread `1,073.77` as `107.77`.
- Calculate payload and prepare-pdf payload must use the same `landArea`.
- If a transcript shows multiple ownership holders, different ownership ranges, or multiple ownership sections, GPTs must ask which ownership holder is being transferred and obtain that holder's ownership range before calling calculate.
- Current self-use result is only `自用住宅優惠稅率 10% 情境試算`, not partial self-use compound-rate logic.
