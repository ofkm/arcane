import { j as json } from './index-Ddp2AB5f.js';
import { u as updateAgent } from './agent-manager-CcYAjDZW.js';
import 'nanoid';
import 'fs/promises';
import 'node:path';
import './schema-CDkq0ub_.js';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';

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

export { POST };
//# sourceMappingURL=_server.ts-JzmbPDIq.js.map
