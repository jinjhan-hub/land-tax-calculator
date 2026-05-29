import type { NextApiRequest, NextApiResponse } from "next";
import { requireSession } from "@/lib/api/auth";
import { toErrorCode } from "@/lib/api/errors";
import { fetchStoreProfileByCodes } from "@/lib/auth/store-users";
import { generateLandTaxPdf } from "@/lib/pdf/generate-land-tax-pdf";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { encryptPdfData } from "@/lib/tokens/pdf-encryption";
import { createPdfDownloadToken, PDF_TOKEN_TTL_MINUTES } from "@/lib/tokens/pdf-token";

const FORBIDDEN_INPUT_KEYS = ["image", "base64", "businessCardImageUrl", "openaiFileIdRefs", "portraitAvailable", "portraitCropArea"];
const REQUIRED_PDF_LAND_FIELDS = ["landCityDistrict", "landSection", "landNumber", "landArea", "ownershipRange", "landUrbanPlanningLabel"] as const;

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function firstValue(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (cleanText(value)) return value;
  }
  return undefined;
}

function hasOwn(source: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function normalizeOwnershipRange(value: unknown): unknown {
  const text = cleanText(value);
  if (!text) return value;
  return text === "全部" ? "1/1" : text;
}

function normalizeUrbanPlanningLabel(landData: Record<string, unknown>): unknown {
  const explicitLabel = cleanText(firstValue(landData, ["landUrbanPlanningLabel", "urbanPlanningLabel"]));
  if (explicitLabel === "都市計畫內" || explicitLabel === "非都市計畫內") return explicitLabel;

  const explicitType = cleanText(firstValue(landData, ["landUrbanPlanningType", "urbanPlanningType"]));
  if (explicitType === "urban") return "都市計畫內";
  if (explicitType === "nonUrban") return "非都市計畫內";

  const hasUseDistrict = hasOwn(landData, "useDistrict");
  const hasLandUseCategory = hasOwn(landData, "landUseCategory");
  if (hasUseDistrict || hasLandUseCategory) {
    const useDistrict = cleanText(landData.useDistrict);
    const landUseCategory = cleanText(landData.landUseCategory);
    return useDistrict || landUseCategory ? "非都市計畫內" : "都市計畫內";
  }

  return undefined;
}

function normalizePdfPayload(body: unknown): Record<string, unknown> {
  const payload = body && typeof body === "object" && !Array.isArray(body) ? { ...(body as Record<string, unknown>) } : {};
  const rawLandData =
    payload.confirmedLandData && typeof payload.confirmedLandData === "object" && !Array.isArray(payload.confirmedLandData)
      ? (payload.confirmedLandData as Record<string, unknown>)
      : {};
  const confirmedLandData = { ...rawLandData };

  confirmedLandData.landCityDistrict = firstValue(confirmedLandData, ["landCityDistrict", "cityDistrict", "countyDistrict", "landLocation"]);
  confirmedLandData.landSection = firstValue(confirmedLandData, ["landSection", "section", "landSectionName"]);
  confirmedLandData.landNumber = firstValue(confirmedLandData, ["landNumber", "landNo", "lotNumber", "cadastralNumber"]);
  confirmedLandData.landArea = firstValue(confirmedLandData, ["landArea", "area", "landAreaSqm"]);
  confirmedLandData.ownershipRange = normalizeOwnershipRange(firstValue(confirmedLandData, ["ownershipRange", "rightScope", "rightsRange"]));
  confirmedLandData.landUrbanPlanningLabel = normalizeUrbanPlanningLabel(confirmedLandData);
  confirmedLandData.currentTransferYearMonth = firstValue(confirmedLandData, [
    "currentTransferYearMonth",
    "announcedLandValueYearMonth",
    "currentAnnouncedLandValueYearMonth",
  ]);
  confirmedLandData.previousTransferYearMonth = firstValue(confirmedLandData, ["previousTransferYearMonth", "previousTransferYm"]);
  confirmedLandData.previousDeclaredValuePerSqm = firstValue(confirmedLandData, [
    "previousDeclaredValuePerSqm",
    "previousTransferValuePerSqm",
    "previousDeclaredLandValuePerSqm",
  ]);
  confirmedLandData.currentDeclaredValuePerSqm = firstValue(confirmedLandData, [
    "currentDeclaredValuePerSqm",
    "announcedLandValuePerSqm",
    "currentAnnouncedLandValuePerSqm",
  ]);

  return { ...payload, confirmedLandData };
}

function getMissingPdfLandFields(body: Record<string, unknown>): string[] {
  const landData = body.confirmedLandData as Record<string, unknown> | undefined;
  if (!landData) return [...REQUIRED_PDF_LAND_FIELDS];
  return REQUIRED_PDF_LAND_FIELDS.filter((field) => !cleanText(landData[field]));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, errorCode: "UNKNOWN_ERROR" });
  }

  try {
    const session = requireSession(req);
    const rawBody = JSON.stringify(req.body ?? {});
    if (FORBIDDEN_INPUT_KEYS.some((key) => rawBody.includes(key))) {
      return res.status(400).json({ success: false, errorCode: "PDF_GENERATION_FAILED" });
    }

    const pdfPayload = normalizePdfPayload(req.body);
    const missingFields = getMissingPdfLandFields(pdfPayload);
    if (missingFields.length > 0) {
      return res.status(400).json({ success: false, errorCode: "LAND_FIELD_MISSING", missingFields });
    }

    const storeProfile = await fetchStoreProfileByCodes(session.storeCode, session.userCode);
    const pdfBytes = await generateLandTaxPdf(pdfPayload, storeProfile);
    const { token, tokenHash, expiresAt } = createPdfDownloadToken();
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("land_tax_temp_pdf_files").insert({
      token_hash: tokenHash,
      encrypted_pdf_data: encryptPdfData(pdfBytes),
      expires_at: expiresAt,
    });
    if (error) throw error;

    const host = req.headers["x-forwarded-host"] ?? req.headers.host;
    const protocol = req.headers["x-forwarded-proto"] ?? "https";
    return res.status(200).json({
      success: true,
      downloadUrl: `${protocol}://${host}/api/land-tax/pdf/download?token=${token}`,
      expiresInMinutes: PDF_TOKEN_TTL_MINUTES,
    });
  } catch (error) {
    console.error("[land-tax-pdf]", error instanceof Error ? error.message : String(error));

    return res.status(error instanceof Error && error.message === "AUTH_FAILED" ? 401 : 400).json({
      success: false,
      errorCode: toErrorCode(error, "PDF_GENERATION_FAILED"),
    });
  }
}
