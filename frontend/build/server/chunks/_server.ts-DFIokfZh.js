import { r as redirect } from './index-Ddp2AB5f.js';
import { generateState, generateCodeVerifier, CodeChallengeMethod } from 'arctic';
import { g as getOIDCClient, c as getOIDCAuthorizationEndpoint, d as getOIDCScopes } from './oidc-service-HuELLBQe.js';
import './shared-server-DIsQ43MR.js';
import './settings-service-B1w8bfJq.js';
import 'proper-lockfile';
import './encryption-service-C1I869gF.js';
import 'node:crypto';
import 'node:fs/promises';
import 'node:path';
import 'node:util';
import './schema-CDkq0ub_.js';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './settings-db-service-DyTlfQVT.js';
import './index4-SoK3Vczo.js';

const GET = async ({ cookies, url }) => {
  const oidcClient = await getOIDCClient();
  const authorizationEndpoint = await getOIDCAuthorizationEndpoint();
  const scopes = await getOIDCScopes();
  if (!oidcClient) {
    console.error("OIDC client is not configured.");
    throw redirect(302, "/auth/login?error=oidc_misconfigured");
  }
  if (!authorizationEndpoint) {
    console.error("OIDC_AUTHORIZATION_ENDPOINT is not configured.");
    throw redirect(302, "/auth/login?error=oidc_misconfigured");
  }
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const authUrl = await oidcClient.createAuthorizationURLWithPKCE(authorizationEndpoint, state, CodeChallengeMethod.S256, codeVerifier, scopes);
  cookies.set("oidc_state", state, {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax"
  });
  cookies.set("oidc_code_verifier", codeVerifier, {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax"
  });
  function isSafeRedirect(redirect2) {
    if (!redirect2) return false;
    try {
      const parsed = new URL(redirect2, "http://dummy");
      return parsed.origin === "http://dummy" && redirect2.startsWith("/");
    } catch {
      return false;
    }
  }
  const redirectUrl = url.searchParams.get("redirect");
  const safeRedirect = isSafeRedirect(redirectUrl) ? redirectUrl : "/";
  cookies.set("oidc_redirect", safeRedirect ?? "/", {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax"
  });
  throw redirect(302, authUrl.toString());
};

export { GET };
//# sourceMappingURL=_server.ts-DFIokfZh.js.map
