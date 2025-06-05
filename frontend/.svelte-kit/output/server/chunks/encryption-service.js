import crypto from "node:crypto";
import fs from "node:fs/promises";
import path__default from "node:path";
import { promisify } from "node:util";
import { K as KEY_FILE, e as ensureDirectory } from "./schema.js";
const PBKDF2_ITERATIONS = 1e5;
const KEY_LENGTH = 32;
const pbkdf2Async = promisify(crypto.pbkdf2);
async function getSecretKey() {
  try {
    await fs.access(KEY_FILE);
    const keyData = await fs.readFile(KEY_FILE);
    return keyData;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.log("Generating new encryption key...");
      const key = crypto.randomBytes(KEY_LENGTH);
      await ensureDirectory(path__default.dirname(KEY_FILE), 448);
      await fs.writeFile(KEY_FILE, key, { mode: 384 });
      return key;
    }
    console.error("Error accessing encryption key:", error);
    throw error;
  }
}
async function decrypt(encryptedData) {
  const secretKey = await getSecretKey();
  const parts = encryptedData.split(":");
  if (parts.length !== 4) throw new Error("Invalid encrypted data format");
  const salt = Buffer.from(parts[0], "hex");
  const iv = Buffer.from(parts[1], "hex");
  const authTag = Buffer.from(parts[2], "hex");
  const encrypted = parts[3];
  const key = await pbkdf2Async(secretKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}
export {
  decrypt as d
};
