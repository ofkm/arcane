import { j as json } from "../../../../../../chunks/index.js";
import fs from "node:fs/promises";
import path__default from "node:path";
import slugify from "slugify";
import { ensureStacksDir, isStackRunning, stopStack, startStack } from "../../../../../../chunks/stack-custom-service.js";
import { A as ApiErrorCode } from "../../../../../../chunks/errors.type.js";
import { t as tryCatch } from "../../../../../../chunks/try-catch.js";
async function migrateStackToNameFolder(stackId) {
  const stacksDir = await ensureStacksDir();
  const oldDirPath = path__default.join(stacksDir, stackId);
  const stat = await fs.stat(oldDirPath);
  if (!stat.isDirectory()) throw new Error(`Stack directory "${stackId}" does not exist`);
  const metaPath = path__default.join(oldDirPath, "meta.json");
  const newMetaPath = path__default.join(oldDirPath, ".stack.json");
  try {
    await fs.access(metaPath);
  } catch {
    throw new Error(`No meta.json found for stack "${stackId}"`);
  }
  try {
    await fs.access(newMetaPath);
    throw new Error(`Stack "${stackId}" is already migrated`);
  } catch {
  }
  let wasRunning = false;
  try {
    wasRunning = await isStackRunning(stackId);
  } catch {
    wasRunning = false;
  }
  try {
    await stopStack(stackId);
    console.log(`Stopped stack "${stackId}" before migration.`);
  } catch (err) {
    console.warn(`Failed to stop stack "${stackId}" before migration:`, err);
  }
  const metaRaw = await fs.readFile(metaPath, "utf8");
  const meta = JSON.parse(metaRaw);
  const slug = slugify(meta.name, { lower: true, strict: true, trim: true });
  let newDirName = slug;
  let counter = 1;
  const dirs = await fs.readdir(stacksDir);
  while (dirs.includes(newDirName) && newDirName !== stackId) {
    newDirName = `${slug}-${counter++}`;
  }
  const newDirPath = path__default.join(stacksDir, newDirName);
  if (newDirName !== stackId) {
    await fs.rename(oldDirPath, newDirPath);
  }
  try {
    await fs.access(path__default.join(newDirPath, "docker-compose.yml"));
    try {
      await fs.access(path__default.join(newDirPath, "compose.yaml"));
    } catch {
      await fs.rename(path__default.join(newDirPath, "docker-compose.yml"), path__default.join(newDirPath, "compose.yaml"));
      console.log(`Migrated docker-compose.yml to compose.yaml in "${newDirName}"`);
    }
  } catch {
  }
  meta.dirName = newDirName;
  meta.path = newDirPath;
  await fs.writeFile(path__default.join(newDirPath, ".stack.json"), JSON.stringify(meta, null, 2), "utf8");
  await fs.rm(path__default.join(newDirPath, "meta.json"));
  console.log(`Migrated stack "${meta.name}" to folder "${newDirName}"`);
  if (wasRunning) {
    try {
      await startStack(newDirName);
      console.log(`Started stack "${newDirName}" after migration.`);
    } catch (err) {
      console.warn(`Failed to start stack "${newDirName}" after migration:`, err);
    }
  }
}
const POST = async ({ params }) => {
  const { stackId } = params;
  if (!stackId) {
    const response = {
      success: false,
      error: "Missing stackId",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const result = await tryCatch(migrateStackToNameFolder(stackId));
  if (result.error) {
    console.error("Error migrating stack:", result.error);
    const response = {
      success: false,
      error: result.error.message || "Failed to migrate stack",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: result.error
    };
    return json(response, { status: 500 });
  }
  return json({
    success: true,
    message: `Stack "${stackId}" migrated successfully.`
  });
};
export {
  POST
};
