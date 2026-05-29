# GPTs Action Schema Notes

## Preferred Endpoints

GPTs Actions should use:

- `POST /api/gpts/login`
- `POST /api/gpts/calculate`
- `POST /api/gpts/prepare-pdf`

Legacy endpoints remain backend/source APIs and production smoke-test tools only.

## sessionToken Handoff

GPTs Builder may not reliably pass Authorization headers between actions. For this reason:

- `gptsCalculate` accepts either `Authorization: Bearer <sessionToken>` or body `sessionToken`.
- `gptsPreparePdf` accepts either `Authorization: Bearer <sessionToken>` or body `sessionToken`.
- Authorization header takes priority.
- Body `sessionToken` is only a fallback.
- Responses must not echo the sessionToken.
- Errors must not include the sessionToken.
- Docs and examples must use only `SESSION_TOKEN_PLACEHOLDER`.

## OpenAPI Requirements

The production schema must:

- Use server URL `https://land-tax-calculator-xi.vercel.app`.
- Include operation IDs `gptsLogin`, `gptsCalculate`, and `gptsPreparePdf`.
- Keep `gptsCalculate` and `gptsPreparePdf` descriptions under 300 characters.
- Include optional `sessionToken` in `CalculateRequest`.
- Include optional `sessionToken` in `PdfPrepareRequest`.
- Avoid binary PDF download actions as primary GPTs Actions.
- Use placeholders only.
- Avoid real store credentials, session tokens, admin tokens, and full download URLs.

## Wrapper Response Summary

`gptsLogin` returns:

- `success`
- `data.sessionToken`
- `data.store`
- `nextAction = calculate`

`gptsCalculate` returns:

- `success`
- `data`
- `nextAction = prepare-pdf`

`gptsPreparePdf` returns:

- `success`
- `data.downloadUrl`
- `data.expiresInMinutes`
- `data.storeProfileSummary`
- `nextAction = download`

## Transcript Parsing Summary

Full rules live in `docs/transcript-parsing-rules.md`. GPTs Instructions must still include the core rules directly.

Schema and Action notes only need these reminders:

- User prompts should say `公告土地現值年月`, not `本次移轉年月`.
- GPTs must not use registration date, sale date, filing date, or transfer date as 公告土地現值年月.
- `****` in transcripts is often a fixed format marker, not proof that data is masked.
- `公告土地現值` should be parsed from the line containing `公告土地現值`.
- `前次移轉現值或原規定地價` usually reads from the following line.
- `當期申報地價` must not be used as 公告土地現值 or 前次移轉現值.
- GPTs should not ask whether to continue a previous case; it should manage state internally.

## V1.6 Tax Index Baseline

- `tax_price_indexes count = 808`
- `first_year_month = 04801`
- `latest_year_month = 11504`
- sample Excel range ends at `11504`; therefore `11505` should not exist
- `previousIndexValue = 9.86`
- `currentIndexValue = 111.23`
- `taxIndexMultiplier = 11.280933062880326`
