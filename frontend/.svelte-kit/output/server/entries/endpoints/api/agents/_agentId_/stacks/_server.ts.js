import { j as json } from "../../../../../../chunks/index.js";
import { g as getAgent } from "../../../../../../chunks/agent-manager.js";
import { g as getStacksFromAgent } from "../../../../../../chunks/agent-stack-service.js";
const GET = async ({ locals, params, fetch }) => {
  if (!locals.user?.roles.includes("admin")) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const agentId = params.agentId;
    const agent = await getAgent(agentId);
    if (!agent) {
      return json({ error: "Agent not found" }, { status: 404 });
    }
    if (agent.status !== "online") {
      return json({ error: `Agent is not online (status: ${agent.status})` }, { status: 400 });
    }
    const stacks = await getStacksFromAgent(agent, { fetch });
    return json({
      success: true,
      stacks
    });
  } catch (error) {
    console.error("Error fetching agent stacks:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch agent stacks"
      },
      { status: 500 }
    );
  }
};
export {
  GET
};
