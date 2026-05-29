export function toRocYearMonth(rocYear: number, month: number): string {
  if (!Number.isInteger(rocYear) || rocYear < 1 || rocYear > 999) {
    throw new Error("TAX_INDEX_PARSE_FAILED");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("TAX_INDEX_PARSE_FAILED");
  }
  return `${rocYear.toString().padStart(3, "0")}${month.toString().padStart(2, "0")}`;
}

export function isRocYearMonth(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]{5}$/.test(value);
}
