# GPTs Action Schema Notes

## Preferred V1.7 Endpoints

GPTs Actions should use the JSON-friendly wrapper endpoints:

- `POST /api/gpts/login`
- `POST /api/gpts/calculate`
- `POST /api/gpts/prepare-pdf`

The wrapper endpoints reuse the existing backend APIs but normalize responses for GPTs. They are the only endpoints that should appear as primary actions in the GPTs OpenAPI schema.

## Legacy Backend APIs

These endpoints remain available as backend/source APIs and for production smoke tests:

- `POST /api/auth/login`
- `POST /api/land-tax/calculate`
- `POST /api/land-tax/pdf`
- `GET /api/land-tax/pdf/download`

GPTs Instructions should not tell the GPT to call the legacy endpoints directly during the normal production flow.

## Wrapper Response Shapes

### `POST /api/gpts/login`

Success:

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

### `POST /api/gpts/calculate`

Success:

```json
{
  "success": true,
  "data": {
    "success": true,
    "formulaVersion": "land-tax-v1.0.0",
    "previousIndexValue": 9.86,
    "currentIndexValue": 111.23,
    "taxIndexMultiplier": 11.280933062880326,
    "currentTotalValue": 500000,
    "adjustedPreviousTotalValue": 1128093.3062880326,
    "taxableIncrement": 0,
    "generalTaxResult": {
      "estimatedTax": 0,
      "rateNote": "RATE_NOTE_PLACEHOLDER"
    },
    "selfUseTaxResult": {
      "estimatedTax": 0,
      "rateNote": "RATE_NOTE_PLACEHOLDER"
    }
  },
  "nextAction": "prepare-pdf"
}
```

### `POST /api/gpts/prepare-pdf`

Success:

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

The wrapper does not return binary PDF content. GPTs should present the short-lived download URL to the user.

## Error Shape

Wrapper errors use:

```json
{
  "success": false,
  "errorCode": "TAX_INDEX_NOT_FOUND",
  "stage": "calculate",
  "sourceStatus": 404
}
```

Login failures may also include `reason`, for example `invalid_auth_code`.

## OpenAPI Requirements

The production schema must:

- Use `https://land-tax-calculator-xi.vercel.app` as the server URL.
- Include operation IDs:
  - `gptsLogin`
  - `gptsCalculate`
  - `gptsPreparePdf`
- Avoid binary PDF download actions as primary GPTs Actions.
- Use placeholders only.
- Avoid real store credentials, session tokens, admin tokens, and full download URLs.

## V1.6 Tax Index Baseline

Documented production baseline:

- `tax_price_indexes count = 808`
- `first_year_month = 04801`
- `latest_year_month = 11504`
- sample Excel range ends at `11504`; therefore `11505` should not exist
- `previousIndexValue = 9.86`
- `currentIndexValue = 111.23`
- `taxIndexMultiplier = 11.280933062880326`

If `TAX_INDEX_NOT_FOUND` appears for a year-month outside this range, the GPT should explain that the production index data does not contain that period.
