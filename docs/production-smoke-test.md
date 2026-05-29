# 正式站 Smoke Test

## 前置注意

正式站：

```text
https://land-tax-calculator-xi.vercel.app
```

PowerShell 測試時：

- 不要把完整 authCode 貼到公開紀錄。
- 不要把完整 `sessionToken` 貼到公開紀錄。
- 不要把完整 PDF `downloadUrl` 貼到公開紀錄。
- 測試 PDF 下載後要刪除。
- 中文 JSON 建議使用 UTF-8。

## 1. API login 測試

```powershell
$base = "https://land-tax-calculator-xi.vercel.app"

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "$base/api/auth/login" `
  -ContentType "application/json; charset=utf-8" `
  -Body (@{
    storeCode = "CH006"
    authCode = "<redacted>"
  } | ConvertTo-Json)

$login.success
$login.store
```

預期：

- `success = True`
- `store.storeCode` 正確
- `store.storeName` 正確
- `store.brokerageName` 正確
- `store.brokerName` 正確
- `store.brokerLicenseNo` 正確
- `store.watermarkText` 正確
- `store.expiresAt` 正確

錯誤密碼測試：

```powershell
$badLogin = Invoke-WebRequest `
  -Method Post `
  -Uri "$base/api/auth/login" `
  -ContentType "application/json; charset=utf-8" `
  -Body (@{
    storeCode = "CH006"
    authCode = "wrong-code"
  } | ConvertTo-Json) `
  -SkipHttpErrorCheck

$badLogin.StatusCode
$badLogin.Content
```

預期：

- HTTP 401
- `errorCode = AUTH_FAILED`
- `reason = invalid_auth_code`

## 2. calculate 測試

```powershell
$token = $login.sessionToken

$calcPayload = @{
  landArea = 100
  ownershipNumerator = 1
  ownershipDenominator = 1
  previousTransferYearMonth = "11301"
  currentTransferYearMonth = "11401"
  previousDeclaredValuePerSqm = 1000
  currentDeclaredValuePerSqm = 1500
  improvementCost = 0
  landReadjustmentCost = 0
  engineeringBenefitFee = 0
}

$calc = Invoke-RestMethod `
  -Method Post `
  -Uri "$base/api/land-tax/calculate" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json; charset=utf-8" `
  -Body ($calcPayload | ConvertTo-Json -Depth 10)

$calc.success
$calc.formulaVersion
$calc.generalTaxResult
$calc.selfUseTaxResult
```

預期：

- `success = True`
- `formulaVersion` 有值
- `generalTaxResult.estimatedTax` 有值
- `selfUseTaxResult.estimatedTax` 有值

## 3. PDF API 測試

```powershell
$pdfPayload = @{
  confirmedLandData = @{
    landCityDistrict = "彰化縣員林市"
    landSection = "測試段"
    landNumber = "123-1"
    landArea = 100
    ownershipRange = "1/1"
    previousTransferYearMonth = "11301"
    currentTransferYearMonth = "11401"
    previousDeclaredValuePerSqm = 1000
    currentDeclaredValuePerSqm = 1500
  }
  calculationResult = $calc
  businessCardData = @{
    agentName = "測試經紀人"
    phone = "0900-000-000"
    storeName = "測試分店"
  }
}

$pdfResult = Invoke-RestMethod `
  -Method Post `
  -Uri "$base/api/land-tax/pdf" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json; charset=utf-8" `
  -Body ($pdfPayload | ConvertTo-Json -Depth 20)

$pdfResult.success
$pdfResult.expiresInMinutes
```

預期：

- `success = True`
- `expiresInMinutes = 15`
- 有 `downloadUrl`

不要在公開回報貼完整 `downloadUrl`。

## 4. PDF download 測試

```powershell
$pdfPath = Join-Path $PWD "tmp-land-tax-smoke.pdf"
Invoke-WebRequest -Uri $pdfResult.downloadUrl -OutFile $pdfPath
Get-Item $pdfPath | Select-Object FullName,Length
```

檢查：

- PDF 可開啟。
- 不應出現 `???`。
- `彰化縣員林市` 正確顯示。
- `測試段` 正確顯示。
- `一般用地稅率` 正確顯示。
- `自用住宅用地稅率` 正確顯示。
- `測試經紀人` 正確顯示。
- `測試分店` 正確顯示。
- 底部揭露資訊正確。
- 浮水印為登入分店的 `watermarkText`。

測完刪除：

```powershell
Remove-Item $pdfPath
```

## 5. PowerShell UTF-8 注意事項

建議：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

API request 使用：

```powershell
-ContentType "application/json; charset=utf-8"
```

若 PowerShell 顯示亂碼，但 PDF 內文字正常，優先以 PDF 視覺檢查為準。

## 6. 驗收回報格式

建議回報：

- login 成功或失敗。
- store profile 是否正確。
- calculate 是否成功。
- PDF API 是否成功。
- PDF download 是否成功。
- PDF 是否無 `???`。
- 店家揭露資訊是否正確。
- 浮水印是否正確。
- 測試 PDF 是否已刪除。
