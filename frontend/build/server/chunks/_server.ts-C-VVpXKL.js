import { j as json } from './index-Ddp2AB5f.js';
import { g as getAgent } from './agent-manager-CcYAjDZW.js';
import { a as getStacksFromAgent } from './agent-stack-service-fp3gmye9.js';
import 'nanoid';
import 'fs/promises';
import 'node:path';
import './schema-CDkq0ub_.js';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';

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

export { GET };
//# sourceMappingURL=_server.ts-C-VVpXKL.js.map
