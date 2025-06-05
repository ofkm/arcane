import fs from "node:fs/promises";
import path__default from "node:path";
import bcrypt from "bcryptjs";
import { d as decrypt } from "./encryption-service.js";
import { u as usersTable, U as USER_DIR, e as ensureDirectory } from "./schema.js";
import { eq } from "drizzle-orm";
import { d as db } from "./index4.js";
async function migrateUsersToDatabase(backupOldFiles = true) {
  const errors = [];
  let migratedCount = 0;
  try {
    console.log("Starting user migration from file to database...");
    const fileUsers = await listUsersFromFile();
    console.log(`Found ${fileUsers.length} users in file system`);
    if (fileUsers.length === 0) {
      console.log("No users found in file system. Migration completed.");
      return { success: true, migratedCount: 0, errors: [] };
    }
    const existingUsers = await db.select().from(usersTable).limit(1);
    if (existingUsers.length > 0) {
      console.log("Users already exist in database. Migration aborted.");
      return { success: false, migratedCount: 0, errors: ["Users already exist in database"] };
    }
    for (const user of fileUsers) {
      try {
        const insertData = {
          id: user.id,
          username: user.username,
          passwordHash: user.passwordHash || null,
          displayName: user.displayName || null,
          email: user.email || null,
          roles: JSON.stringify(user.roles || []),
          requirePasswordChange: user.requirePasswordChange || false,
          oidcSubjectId: user.oidcSubjectId || null,
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
          createdAt: new Date(user.createdAt),
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : /* @__PURE__ */ new Date()
        };
        await db.insert(usersTable).values(insertData);
        migratedCount++;
        console.log(`Migrated user: ${user.username}`);
      } catch (error) {
        const errorMsg = `Failed to migrate user ${user.username}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    console.log(`Successfully migrated ${migratedCount} users to database`);
    if (backupOldFiles && migratedCount > 0) {
      try {
        const backupDir = path__default.join(USER_DIR, `backup-${Date.now()}`);
        await fs.mkdir(backupDir, { recursive: true });
        const files = await fs.readdir(USER_DIR);
        const userFiles = files.filter((file) => file.endsWith(".dat"));
        for (const file of userFiles) {
          const sourcePath = path__default.join(USER_DIR, file);
          const backupPath = path__default.join(backupDir, file);
          try {
            await fs.copyFile(sourcePath, backupPath);
          } catch (copyError) {
            console.warn(`Could not backup user file ${file}:`, copyError);
          }
        }
        console.log(`User files backed up to: ${backupDir}`);
      } catch (backupError) {
        console.warn("Could not create backup of user files:", backupError);
        errors.push(`Backup failed: ${backupError}`);
      }
    }
    return {
      success: errors.length === 0,
      migratedCount,
      errors
    };
  } catch (error) {
    console.error("Failed to migrate users to database:", error);
    return {
      success: false,
      migratedCount,
      errors: [...errors, `Migration failed: ${error}`]
    };
  }
}
async function getUserByIdFromDb(id) {
  try {
    const result = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (result.length === 0) {
      return null;
    }
    const dbUser = result[0];
    return {
      id: dbUser.id,
      username: dbUser.username,
      passwordHash: dbUser.passwordHash || void 0,
      displayName: dbUser.displayName || void 0,
      email: dbUser.email || void 0,
      roles: JSON.parse(dbUser.roles),
      requirePasswordChange: dbUser.requirePasswordChange,
      oidcSubjectId: dbUser.oidcSubjectId || void 0,
      lastLogin: dbUser.lastLogin ? dbUser.lastLogin.toISOString() : void 0,
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt ? dbUser.updatedAt.toISOString() : void 0
    };
  } catch (error) {
    console.error("Failed to get user from database:", error);
    throw error;
  }
}
async function getUserByUsernameFromDb(username) {
  try {
    const result = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (result.length === 0) {
      return null;
    }
    const dbUser = result[0];
    return {
      id: dbUser.id,
      username: dbUser.username,
      passwordHash: dbUser.passwordHash || void 0,
      displayName: dbUser.displayName || void 0,
      email: dbUser.email || void 0,
      roles: JSON.parse(dbUser.roles),
      requirePasswordChange: dbUser.requirePasswordChange,
      oidcSubjectId: dbUser.oidcSubjectId || void 0,
      // Fix: Handle Date objects from Drizzle timestamp mode properly
      lastLogin: dbUser.lastLogin ? dbUser.lastLogin.toISOString() : void 0,
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt ? dbUser.updatedAt.toISOString() : void 0
    };
  } catch (error) {
    console.error("Failed to get user by username from database:", error);
    throw error;
  }
}
async function getUserByOidcSubjectIdFromDb(oidcSubjectId) {
  try {
    const result = await db.select().from(usersTable).where(eq(usersTable.oidcSubjectId, oidcSubjectId)).limit(1);
    if (result.length === 0) {
      return null;
    }
    const dbUser = result[0];
    return {
      id: dbUser.id,
      username: dbUser.username,
      passwordHash: dbUser.passwordHash || void 0,
      displayName: dbUser.displayName || void 0,
      email: dbUser.email || void 0,
      roles: JSON.parse(dbUser.roles),
      requirePasswordChange: dbUser.requirePasswordChange,
      oidcSubjectId: dbUser.oidcSubjectId || void 0,
      // Fix: Handle Date objects from Drizzle timestamp mode properly
      lastLogin: dbUser.lastLogin ? dbUser.lastLogin.toISOString() : void 0,
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt ? dbUser.updatedAt.toISOString() : void 0
    };
  } catch (error) {
    console.error("Failed to get user by OIDC subject ID from database:", error);
    throw error;
  }
}
async function listUsersFromDb() {
  try {
    const result = await db.select().from(usersTable);
    return result.map((dbUser) => ({
      id: dbUser.id,
      username: dbUser.username,
      passwordHash: dbUser.passwordHash || void 0,
      displayName: dbUser.displayName || void 0,
      email: dbUser.email || void 0,
      roles: JSON.parse(dbUser.roles),
      requirePasswordChange: dbUser.requirePasswordChange,
      oidcSubjectId: dbUser.oidcSubjectId || void 0,
      // Fix: Handle Date objects from Drizzle timestamp mode properly
      lastLogin: dbUser.lastLogin ? dbUser.lastLogin.toISOString() : void 0,
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt ? dbUser.updatedAt.toISOString() : void 0
    }));
  } catch (error) {
    console.error("Failed to list users from database:", error);
    throw error;
  }
}
async function saveUserToDb(user) {
  try {
    const userData = {
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash || null,
      displayName: user.displayName || null,
      email: user.email || null,
      roles: JSON.stringify(user.roles || []),
      requirePasswordChange: user.requirePasswordChange || false,
      oidcSubjectId: user.oidcSubjectId || null,
      lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
      createdAt: new Date(user.createdAt),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const existing = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    if (existing.length > 0) {
      await db.update(usersTable).set(userData).where(eq(usersTable.id, user.id));
    } else {
      await db.insert(usersTable).values(userData);
    }
    return user;
  } catch (error) {
    console.error("Failed to save user to database:", error);
    throw error;
  }
}
async function deleteUserFromDb(id) {
  try {
    const result = await db.delete(usersTable).where(eq(usersTable.id, id));
    return true;
  } catch (error) {
    console.error("Failed to delete user from database:", error);
    throw error;
  }
}
const userDbService = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  deleteUserFromDb,
  getUserByIdFromDb,
  getUserByOidcSubjectIdFromDb,
  getUserByUsernameFromDb,
  listUsersFromDb,
  migrateUsersToDatabase,
  saveUserToDb
}, Symbol.toStringTag, { value: "Module" }));
const getUserById = getUserByIdFromDb;
const getUserByUsername = getUserByUsernameFromDb;
const getUserByOidcSubjectId = getUserByOidcSubjectIdFromDb;
const listUsers = listUsersFromDb;
const saveUser = saveUserToDb;
async function verifyPassword(user, password) {
  if (typeof user.passwordHash !== "string") {
    return false;
  }
  return await bcrypt.compare(password, user.passwordHash);
}
async function hashPassword(password) {
  return await bcrypt.hash(password, 14);
}
async function ensureUserDir() {
  await ensureDirectory(USER_DIR, 448);
}
async function listUsersFromFile() {
  try {
    await ensureUserDir();
    const files = await fs.readdir(USER_DIR);
    const userFiles = files.filter((file) => file.endsWith(".dat"));
    const users = await Promise.all(
      userFiles.map(async (file) => {
        try {
          const filePath = path__default.join(USER_DIR, file);
          const encryptedData = await fs.readFile(filePath, "utf8");
          return await decrypt(encryptedData);
        } catch (error) {
          console.error(`Error reading user file ${file}:`, error);
          return null;
        }
      })
    );
    return users.filter((user) => user !== null);
  } catch (error) {
    console.error("Error listing users:", error);
    return [];
  }
}
export {
  getUserById as a,
  getUserByOidcSubjectId as b,
  getUserByUsernameFromDb as c,
  deleteUserFromDb as d,
  getUserByUsername as g,
  hashPassword as h,
  listUsers as l,
  saveUser as s,
  userDbService as u,
  verifyPassword as v
};
