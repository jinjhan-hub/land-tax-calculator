import type { NextApiRequest, NextApiResponse } from "next";
import { assertPost, proxyJsonPost, toGptsError } from "@/lib/api/gpts-wrapper";

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
    return res.status(401).json({ success: false, errorCode: "AUTH_FAILED", stage: "calculate" });
  }

  const originalAuthorization = req.headers.authorization;
  const originalBody = req.body;
  req.headers.authorization = authorization;
  req.body = withoutSessionToken(originalBody);

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
  } finally {
    req.headers.authorization = originalAuthorization;
    req.body = originalBody;
  }
}
