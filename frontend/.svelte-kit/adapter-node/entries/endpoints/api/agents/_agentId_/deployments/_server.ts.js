import { j as json } from "../../../../../../chunks/index.js";
import { g as getAgent, b as getDeployments } from "../../../../../../chunks/agent-manager.js";
const GET = async ({ locals, params }) => {
  if (!locals.user?.roles.includes("admin")) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const agentId = params.agentId;
    const agent = await getAgent(agentId);
    if (!agent) {
      return json({ error: "Agent not found" }, { status: 404 });
    }
    const deployments = await getDeployments(agentId);
    return json({
      success: true,
      deployments
    });
  } catch (error) {
    console.error("Error fetching deployments:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch deployments"
      },
      { status: 500 }
    );
  }
};
export {
  GET
};
