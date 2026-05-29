import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  return createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
