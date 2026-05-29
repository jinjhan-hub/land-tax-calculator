import type { NextApiRequest, NextApiResponse } from "next";
import { requireSession } from "@/lib/api/auth";
import { toErrorCode } from "@/lib/api/errors";
import { calculateLandTax, type LandTaxCalculationInput } from "@/lib/land-tax/calculate";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, errorCode: "UNKNOWN_ERROR" });
  }

  try {
    requireSession(req);
    if ("isSelfUseResidential" in (req.body ?? {})) {
      return res.status(400).json({ success: false, errorCode: "LAND_FIELD_MISSING" });
    }

    const input = req.body as LandTaxCalculationInput;
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("tax_price_indexes")
      .select("year_month,index_value")
      .in("year_month", [input.previousTransferYearMonth, input.currentTransferYearMonth]);

    if (error) throw error;

    const previous = data?.find((row) => row.year_month === input.previousTransferYearMonth);
    const current = data?.find((row) => row.year_month === input.currentTransferYearMonth);
    if (!previous || !current) {
      return res.status(404).json({ success: false, errorCode: "TAX_INDEX_NOT_FOUND" });
    }

    const result = calculateLandTax(input, {
      previousIndexValue: Number(previous.index_value),
      currentIndexValue: Number(current.index_value),
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error instanceof Error && error.message === "AUTH_FAILED" ? 401 : 400).json({
      success: false,
      errorCode: toErrorCode(error, "CALCULATION_FAILED"),
    });
  }
}
