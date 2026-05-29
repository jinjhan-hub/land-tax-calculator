import { describe, expect, it } from "vitest";
import { calculateLandTax } from "../lib/land-tax/calculate";

describe("calculateLandTax", () => {
  it("uses the previous tax price index divided by 100 as the multiplier", () => {
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

    expect(result.taxIndexMultiplier).toBeCloseTo(1);
    expect(result.taxableIncrement).toBeCloseTo(23000);
    expect(result.selfUseTaxResult.estimatedTax).toBe(2300);
  });

  it("calculates the 107.77 square meter simplified sample", () => {
    const result = calculateLandTax(
      {
        landArea: 107.77,
        ownershipNumerator: 1,
        ownershipDenominator: 1,
        previousTransferYearMonth: "10210",
        currentTransferYearMonth: "11501",
        previousDeclaredValuePerSqm: 1619.6,
        currentDeclaredValuePerSqm: 1900,
        improvementCost: 0,
        landReadjustmentCost: 0,
        engineeringBenefitFee: 0,
      },
      { previousIndexValue: 94.66, currentIndexValue: 110.22 },
    );

    expect(result.taxIndexMultiplier).toBeCloseTo(0.9466);
    expect(result.currentTotalValue).toBeCloseTo(204763);
    expect(result.adjustedPreviousTotalValue).toBeCloseTo(165223.627, 2);
    expect(result.taxableIncrement).toBeCloseTo(39539.373, 2);
    expect(result.generalTaxResult.estimatedTax).toBe(7908);
    expect(result.selfUseTaxResult.estimatedTax).toBe(3954);
  });

  it("10210 tax price index multiplier should use previous index divided by 100", () => {
    const result = calculateLandTax(
      {
        landArea: 1073.77,
        ownershipNumerator: 1,
        ownershipDenominator: 1,
        previousTransferYearMonth: "10210",
        currentTransferYearMonth: "11501",
        previousDeclaredValuePerSqm: 1619.6,
        currentDeclaredValuePerSqm: 1900,
        improvementCost: 0,
        landReadjustmentCost: 0,
        engineeringBenefitFee: 0,
      },
      { previousIndexValue: 94.66, currentIndexValue: 110.22 },
    );

    expect(result.previousIndexValue).toBe(94.66);
    expect(result.currentIndexValue).toBe(110.22);
    expect(result.taxIndexMultiplier).toBeCloseTo(0.9466);
    expect(result.currentTotalValue).toBeCloseTo(2040163);
    expect(result.adjustedPreviousTotalValue).toBeCloseTo(1646211.133, 2);
    expect(result.taxableIncrement).toBeCloseTo(393951.867, 2);
    expect(result.generalTaxResult.estimatedTax).toBe(78790);
    expect(result.selfUseTaxResult.estimatedTax).toBe(39395);
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
