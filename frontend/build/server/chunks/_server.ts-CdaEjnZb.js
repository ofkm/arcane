import { j as json } from './index-Ddp2AB5f.js';
import { g as getAgent, s as sendTaskToAgent, f as createContainerDeployment } from './agent-manager-CcYAjDZW.js';
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
    const { imageName, containerName, ports = [], volumes = [], envVars = [], detached = true, autoRemove = false, restartPolicy = "no" } = data;
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
    const args = ["run"];
    if (detached) {
      args.push("-d");
    }
    if (autoRemove) {
      args.push("--rm");
    }
    if (restartPolicy && restartPolicy !== "no") {
      args.push("--restart", restartPolicy);
    }
    if (containerName) {
      args.push("--name", containerName);
    }
    ports.forEach((port) => {
      if (port.host && port.container) {
        args.push("-p", `${port.host}:${port.container}`);
      }
    });
    volumes.forEach((volume) => {
      if (volume.host && volume.container) {
        args.push("-v", `${volume.host}:${volume.container}`);
      }
    });
    envVars.forEach((env) => {
      if (env.key && env.value) {
        args.push("-e", `${env.key}=${env.value}`);
      }
    });
    args.push(imageName);
    const task = await sendTaskToAgent(agentId, "docker_command", {
      command: "run",
      args: args.slice(1)
      // Remove 'run' since it's the command
    });
    const deployment = await createContainerDeployment(
      agentId,
      containerName || imageName,
      imageName,
      ports.map((p) => `${p.host}:${p.container}`),
      volumes.map((v) => `${v.host}:${v.container}`),
      task.id
    );
    console.log(`🐳 Container deployment task ${task.id} created for agent ${agentId}: ${containerName || imageName}`);
    return json({
      success: true,
      task,
      deployment,
      message: `Container deployment task created: ${containerName || imageName}`
    });
  } catch (error) {
    console.error("Error creating container deployment task:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to create container deployment task"
      },
      { status: 500 }
    );
  }
};

export { POST };
//# sourceMappingURL=_server.ts-CdaEjnZb.js.map
