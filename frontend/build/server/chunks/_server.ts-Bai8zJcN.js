import { j as json } from './index-Ddp2AB5f.js';
import { j as getTask } from './agent-manager-CcYAjDZW.js';
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
    const task = await getTask(params.taskId);
    if (!task) {
      return json({ error: "Task not found" }, { status: 404 });
    }
    if (task.agentId !== params.agentId) {
      return json({ error: "Task does not belong to this agent" }, { status: 400 });
    }
    return json({ task });
  } catch (error) {
    console.error("Error fetching task:", error);
    return json({ error: "Failed to fetch task" }, { status: 500 });
  }
};

export { GET };
//# sourceMappingURL=_server.ts-Bai8zJcN.js.map
