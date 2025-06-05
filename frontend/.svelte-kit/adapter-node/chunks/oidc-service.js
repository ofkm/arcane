import { OAuth2Client } from "arctic";
import { d as private_env } from "./shared-server.js";
import { b as building } from "./environment.js";
import { g as getSettings } from "./settings-service.js";
let oidcConfig = null;
let oidcClient = null;
async function getOIDCConfig() {
  if (building) {
    return {
      enabled: false,
      clientId: "",
      clientSecret: "",
      redirectUri: "",
      authorizationEndpoint: "",
      tokenEndpoint: "",
      userinfoEndpoint: "",
      scopes: ["openid", "email", "profile"]
    };
  }
  if (oidcConfig) {
    return { enabled: true, ...oidcConfig };
  }
  try {
    const settings = await getSettings();
    let resolvedClientId = private_env.OIDC_CLIENT_ID;
    let resolvedClientSecret = private_env.OIDC_CLIENT_SECRET;
    let resolvedRedirectUri = private_env.OIDC_REDIRECT_URI;
    let resolvedAuthEndpoint = private_env.OIDC_AUTHORIZATION_ENDPOINT;
    let resolvedTokenEndpoint = private_env.OIDC_TOKEN_ENDPOINT;
    let resolvedUserInfoEndpoint = private_env.OIDC_USERINFO_ENDPOINT;
    let resolvedScopesString = private_env.OIDC_SCOPES;
    if (settings.auth.oidcEnabled && settings.auth.oidc) {
      if (resolvedClientId === void 0) resolvedClientId = settings.auth.oidc.clientId;
      if (resolvedClientSecret === void 0) resolvedClientSecret = settings.auth.oidc.clientSecret;
      if (resolvedRedirectUri === void 0) resolvedRedirectUri = settings.auth.oidc.redirectUri;
      if (resolvedAuthEndpoint === void 0) resolvedAuthEndpoint = settings.auth.oidc.authorizationEndpoint;
      if (resolvedTokenEndpoint === void 0) resolvedTokenEndpoint = settings.auth.oidc.tokenEndpoint;
      if (resolvedUserInfoEndpoint === void 0) resolvedUserInfoEndpoint = settings.auth.oidc.userinfoEndpoint;
      if (resolvedScopesString === void 0) resolvedScopesString = settings.auth.oidc.scopes;
    }
    if (resolvedScopesString === void 0) {
      resolvedScopesString = "openid email profile";
    }
    const scopes = resolvedScopesString.split(" ").filter((s) => s.trim() !== "");
    if (!resolvedClientId || !resolvedClientSecret || !resolvedRedirectUri) {
      console.log("OIDC not configured or incomplete configuration, OIDC will be disabled");
      return {
        enabled: false,
        clientId: "",
        clientSecret: "",
        redirectUri: "",
        authorizationEndpoint: "",
        tokenEndpoint: "",
        userinfoEndpoint: "",
        scopes
      };
    }
    oidcConfig = {
      clientId: resolvedClientId,
      clientSecret: resolvedClientSecret,
      redirectUri: resolvedRedirectUri,
      authorizationEndpoint: resolvedAuthEndpoint,
      tokenEndpoint: resolvedTokenEndpoint,
      userinfoEndpoint: resolvedUserInfoEndpoint,
      scopes
    };
    if (!resolvedAuthEndpoint || !resolvedTokenEndpoint) {
      console.warn("OIDC Authorization or Token Endpoint is not set (from environment or application settings). OIDC flow will likely fail.");
    }
    return { enabled: true, ...oidcConfig };
  } catch (error) {
    console.warn("Failed to load OIDC configuration:", error);
    return {
      enabled: false,
      clientId: "",
      clientSecret: "",
      redirectUri: "",
      authorizationEndpoint: "",
      tokenEndpoint: "",
      userinfoEndpoint: "",
      scopes: ["openid", "email", "profile"]
    };
  }
}
async function getOIDCClient() {
  if (building) {
    return null;
  }
  if (oidcClient) {
    return oidcClient;
  }
  const config = await getOIDCConfig();
  if (!config.enabled) {
    return null;
  }
  oidcClient = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
  return oidcClient;
}
async function getOIDCScopes() {
  const config = await getOIDCConfig();
  return config.scopes;
}
async function getOIDCAuthorizationEndpoint() {
  const config = await getOIDCConfig();
  return config.authorizationEndpoint || "";
}
async function getOIDCTokenEndpoint() {
  const config = await getOIDCConfig();
  return config.tokenEndpoint || "";
}
async function getOIDCUserinfoEndpoint() {
  const config = await getOIDCConfig();
  return config.userinfoEndpoint || "";
}
export {
  getOIDCTokenEndpoint as a,
  getOIDCUserinfoEndpoint as b,
  getOIDCAuthorizationEndpoint as c,
  getOIDCScopes as d,
  getOIDCClient as g
};
