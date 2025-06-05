import { r as redirect } from './index-Ddp2AB5f.js';
import { l as listUsers, h as hashPassword, s as saveUser, g as getUserByUsername } from './user-service-DRkBleBJ.js';
import { g as getSettings } from './settings-service-B1w8bfJq.js';
import { handleSession } from 'svelte-kit-cookie-session';
import { createHash } from 'node:crypto';
import { p as public_env } from './shared-server-DIsQ43MR.js';
import { d as dev } from './index5-HpJcNJHQ.js';
import 'node:fs/promises';
import 'node:path';
import 'bcryptjs';
import './encryption-service-C1I869gF.js';
import 'node:util';
import './schema-CDkq0ub_.js';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';
import 'proper-lockfile';
import './settings-db-service-DyTlfQVT.js';
import './false-CRHihH2U.js';

function sequence(...handlers) {
  const length = handlers.length;
  if (!length) return ({ event, resolve }) => resolve(event);
  return ({ event, resolve }) => {
    return apply_handle(0, event, {});
    function apply_handle(i, event2, parent_options) {
      const handle2 = handlers[i];
      return handle2({
        event: event2,
        resolve: (event3, options) => {
          const transformPageChunk = async ({ html, done }) => {
            if (options?.transformPageChunk) {
              html = await options.transformPageChunk({ html, done }) ?? "";
            }
            if (parent_options?.transformPageChunk) {
              html = await parent_options.transformPageChunk({ html, done }) ?? "";
            }
            return html;
          };
          const filterSerializedResponseHeaders = parent_options?.filterSerializedResponseHeaders ?? options?.filterSerializedResponseHeaders;
          const preload = parent_options?.preload ?? options?.preload;
          return i < length - 1 ? apply_handle(i + 1, event3, {
            transformPageChunk,
            filterSerializedResponseHeaders,
            preload
          }) : resolve(event3, { transformPageChunk, filterSerializedResponseHeaders, preload });
        }
      });
    }
  };
}
async function checkFirstRun() {
  try {
    const users = await listUsers();
    if (users.length === 0) {
      console.log("No users found. Creating default admin user...");
      const passwordHash = await hashPassword("arcane-admin");
      await saveUser({
        id: crypto.randomUUID(),
        username: "arcane",
        passwordHash,
        displayName: "Arcane Admin",
        email: "arcane@local",
        roles: ["admin"],
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log("Default admin user created successfully");
      console.log("Username: arcane");
      console.log("Password: arcane-admin");
      console.log("IMPORTANT: Please change this password immediately after first login!");
    }
  } catch (error) {
    console.error("Error during first-run check:", error);
  }
}
const settings = await getSettings();
const sessionTimeout = settings.auth?.sessionTimeout || 1440;
function createSecret(input) {
  const hash = createHash("sha256").update(input).digest();
  return new Uint8Array(hash);
}
const secretInput = public_env.PUBLIC_SESSION_SECRET;
if (!secretInput) {
  throw new Error("PUBLIC_SESSION_SECRET is missing in ENV.");
}
const secret = createSecret(secretInput);
const useSecureCookie = !(public_env.PUBLIC_ALLOW_INSECURE_COOKIES === "true" || dev);
const sessionHandler = handleSession({
  secret,
  expires: sessionTimeout * 60,
  cookie: {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookie
  }
});
const isTestEnvironment = process.env.APP_ENV === "TEST";
{
  try {
    const { runMigrations } = await import('./migrate-y4pzZq-j.js');
    const { migrateSettingsToDatabase } = await import('./settings-db-service-DyTlfQVT.js');
    const { migrateUsersToDatabase } = await import('./user-service-DRkBleBJ.js').then((n) => n.u);
    const { migrateStacksToDatabase } = await import('./compose-db-service-CB23kKq4.js');
    const { initComposeService, stackRuntimeUpdater } = await import('./stack-custom-service-5Y1e9SF0.js');
    const { initAutoUpdateScheduler } = await import('./scheduler-service-BkX7_vyx.js');
    const { initMaturityPollingScheduler } = await import('./image-service-CL2WzxPP.js').then((n) => n.e);
    await runMigrations();
    await Promise.all([migrateSettingsToDatabase(), migrateUsersToDatabase(), migrateStacksToDatabase()]);
    await Promise.all([checkFirstRun(), initComposeService(), initAutoUpdateScheduler(), initMaturityPollingScheduler()]);
    stackRuntimeUpdater.start(2);
  } catch (err) {
    console.error("Critical service init failed, exiting:", err);
    process.exit(1);
  }
}
const authHandler = async ({ event, resolve }) => {
  const { url } = event;
  const path = url.pathname;
  const publicPaths = [
    "/auth/login",
    "/img",
    "/auth/oidc/login",
    "/auth/oidc/callback",
    "/api/agents/register",
    // Agent registration
    "/api/agents/heartbeat"
    // Agent heartbeat
  ];
  const agentPollingPattern = /^\/api\/agents\/[^\/]+\/tasks$/;
  const agentResultPattern = /^\/api\/agents\/[^\/]+\/tasks\/[^\/]+\/result$/;
  const isPublicPath = publicPaths.some((p) => path.startsWith(p));
  const isAgentPolling = agentPollingPattern.test(path) && event.request.method === "GET";
  const isAgentResult = agentResultPattern.test(path) && event.request.method === "POST";
  if (isPublicPath || isAgentPolling || isAgentResult) {
    return await resolve(event);
  }
  const session = event.locals.session.data;
  if (!session || !session.userId) {
    await event.locals.session.destroy();
    throw redirect(302, `/auth/login?redirect=${encodeURIComponent(path)}`);
  }
  if (!event.locals.user) {
    try {
      event.locals.user = await getUserByUsername(session.username);
    } catch {
      await event.locals.session.destroy();
      throw redirect(302, `/auth/login?error=invalid-session`);
    }
  }
  const user = event.locals.user;
  if (!user) {
    await event.locals.session.destroy();
    throw redirect(302, `/auth/login?error=invalid-session`);
  }
  const settings2 = await getSettings();
  const isOnboardingPath = path.startsWith("/onboarding");
  const isApiRoute = path.startsWith("/api/");
  if (!isTestEnvironment) {
    if (!isOnboardingPath && !isApiRoute && !settings2?.onboarding?.completed) {
      throw redirect(302, "/onboarding/welcome");
    }
    if (isApiRoute && !settings2?.onboarding?.completed) {
      const allowedApiDuringOnboarding = ["/api/settings", "/api/users/password"];
      const isAllowedApi = allowedApiDuringOnboarding.some((api) => path.startsWith(api));
      if (!isAllowedApi) {
        throw redirect(302, "/onboarding/welcome");
      }
    }
  }
  return await resolve(event);
};
const handle = sequence(sessionHandler, authHandler);

export { handle };
//# sourceMappingURL=hooks.server-D27uDmgz.js.map
