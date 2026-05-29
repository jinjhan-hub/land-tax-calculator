export type StoreAuthInput = {
  storeCode: string;
  userCode: string;
  authCode: string;
};

export type StoreAuthResult = {
  valid: boolean;
  reason?: string;
};

export async function validateStoreUser(input: StoreAuthInput): Promise<StoreAuthResult> {
  if (!input.storeCode || !input.userCode || !input.authCode) {
    return { valid: false, reason: "missing_credentials" };
  }

  const mockAllowed = process.env.NODE_ENV !== "production" || process.env.AUTH_MOCK_MODE === "true";
  if (!mockAllowed) {
    return { valid: false, reason: "store_auth_table_not_configured" };
  }

  return { valid: true };
}
