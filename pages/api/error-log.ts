import type { NextApiRequest, NextApiResponse } from "next";
import { requireSession } from "@/lib/api/auth";
import { toErrorCode } from "@/lib/api/errors";
import { assertSafeErrorLog } from "@/lib/logs/safe-log";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, errorCode: "UNKNOWN_ERROR" });
  }

  try {
    const session = requireSession(req);
    assertSafeErrorLog(req.body);
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("land_tax_error_logs").insert({
      store_code: session.storeCode,
      user_code: session.userCode,
      tool_name: req.body.toolName,
      session_id: req.body.sessionId ?? null,
      stage: req.body.stage,
      error_code: req.body.errorCode,
      error_message: req.body.errorMessage ?? null,
      gpts_note: req.body.gptsNote ?? null,
    });
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(error instanceof Error && error.message === "AUTH_FAILED" ? 401 : 400).json({ success: false, errorCode: toErrorCode(error) });
  }
}
