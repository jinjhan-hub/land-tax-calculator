import fs from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { getRequiredEnv } from "@/lib/env";
import { landTaxPacificV1Template, type PdfFieldSpec } from "@/templates/land-tax/pacific-v1.fields";

type PdfPayload = {
  confirmedLandData: Record<string, unknown>;
  calculationResult: Record<string, unknown>;
  businessCardData: { agentName?: string; phone?: string; storeName?: string };
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

export async function generateLandTaxPdf(payload: PdfPayload): Promise<Uint8Array> {
  const fontPath = getRequiredEnv("PDF_FONT_PATH");
  const templatePath = path.join(process.cwd(), landTaxPacificV1Template.pdfPath.replace(/^\/public\//, "public/"));
  const [templateBytes, fontBytes] = await Promise.all([fs.readFile(templatePath), fs.readFile(fontPath)]);

  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  const pages = pdfDoc.getPages();

  const values: Record<string, unknown> = {
    ...payload.confirmedLandData,
    ...payload.calculationResult,
    agentName: payload.businessCardData.agentName,
    agentPhone: payload.businessCardData.phone,
    storeName: payload.businessCardData.storeName,
    generalEstimatedTax: (payload.calculationResult.generalTaxResult as { estimatedTax?: number } | undefined)?.estimatedTax,
    generalTaxableIncrement: payload.calculationResult.taxableIncrement,
    generalRateNote: (payload.calculationResult.generalTaxResult as { rateNote?: string } | undefined)?.rateNote,
    selfUseEstimatedTax: (payload.calculationResult.selfUseTaxResult as { estimatedTax?: number } | undefined)?.estimatedTax,
    selfUseTaxableIncrement: payload.calculationResult.taxableIncrement,
    selfUseRateNote: (payload.calculationResult.selfUseTaxResult as { rateNote?: string } | undefined)?.rateNote,
    generatedAt: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
  };

  const fields: Record<string, PdfFieldSpec> = landTaxPacificV1Template.fields;
  for (const [fieldName, field] of Object.entries(fields)) {
    const text = valueToText(values[fieldName]);
    if (!text) continue;
    const page = pages[field.page];
    const textWidth = font.widthOfTextAtSize(text, field.fontSize);
    const x = field.align === "right" ? field.x + field.maxWidth - textWidth : field.align === "center" ? field.x + (field.maxWidth - textWidth) / 2 : field.x;
    page.drawText(text, { x: Math.max(field.x, x), y: field.y, size: field.fontSize, font, color: hexToRgb(field.color), maxWidth: field.maxWidth });
  }

  return pdfDoc.save();
}
