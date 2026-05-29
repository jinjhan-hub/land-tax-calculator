import { ERROR_CODES, type ErrorCode } from "@/lib/api/errors";

const ACTION_NAMES = new Set(["login", "upload_tax_price_index", "calculate_land_tax", "generate_pdf"]);
const ERROR_STAGES = new Set(["AUTH", "CPI_UPLOAD", "CALCULATE", "PDF", "PDF_DOWNLOAD", "USAGE_LOG", "ERROR_LOG"]);

export function assertSafeUsageLog(body: Record<string, unknown>) {
  if (typeof body.toolName !== "string" || typeof body.actionName !== "string") {
    throw new Error("UNKNOWN_ERROR");
  }
  if (!ACTION_NAMES.has(body.actionName)) {
    throw new Error("UNKNOWN_ERROR");
  }
}

export function assertSafeErrorLog(body: Record<string, unknown>) {
  if (typeof body.stage !== "string" || !ERROR_STAGES.has(body.stage)) {
    throw new Error("UNKNOWN_ERROR");
  }
  if (typeof body.errorCode !== "string" || !ERROR_CODES.includes(body.errorCode as ErrorCode)) {
    throw new Error("UNKNOWN_ERROR");
  }
  if (typeof body.gptsNote === "string" && body.gptsNote.length > 300) {
    throw new Error("UNKNOWN_ERROR");
  }
}
