import { j as json } from './index-Ddp2AB5f.js';
import { g as getAgent, e as getDeployments } from './agent-manager-CcYAjDZW.js';
import 'nanoid';
import 'fs/promises';
import 'node:path';
import './schema-CDkq0ub_.js';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';

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

export { GET };
//# sourceMappingURL=_server.ts-8L3O-UUg.js.map
