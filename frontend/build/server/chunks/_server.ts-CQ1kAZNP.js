import { j as json } from './index-Ddp2AB5f.js';
import { g as getAgent, s as sendTaskToAgent } from './agent-manager-CcYAjDZW.js';
import 'nanoid';
import 'fs/promises';
import 'node:path';
import './schema-CDkq0ub_.js';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';

const POST = async ({ locals, params, request }) => {
  if (!locals.user?.roles.includes("admin")) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const data = await request.json();
    const agentId = params.agentId;
    const { command, args } = data;
    if (!command) {
      return json({ error: "Command is required" }, { status: 400 });
    }
    const agent = await getAgent(agentId);
    if (!agent) {
      return json({ error: "Agent not found" }, { status: 404 });
    }
    if (agent.status !== "online") {
      return json({ error: `Agent is not online (status: ${agent.status})` }, { status: 400 });
    }
    const task = await sendTaskToAgent(agentId, "docker_command", {
      command,
      args
    });
    return json({
      success: true,
      task,
      message: `Command sent to agent ${agent.hostname}`
    });
  } catch (error) {
    console.error("Error sending command to agent:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to send command to agent"
      },
      { status: 500 }
    );
  }
};

export { POST };
//# sourceMappingURL=_server.ts-CQ1kAZNP.js.map
