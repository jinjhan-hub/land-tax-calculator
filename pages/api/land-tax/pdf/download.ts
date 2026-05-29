import type { NextApiRequest, NextApiResponse } from "next";
import { toErrorCode } from "@/lib/api/errors";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { decryptPdfData } from "@/lib/tokens/pdf-encryption";
import { hashPdfDownloadToken } from "@/lib/tokens/pdf-token";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, errorCode: "UNKNOWN_ERROR" });
  }

  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) return res.status(401).json({ success: false, errorCode: "PDF_TOKEN_INVALID" });

    const supabase = createSupabaseAdminClient();
    const tokenHash = hashPdfDownloadToken(token);
    const { data, error } = await supabase
      .from("land_tax_temp_pdf_files")
      .select("id, encrypted_pdf_data, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(401).json({ success: false, errorCode: "PDF_TOKEN_INVALID" });
    if (new Date(data.expires_at).getTime() <= Date.now()) return res.status(410).json({ success: false, errorCode: "PDF_TOKEN_EXPIRED" });

    const pdf = decryptPdfData(data.encrypted_pdf_data);
    await supabase.from("land_tax_temp_pdf_files").update({ downloaded_at: new Date().toISOString() }).eq("id", data.id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="land-tax-result.pdf"');
    return res.status(200).send(pdf);
  } catch (error) {
    return res.status(400).json({ success: false, errorCode: toErrorCode(error, "PDF_TOKEN_INVALID") });
  }
}
