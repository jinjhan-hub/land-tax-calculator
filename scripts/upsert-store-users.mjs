import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";

const scrypt = promisify(scryptCallback);

function parseArgs() {
  const csvPath = process.argv[2] || process.env.STORE_USERS_CSV;
  if (!csvPath) {
    throw new Error("Usage: node scripts/upsert-store-users.mjs <gitignored-credentials.csv>");
  }
  return { csvPath };
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const [headerLine, ...rowLines] = lines;
  const headers = parseCsvLine(headerLine);
  return rowLines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

async function createScryptHash(authCode) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(authCode, salt, 32);
  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

function required(row, key) {
  const value = row[key]?.trim();
  if (!value) {
    throw new Error(`Missing required CSV column value: ${key}`);
  }
  return value;
}

async function main() {
  const { csvPath } = parseArgs();
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in the local environment.");
  }

  const rows = parseCsv(await fs.readFile(csvPath, "utf8"));
  const records = await Promise.all(
    rows.map(async (row) => {
      const storeName = required(row, "store_name");
      return {
        store_code: required(row, "store_code"),
        user_code: row.user_code?.trim() || "STORE",
        auth_code_hash: await createScryptHash(required(row, "authCode")),
        store_name: storeName,
        brokerage_name: required(row, "brokerage_name"),
        broker_name: required(row, "broker_name"),
        broker_license_no: required(row, "broker_license_no"),
        watermark_text: row.watermark_text?.trim() || `${storeName} 土地增值稅試算`,
        expires_at: required(row, "expires_at"),
        is_active: row.is_active?.trim().toLowerCase() !== "false",
        is_test_account: row.is_test_account?.trim().toLowerCase() === "true",
      };
    }),
  );

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from("store_users").upsert(records, {
    onConflict: "store_code,user_code",
  });
  if (error) throw error;

  console.log(`Upserted ${records.length} store user(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
