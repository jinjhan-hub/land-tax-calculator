# 土地增值稅試算報告 PDF 模板 - Pacific V1.1

## V1 開發原則

本階段優先完成：

- 土地增值稅試算
- 稅務專用物價指數匯入
- PDF 固定模板填入
- 短效 PDF 下載連結
- 店家認證整合

本階段不開發：

- 人物照
- 名片圖片處理
- OCR
- GPTs Actions
- 自動同步政府 CPI
- 多筆土地合併試算

## 檔案結構

```text
public/branding/pacific/logo.png
public/templates/land-tax/pacific-v1.pdf
src/templates/land-tax/pacific-v1.fields.ts
src/templates/land-tax/pacific-v1.fields.json
```

## 本版調整

- 業務聯絡資訊只保留：姓名、手機、店名。
- 移除 LINE、公司電話、地址、營業員證號、經紀業字號等欄位。
- 標題列與主要標題採加粗效果。
- 不包含人物照區塊。

## 使用方式

1. 將整個資料夾內容放入 GitHub Repository。
2. Vercel API 讀取 `public/templates/land-tax/pacific-v1.pdf`。
3. 使用 `pdf-lib` 或其他輕量 PDF library，依照 `src/templates/land-tax/pacific-v1.fields.ts` 或 `.json` 的座標填入動態資料。
4. PDF 產出後回傳短效下載連結。

## 注意事項

- 這是固定 A4 版型模板，不是互動式 PDF 表單。
- 座標單位是 PDF points，原點在左下角。
- 模板已包含靜態中文標籤，但動態填入的中文文字仍需在程式端載入支援繁體中文的字型。
- 此 ZIP 不包含字型檔。
- PDF 不包含人物照區塊；名片只用於聯絡資訊文字。
- LOGO 已內嵌於模板，也另存於 `public/branding/pacific/logo.png` 供未來版本使用。
