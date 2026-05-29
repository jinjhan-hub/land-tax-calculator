import type { NextApiRequest, NextApiResponse } from "next";
import { requireSession } from "@/lib/api/auth";
import { toErrorCode } from "@/lib/api/errors";
import { fetchStoreProfileByCodes } from "@/lib/auth/store-users";
import { generateLandTaxPdf } from "@/lib/pdf/generate-land-tax-pdf";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { encryptPdfData } from "@/lib/tokens/pdf-encryption";
import { createPdfDownloadToken, PDF_TOKEN_TTL_MINUTES } from "@/lib/tokens/pdf-token";

const FORBIDDEN_INPUT_KEYS = ["image", "base64", "businessCardImageUrl", "openaiFileIdRefs", "portraitAvailable", "portraitCropArea"];

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

    const storeProfile = await fetchStoreProfileByCodes(session.storeCode, session.userCode);
    const pdfBytes = await generateLandTaxPdf(req.body, storeProfile);
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
