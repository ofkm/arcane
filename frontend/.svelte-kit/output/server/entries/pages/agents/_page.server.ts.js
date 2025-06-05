import { l as listAgents } from "../../../chunks/agent-manager.js";
import { e as error } from "../../../chunks/index.js";
const load = async ({ locals }) => {
  if (!locals.user?.roles.includes("admin")) {
    throw error(403, {
      message: "Unauthorized access"
    });
  }
  try {
    const agents = await listAgents();
    const now = /* @__PURE__ */ new Date();
    const timeout = 5 * 60 * 1e3;
    const agentsWithStatus = agents.map((agent) => {
      const lastSeen = new Date(agent.lastSeen);
      const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
      return {
        ...agent,
        status: timeSinceLastSeen > timeout ? "offline" : agent.status
      };
    });
    return {
      agents: agentsWithStatus
    };
  } catch (err) {
    console.error("SSR: Failed to load agents:", err);
    throw error(500, {
      message: err instanceof Error ? err.message : "Failed to load agents"
    });
  }
};
export {
  load
};
