import { f as fail, r as redirect } from './index-Ddp2AB5f.js';
import { c as getUserByUsernameFromDb, v as verifyPassword } from './user-service-DRkBleBJ.js';
import { g as getSettings } from './settings-service-B1w8bfJq.js';
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

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 6;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-gYl3i_Z3.js')).default;
const server_id = "src/routes/auth/login/+page.server.ts";
const imports = ["_app/immutable/nodes/6.DHMys3EW.js","_app/immutable/chunks/zguDtZw-.js","_app/immutable/chunks/SIFgIYqZ.js","_app/immutable/chunks/D4OMRqmI.js","_app/immutable/chunks/BmbK19Nn.js","_app/immutable/chunks/CU5Yr9hi.js","_app/immutable/chunks/CCdH-GF7.js","_app/immutable/chunks/CGNubMbN.js","_app/immutable/chunks/hybYrdok.js","_app/immutable/chunks/DsjzulNM.js","_app/immutable/chunks/C7TZ37ch.js","_app/immutable/chunks/87Ty6o0e.js","_app/immutable/chunks/D1n4spDD.js","_app/immutable/chunks/DUYgD2_s.js","_app/immutable/chunks/BAOWbDue.js","_app/immutable/chunks/Hi6OfGhB.js","_app/immutable/chunks/m9ItHG6J.js","_app/immutable/chunks/iMjrFJrG.js","_app/immutable/chunks/C4qL6Mf1.js","_app/immutable/chunks/CX4OS9M0.js","_app/immutable/chunks/CVwLPvhk.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-CyXHfX0Y.js.map
