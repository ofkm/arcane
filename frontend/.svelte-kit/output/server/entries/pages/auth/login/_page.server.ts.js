import { r as redirect, f as fail } from "../../../../chunks/index.js";
import { c as getUserByUsernameFromDb, v as verifyPassword } from "../../../../chunks/user-service.js";
import { g as getSettings } from "../../../../chunks/settings-service.js";
const load = async ({ locals, url }) => {
  const session = locals.session.data;
  const appSettings = await getSettings();
  if (session?.userId) {
    if (!appSettings.onboarding?.completed) {
      throw redirect(302, "/onboarding/welcome");
    } else {
      throw redirect(302, "/");
    }
  }
  const redirectTo = url.searchParams.get("redirect") || "/";
  const error = url.searchParams.get("error");
  return {
    redirectTo,
    settings: appSettings,
    // Pass all settings to the page
    error
    // Pass error to the page
  };
};
const actions = {
  login: async ({ request, locals }) => {
    const formData = await request.formData();
    const username = formData.get("username")?.toString() || "";
    const password = formData.get("password")?.toString() || "";
    const redirectTo = formData.get("redirectTo")?.toString() || "/";
    try {
      const user = await getUserByUsernameFromDb(username);
      if (!user) {
        console.log(`User not found: ${username}`);
        return fail(400, { error: "Invalid username or password", username, redirectTo });
      }
      const appSettings = await getSettings();
      if (appSettings.auth?.localAuthEnabled === false) {
        console.log(`Local login attempt for ${username} when local auth is disabled.`);
        return fail(403, { error: "Local login is disabled.", username, redirectTo });
      }
      if (!user.passwordHash) {
        console.log(`Local login attempt for OIDC-only user: ${username}`);
        return fail(400, { error: "This account must sign in via OIDC.", username, redirectTo });
      }
      const passwordValid = await verifyPassword(user, password);
      if (!passwordValid) {
        console.log("Password verification failed");
        return fail(400, { error: "Invalid username or password", username, redirectTo });
      }
      try {
        await locals.session.set({
          userId: user.id,
          username: user.username,
          createdAt: Date.now(),
          lastAccessed: Date.now()
        });
      } catch (sessionError) {
        console.error("Session creation error:", sessionError);
        return fail(500, { error: "Failed to create session.", username, redirectTo });
      }
      return {
        status: 302,
        location: redirectTo
      };
    } catch (error) {
      if (error instanceof Response && error.status === 302) throw error;
      console.error("Login error details:", error);
      const errorMessage = error instanceof Error ? `Login failed: ${error.message}` : "An error occurred during login";
      return fail(500, { error: errorMessage, username, redirectTo });
    }
  }
};
export {
  actions,
  load
};
