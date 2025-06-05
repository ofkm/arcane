import { j as json } from './index-Ddp2AB5f.js';
import { g as getAgent, s as sendTaskToAgent, h as createStackDeployment } from './agent-manager-CcYAjDZW.js';
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
    const { stackName, composeContent, envContent, mode } = data;
    if (!stackName || !composeContent) {
      return json({ error: "Stack name and compose content are required" }, { status: 400 });
    }
    const agent = await getAgent(agentId);
    if (!agent) {
      return json({ error: "Agent not found" }, { status: 404 });
    }
    if (agent.status !== "online") {
      return json({ error: `Agent is not online (status: ${agent.status})` }, { status: 400 });
    }
    const envVars = {};
    if (envContent) {
      envContent.split("\n").forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
          const [key, ...valueParts] = trimmedLine.split("=");
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join("=").trim();
          }
        }
      });
    }
    const createTask = await sendTaskToAgent(agentId, "compose_create_project", {
      project_name: stackName,
      compose_content: composeContent,
      env_vars: envVars
    });
    console.log(`📋 Stack creation task ${createTask.id} created for agent ${agentId}: ${stackName}`);
    const startTask = await sendTaskToAgent(agentId, "compose_up", {
      project_name: stackName
    });
    console.log(`🚀 Stack start task ${startTask.id} created for agent ${agentId}: ${stackName}`);
    const deployment = await createStackDeployment(agentId, stackName, composeContent, envContent, startTask.id);
    return json({
      success: true,
      createTask,
      startTask,
      deployment,
      message: `Stack "${stackName}" created and started on agent`
    });
  } catch (error) {
    console.error("Error creating and starting stack:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to create and start stack"
      },
      { status: 500 }
    );
  }
};

export { POST };
//# sourceMappingURL=_server.ts-CaMl-e_z.js.map
