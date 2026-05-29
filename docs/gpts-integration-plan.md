# GPTs Integration Plan

## Production Flow

The production GPTs flow must use the JSON-friendly wrapper endpoints:

1. `POST /api/gpts/login`
2. `POST /api/gpts/calculate`
3. `POST /api/gpts/prepare-pdf`
4. Present the short-lived `downloadUrl` to the user.

The GPTs should not call these legacy endpoints directly in the normal Action flow:

- `POST /api/auth/login`
- `POST /api/land-tax/calculate`
- `POST /api/land-tax/pdf`

Those legacy endpoints remain the backend source APIs and may be used for production smoke tests or compatibility checks.

## Responsibilities

GPTs is the primary user interaction layer. The Vercel API is the source of truth for authentication, calculation, store profile lookup, and PDF preparation.

GPTs may:

- Guide users through login.
- Collect and normalize land data.
- Call wrapper APIs.
- Explain API results in plain Traditional Chinese.
- Provide a short-lived PDF download link when requested.

GPTs must not:

- Recalculate or replace the land tax formula.
- Trust user-entered store disclosure data.
- Ask for or send `userCode`.
- Save credentials, session tokens, admin tokens, or full PDF download URLs.
- Save test PDF or JSON files.
- Call `/api/cpi/upload-excel`.

## Step 1: Login

Use:

```text
POST /api/gpts/login
```

Request uses `storeCode` and the store credential field defined in the Action schema. The backend still fixes `userCode = STORE`.

Success response shape:

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

The GPTs may summarize the store name to the user, but must not reveal the full session token.

## Step 2: Calculate

Use:

```text
POST /api/gpts/calculate
Authorization: Bearer <sessionToken>
```

Required input:

- `landArea`
- `ownershipNumerator`
- `ownershipDenominator`
- `previousTransferYearMonth`
- `currentTransferYearMonth`
- `previousDeclaredValuePerSqm`
- `currentDeclaredValuePerSqm`

Optional cost fields:

- `improvementCost`
- `landReadjustmentCost`
- `engineeringBenefitFee`

Do not send `isSelfUseResidential`.

## Step 3: Prepare PDF

Use:

```text
POST /api/gpts/prepare-pdf
Authorization: Bearer <sessionToken>
```

Request body includes:

- `confirmedLandData`
- `calculationResult`
- optional `businessCardData`

The store disclosure text and watermark are resolved by the backend from the session store profile. GPTs must not provide official store disclosure fields in the request.

Success response shape:

```json
{
  "success": true,
  "data": {
    "downloadUrl": "PDF_DOWNLOAD_URL_PLACEHOLDER",
    "expiresInMinutes": 15,
    "storeProfileSummary": {
      "storeCode": "CH006",
      "storeName": "STORE_NAME_PLACEHOLDER"
    }
  },
  "nextAction": "download"
}
```

## Download URL Handling

The `downloadUrl` is short-lived and user-facing only. It must not be stored in files, docs, logs, or long-term memory.

GPTs should not parse the binary PDF response. If a user needs the PDF, provide the short-lived link and explain that it expires.

## V1.6 Production Tax Index Baseline

The accepted production tax index baseline is:

- `tax_price_indexes count = 808`
- `first_year_month = 04801`
- `latest_year_month = 11504`
- The sample Excel range ends at `11504`; therefore `11505` should not exist.
- Smoke pair: `previousTransferYearMonth = 04801`, `currentTransferYearMonth = 11504`
- `previousIndexValue = 9.86`
- `currentIndexValue = 111.23`
- `taxIndexMultiplier = 11.280933062880326`

If GPTs receives `TAX_INDEX_NOT_FOUND`, it should ask the user to verify the year-month values or ask an operator to check the production tax index data. GPTs must not invent missing index values.

## Error Handling

Login errors:

- `AUTH_FAILED`
- `missing_credentials`
- `invalid_auth_code`
- `store_user_not_found`
- `store_user_inactive`
- `store_user_expired`
- `invalid_auth_hash`
- `store_auth_error`

Calculate errors:

- `AUTH_FAILED`
- `LAND_FIELD_MISSING`
- `TAX_INDEX_NOT_FOUND`
- `CALCULATION_FAILED`

PDF errors:

- `AUTH_FAILED`
- `PDF_GENERATION_FAILED`

Download errors:

- `PDF_TOKEN_EXPIRED`
- `PDF_TOKEN_INVALID`
