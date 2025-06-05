import { j as json } from './index-Ddp2AB5f.js';
import { g as getAgent, p as pullImageOnAgent } from './agent-manager-CcYAjDZW.js';
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
    const { imageName } = await request.json();
    const agentId = params.agentId;
    if (!imageName) {
      return json({ error: "Image name is required" }, { status: 400 });
    }
    const agent = await getAgent(agentId);
    if (!agent) {
      return json({ error: "Agent not found" }, { status: 404 });
    }
    if (agent.status !== "online") {
      return json({ error: `Agent is not online (status: ${agent.status})` }, { status: 400 });
    }
    const task = await pullImageOnAgent(agentId, imageName);
    console.log(`📋 Image pull task ${task.id} created for agent ${agentId}: ${imageName}`);
    return json({
      success: true,
      task,
      message: `Image pull task created: ${imageName}`
    });
  } catch (error) {
    console.error("Error creating image pull task:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to create image pull task"
      },
      { status: 500 }
    );
  }
};

export { POST };
//# sourceMappingURL=_server.ts-Bl_9D6uz.js.map
