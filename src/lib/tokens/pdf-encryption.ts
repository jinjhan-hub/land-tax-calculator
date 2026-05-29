import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getRequiredEnv } from "@/lib/env";

function getKey() {
  return createHash("sha256").update(getRequiredEnv("PDF_TOKEN_SECRET")).digest();
}

export function encryptPdfData(data: Uint8Array): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    data: encrypted.toString("base64url"),
  });
}

export function decryptPdfData(encryptedPdfData: string): Buffer {
  const payload = JSON.parse(encryptedPdfData) as { iv: string; tag: string; data: string };
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(payload.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64url")),
    decipher.final(),
  ]);
}
