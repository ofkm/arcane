import { j as json } from './index-Ddp2AB5f.js';
import { g as getUserByUsername, v as verifyPassword, h as hashPassword, s as saveUser } from './user-service-DRkBleBJ.js';
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

const POST = async ({ request, locals }) => {
  const currentUser = locals.user;
  if (!currentUser) {
    const response = {
      success: false,
      error: "Not authenticated",
      code: ApiErrorCode.UNAUTHORIZED
    };
    return json(response, { status: 401 });
  }
  const bodyResult = await tryCatch(request.json());
  if (bodyResult.error) {
    const response = {
      success: false,
      error: "Invalid JSON payload",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const { currentPassword, newPassword } = bodyResult.data;
  if (!currentPassword || !newPassword) {
    const response = {
      success: false,
      error: "Both current and new passwords are required",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const userResult = await tryCatch(getUserByUsername(currentUser.username));
  if (userResult.error || !userResult.data) {
    const response = {
      success: false,
      error: "User not found",
      code: ApiErrorCode.NOT_FOUND
    };
    return json(response, { status: 404 });
  }
  const user = userResult.data;
  const verifyResult = await tryCatch(verifyPassword(user, currentPassword));
  if (verifyResult.error || !verifyResult.data) {
    const response = {
      success: false,
      error: "Current password is incorrect",
      code: ApiErrorCode.BAD_REQUEST
    };
    return json(response, { status: 400 });
  }
  const hashResult = await tryCatch(hashPassword(newPassword));
  if (hashResult.error) {
    console.error("Error hashing new password:", hashResult.error);
    const response = {
      success: false,
      error: "Failed to hash new password",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: hashResult.error
    };
    return json(response, { status: 500 });
  }
  const saveResult = await tryCatch(
    saveUser({
      ...user,
      passwordHash: hashResult.data,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    })
  );
  if (saveResult.error) {
    console.error("Error saving user with new password:", saveResult.error);
    const response = {
      success: false,
      error: "Failed to change password",
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: saveResult.error
    };
    return json(response, { status: 500 });
  }
  return json({ success: true });
};

export { POST };
//# sourceMappingURL=_server.ts-CRtI5KqD.js.map
