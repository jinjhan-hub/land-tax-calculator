import type { NextApiRequest, NextApiResponse } from "next";
import { assertPost, proxyJsonPost, toGptsError } from "@/lib/api/gpts-wrapper";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!assertPost(req, res)) return;

  try {
    const source = await proxyJsonPost(req, "/api/auth/login");
    if (source.status < 200 || source.status >= 300 || source.body.success !== true) {
      return res.status(source.status).json(toGptsError(source, "login"));
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionToken: source.body.sessionToken,
        store: source.body.store,
      },
      nextAction: "calculate",
    });
  } catch {
    return res.status(500).json({ success: false, errorCode: "UNKNOWN_ERROR", stage: "login" });
  }
}
