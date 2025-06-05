import { j as json } from './index-Ddp2AB5f.js';
import { k as updateTaskStatus } from './agent-manager-CcYAjDZW.js';
import 'nanoid';
import 'fs/promises';
import 'node:path';
import './schema-CDkq0ub_.js';
import 'node:fs/promises';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import './index4-SoK3Vczo.js';

const POST = async ({ params, request }) => {
  try {
    const { task_id, status, result, error: taskError } = await request.json();
    const agentId = params.agentId;
    const taskId = params.taskId;
    if (task_id && task_id !== taskId) {
      return json({ error: "Task ID mismatch" }, { status: 400 });
    }
    if (!status || !["completed", "failed", "running"].includes(status)) {
      return json({ error: "Invalid status" }, { status: 400 });
    }
    await updateTaskStatus(taskId, status, result, taskError);
    console.log(`📋 Task ${taskId} result received from agent ${agentId}: ${status}`);
    return json({
      success: true,
      message: "Task result received"
    });
  } catch (error) {
    console.error("Failed to update task result:", error);
    return json(
      {
        error: "Failed to update task result",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

export { POST };
//# sourceMappingURL=_server.ts-DrW31QZ1.js.map
