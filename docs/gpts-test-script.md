# V1.7.1 GPTs Action Test Script

This script verifies GPTs wrapper behavior, sessionToken handoff, transcript parsing prompts, and safety rules. Do not paste real store credentials, full session tokens, full download URLs, PDF files, or test JSON into Git.

## Production Wrapper Flow

Use only:

1. `POST /api/gpts/login`
2. `POST /api/gpts/calculate`
3. `POST /api/gpts/prepare-pdf`
4. Present the short-lived `downloadUrl` to the user.

Do not use the legacy endpoints directly in the GPTs Action flow.

## Baseline Data

V1.6 production tax index baseline:

- `tax_price_indexes count = 808`
- `first_year_month = 04801`
- `latest_year_month = 11504`
- sample Excel range ends at `11504`; therefore `11505` should not exist
- normal calculate smoke pair: `04801` to `11504`
- `previousIndexValue = 9.86`
- `currentIndexValue = 111.23`
- `taxIndexMultiplier = 11.280933062880326`

## 1. Wrapper Login Success

Action:

```text
gptsLogin
```

Use store code `CH006` and enter the store credential privately in the GPTs Action UI.

Expected:

- `success = true`
- `data.sessionToken` exists
- `data.store.storeCode = CH006`
- `data.store.storeName` exists
- `nextAction = calculate`
- GPTs does not display the full `data.sessionToken`

## 2. Wrapper Login Failure

Action:

```text
gptsLogin
```

Use `CH006` with an intentionally wrong credential.

Expected:

- HTTP 401
- `success = false`
- `errorCode = AUTH_FAILED`
- `reason = invalid_auth_code`
- `stage = login`
- GPTs does not guess or reveal the correct credential

## 3. Wrapper Calculate Success With Authorization Header

Action:

```text
gptsCalculate
Authorization: Bearer <sessionToken>
```

Payload values:

- `landArea = 100`
- `ownershipNumerator = 1`
- `ownershipDenominator = 1`
- `previousTransferYearMonth = 04801`
- `currentTransferYearMonth = 11504`
- `previousDeclaredValuePerSqm = 1000`
- `currentDeclaredValuePerSqm = 5000`
- costs can be `0`

Expected:

- `success = true`
- `data.success = true`
- `data.formulaVersion = land-tax-v1.0.0`
- `data.previousIndexValue = 9.86`
- `data.currentIndexValue = 111.23`
- `data.taxIndexMultiplier = 11.280933062880326`
- `nextAction = prepare-pdf`

## 4. Wrapper Calculate Success With Body sessionToken

If GPTs Actions cannot send Authorization headers, call `gptsCalculate` with the same payload plus:

```json
{
  "sessionToken": "SESSION_TOKEN_PLACEHOLDER"
}
```

Expected:

- same success criteria as header-based calculate
- response does not echo the sessionToken
- logs and errors do not expose the sessionToken

## 5. Wrapper Calculate Missing Token

Call `gptsCalculate` without Authorization header and without body `sessionToken`.

Expected:

- HTTP 401
- `success = false`
- `errorCode = AUTH_FAILED`
- `stage = calculate`
- GPTs must not calculate by itself

## 6. Wrapper TAX_INDEX_NOT_FOUND

Use a nonexistent year-month such as:

- `previousTransferYearMonth = 99912`
- `currentTransferYearMonth = 11504`

Expected:

- HTTP 404
- `success = false`
- `errorCode = TAX_INDEX_NOT_FOUND`
- `stage = calculate`
- `sourceStatus = 404`
- GPTs must not invent missing index values or calculate by itself

## 7. Wrapper Prepare PDF With Authorization Header

Action:

```text
gptsPreparePdf
Authorization: Bearer <sessionToken>
```

Use:

- `confirmedLandData`
- `calculationResult` from `gptsCalculate.data`
- optional `businessCardData`

Expected:

- `success = true`
- `data.downloadUrl` exists
- `data.expiresInMinutes = 15`
- `data.storeProfileSummary` exists
- `nextAction = download`
- GPTs does not paste the full `data.downloadUrl` into notes

## 8. Wrapper Prepare PDF With Body sessionToken

If GPTs Actions cannot send Authorization headers, call `gptsPreparePdf` with the same payload plus:

```json
{
  "sessionToken": "SESSION_TOKEN_PLACEHOLDER"
}
```

Expected:

- same success criteria as header-based prepare PDF
- response does not echo the sessionToken
- logs and errors do not expose the sessionToken

## 9. Wrapper Prepare PDF Missing Token

Call `gptsPreparePdf` without Authorization header and without body `sessionToken`.

Expected:

- HTTP 401
- `success = false`
- `errorCode = AUTH_FAILED`
- `stage = prepare-pdf`

## 10. Transcript Prompt Behavior

After login success and before complete land data exists, GPTs prompt must:

- not show `本次移轉年月`
- show `公告土地現值年月`
- show `公告土地現值（元／平方公尺）`
- not ask `是否延續先前案件`
- not require the user to understand session, case continuation, or workflow state

Expected user-facing prompt style:

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

## 11. Transcript Parsing Behavior

Verify:

1. `****` does not automatically mean masked or unreadable data.
2. `公告土地現值` reads the ROC year-month and amount from the same line.
3. `前次移轉現值或原規定地價` reads the following line.
4. `當期申報地價` is not used as 公告土地現值.
5. `當期申報地價` is not used as 前次移轉現值.
6. 登記日期、買賣日期、送件日期不得作為公告土地現值年月。
7. If a transcript is uploaded, GPTs parses it first and does not repeatedly ask for fields already available from the transcript.

## 12. PDF Handling

The wrapper returns JSON only. GPTs should not parse binary PDF content.

If the user needs the PDF:

- Present the short-lived download link.
- Tell the user it expires.
- Do not save the PDF.
- Do not commit PDF or JSON test payload files.

## 13. Cleanup

After testing:

- Delete any downloaded PDF.
- Delete any temporary JSON payload.
- Do not commit secrets, tokens, download links, PDFs, or JSON files.
