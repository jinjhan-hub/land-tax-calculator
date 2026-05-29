import type { NextApiRequest, NextApiResponse } from "next";
import { requireSession } from "@/lib/api/auth";
import { assertPost, proxyJsonPost, toGptsError } from "@/lib/api/gpts-wrapper";
import { fetchStoreProfileByCodes } from "@/lib/auth/store-users";

function resolveAuthorization(req: NextApiRequest): string | null {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ") && authorization.slice("Bearer ".length).trim()) {
    return authorization;
  }

  const token = typeof req.body?.sessionToken === "string" ? req.body.sessionToken.trim() : "";
  return token ? `Bearer ${token}` : null;
}

function withoutSessionToken(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const { sessionToken: _sessionToken, ...rest } = body as Record<string, unknown>;
  return rest;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!assertPost(req, res)) return;

  const authorization = resolveAuthorization(req);
  if (!authorization) {
    return res.status(401).json({ success: false, errorCode: "AUTH_FAILED", stage: "prepare-pdf" });
  }

  const originalAuthorization = req.headers.authorization;
  const originalBody = req.body;
  req.headers.authorization = authorization;
  req.body = withoutSessionToken(originalBody);

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
  } finally {
    req.headers.authorization = originalAuthorization;
    req.body = originalBody;
  }
}
