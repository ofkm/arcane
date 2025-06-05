import { nanoid } from 'nanoid';
import fs from 'fs/promises';
import path__default from 'node:path';
import { d as deploymentsTable, b as agentsTable, c as agentTasksTable, B as BASE_PATH } from './schema-CDkq0ub_.js';
import { eq, desc } from 'drizzle-orm';
import { d as db } from './index4-SoK3Vczo.js';

path__default.join(BASE_PATH, "deployments");
async function getDeploymentsFromDb(agentId) {
  try {
    const query = agentId ? db.select().from(deploymentsTable).where(eq(deploymentsTable.agentId, agentId)) : db.select().from(deploymentsTable);
    const dbDeployments = await query;
    return dbDeployments.map((dbDeployment) => ({
      id: dbDeployment.id,
      name: dbDeployment.name,
      type: dbDeployment.type,
      status: dbDeployment.status,
      agentId: dbDeployment.agentId,
      taskId: dbDeployment.taskId || void 0,
      error: dbDeployment.error || void 0,
      metadata: dbDeployment.metadata ? JSON.parse(dbDeployment.metadata) : void 0,
      createdAt: dbDeployment.createdAt.toISOString(),
      updatedAt: dbDeployment.updatedAt?.toISOString()
    }));
  } catch (error) {
    console.error("Failed to get deployments from database:", error);
    return [];
  }
}
async function saveDeploymentToDb(deployment) {
  try {
    const now = /* @__PURE__ */ new Date();
    const createdAtForDb = new Date(deployment.createdAt);
    const deploymentData = {
      id: deployment.id,
      name: deployment.name,
      type: deployment.type,
      status: deployment.status,
      agentId: deployment.agentId,
      taskId: deployment.taskId || null,
      error: deployment.error || null,
      metadata: deployment.metadata ? JSON.stringify(deployment.metadata) : null,
      createdAt: createdAtForDb,
      updatedAt: now
    };
    const existing = await db.select({ id: deploymentsTable.id }).from(deploymentsTable).where(eq(deploymentsTable.id, deployment.id)).limit(1);
    if (existing.length > 0) {
      await db.update(deploymentsTable).set({
        ...deploymentData,
        updatedAt: now
      }).where(eq(deploymentsTable.id, deployment.id));
    } else {
      await db.insert(deploymentsTable).values(deploymentData);
    }
    return deployment;
  } catch (error) {
    console.error("Failed to save deployment to database:", error);
    throw error;
  }
}
async function updateDeploymentInDb(deploymentId, updates) {
  try {
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (updates.status !== void 0) updateData.status = updates.status;
    if (updates.error !== void 0) updateData.error = updates.error;
    if (updates.metadata !== void 0) {
      updateData.metadata = updates.metadata ? JSON.stringify(updates.metadata) : null;
    }
    await db.update(deploymentsTable).set(updateData).where(eq(deploymentsTable.id, deploymentId));
  } catch (error) {
    console.error("Failed to update deployment in database:", error);
    throw error;
  }
}
async function getDeploymentByTaskIdFromDb(taskId) {
  try {
    const dbDeployments = await db.select().from(deploymentsTable).where(eq(deploymentsTable.taskId, taskId)).limit(1);
    if (dbDeployments.length === 0) {
      return null;
    }
    const dbDeployment = dbDeployments[0];
    return {
      id: dbDeployment.id,
      name: dbDeployment.name,
      type: dbDeployment.type,
      status: dbDeployment.status,
      agentId: dbDeployment.agentId,
      taskId: dbDeployment.taskId || void 0,
      error: dbDeployment.error || void 0,
      metadata: dbDeployment.metadata ? JSON.parse(dbDeployment.metadata) : void 0,
      createdAt: dbDeployment.createdAt.toISOString(),
      updatedAt: dbDeployment.updatedAt?.toISOString()
    };
  } catch (error) {
    console.error("Failed to get deployment by task ID from database:", error);
    return null;
  }
}
const DEPLOYMENTS_DIR = path__default.join(BASE_PATH, "deployments");
await fs.mkdir(DEPLOYMENTS_DIR, { recursive: true });
async function createDeployment(deployment) {
  const newDeployment = {
    ...deployment,
    id: nanoid(),
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await saveDeploymentToDb(newDeployment);
}
async function getDeployments(agentId) {
  return await getDeploymentsFromDb(agentId);
}
async function createStackDeployment(agentId, stackName, composeContent, envContent, taskId) {
  return createDeployment({
    name: stackName,
    type: "stack",
    status: "pending",
    agentId,
    metadata: {
      stackName,
      composeContent,
      envContent
    },
    taskId
  });
}
async function createContainerDeployment(agentId, containerName, imageName, ports, volumes, taskId) {
  return createDeployment({
    name: containerName || imageName,
    type: "container",
    status: "pending",
    agentId,
    metadata: {
      containerName,
      imageName,
      ports,
      volumes
    },
    taskId
  });
}
async function updateDeploymentFromTask(taskId, status, result, error) {
  try {
    const deployment = await getDeploymentByTaskIdFromDb(taskId);
    if (!deployment) {
      return;
    }
    let deploymentStatus;
    switch (status) {
      case "running":
        deploymentStatus = "running";
        break;
      case "completed":
        deploymentStatus = "completed";
        break;
      case "failed":
        deploymentStatus = "failed";
        break;
      default:
        deploymentStatus = "pending";
    }
    await updateDeploymentInDb(deployment.id, {
      status: deploymentStatus,
      error: error || void 0
    });
    console.log(`Deployment ${deployment.id} updated to status: ${deploymentStatus}`);
  } catch (error2) {
    console.error("Failed to update deployment from task:", error2);
  }
}
const safeTimestamp = (timestamp, fallback = /* @__PURE__ */ new Date()) => {
  if (!timestamp || timestamp === null || timestamp === void 0) {
    return fallback.toISOString();
  }
  if (typeof timestamp === "string") {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
  }
  if (typeof timestamp === "number" && !isNaN(timestamp)) {
    const date = timestamp > 946684800 ? new Date(timestamp * 1e3) : new Date(timestamp);
    return isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
  }
  return fallback.toISOString();
};
function dbAgentToAgent(dbAgent) {
  return {
    id: dbAgent.id,
    hostname: dbAgent.hostname,
    platform: dbAgent.platform,
    version: dbAgent.version,
    capabilities: Array.isArray(dbAgent.capabilities) ? dbAgent.capabilities : JSON.parse(dbAgent.capabilities || "[]"),
    status: dbAgent.status,
    lastSeen: safeTimestamp(dbAgent.lastSeen),
    registeredAt: safeTimestamp(dbAgent.registeredAt),
    metrics: {
      containerCount: dbAgent.containerCount,
      imageCount: dbAgent.imageCount,
      stackCount: dbAgent.stackCount,
      networkCount: dbAgent.networkCount,
      volumeCount: dbAgent.volumeCount
    },
    dockerInfo: dbAgent.dockerVersion ? {
      version: dbAgent.dockerVersion,
      containers: dbAgent.dockerContainers || 0,
      images: dbAgent.dockerImages || 0
    } : void 0,
    metadata: dbAgent.metadata ? typeof dbAgent.metadata === "string" ? JSON.parse(dbAgent.metadata) : dbAgent.metadata : void 0,
    createdAt: safeTimestamp(dbAgent.createdAt),
    updatedAt: dbAgent.updatedAt ? safeTimestamp(dbAgent.updatedAt) : void 0
  };
}
function dbTaskToAgentTask(dbTask) {
  const safeTimestamp2 = (timestamp, fallback = /* @__PURE__ */ new Date()) => {
    if (!timestamp || timestamp === null || timestamp === void 0) {
      return fallback.toISOString();
    }
    if (typeof timestamp === "string") {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
    }
    if (typeof timestamp === "number" && !isNaN(timestamp)) {
      const date = timestamp > 946684800 ? new Date(timestamp * 1e3) : new Date(timestamp);
      return isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
    }
    return fallback.toISOString();
  };
  return {
    id: dbTask.id,
    agentId: dbTask.agentId,
    type: dbTask.type,
    payload: typeof dbTask.payload === "string" ? JSON.parse(dbTask.payload) : dbTask.payload,
    status: dbTask.status,
    result: dbTask.result ? typeof dbTask.result === "string" ? JSON.parse(dbTask.result) : dbTask.result : void 0,
    error: dbTask.error,
    createdAt: safeTimestamp2(dbTask.createdAt),
    updatedAt: dbTask.updatedAt ? safeTimestamp2(dbTask.updatedAt) : void 0
  };
}
function agentToDbAgent(agent) {
  return {
    id: agent.id,
    hostname: agent.hostname,
    platform: agent.platform,
    version: agent.version,
    capabilities: JSON.stringify(agent.capabilities),
    status: agent.status,
    lastSeen: new Date(agent.lastSeen),
    // Use Date object
    registeredAt: new Date(agent.registeredAt),
    // Use Date object
    containerCount: agent.metrics?.containerCount,
    imageCount: agent.metrics?.imageCount,
    stackCount: agent.metrics?.stackCount,
    networkCount: agent.metrics?.networkCount,
    volumeCount: agent.metrics?.volumeCount,
    dockerVersion: agent.dockerInfo?.version,
    dockerContainers: agent.dockerInfo?.containers,
    dockerImages: agent.dockerInfo?.images,
    metadata: agent.metadata ? JSON.stringify(agent.metadata) : null,
    updatedAt: /* @__PURE__ */ new Date()
    // Use Date object
  };
}
function agentTaskToDbTask(task) {
  return {
    id: task.id,
    agentId: task.agentId,
    type: task.type,
    payload: JSON.stringify(task.payload),
    status: task.status,
    result: task.result ? JSON.stringify(task.result) : null,
    error: task.error,
    startedAt: task.status === "running" ? /* @__PURE__ */ new Date() : null,
    // Use Date object
    completedAt: task.status === "completed" || task.status === "failed" ? /* @__PURE__ */ new Date() : null,
    // Use Date object
    updatedAt: /* @__PURE__ */ new Date()
    // Use Date object
  };
}
async function registerAgentInDb(agent) {
  try {
    const agentData = agentToDbAgent(agent);
    const existing = await getAgentByIdFromDb(agent.id);
    if (existing) {
      await db.update(agentsTable).set({
        ...agentData,
        updatedAt: /* @__PURE__ */ new Date()
        // Use Date object
      }).where(eq(agentsTable.id, agent.id));
    } else {
      await db.insert(agentsTable).values({
        ...agentData,
        createdAt: /* @__PURE__ */ new Date(),
        // Use Date object
        updatedAt: /* @__PURE__ */ new Date()
        // Use Date object
      });
    }
    return agent;
  } catch (error) {
    console.error("Failed to register agent in database:", error);
    throw error;
  }
}
async function getAgentByIdFromDb(agentId) {
  try {
    const result = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId)).limit(1);
    if (result.length === 0) {
      return null;
    }
    return dbAgentToAgent(result[0]);
  } catch (error) {
    console.error("Failed to get agent from database:", error);
    throw error;
  }
}
async function updateAgentInDb(agentId, updates) {
  try {
    const existing = await getAgentByIdFromDb(agentId);
    if (!existing) {
      throw new Error("Agent not found");
    }
    const updated = {
      ...existing,
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const agentData = agentToDbAgent(updated);
    await db.update(agentsTable).set(agentData).where(eq(agentsTable.id, agentId));
    return updated;
  } catch (error) {
    console.error("Failed to update agent in database:", error);
    throw error;
  }
}
async function updateAgentHeartbeatInDb(agentId) {
  try {
    await db.update(agentsTable).set({
      status: "online",
      lastSeen: /* @__PURE__ */ new Date(),
      // Use Date object
      updatedAt: /* @__PURE__ */ new Date()
      // Use Date object
    }).where(eq(agentsTable.id, agentId));
  } catch (error) {
    console.error("Failed to update agent heartbeat in database:", error);
    throw error;
  }
}
async function listAgentsFromDb() {
  try {
    const result = await db.select().from(agentsTable).orderBy(desc(agentsTable.lastSeen));
    return result.map(dbAgentToAgent);
  } catch (error) {
    console.error("Failed to list agents from database:", error);
    throw error;
  }
}
async function deleteAgentFromDb(agentId) {
  try {
    await db.delete(agentTasksTable).where(eq(agentTasksTable.agentId, agentId));
    await db.delete(agentsTable).where(eq(agentsTable.id, agentId));
  } catch (error) {
    console.error("Failed to delete agent from database:", error);
    throw error;
  }
}
async function createTaskInDb(task) {
  try {
    const taskData = {
      ...agentTaskToDbTask(task),
      createdAt: /* @__PURE__ */ new Date(),
      // Use Date object
      updatedAt: /* @__PURE__ */ new Date()
      // Use Date object
    };
    await db.insert(agentTasksTable).values(taskData);
    return {
      ...task,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    console.error("Failed to create task in database:", error);
    throw error;
  }
}
async function getTaskByIdFromDb(taskId) {
  try {
    const result = await db.select().from(agentTasksTable).where(eq(agentTasksTable.id, taskId)).limit(1);
    if (result.length === 0) {
      return null;
    }
    return dbTaskToAgentTask(result[0]);
  } catch (error) {
    console.error("Failed to get task from database:", error);
    throw error;
  }
}
async function updateTaskStatusInDb(taskId, status, result, error) {
  try {
    const updateData = {
      status,
      updatedAt: /* @__PURE__ */ new Date()
      // Use Date object
    };
    if (result !== void 0) {
      updateData.result = JSON.stringify(result);
    }
    if (error !== void 0) {
      updateData.error = error;
    }
    if (status === "running") {
      updateData.startedAt = /* @__PURE__ */ new Date();
    } else if (status === "completed" || status === "failed") {
      updateData.completedAt = /* @__PURE__ */ new Date();
    }
    await db.update(agentTasksTable).set(updateData).where(eq(agentTasksTable.id, taskId));
  } catch (error2) {
    console.error("Failed to update task status in database:", error2);
    throw error2;
  }
}
async function listTasksFromDb(agentId) {
  try {
    const baseQuery = db.select().from(agentTasksTable);
    const result = agentId ? await baseQuery.where(eq(agentTasksTable.agentId, agentId)).orderBy(desc(agentTasksTable.createdAt)) : await baseQuery.orderBy(desc(agentTasksTable.createdAt));
    return result.map(dbTaskToAgentTask);
  } catch (error) {
    console.error("Failed to list tasks from database:", error);
    throw error;
  }
}
async function getAgentTasksFromDb(agentId) {
  return listTasksFromDb(agentId);
}
async function registerAgent(agent) {
  try {
    const existing = await getAgent(agent.id);
    if (existing) {
      return await updateAgent(agent.id, {
        ...agent,
        status: "online",
        lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } else {
      const newAgent = {
        ...agent,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      return await registerAgentInDb(newAgent);
    }
  } catch (error) {
    console.error("Failed to register agent:", error);
    throw error;
  }
}
async function getAgent(agentId) {
  try {
    return await getAgentByIdFromDb(agentId);
  } catch (error) {
    console.error("Failed to get agent:", error);
    return null;
  }
}
async function updateAgent(agentId, updates) {
  try {
    return await updateAgentInDb(agentId, updates);
  } catch (error) {
    console.error("Failed to update agent:", error);
    throw error;
  }
}
async function updateAgentHeartbeat(agentId) {
  try {
    await updateAgentHeartbeatInDb(agentId);
  } catch (error) {
    console.error("Failed to update agent heartbeat:", error);
  }
}
async function listAgents() {
  try {
    return await listAgentsFromDb();
  } catch (error) {
    console.error("Failed to list agents:", error);
    return [];
  }
}
async function deleteAgent(agentId) {
  try {
    await deleteAgentFromDb(agentId);
    console.log(`Agent ${agentId} deleted successfully`);
  } catch (error) {
    console.error("Failed to delete agent:", error);
    throw error;
  }
}
async function sendTaskToAgent(agentId, taskType, payload) {
  try {
    const agent = await getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    if (agent.status !== "online") {
      throw new Error(`Agent ${agentId} is not online (status: ${agent.status})`);
    }
    const task = {
      id: nanoid(),
      agentId,
      type: taskType,
      // No casting needed anymore!
      payload,
      status: "pending",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await createTaskInDb(task);
    console.log(`📋 Task ${task.id} created for agent ${agentId} (will be picked up on next poll)`);
    return task;
  } catch (error) {
    console.error("Failed to send task to agent:", error);
    throw error;
  }
}
async function updateTaskStatus(taskId, status, result, error) {
  try {
    await updateTaskStatusInDb(taskId, status, result, error);
    await updateDeploymentFromTask(taskId, status, result, error);
    console.log(`Task ${taskId} status updated to: ${status}`);
  } catch (dbError) {
    console.error("Error updating task status:", dbError);
  }
}
async function getTask(taskId) {
  try {
    return await getTaskByIdFromDb(taskId);
  } catch (error) {
    console.error("Failed to get task:", error);
    return null;
  }
}
async function listTasks(agentId) {
  try {
    return await listTasksFromDb(agentId);
  } catch (error) {
    console.error("Failed to list tasks:", error);
    return [];
  }
}
async function getAgentTasks(agentId) {
  try {
    return await getAgentTasksFromDb(agentId);
  } catch (error) {
    console.error("Failed to get agent tasks:", error);
    return [];
  }
}
async function pullImageOnAgent(agentId, imageName) {
  return sendTaskToAgent(agentId, "image_pull", {
    imageName
  });
}

export { getAgentTasks as a, getDeploymentsFromDb as b, updateAgentHeartbeat as c, deleteAgent as d, getDeployments as e, createContainerDeployment as f, getAgent as g, createStackDeployment as h, listTasks as i, getTask as j, updateTaskStatus as k, listAgents as l, pullImageOnAgent as p, registerAgent as r, sendTaskToAgent as s, updateAgent as u };
//# sourceMappingURL=agent-manager-CcYAjDZW.js.map
