import { j as json } from './index-Ddp2AB5f.js';
import { r as registerAgent } from './agent-manager-CcYAjDZW.js';
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
    const { agent_id, hostname, platform, version, capabilities } = await request.json();
    if (!agent_id || !hostname) {
      return json({ error: "agent_id and hostname are required" }, { status: 400 });
    }
    const agent = await registerAgent({
      id: agent_id,
      hostname,
      platform: platform || "unknown",
      version: version || "1.0.0",
      capabilities: capabilities || [],
      status: "online",
      lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      registeredAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    console.log(`✅ Agent ${agent_id} registered successfully`);
    return json({
      success: true,
      agent_id,
      message: "Agent registered successfully"
    });
  } catch (error) {
    console.error("Failed to register agent:", error);
    return json(
      {
        error: "Failed to register agent",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

export { POST };
//# sourceMappingURL=_server.ts-BQplbPWr.js.map
