import { describe, expect, it } from "vitest";
import { isRocYearMonth, toRocYearMonth } from "../lib/cpi/year-month";

describe("ROC year_month format", () => {
  it("formats ROC year and month as 5 text digits", () => {
    expect(toRocYearMonth(48, 1)).toBe("04801");
    expect(toRocYearMonth(90, 5)).toBe("09005");
    expect(toRocYearMonth(113, 1)).toBe("11301");
    expect(toRocYearMonth(114, 12)).toBe("11412");
  });

  it("validates only string values", () => {
    expect(isRocYearMonth("11301")).toBe(true);
    expect(isRocYearMonth(11301)).toBe(false);
  });
});
