import { scrypt as scryptCallback, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateStoreUser } from "../lib/auth/store-auth";
import { fetchStoreUserByCodes, type StoreUserRecord } from "../lib/auth/store-users";

vi.mock("../lib/auth/store-users", () => ({
  fetchStoreUserByCodes: vi.fn(),
}));

const scrypt = promisify(scryptCallback);
const fetchStoreUserByCodesMock = vi.mocked(fetchStoreUserByCodes);

async function createScryptHash(authCode: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(authCode, salt, 32)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

function activeStoreUser(authCodeHash: string): StoreUserRecord {
  return {
    auth_code_hash: authCodeHash,
    is_active: true,
  };
}

describe("validateStoreUser", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.AUTH_MOCK_MODE;
  });

  it("fails when credentials are missing", async () => {
    await expect(validateStoreUser({ storeCode: "", userCode: "user", authCode: randomBytes(8).toString("hex") })).resolves.toEqual({
      valid: false,
      reason: "missing_credentials",
    });
  });

  it("passes with all fields when AUTH_MOCK_MODE is true", async () => {
    process.env.AUTH_MOCK_MODE = "true";

    await expect(validateStoreUser({ storeCode: "store", userCode: "user", authCode: randomBytes(8).toString("hex") })).resolves.toEqual({
      valid: true,
    });
    expect(fetchStoreUserByCodesMock).not.toHaveBeenCalled();
  });

  it("fails when the store user is not found with AUTH_MOCK_MODE false", async () => {
    process.env.AUTH_MOCK_MODE = "false";
    fetchStoreUserByCodesMock.mockResolvedValue(null);

    await expect(validateStoreUser({ storeCode: "store", userCode: "user", authCode: randomBytes(8).toString("hex") })).resolves.toEqual({
      valid: false,
      reason: "store_user_not_found",
    });
  });

  it("fails when the store user is inactive with AUTH_MOCK_MODE false", async () => {
    process.env.AUTH_MOCK_MODE = "false";
    fetchStoreUserByCodesMock.mockResolvedValue({ auth_code_hash: "scrypt$salt$key", is_active: false });

    await expect(validateStoreUser({ storeCode: "store", userCode: "user", authCode: randomBytes(8).toString("hex") })).resolves.toEqual({
      valid: false,
      reason: "store_user_inactive",
    });
  });

  it("fails when the auth code is invalid with AUTH_MOCK_MODE false", async () => {
    process.env.AUTH_MOCK_MODE = "false";
    const authCode = randomBytes(8).toString("hex");
    const authCodeHash = await createScryptHash(authCode);
    fetchStoreUserByCodesMock.mockResolvedValue(activeStoreUser(authCodeHash));

    await expect(validateStoreUser({ storeCode: "store", userCode: "user", authCode: randomBytes(8).toString("hex") })).resolves.toEqual({
      valid: false,
      reason: "invalid_auth_code",
    });
  });

  it("passes when the auth code is valid with AUTH_MOCK_MODE false", async () => {
    process.env.AUTH_MOCK_MODE = "false";
    const authCode = randomBytes(8).toString("hex");
    const authCodeHash = await createScryptHash(authCode);
    fetchStoreUserByCodesMock.mockResolvedValue(activeStoreUser(authCodeHash));

    await expect(validateStoreUser({ storeCode: "store", userCode: "user", authCode })).resolves.toEqual({
      valid: true,
    });
  });
});
