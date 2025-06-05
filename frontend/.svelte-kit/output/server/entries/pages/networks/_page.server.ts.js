import { l as listNetworks } from "../../../chunks/network-service.js";
const load = async () => {
  try {
    const networks = await listNetworks();
    return {
      networks
    };
  } catch (err) {
    console.error("Failed to load networks:", err);
    const message = err instanceof Error ? err.message : "Failed to connect to Docker or list networks.";
    return {
      networks: [],
      error: message
    };
  }
};
export {
  load
};
