import { createSupabaseAdminClient } from "../supabase/server";

export type StoreUserRecord = {
  auth_code_hash: string | null;
  is_active: boolean | null;
};

export async function fetchStoreUserByCodes(storeCode: string, userCode: string): Promise<StoreUserRecord | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("store_users")
    .select("auth_code_hash, is_active")
    .eq("store_code", storeCode)
    .eq("user_code", userCode)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
