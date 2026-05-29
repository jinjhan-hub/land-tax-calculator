import fs from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { degrees, PDFDocument, rgb } from "pdf-lib";
import type { StoreProfile } from "@/lib/auth/store-users";
import { createStoreDisclosureLines, resolveWatermarkText } from "@/lib/pdf/store-profile-text";
import { landTaxPacificV1Template, type PdfFieldSpec } from "@/templates/land-tax/pacific-v1.fields";

const DEFAULT_PDF_FONT_PATH = "assets/fonts/NotoSansTC-Regular.ttf";
const CJK_PATTERN = /[\u3400-\u9fff]/;

type PdfPayload = {
  confirmedLandData?: Record<string, unknown>;
  calculationResult?: Record<string, unknown>;
  businessCardData?: { agentName?: string; phone?: string; storeName?: string };
};

function valueToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("zh-TW") : "";
  return String(value);
}

function hexToRgb(color?: string) {
  const clean = (color ?? "#222222").replace("#", "");
  return rgb(parseInt(clean.slice(0, 2), 16) / 255, parseInt(clean.slice(2, 4), 16) / 255, parseInt(clean.slice(4, 6), 16) / 255);
}

function resolvePdfFontPath() {
  const configuredPath = process.env.PDF_FONT_PATH?.trim() || DEFAULT_PDF_FONT_PATH;
  return path.isAbsolute(configuredPath) ? configuredPath : path.join(process.cwd(), configuredPath);
}

function debugPdf(...args: unknown[]) {
  if (process.env.PDF_DEBUG === "true") {
    console.info("[land-tax-pdf]", ...args);
  }
}

export async function generateLandTaxPdf(payload: PdfPayload, storeProfile?: StoreProfile | null): Promise<Uint8Array> {
  const confirmedLandData = payload.confirmedLandData ?? {};
  const calculationResult = payload.calculationResult ?? {};
  const businessCardData = payload.businessCardData ?? {};
  const fontPath = resolvePdfFontPath();
  const templatePath = path.join(process.cwd(), landTaxPacificV1Template.pdfPath.replace(/^\/public\//, "public/"));
  const [templateBytes, fontBytes] = await Promise.all([fs.readFile(templatePath), fs.readFile(fontPath)]);

  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);
  const cjkFont = await pdfDoc.embedFont(fontBytes, { subset: false });
  debugPdf("font", {
    fontPath,
    fontBytesLength: fontBytes.length,
    fontConstructor: cjkFont.constructor.name,
    fontName: cjkFont.name,
  });
  const pages = pdfDoc.getPages();

  const values: Record<string, unknown> = {
    ...confirmedLandData,
    ...calculationResult,
    agentName: businessCardData.agentName ?? "",
    agentPhone: businessCardData.phone ?? "",
    storeName: businessCardData.storeName ?? "",
    generalEstimatedTax: (calculationResult.generalTaxResult as { estimatedTax?: number } | undefined)?.estimatedTax,
    generalTaxableIncrement: calculationResult.taxableIncrement,
    generalRateNote: (calculationResult.generalTaxResult as { rateNote?: string } | undefined)?.rateNote,
    selfUseEstimatedTax: (calculationResult.selfUseTaxResult as { estimatedTax?: number } | undefined)?.estimatedTax,
    selfUseTaxableIncrement: calculationResult.taxableIncrement,
    selfUseRateNote: (calculationResult.selfUseTaxResult as { rateNote?: string } | undefined)?.rateNote,
    generatedAt: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
  };

  const fields: Record<string, PdfFieldSpec> = landTaxPacificV1Template.fields;
  for (const [fieldName, field] of Object.entries(fields)) {
    const text = valueToText(values[fieldName]);
    if (!text) continue;
    if (CJK_PATTERN.test(text)) {
      debugPdf("field", { fieldName, text });
    }
    const page = pages[field.page];
    const textWidth = cjkFont.widthOfTextAtSize(text, field.fontSize);
    const x = field.align === "right" ? field.x + field.maxWidth - textWidth : field.align === "center" ? field.x + (field.maxWidth - textWidth) / 2 : field.x;
    page.drawText(text, { x: Math.max(field.x, x), y: field.y, size: field.fontSize, font: cjkFont, color: hexToRgb(field.color), maxWidth: field.maxWidth });
  }

  const watermarkText = resolveWatermarkText(storeProfile);
  const disclosureLines = createStoreDisclosureLines(storeProfile);
  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(watermarkText, {
      x: width * 0.16,
      y: height * 0.44,
      size: 34,
      font: cjkFont,
      color: rgb(0.62, 0.68, 0.75),
      opacity: 0.18,
      rotate: degrees(32),
    });
  }

  if (disclosureLines.length > 0) {
    const page = pages[pages.length - 1];
    const { width } = page.getSize();
    disclosureLines.forEach((line, index) => {
      page.drawText(line, {
        x: 36,
        y: 24 - index * 13,
        size: 9,
        font: cjkFont,
        color: rgb(0.28, 0.32, 0.38),
        maxWidth: width - 72,
      });
    });
  }

  return pdfDoc.save({ useObjectStreams: false });
}
