import { describe, expect, it } from "vitest";
import { calculateLandTax } from "../lib/land-tax/calculate";

describe("calculateLandTax", () => {
  it("calculates the CPI multiplier from index values", () => {
    const result = calculateLandTax(
      {
        landArea: 100,
        ownershipNumerator: 1,
        ownershipDenominator: 2,
        previousTransferYearMonth: "11301",
        currentTransferYearMonth: "11401",
        previousDeclaredValuePerSqm: 1000,
        currentDeclaredValuePerSqm: 1500,
        improvementCost: 1000,
        landReadjustmentCost: 500,
        engineeringBenefitFee: 500,
      },
      { previousIndexValue: 100, currentIndexValue: 110 },
    );

    expect(result.taxIndexMultiplier).toBeCloseTo(1.1);
    expect(result.taxableIncrement).toBeCloseTo(18000);
    expect(result.selfUseTaxResult.estimatedTax).toBe(1800);
  });

  it("returns zero tax when taxable increment is not positive", () => {
    const result = calculateLandTax(
      {
        landArea: 100,
        ownershipNumerator: 1,
        ownershipDenominator: 1,
        previousTransferYearMonth: "11301",
        currentTransferYearMonth: "11401",
        previousDeclaredValuePerSqm: 2000,
        currentDeclaredValuePerSqm: 1000,
      },
      { previousIndexValue: 100, currentIndexValue: 100 },
    );

    expect(result.taxableIncrement).toBe(0);
    expect(result.generalTaxResult.estimatedTax).toBe(0);
  });
});
