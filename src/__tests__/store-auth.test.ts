import { scrypt as scryptCallback, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateStoreUser } from "../lib/auth/store-auth";
import { fetchStoreUserByCodes, type StoreUserRecord } from "../lib/auth/store-users";

vi.mock("../lib/auth/store-users", () => ({
  fetchStoreUserByCodes: vi.fn(),
  toStoreProfile: (storeUser: StoreUserRecord) => ({
    storeCode: storeUser.store_code,
    storeName: storeUser.store_name,
    brokerageName: storeUser.brokerage_name,
    brokerName: storeUser.broker_name,
    brokerLicenseNo: storeUser.broker_license_no,
    watermarkText: storeUser.watermark_text,
    expiresAt: storeUser.expires_at,
  }),
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
    store_code: "CH006",
    user_code: "STORE",
    auth_code_hash: authCodeHash,
    is_active: true,
    store_name: "員林站前店",
    brokerage_name: "九意開發有限公司",
    broker_name: "曾群丞",
    broker_license_no: "111年彰縣字00383號",
    watermark_text: "員林站前店 土地增值稅試算",
    expires_at: "2999-08-26",
  };
}

describe("validateStoreUser", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.AUTH_MOCK_MODE;
  });

  it("fails when credentials are missing", async () => {
    await expect(validateStoreUser({ storeCode: "", authCode: randomBytes(8).toString("hex") })).resolves.toEqual({
      valid: false,
      reason: "missing_credentials",
    });
  });

  it("passes with all fields when AUTH_MOCK_MODE is true", async () => {
    process.env.AUTH_MOCK_MODE = "true";

    await expect(validateStoreUser({ storeCode: "store", authCode: randomBytes(8).toString("hex") })).resolves.toMatchObject({
      valid: true,
      userCode: "STORE",
      store: { storeCode: "store" },
    });
    expect(fetchStoreUserByCodesMock).not.toHaveBeenCalled();
  });

  it("fails when the store user is not found with AUTH_MOCK_MODE false", async () => {
    process.env.AUTH_MOCK_MODE = "false";
    fetchStoreUserByCodesMock.mockResolvedValue(null);

    await expect(validateStoreUser({ storeCode: "store", authCode: randomBytes(8).toString("hex") })).resolves.toEqual({
      valid: false,
      reason: "store_user_not_found",
    });
    expect(fetchStoreUserByCodesMock).toHaveBeenCalledWith("store", "STORE");
  });

  it("fails when the store user is inactive with AUTH_MOCK_MODE false", async () => {
    process.env.AUTH_MOCK_MODE = "false";
    fetchStoreUserByCodesMock.mockResolvedValue({ ...activeStoreUser("scrypt$salt$key"), is_active: false });

    await expect(validateStoreUser({ storeCode: "store", authCode: randomBytes(8).toString("hex") })).resolves.toEqual({
      valid: false,
      reason: "store_user_inactive",
    });
  });

  it("fails when the store user is expired with AUTH_MOCK_MODE false", async () => {
    process.env.AUTH_MOCK_MODE = "false";
    fetchStoreUserByCodesMock.mockResolvedValue({ ...activeStoreUser("scrypt$salt$key"), expires_at: "2020-01-01" });

    await expect(validateStoreUser({ storeCode: "store", authCode: randomBytes(8).toString("hex") })).resolves.toEqual({
      valid: false,
      reason: "store_user_expired",
    });
  });

  it("fails when the auth code is invalid with AUTH_MOCK_MODE false", async () => {
    process.env.AUTH_MOCK_MODE = "false";
    const authCode = randomBytes(8).toString("hex");
    const authCodeHash = await createScryptHash(authCode);
    fetchStoreUserByCodesMock.mockResolvedValue(activeStoreUser(authCodeHash));

    await expect(validateStoreUser({ storeCode: "store", authCode: randomBytes(8).toString("hex") })).resolves.toEqual({
      valid: false,
      reason: "invalid_auth_code",
    });
  });

  it("passes when the auth code is valid with AUTH_MOCK_MODE false", async () => {
    process.env.AUTH_MOCK_MODE = "false";
    const authCode = randomBytes(8).toString("hex");
    const authCodeHash = await createScryptHash(authCode);
    fetchStoreUserByCodesMock.mockResolvedValue(activeStoreUser(authCodeHash));

    const result = await validateStoreUser({ storeCode: "store", authCode });
    expect(result).toEqual({
      valid: true,
      userCode: "STORE",
      store: {
        storeCode: "CH006",
        storeName: "員林站前店",
        brokerageName: "九意開發有限公司",
        brokerName: "曾群丞",
        brokerLicenseNo: "111年彰縣字00383號",
        watermarkText: "員林站前店 土地增值稅試算",
        expiresAt: "2999-08-26",
      },
    });
    expect(fetchStoreUserByCodesMock).toHaveBeenCalledWith("store", "STORE");
  });
});
