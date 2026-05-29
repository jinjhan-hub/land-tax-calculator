import { createHmac, timingSafeEqual } from "node:crypto";
import { getRequiredEnv } from "@/lib/env";
import { decodeBase64Url, encodeBase64Url } from "@/lib/tokens/base64url";

export type SessionClaims = {
  storeCode: string;
  userCode: string;
  expiresAt: string;
};

const SESSION_TTL_MINUTES = 30;

function sign(payload: string): string {
  return createHmac("sha256", getRequiredEnv("APP_SECRET"))
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(storeCode: string, userCode: string): SessionClaims & { sessionToken: string } {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000).toISOString();
  const payload = encodeBase64Url(JSON.stringify({ storeCode, userCode, expiresAt }));
  const signature = sign(payload);

  return {
    storeCode,
    userCode,
    expiresAt,
    sessionToken: `${payload}.${signature}`,
  };
}

export function verifySessionToken(token: string): SessionClaims {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    throw new Error("AUTH_FAILED");
  }

  const expected = sign(payload);
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    throw new Error("AUTH_FAILED");
  }

  const claims = JSON.parse(decodeBase64Url(payload).toString("utf8")) as SessionClaims;
  if (!claims.storeCode || !claims.userCode || !claims.expiresAt) {
    throw new Error("AUTH_FAILED");
  }

  if (new Date(claims.expiresAt).getTime() <= Date.now()) {
    throw new Error("AUTH_FAILED");
  }

  return claims;
}
