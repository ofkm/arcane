import { j as json } from "../../../../../chunks/index.js";
import { u as updateAgent } from "../../../../../chunks/agent-manager.js";
const POST = async ({ request }) => {
  try {
    const { agent_id, status, timestamp, metrics } = await request.json();
    if (!agent_id) {
      return json({ error: "agent_id is required" }, { status: 400 });
    }
    await updateAgent(agent_id, {
      status: "online",
      lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
      ...metrics && { metrics }
    });
    console.log(`💓 Heartbeat received from ${agent_id}${metrics ? " (with metrics)" : ""}`);
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
  POST
};
