import { U as UserAPIService } from "../../../../chunks/user-api-service.js";
import { l as listUsers } from "../../../../chunks/user-service.js";
const load = async ({ cookies }) => {
  try {
    const userApi = new UserAPIService();
    const users = await listUsers();
    const sanitizedUsers = users.map((user) => {
      const { passwordHash: _passwordHash, ...rest } = user;
      return rest;
    });
    return {
      users: users || []
    };
  } catch (error) {
    console.error("Failed to load users:", error);
    return {
      users: []
    };
  }
};
export {
  load
};
