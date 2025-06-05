import { j as json } from './index-Ddp2AB5f.js';
import { a as getUserById, d as deleteUserFromDb, h as hashPassword, s as saveUser } from './user-service-DRkBleBJ.js';
import './settings-service-B1w8bfJq.js';
import { A as ApiErrorCode } from './errors.type-DfKnJ3rD.js';
import { t as tryCatch } from './try-catch-KtE72Cop.js';
import 'node:fs/promises';
import 'node:path';
import 'bcryptjs';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:util';
import './schema-CDkq0ub_.js';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';
import 'proper-lockfile';
import './settings-db-service-DyTlfQVT.js';

const PUT = async ({ request, params, locals }) => {
  try {
    const userId = params.id;
    if (!userId) {
      return json({ success: false, error: "User ID is required" }, { status: 400 });
    }
    const bodyResult = await tryCatch(request.json());
    if (bodyResult.error) {
      return json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }
    const { username, displayName, email, roles, password } = bodyResult.data;
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      return json({ success: false, error: "User not found" }, { status: 404 });
    }
    const updatedUser = {
      ...existingUser,
      ...username !== void 0 && { username },
      ...displayName !== void 0 && { displayName },
      ...email !== void 0 && { email },
      ...roles !== void 0 && { roles },
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (password) {
      updatedUser.passwordHash = await hashPassword(password);
    }
    await saveUser(updatedUser);
    return json({
      success: true,
      user: {
        ...updatedUser,
        passwordHash: void 0
      }
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return json({ success: false, error: "Failed to update user" }, { status: 500 });
  }
};
const DELETE = async ({ params, locals }) => {
  if (!locals.user || !locals.user.roles.includes("admin")) {
    const response = {
      success: false,
      error: "Unauthorized",
      code: ApiErrorCode.FORBIDDEN
    };
    return json(response, { status: 403 });
  }
  const userId = params.id;
  if (userId === locals.user.id) {
    const response = {
      success: false,
      error: "Cannot delete your own account",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  try {
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      const response = {
        success: false,
        error: "User not found",
        code: ApiErrorCode.NOT_FOUND
      };
      return json(response, { status: 404 });
    }
    const deleteResult = await tryCatch(deleteUserFromDb(userId));
    if (deleteResult.error) {
      console.error("Error deleting user from database:", deleteResult.error);
      const response = {
        success: false,
        error: "Failed to delete user",
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        details: deleteResult.error
      };
      return json(response, { status: 500 });
    }
    return json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    const response = {
      success: false,
      error: "Failed to delete user",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: error
    };
    return json(response, { status: 500 });
  }
};

export { DELETE, PUT };
//# sourceMappingURL=_server.ts-BLoxKRgd.js.map
