import { g as getSettings } from "../../../../chunks/settings-service.js";
import { d as private_env } from "../../../../chunks/shared-server.js";
const load = async () => {
  const settings = await getSettings();
  const oidcEnvVarsConfigured = !!private_env.OIDC_CLIENT_ID && !!private_env.OIDC_CLIENT_SECRET && !!private_env.OIDC_REDIRECT_URI && !!private_env.OIDC_AUTHORIZATION_ENDPOINT && !!private_env.OIDC_TOKEN_ENDPOINT && !!private_env.OIDC_USERINFO_ENDPOINT;
  return {
    settings,
    oidcEnvVarsConfigured
  };
};
export {
  load
};
