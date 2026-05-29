import { createHash, randomBytes } from "node:crypto";
import { getRequiredEnv } from "@/lib/env";

export const PDF_TOKEN_TTL_MINUTES = 15;

export function createPdfDownloadToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashPdfDownloadToken(token),
    expiresAt: new Date(Date.now() + PDF_TOKEN_TTL_MINUTES * 60 * 1000).toISOString(),
  };
}

export function hashPdfDownloadToken(token: string): string {
  return createHash("sha256")
    .update(`${getRequiredEnv("PDF_TOKEN_SECRET")}:${token}`)
    .digest("hex");
}
