import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { fetchStoreUserByCodes } from "./store-users";

export type StoreAuthInput = {
  storeCode: string;
  userCode: string;
  authCode: string;
};

export type StoreAuthReason =
  | "missing_credentials"
  | "store_user_not_found"
  | "store_user_inactive"
  | "invalid_auth_hash"
  | "invalid_auth_code"
  | "store_auth_error";

export type StoreAuthResult = {
  valid: boolean;
  reason?: StoreAuthReason;
};

const scrypt = promisify(scryptCallback);

async function verifyScryptAuthCode(authCode: string, authCodeHash: string): Promise<boolean | "invalid_hash"> {
  const parts = authCodeHash.split("$");
  const [scheme, salt, expectedDerivedKey] = parts;
  if (parts.length !== 3 || scheme !== "scrypt" || !salt || !expectedDerivedKey) {
    return "invalid_hash";
  }

  const actualDerivedKey = ((await scrypt(authCode, salt, 32)) as Buffer).toString("base64url");
  const actual = Buffer.from(actualDerivedKey);
  const expected = Buffer.from(expectedDerivedKey);
  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export async function validateStoreUser(input: StoreAuthInput): Promise<StoreAuthResult> {
  if (!input.storeCode || !input.userCode || !input.authCode) {
    return { valid: false, reason: "missing_credentials" };
  }

  if (process.env.AUTH_MOCK_MODE === "true") {
    return { valid: true };
  }

  try {
    const storeUser = await fetchStoreUserByCodes(input.storeCode, input.userCode);
    if (!storeUser) {
      return { valid: false, reason: "store_user_not_found" };
    }
    if (storeUser.is_active !== true) {
      return { valid: false, reason: "store_user_inactive" };
    }
    if (!storeUser.auth_code_hash) {
      return { valid: false, reason: "invalid_auth_hash" };
    }

    const verified = await verifyScryptAuthCode(input.authCode, storeUser.auth_code_hash);
    if (verified === "invalid_hash") {
      return { valid: false, reason: "invalid_auth_hash" };
    }
    if (!verified) {
      return { valid: false, reason: "invalid_auth_code" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "store_auth_error" };
  }
}
