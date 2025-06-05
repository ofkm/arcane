import { eq } from "drizzle-orm";
import { f as stacksTable, S as STACKS_DIR } from "./schema.js";
import fs from "node:fs/promises";
import path__default from "node:path";
import { d as db } from "./index4.js";
function ensureDateObject(dateInput) {
  if (dateInput === null || dateInput === void 0) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === "string") return new Date(dateInput);
  if (typeof dateInput === "number") {
    return new Date(dateInput * (dateInput < 1e12 ? 1e3 : 1));
  }
  console.warn("ensureDateObject received invalid input:", dateInput);
  return null;
}
async function loadStacksFromFiles() {
  try {
    const stackDirEntries = await fs.readdir(STACKS_DIR, { withFileTypes: true });
    const stacks = [];
    for (const entry of stackDirEntries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const dirName = entry.name;
      const stackDir = path__default.join(STACKS_DIR, dirName);
      let composeContent = "";
      const potentialComposePaths = [path__default.join(stackDir, "compose.yaml"), path__default.join(stackDir, "docker-compose.yml"), path__default.join(stackDir, "compose.yml"), path__default.join(stackDir, "docker-compose.yaml")];
      for (const p of potentialComposePaths) {
        try {
          await fs.access(p);
          composeContent = await fs.readFile(p, "utf8");
          break;
        } catch {
        }
      }
      if (!composeContent) {
        console.warn(`No compose file found in directory ${dirName}, skipping.`);
        continue;
      }
      let dirStat;
      try {
        dirStat = await fs.stat(stackDir);
      } catch (statErr) {
        console.error(`Could not stat directory ${stackDir}:`, statErr);
        const now = /* @__PURE__ */ new Date();
        dirStat = { birthtime: now, mtime: now };
      }
      stacks.push({
        id: dirName,
        name: dirName,
        serviceCount: 0,
        runningCount: 0,
        status: "unknown",
        createdAt: dirStat.birthtime.toISOString(),
        updatedAt: dirStat.mtime.toISOString(),
        isExternal: false
      });
    }
    return stacks;
  } catch (err) {
    console.error("Error loading stacks from STACKS_DIR:", err);
    throw new Error("Failed to load compose stacks");
  }
}
async function migrateStacksToDatabase(backupOldFiles = true) {
  const errors = [];
  let migratedCount = 0;
  try {
    console.log("Starting stack migration from file to database...");
    const fileStacks = await loadStacksFromFiles();
    console.log(`Found ${fileStacks.length} stacks in file system`);
    if (fileStacks.length === 0) {
      console.log("No stacks found in file system. Migration completed.");
      return { success: true, migratedCount: 0, errors: [] };
    }
    const existingStacks = await db.select({ id: stacksTable.id }).from(stacksTable).limit(1);
    if (existingStacks.length > 0) {
      console.log("Stacks already exist in database. Migration aborted.");
      return { success: false, migratedCount: 0, errors: ["Stacks already exist in database"] };
    }
    for (const stack of fileStacks) {
      try {
        const stackDir = path__default.join(STACKS_DIR, stack.id);
        let composeContent = "";
        let envContent = "";
        const potentialComposePaths = [path__default.join(stackDir, "compose.yaml"), path__default.join(stackDir, "docker-compose.yml"), path__default.join(stackDir, "compose.yml"), path__default.join(stackDir, "docker-compose.yaml")];
        for (const composePath of potentialComposePaths) {
          try {
            composeContent = await fs.readFile(composePath, "utf8");
            break;
          } catch {
          }
        }
        try {
          const envPath = path__default.join(stackDir, ".env");
          envContent = await fs.readFile(envPath, "utf8");
        } catch {
        }
        const dbInsertValues = {
          id: stack.id,
          name: stack.name,
          dirName: stack.id,
          // Assuming dirName is stack.id for migration
          path: stackDir,
          // Assuming path is STACKS_DIR + stack.id
          autoUpdate: false,
          // Default value
          isExternal: stack.isExternal || false,
          isLegacy: stack.isLegacy || false,
          isRemote: stack.isRemote || false,
          agentId: stack.agentId || null,
          agentHostname: stack.agentHostname || null,
          status: stack.status,
          serviceCount: stack.serviceCount || 0,
          runningCount: stack.runningCount || 0,
          composeContent: composeContent || null,
          envContent: envContent || null,
          lastPolled: null,
          // Explicitly null for new migration
          createdAt: ensureDateObject(stack.createdAt) || /* @__PURE__ */ new Date(),
          // Convert ISO string to Date
          updatedAt: ensureDateObject(stack.updatedAt) || /* @__PURE__ */ new Date()
          // Convert ISO string to Date
        };
        await db.insert(stacksTable).values(dbInsertValues);
        migratedCount++;
        console.log(`Migrated stack: ${stack.name}`);
      } catch (error) {
        const errorMsg = `Failed to migrate stack ${stack.name}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
  } catch (error) {
    console.error("Failed to migrate stacks to database:", error);
    return {
      success: false,
      migratedCount,
      errors: [...errors, `Migration failed: ${String(error)}`]
    };
  }
  return { success: errors.length === 0, migratedCount, errors };
}
async function getStackByIdFromDb(id) {
  try {
    const result = await db.select().from(stacksTable).where(eq(stacksTable.id, id)).limit(1);
    if (result.length === 0) return null;
    const dbStack = result[0];
    return {
      id: dbStack.id,
      name: dbStack.name,
      serviceCount: dbStack.serviceCount,
      runningCount: dbStack.runningCount,
      status: dbStack.status,
      isExternal: dbStack.isExternal,
      isLegacy: dbStack.isLegacy,
      isRemote: dbStack.isRemote,
      agentId: dbStack.agentId || void 0,
      agentHostname: dbStack.agentHostname || void 0,
      createdAt: dbStack.createdAt.toISOString(),
      // Convert Date to ISO String
      updatedAt: dbStack.updatedAt.toISOString(),
      // Convert Date to ISO String
      lastPolled: dbStack.lastPolled ? dbStack.lastPolled.toISOString() : void 0,
      // Convert Date to ISO String
      composeContent: dbStack.composeContent || void 0,
      envContent: dbStack.envContent || void 0
    };
  } catch (error) {
    console.error("Failed to get stack from database:", error);
    throw error;
  }
}
async function listStacksFromDb() {
  try {
    const result = await db.select().from(stacksTable);
    return result.map((dbStack) => ({
      id: dbStack.id,
      name: dbStack.name,
      serviceCount: dbStack.serviceCount,
      runningCount: dbStack.runningCount,
      status: dbStack.status,
      isExternal: dbStack.isExternal,
      isLegacy: dbStack.isLegacy,
      isRemote: dbStack.isRemote,
      agentId: dbStack.agentId || void 0,
      agentHostname: dbStack.agentHostname || void 0,
      createdAt: dbStack.createdAt.toISOString(),
      updatedAt: dbStack.updatedAt.toISOString(),
      composeContent: dbStack.composeContent || void 0,
      envContent: dbStack.envContent || void 0,
      services: []
    }));
  } catch (error) {
    console.error("Failed to list stacks from database:", error);
    throw error;
  }
}
async function saveStackToDb(stack) {
  try {
    const now = /* @__PURE__ */ new Date();
    const createdAtForDb = ensureDateObject(stack.createdAt) || now;
    const lastPolledForDb = ensureDateObject(stack.lastPolled);
    const dataToSave = {
      id: stack.id,
      name: stack.name,
      dirName: stack.dirName || stack.id,
      path: stack.path || path__default.join(STACKS_DIR, stack.id),
      // Ensure path is provided or derived
      isExternal: typeof stack.isExternal === "boolean" ? stack.isExternal : false,
      isLegacy: typeof stack.isLegacy === "boolean" ? stack.isLegacy : false,
      isRemote: typeof stack.isRemote === "boolean" ? stack.isRemote : false,
      agentId: stack.agentId || null,
      agentHostname: stack.agentHostname || null,
      status: stack.status,
      serviceCount: stack.serviceCount || 0,
      runningCount: stack.runningCount || 0,
      composeContent: stack.composeContent || null,
      envContent: stack.envContent || null,
      lastPolled: lastPolledForDb
    };
    const existing = await db.select({ id: stacksTable.id }).from(stacksTable).where(eq(stacksTable.id, stack.id)).limit(1);
    if (existing.length > 0) {
      await db.update(stacksTable).set({
        ...dataToSave,
        updatedAt: now
        // Always update 'updatedAt' on modification
      }).where(eq(stacksTable.id, stack.id));
    } else {
      await db.insert(stacksTable).values({
        ...dataToSave,
        createdAt: createdAtForDb,
        // Set 'createdAt' for new records
        updatedAt: now
        // Set 'updatedAt' for new records
      });
    }
    return stack;
  } catch (error) {
    console.error("Failed to save stack to database:", error);
    throw error;
  }
}
async function updateStackRuntimeInfoInDb(id, updates) {
  try {
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
      // Pass Date object directly
    };
    if (updates.status !== void 0) updateData.status = updates.status;
    if (updates.serviceCount !== void 0) updateData.serviceCount = updates.serviceCount;
    if (updates.runningCount !== void 0) updateData.runningCount = updates.runningCount;
    if (updates.lastPolled !== void 0) {
      updateData.lastPolled = ensureDateObject(updates.lastPolled);
    }
    await db.update(stacksTable).set(updateData).where(eq(stacksTable.id, id));
  } catch (error) {
    console.error("Failed to update stack runtime info in database:", error);
    throw error;
  }
}
async function updateStackContentInDb(id, updates) {
  try {
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
      // Pass Date object
    };
    if (updates.composeContent !== void 0) updateData.composeContent = updates.composeContent;
    if (updates.envContent !== void 0) updateData.envContent = updates.envContent;
    await db.update(stacksTable).set(updateData).where(eq(stacksTable.id, id));
  } catch (error) {
    console.error("Failed to update stack content in database:", error);
    throw error;
  }
}
async function deleteStackFromDb(id) {
  try {
    await db.delete(stacksTable).where(eq(stacksTable.id, id));
    return true;
  } catch (error) {
    console.error("Failed to delete stack from database:", error);
    throw error;
  }
}
export {
  deleteStackFromDb,
  getStackByIdFromDb,
  listStacksFromDb,
  migrateStacksToDatabase,
  saveStackToDb,
  updateStackContentInDb,
  updateStackRuntimeInfoInDb
};
