import type { NextApiRequest, NextApiResponse } from "next";
import { validateStoreUser } from "@/lib/auth/store-auth";
import { createSessionToken } from "@/lib/tokens/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, errorCode: "UNKNOWN_ERROR" });
  }

  const { storeCode, authCode } = req.body ?? {};
  const result = await validateStoreUser({ storeCode, authCode });
  if (!result.valid) {
    return res.status(401).json({ success: false, errorCode: "AUTH_FAILED", reason: result.reason });
  }

  const session = createSessionToken(result.store?.storeCode ?? storeCode, result.userCode ?? "STORE");
  return res.status(200).json({ success: true, sessionToken: session.sessionToken, store: result.store });
}
