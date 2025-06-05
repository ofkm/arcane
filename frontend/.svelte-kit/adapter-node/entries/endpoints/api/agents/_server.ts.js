import { j as json } from "../../../../chunks/index.js";
import { l as listAgents } from "../../../../chunks/agent-manager.js";
const GET = async () => {
  try {
    const agents = await listAgents();
    return json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error) {
    console.error("API: Failed to list agents:", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        agents: []
      },
      { status: 500 }
    );
  }
};
export {
  GET
};
