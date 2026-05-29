export const ERROR_CODES = [
  "AUTH_FAILED",
  "TAX_INDEX_UPLOAD_FAILED",
  "TAX_INDEX_PARSE_FAILED",
  "TAX_INDEX_NOT_FOUND",
  "LAND_FIELD_MISSING",
  "CALCULATION_FAILED",
  "PDF_GENERATION_FAILED",
  "PDF_TOKEN_EXPIRED",
  "PDF_TOKEN_INVALID",
  "VERCEL_API_TIMEOUT",
  "UNKNOWN_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function toErrorCode(value: unknown, fallback: ErrorCode = "UNKNOWN_ERROR"): ErrorCode {
  if (value instanceof Error && ERROR_CODES.includes(value.message as ErrorCode)) {
    return value.message as ErrorCode;
  }
  if (typeof value === "string" && ERROR_CODES.includes(value as ErrorCode)) {
    return value as ErrorCode;
  }
  return fallback;
}
