import { j as json } from "../../../../../../chunks/index.js";
import { f as listTasks, g as getAgent, s as sendTaskToAgent } from "../../../../../../chunks/agent-manager.js";
const GET = async ({ params, url }) => {
  try {
    const agentId = params.agentId;
    const isAdminRequest = url.searchParams.has("admin") || url.searchParams.has("include_results");
    if (isAdminRequest) {
      const allTasks = await listTasks(agentId);
      return json({ tasks: allTasks });
    } else {
      const allTasks = await listTasks(agentId);
      const pendingTasks = allTasks.filter((task) => task.status === "pending");
      const formattedTasks = pendingTasks.map((task) => ({
        id: task.id,
        type: task.type,
        payload: task.payload
      }));
      console.log(`📋 Agent ${agentId} requested tasks, returning ${formattedTasks.length} pending tasks`);
      return json(formattedTasks);
    }
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
};
const POST = async ({ locals, params, request }) => {
  if (!locals.user?.roles.includes("admin")) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { type, payload } = await request.json();
    const agent = await getAgent(params.agentId);
    if (!agent) {
      return json({ error: "Agent not found" }, { status: 404 });
    }
    if (agent.status !== "online") {
      return json({ error: `Agent is not online (status: ${agent.status})` }, { status: 400 });
    }
    const task = await sendTaskToAgent(params.agentId, type, payload);
    console.log(`📋 Task ${task.id} created for agent ${params.agentId}`);
    return json({ success: true, task });
  } catch (error) {
    console.error("Error creating task:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to create task"
      },
      { status: 500 }
    );
  }
};
export {
  GET,
  POST
};
