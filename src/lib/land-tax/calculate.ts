import { isRocYearMonth } from "../cpi/year-month";

export const FORMULA_VERSION = "land-tax-v1.0.0";

export type LandTaxCalculationInput = {
  landArea: number;
  ownershipNumerator: number;
  ownershipDenominator: number;
  previousTransferYearMonth: string;
  currentTransferYearMonth: string;
  previousDeclaredValuePerSqm: number;
  currentDeclaredValuePerSqm: number;
  improvementCost?: number;
  landReadjustmentCost?: number;
  engineeringBenefitFee?: number;
};

export type LandTaxCalculationResult = {
  success: true;
  formulaVersion: typeof FORMULA_VERSION;
  previousIndexValue: number;
  currentIndexValue: number;
  taxIndexMultiplier: number;
  currentTotalValue: number;
  adjustedPreviousTotalValue: number;
  taxableIncrement: number;
  generalTaxResult: { estimatedTax: number; rateNote: string };
  selfUseTaxResult: { estimatedTax: number; rateNote: string };
};

function assertPositiveNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("LAND_FIELD_MISSING");
  }
}

export function calculateLandTax(
  input: LandTaxCalculationInput,
  indexes: { previousIndexValue: number; currentIndexValue: number },
): LandTaxCalculationResult {
  if (!isRocYearMonth(input.previousTransferYearMonth) || !isRocYearMonth(input.currentTransferYearMonth)) {
    throw new Error("LAND_FIELD_MISSING");
  }

  [input.landArea, input.ownershipNumerator, input.ownershipDenominator, input.previousDeclaredValuePerSqm, input.currentDeclaredValuePerSqm].forEach(assertPositiveNumber);

  if (input.ownershipDenominator <= 0 || indexes.previousIndexValue <= 0 || indexes.currentIndexValue <= 0) {
    throw new Error("CALCULATION_FAILED");
  }

  const ownershipRatio = input.ownershipNumerator / input.ownershipDenominator;
  const taxIndexMultiplier = indexes.currentIndexValue / indexes.previousIndexValue;
  const previousTotalValue = input.landArea * ownershipRatio * input.previousDeclaredValuePerSqm;
  const adjustedPreviousTotalValue = previousTotalValue * taxIndexMultiplier;
  const currentTotalValue = input.landArea * ownershipRatio * input.currentDeclaredValuePerSqm;
  const deductibleCosts = (input.improvementCost ?? 0) + (input.landReadjustmentCost ?? 0) + (input.engineeringBenefitFee ?? 0);
  const taxableIncrement = Math.max(0, currentTotalValue - adjustedPreviousTotalValue - deductibleCosts);

  return {
    success: true,
    formulaVersion: FORMULA_VERSION,
    previousIndexValue: indexes.previousIndexValue,
    currentIndexValue: indexes.currentIndexValue,
    taxIndexMultiplier,
    currentTotalValue,
    adjustedPreviousTotalValue,
    taxableIncrement,
    generalTaxResult: {
      // TODO: Confirm official progressive general land value increment tax rules.
      estimatedTax: Math.round(taxableIncrement * 0.2),
      rateNote: "一般用地稅率試算；正式級距與長期持有減徵待驗證",
    },
    selfUseTaxResult: {
      estimatedTax: Math.round(taxableIncrement * 0.1),
      rateNote: "自用住宅優惠稅率 10% 情境試算",
    },
  };
}
