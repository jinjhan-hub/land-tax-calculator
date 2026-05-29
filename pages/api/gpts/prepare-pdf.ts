import type { NextApiRequest, NextApiResponse } from "next";
import { requireSession } from "@/lib/api/auth";
import { assertPost, proxyJsonPost, toGptsError } from "@/lib/api/gpts-wrapper";
import { fetchStoreProfileByCodes } from "@/lib/auth/store-users";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!assertPost(req, res)) return;

  try {
    const session = requireSession(req);
    const storeProfileSummary = await fetchStoreProfileByCodes(session.storeCode, session.userCode);
    const source = await proxyJsonPost(req, "/api/land-tax/pdf", true);
    if (source.status < 200 || source.status >= 300 || source.body.success !== true) {
      return res.status(source.status).json(toGptsError(source, "prepare-pdf"));
    }

    return res.status(200).json({
      success: true,
      data: {
        downloadUrl: source.body.downloadUrl,
        expiresInMinutes: source.body.expiresInMinutes,
        storeProfileSummary,
      },
      nextAction: "download",
    });
  } catch (error) {
    const status = error instanceof Error && error.message === "AUTH_FAILED" ? 401 : 500;
    const errorCode = error instanceof Error && error.message === "AUTH_FAILED" ? "AUTH_FAILED" : "UNKNOWN_ERROR";
    return res.status(status).json({ success: false, errorCode, stage: "prepare-pdf" });
  }
}
