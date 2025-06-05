import { j as json } from "../../../../../chunks/index.js";
import { g as getAgent, d as deleteAgent, a as updateAgentHeartbeat } from "../../../../../chunks/agent-manager.js";
const GET = async ({ locals, params }) => {
  if (!locals.user?.roles.includes("admin")) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const agent = await getAgent(params.agentId);
    if (!agent) {
      return json({ error: "Agent not found" }, { status: 404 });
    }
    return json({ agent });
  } catch (error) {
    console.error("Error fetching agent:", error);
    return json({ error: "Failed to fetch agent" }, { status: 500 });
  }
};
const DELETE = async ({ locals, params }) => {
  if (!locals.user?.roles.includes("admin")) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const agent = await getAgent(params.agentId);
    if (!agent) {
      return json({ error: "Agent not found" }, { status: 404 });
    }
    await deleteAgent(params.agentId);
    console.log(`Agent ${params.agentId} deleted successfully`);
    return json({ success: true, message: "Agent deleted successfully" });
  } catch (error) {
    console.error("Error deleting agent:", error);
    return json({ error: "Failed to delete agent" }, { status: 500 });
  }
};
const POST = async ({ request }) => {
  try {
    const { agent_id, status, timestamp } = await request.json();
    if (!agent_id) {
      return json({ error: "agent_id is required" }, { status: 400 });
    }
    await updateAgentHeartbeat(agent_id);
    console.log(`💓 Heartbeat received from ${agent_id}`);
    return json({
      success: true,
      message: "Heartbeat received"
    });
  } catch (error) {
    console.error("Failed to process heartbeat:", error);
    return json(
      {
        error: "Failed to process heartbeat",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};
export {
  DELETE,
  GET,
  POST
};
