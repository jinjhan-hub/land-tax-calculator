export function encodeBase64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function decodeBase64Url(input: string): Buffer {
  return Buffer.from(input, "base64url");
}
