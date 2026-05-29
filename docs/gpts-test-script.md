# V1.7 GPTs Action Test Script

This script verifies the production GPTs wrapper flow. Do not paste real store credentials, full session tokens, full download URLs, PDF files, or test JSON into Git.

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

Do not paste the full session token into test notes.

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

Do not guess or reveal the correct credential.

## 3. Wrapper Calculate Success

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

## 4. Wrapper TAX_INDEX_NOT_FOUND

Action:

```text
gptsCalculate
Authorization: Bearer <sessionToken>
```

Use a nonexistent year-month such as:

- `previousTransferYearMonth = 99912`
- `currentTransferYearMonth = 11504`

Expected:

- HTTP 404
- `success = false`
- `errorCode = TAX_INDEX_NOT_FOUND`
- `stage = calculate`
- `sourceStatus = 404`

GPTs should ask the user to verify the year-month values or ask operations to check tax index data. GPTs must not invent missing index values.

## 5. Wrapper Prepare PDF

Action:

```text
gptsPreparePdf
Authorization: Bearer <sessionToken>
```

Use:

- `confirmedLandData` with display fields such as city district, section, land number, area, ownership range, and year-month values.
- `calculationResult` from `gptsCalculate.data`.
- optional `businessCardData`.

Expected:

- `success = true`
- `data.downloadUrl` exists
- `data.expiresInMinutes = 15`
- `data.storeProfileSummary` exists
- `nextAction = download`

Do not paste the full `data.downloadUrl` into test notes.

## 6. PDF Handling

The wrapper returns JSON only. GPTs should not parse binary PDF content.

If the user needs the PDF:

- Present the short-lived download link.
- Tell the user it expires.
- Do not save the PDF.
- Do not commit PDF or JSON test payload files.

## 7. Visual Checks

When a human opens the PDF, verify:

- No `???`.
- Land data Chinese text displays correctly.
- Store disclosure appears at the bottom.
- Watermark uses the logged-in store profile.

## 8. Cleanup

After testing:

- Delete any downloaded PDF.
- Delete any temporary JSON payload.
- Do not commit secrets, tokens, download links, PDFs, or JSON files.
