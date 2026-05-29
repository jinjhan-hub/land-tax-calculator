// Auto-generated coordinate map for /public/templates/land-tax/pacific-v1.pdf
// Template version: pacific-v1.1
// Coordinates use PDF points. Origin is bottom-left. y is the text baseline.
// Dynamic Chinese text requires a CJK-capable font in the rendering code; no font file is included here.
// Contact fields retained in this template: agentName, agentPhone, storeName.

export type PdfFieldSpec = {
  page: number;
  x: number;
  y: number;
  maxWidth: number;
  fontSize: number;
  align?: 'left' | 'right' | 'center';
  color?: string;
  note?: string;
};

export const landTaxPacificV1Template = {
  version: 'pacific-v1.1',
  pdfPath: '/public/templates/land-tax/pacific-v1.pdf',
  logoPath: '/public/branding/pacific/logo.png',
  pageSize: { width: 595.28, height: 841.89 },
  fields: {
    landCityDistrict: { page: 0, x: 124.0, y: 687.33, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    landSection: { page: 0, x: 387.64, y: 687.33, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    landNumber: { page: 0, x: 124.0, y: 662.0, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    landArea: { page: 0, x: 387.64, y: 662.0, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    ownershipRange: { page: 0, x: 124.0, y: 636.67, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    landUrbanPlanningLabel: { page: 0, x: 387.64, y: 636.67, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    previousTransferYearMonth: { page: 0, x: 124.0, y: 576.0, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    currentTransferYearMonth: { page: 0, x: 387.64, y: 576.0, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    previousDeclaredValuePerSqm: { page: 0, x: 124.0, y: 552.0, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    currentDeclaredValuePerSqm: { page: 0, x: 387.64, y: 552.0, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    taxIndexMultiplier: { page: 0, x: 124.0, y: 528.0, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    deductibleCosts: { page: 0, x: 387.64, y: 528.0, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    adjustedPreviousTotalValue: { page: 0, x: 124.0, y: 504.0, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    taxableIncrement: { page: 0, x: 387.64, y: 504.0, maxWidth: 165.64, fontSize: 10, align: 'left', color: '#222222' },
    generalEstimatedTax: { page: 0, x: 56, y: 382, maxWidth: 211.64, fontSize: 16, align: 'right', color: '#E60012', note: "currency; right aligned" },
    generalTaxableIncrement: { page: 0, x: 134, y: 354, maxWidth: 139.64, fontSize: 9.3, align: 'right', color: '#222222', note: "currency; right aligned" },
    generalRateNote: { page: 0, x: 134, y: 330, maxWidth: 139.64, fontSize: 8.8, align: 'left', color: '#222222', note: "long text; shrink or wrap" },
    selfUseEstimatedTax: { page: 0, x: 327.64, y: 382, maxWidth: 211.64, fontSize: 16, align: 'right', color: '#E60012', note: "currency; right aligned" },
    selfUseTaxableIncrement: { page: 0, x: 405.64, y: 354, maxWidth: 139.64, fontSize: 9.3, align: 'right', color: '#222222', note: "currency; right aligned" },
    selfUseRateNote: { page: 0, x: 405.64, y: 330, maxWidth: 139.64, fontSize: 8.8, align: 'left', color: '#222222', note: "long text; shrink or wrap" },
    formulaVersion: { page: 0, x: 441.28, y: 292, maxWidth: 120, fontSize: 7.5, align: 'right', color: '#666666' },
    agentName: { page: 0, x: 114.0, y: 242.5, maxWidth: 175.64, fontSize: 10, align: 'left', color: '#222222' },
    agentPhone: { page: 0, x: 377.64, y: 242.5, maxWidth: 175.64, fontSize: 10, align: 'left', color: '#222222' },
    storeName: { page: 0, x: 114, y: 215.5, maxWidth: 439.28, fontSize: 10, align: 'left', color: '#222222', note: "only contact fields retained: name, phone, store name" },
  } satisfies Record<string, PdfFieldSpec>,
} as const;
