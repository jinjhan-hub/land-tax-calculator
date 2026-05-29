import type { StoreProfile } from "@/lib/auth/store-users";

const DEFAULT_WATERMARK_TEXT = "土地增值稅試算";

function cleanText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

export function resolveWatermarkText(storeProfile?: StoreProfile | null): string {
  return cleanText(storeProfile?.watermarkText) ?? DEFAULT_WATERMARK_TEXT;
}

export function createStoreDisclosureLines(storeProfile?: StoreProfile | null): string[] {
  if (!storeProfile) return [];

  const lines: string[] = [];
  const storeName = cleanText(storeProfile.storeName);
  if (storeName) {
    lines.push(`使用分店：${storeName}`);
  }

  const brokerageName = cleanText(storeProfile.brokerageName);
  const brokerName = cleanText(storeProfile.brokerName);
  const brokerLicenseNo = cleanText(storeProfile.brokerLicenseNo);
  const details = [
    brokerageName ? `經紀業名稱：${brokerageName}` : null,
    brokerName ? `經紀人：${brokerName}` : null,
    brokerLicenseNo ? `經紀人字號：${brokerLicenseNo}` : null,
  ].filter((value): value is string => Boolean(value));

  if (details.length > 0) {
    lines.push(details.join("｜"));
  }

  return lines;
}
