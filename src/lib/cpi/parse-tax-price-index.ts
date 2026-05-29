import * as XLSX from "xlsx";
import { toRocYearMonth } from "@/lib/cpi/year-month";

export type TaxPriceIndexRow = {
  yearMonth: string;
  rocYear: number;
  month: number;
  indexValue: number;
};

function parseRocYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string") {
    const match = value.match(/\d{1,3}/);
    return match ? Number(match[0]) : null;
  }
  return null;
}

function parseIndexValue(value: unknown): number | null {
  if (typeof value === "number" && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function parseTaxPriceIndexWorkbook(fileBuffer: Buffer): TaxPriceIndexRow[] {
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets.CPI;
  if (!sheet) {
    throw new Error("TAX_INDEX_PARSE_FAILED");
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false });
  const result: TaxPriceIndexRow[] = [];
  const seen = new Set<string>();

  for (const row of rows.slice(3)) {
    const rocYear = parseRocYear(row[0]);
    if (!rocYear) {
      continue;
    }

    for (let columnIndex = 1; columnIndex <= 12; columnIndex += 1) {
      const indexValue = parseIndexValue(row[columnIndex]);
      if (!indexValue) {
        continue;
      }

      const month = columnIndex;
      const yearMonth = toRocYearMonth(rocYear, month);
      if (seen.has(yearMonth)) {
        throw new Error("TAX_INDEX_PARSE_FAILED");
      }

      seen.add(yearMonth);
      result.push({ yearMonth, rocYear, month, indexValue });
    }
  }

  if (result.length === 0) {
    throw new Error("TAX_INDEX_PARSE_FAILED");
  }

  return result;
}
