# Production Smoke Test

Production site:

```text
https://land-tax-calculator-xi.vercel.app
```

This smoke test is for human verification. The production GPTs flow should use `/api/gpts/*` wrapper endpoints.

## Safety

Do not save or commit:

- Store credentials.
- Session tokens.
- Admin upload tokens.
- Full PDF download URLs.
- Test PDF files.
- Test JSON files.

Do not call:

```text
POST /api/cpi/upload-excel
```

Do not modify production `tax_price_indexes`.

## UTF-8 PowerShell Setup

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$base = "https://land-tax-calculator-xi.vercel.app"
```

Use:

```powershell
-ContentType "application/json; charset=utf-8"
```

## 1. Wrapper Login

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri "$base/api/gpts/login" `
  -ContentType "application/json; charset=utf-8" `
  -Body (@{
    storeCode = "CH006"
    authCode = "<redacted>"
  } | ConvertTo-Json)

$login.success
$login.data.store
```

Expected:

- `success = True`
- `data.sessionToken` exists
- `data.store` is correct
- `nextAction = calculate`

Do not paste the full session token into notes.

## 2. Wrapper Calculate

Use the V1.6 production baseline pair:

```powershell
$token = $login.data.sessionToken

$calcPayload = @{
  landArea = 100
  ownershipNumerator = 1
  ownershipDenominator = 1
  previousTransferYearMonth = "04801"
  currentTransferYearMonth = "11504"
  previousDeclaredValuePerSqm = 1000
  currentDeclaredValuePerSqm = 5000
  improvementCost = 0
  landReadjustmentCost = 0
  engineeringBenefitFee = 0
}

$calc = Invoke-RestMethod `
  -Method Post `
  -Uri "$base/api/gpts/calculate" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json; charset=utf-8" `
  -Body ($calcPayload | ConvertTo-Json -Depth 10)

$calc.success
$calc.data.formulaVersion
$calc.data.previousIndexValue
$calc.data.currentIndexValue
$calc.data.taxIndexMultiplier
$calc.nextAction
```

Expected:

- `success = True`
- `data.success = True`
- `data.formulaVersion = land-tax-v1.0.0`
- `data.previousIndexValue = 9.86`
- `data.currentIndexValue = 111.23`
- `data.taxIndexMultiplier = 11.280933062880326`
- `nextAction = prepare-pdf`

## 3. Wrapper TAX_INDEX_NOT_FOUND

```powershell
$badCalcPayload = $calcPayload.Clone()
$badCalcPayload.previousTransferYearMonth = "99912"

$badCalc = Invoke-WebRequest `
  -Method Post `
  -Uri "$base/api/gpts/calculate" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json; charset=utf-8" `
  -Body ($badCalcPayload | ConvertTo-Json -Depth 10) `
  -SkipHttpErrorCheck

$badCalc.StatusCode
$badCalc.Content
```

Expected:

- HTTP 404
- `success = false`
- `errorCode = TAX_INDEX_NOT_FOUND`
- `stage = calculate`
- `sourceStatus = 404`

## 4. Wrapper Prepare PDF

```powershell
$pdfPayload = @{
  confirmedLandData = @{
    landCityDistrict = "彰化縣員林市"
    landSection = "測試段"
    landNumber = "123-1"
    landArea = 100
    ownershipRange = "1/1"
    previousTransferYearMonth = "04801"
    currentTransferYearMonth = "11504"
    previousDeclaredValuePerSqm = 1000
    currentDeclaredValuePerSqm = 5000
  }
  calculationResult = $calc.data
  businessCardData = @{
    agentName = "測試經紀人"
    phone = "0900-000-000"
    storeName = "測試分店"
  }
}

$pdfResult = Invoke-RestMethod `
  -Method Post `
  -Uri "$base/api/gpts/prepare-pdf" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json; charset=utf-8" `
  -Body ($pdfPayload | ConvertTo-Json -Depth 20)

$pdfResult.success
$pdfResult.data.expiresInMinutes
$pdfResult.data.storeProfileSummary
$pdfResult.nextAction
```

Expected:

- `success = True`
- `data.downloadUrl` exists
- `data.expiresInMinutes = 15`
- `data.storeProfileSummary` is correct
- `nextAction = download`

Do not paste the full download URL into notes.

## 5. PDF Visual Check

If a human downloads the PDF, delete it immediately after verification.

Check:

- No `???`.
- Land data Chinese text displays correctly.
- Business card Chinese text displays correctly.
- Store disclosure is correct.
- Watermark is correct.

Do not commit the PDF.

## 6. V1.6 Production Tax Index Baseline

- `tax_price_indexes count = 808`
- `first_year_month = 04801`
- `latest_year_month = 11504`
- sample Excel range ends at `11504`; therefore `11505` should not exist
- smoke pair `04801` to `11504`
- `previousIndexValue = 9.86`
- `currentIndexValue = 111.23`
- `taxIndexMultiplier = 11.280933062880326`
