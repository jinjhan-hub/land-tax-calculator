import { createHash, randomUUID } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminUploadToken, requireSession } from "@/lib/api/auth";
import { toErrorCode } from "@/lib/api/errors";
import { readRawBody } from "@/lib/api/raw-body";
import { parseTaxPriceIndexWorkbook } from "@/lib/cpi/parse-tax-price-index";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, errorCode: "UNKNOWN_ERROR" });
  }

  try {
    requireSession(req);
    requireAdminUploadToken(req);

    const fileBuffer = await readRawBody(req);
    const sourceFileName = String(req.headers["x-file-name"] ?? "tax-price-index-upload");
    const sourceFileHash = createHash("sha256").update(fileBuffer).digest("hex");
    const batchId = randomUUID();
    const rows = parseTaxPriceIndexWorkbook(fileBuffer);
    const supabase = createSupabaseAdminClient();

    const stagingRows = rows.map((row) => ({
      batch_id: batchId,
      year_month: row.yearMonth,
      roc_year: row.rocYear,
      month: row.month,
      index_value: row.indexValue,
      source_file_name: sourceFileName,
      source_file_hash: sourceFileHash,
    }));

    const { error: stagingError } = await supabase.from("tax_price_indexes_staging").insert(stagingRows);
    if (stagingError) throw stagingError;

    const { error: upsertError } = await supabase.from("tax_price_indexes").upsert(
      stagingRows.map(({ batch_id: _batchId, ...row }) => ({ ...row, source_note: "admin_upload", imported_at: new Date().toISOString() })),
      { onConflict: "year_month" },
    );
    if (upsertError) throw upsertError;

    await supabase.from("tax_price_index_import_logs").insert({
      batch_id: batchId,
      import_type: "admin_upload",
      source_file_name: sourceFileName,
      source_file_hash: sourceFileHash,
      row_count: rows.length,
      latest_year_month: rows.at(-1)?.yearMonth,
      success: true,
    });

    return res.status(200).json({ success: true, batchId, rowCount: rows.length, latestYearMonth: rows.at(-1)?.yearMonth });
  } catch (error) {
    return res.status(error instanceof Error && error.message === "AUTH_FAILED" ? 401 : 400).json({
      success: false,
      errorCode: toErrorCode(error, "TAX_INDEX_UPLOAD_FAILED"),
    });
  }
}
