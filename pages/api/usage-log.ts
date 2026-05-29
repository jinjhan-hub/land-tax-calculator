import type { NextApiRequest, NextApiResponse } from "next";
import { requireSession } from "@/lib/api/auth";
import { toErrorCode } from "@/lib/api/errors";
import { assertSafeUsageLog } from "@/lib/logs/safe-log";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, errorCode: "UNKNOWN_ERROR" });
  }

  try {
    const session = requireSession(req);
    assertSafeUsageLog(req.body);
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("land_tax_usage_logs").insert({
      store_code: session.storeCode,
      user_code: session.userCode,
      tool_name: req.body.toolName,
      action_name: req.body.actionName,
      success: Boolean(req.body.success),
      formula_version: req.body.formulaVersion ?? null,
    });
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(error instanceof Error && error.message === "AUTH_FAILED" ? 401 : 400).json({ success: false, errorCode: toErrorCode(error) });
  }
}
