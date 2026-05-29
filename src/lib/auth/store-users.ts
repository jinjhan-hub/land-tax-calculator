import { createSupabaseAdminClient } from "../supabase/server";

export type StoreUserRecord = {
  store_code: string;
  user_code: string;
  auth_code_hash: string | null;
  is_active: boolean | null;
  store_name: string | null;
  brokerage_name: string | null;
  broker_name: string | null;
  broker_license_no: string | null;
  watermark_text: string | null;
  expires_at: string | null;
};

export type StoreProfile = {
  storeCode: string;
  storeName: string | null;
  brokerageName: string | null;
  brokerName: string | null;
  brokerLicenseNo: string | null;
  watermarkText: string | null;
  expiresAt: string | null;
};

const STORE_USER_SELECT =
  "store_code, user_code, auth_code_hash, is_active, store_name, brokerage_name, broker_name, broker_license_no, watermark_text, expires_at";

function cleanText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

export function toStoreProfile(storeUser: StoreUserRecord): StoreProfile {
  return {
    storeCode: storeUser.store_code,
    storeName: cleanText(storeUser.store_name),
    brokerageName: cleanText(storeUser.brokerage_name),
    brokerName: cleanText(storeUser.broker_name),
    brokerLicenseNo: cleanText(storeUser.broker_license_no),
    watermarkText: cleanText(storeUser.watermark_text),
    expiresAt: storeUser.expires_at,
  };
}

export async function fetchStoreUserByCodes(storeCode: string, userCode: string): Promise<StoreUserRecord | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("store_users")
    .select(STORE_USER_SELECT)
    .eq("store_code", storeCode)
    .eq("user_code", userCode)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchStoreProfileByCodes(storeCode: string, userCode: string): Promise<StoreProfile | null> {
  const storeUser = await fetchStoreUserByCodes(storeCode, userCode);
  return storeUser ? toStoreProfile(storeUser) : null;
}
