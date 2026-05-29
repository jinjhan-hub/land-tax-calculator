import type { NextApiRequest, NextApiResponse } from "next";
import { assertPost, proxyJsonPost, toGptsError } from "@/lib/api/gpts-wrapper";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!assertPost(req, res)) return;

  try {
    const source = await proxyJsonPost(req, "/api/land-tax/calculate", true);
    if (source.status < 200 || source.status >= 300 || source.body.success !== true) {
      return res.status(source.status).json(toGptsError(source, "calculate"));
    }

    return res.status(200).json({
      success: true,
      data: source.body,
      nextAction: "prepare-pdf",
    });
  } catch {
    return res.status(500).json({ success: false, errorCode: "UNKNOWN_ERROR", stage: "calculate" });
  }
}
