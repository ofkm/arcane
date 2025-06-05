import { j as json } from './index-Ddp2AB5f.js';
import { l as listAgents } from './agent-manager-CcYAjDZW.js';
import 'nanoid';
import 'fs/promises';
import 'node:path';
import './schema-CDkq0ub_.js';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';

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

export { GET };
//# sourceMappingURL=_server.ts-DyPq2cEn.js.map
