import { describe, expect, it } from "vitest";
import { createStoreDisclosureLines, resolveWatermarkText } from "../lib/pdf/store-profile-text";

describe("land tax PDF store profile text", () => {
  it("builds disclosure lines from the authenticated store profile", () => {
    const lines = createStoreDisclosureLines({
      storeCode: "CH006",
      storeName: "員林站前店",
      brokerageName: "九意開發有限公司",
      brokerName: "曾群丞",
      brokerLicenseNo: "111年彰縣字00383號",
      watermarkText: "員林站前店 土地增值稅試算",
      expiresAt: "2099-08-26",
    });

    expect(lines).toEqual([
      "使用分店：員林站前店",
      "經紀業名稱：九意開發有限公司｜經紀人：曾群丞｜經紀人字號：111年彰縣字00383號",
    ]);
  });

  it("uses the store watermark text with a clean fallback", () => {
    expect(
      resolveWatermarkText({
        storeCode: "CH001",
        storeName: "彰化民族店",
        brokerageName: "彰一不動產有限公司",
        brokerName: "楊朝欽",
        brokerLicenseNo: "112彰縣字00397號",
        watermarkText: "彰化民族店 土地增值稅試算",
        expiresAt: "2026-08-27",
      }),
    ).toBe("彰化民族店 土地增值稅試算");

    expect(resolveWatermarkText(null)).toBe("土地增值稅試算");
  });
});
