import { g as getAgent, j as getAgentTasks, k as getDeploymentsFromDb } from "../../../../chunks/agent-manager.js";
import { e as error } from "../../../../chunks/index.js";
const load = async ({ params }) => {
  const { agentId } = params;
  try {
    const [agent, tasks, deployments] = await Promise.allSettled([getAgent(agentId), getAgentTasks(agentId), getDeploymentsFromDb(agentId)]);
    if (agent.status === "rejected" || !agent.value) {
      throw error(404, {
        message: "Agent not found"
      });
    }
    const now = /* @__PURE__ */ new Date();
    const timeout = 5 * 60 * 1e3;
    const lastSeen = new Date(agent.value.lastSeen);
    const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
    const agentWithStatus = {
      ...agent.value,
      status: timeSinceLastSeen > timeout ? "offline" : agent.value.status
    };
    return {
      agent: agentWithStatus,
      tasks: tasks.status === "fulfilled" ? tasks.value : [],
      deployments: deployments.status === "fulfilled" ? deployments.value : [],
      agentId
    };
  } catch (err) {
    console.error("SSR: Failed to load agent data:", err);
    throw error(500, {
      message: err instanceof Error ? err.message : "Failed to load agent data"
    });
  }
};
export {
  load
};
