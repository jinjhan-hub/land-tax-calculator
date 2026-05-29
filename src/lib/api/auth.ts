import type { NextApiRequest } from "next";
import { verifySessionToken, type SessionClaims } from "@/lib/tokens/session";

export function requireSession(req: NextApiRequest): SessionClaims {
  const authorization = req.headers.authorization;
  const prefix = "Bearer ";

  if (!authorization?.startsWith(prefix)) {
    throw new Error("AUTH_FAILED");
  }

  return verifySessionToken(authorization.slice(prefix.length).trim());
}

export function requireAdminUploadToken(req: NextApiRequest) {
  const expected = process.env.ADMIN_UPLOAD_TOKEN;
  const actual = req.headers["x-admin-token"];

  if (!expected || typeof actual !== "string" || actual !== expected) {
    throw new Error("AUTH_FAILED");
  }
}
