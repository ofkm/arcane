import { s as sendTaskToAgent } from './agent-manager-CcYAjDZW.js';

async function getStacksFromAgent(agent, context) {
  try {
    const task = await sendTaskToAgent(agent.id, "stack_list", {});
    const maxAttempts = 30;
    const delay = 1e3;
    console.log(`Polling for stack data from agent ${agent.hostname} (task ${task.id})`);
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      const fetchFunc = context?.fetch || fetch;
      const apiUrl = `/api/agents/${agent.id}/tasks/${task.id}`;
      const updatedTask = await fetchFunc(apiUrl, {
        credentials: "include"
      }).then((res) => res.ok ? res.json() : null);
      if (!updatedTask || !updatedTask.task) {
        console.log(`Polling attempt ${i + 1}: No task data received`);
        continue;
      }
      const taskStatus = updatedTask.task.status;
      console.log(`Polling attempt ${i + 1}: Task status is ${taskStatus}`);
      if (taskStatus === "completed" && updatedTask.task.result) {
        console.log(`Task completed, processing stack data`);
        let stacksData;
        try {
          if (typeof updatedTask.task.result === "object") {
            stacksData = updatedTask.task.result;
          } else if (typeof updatedTask.task.result === "string") {
            stacksData = JSON.parse(updatedTask.task.result);
          }
          if (!stacksData && updatedTask.task.result && updatedTask.task.result.output) {
            if (typeof updatedTask.task.result.output === "object") {
              stacksData = updatedTask.task.result.output;
            } else if (typeof updatedTask.task.result.output === "string") {
              stacksData = JSON.parse(updatedTask.task.result.output);
            }
          }
        } catch (parseError) {
          console.error(`Failed to parse stack data: ${parseError}`);
          return [];
        }
        if (!stacksData || !stacksData.stacks || !Array.isArray(stacksData.stacks)) {
          console.log(`No valid stacks data found in task result`);
          return [];
        }
        const stacks = stacksData.stacks.map((stack) => ({
          ...stack,
          agentId: agent.id,
          agentHostname: agent.hostname,
          isRemote: true,
          // Ensure the important fields are always set
          id: stack.id || `${agent.id}_${stack.name}`,
          name: stack.name,
          status: stack.status || "unknown",
          serviceCount: stack.serviceCount || stack.services?.length || 0
        }));
        console.log(`Retrieved ${stacks.length} stacks from agent ${agent.hostname}`);
        return stacks;
      } else if (taskStatus === "failed") {
        console.error(`Task failed: ${updatedTask.task.error || "Unknown error"}`);
        return [];
      }
    }
    console.error(`Polling timed out after ${maxAttempts} seconds`);
    return [];
  } catch (error) {
    console.error(`Failed to get stacks from agent ${agent.hostname}:`, error);
    return [];
  }
}
async function getAllAgentStacks(agents, context) {
  const agentStacks = [];
  for (const agent of agents) {
    try {
      const stacks = await getStacksFromAgent(agent, context);
      agentStacks.push(...stacks);
    } catch (error) {
      console.error(`Failed to get stacks from agent ${agent.hostname}:`, error);
    }
  }
  return agentStacks;
}

export { getStacksFromAgent as a, getAllAgentStacks as g };
//# sourceMappingURL=agent-stack-service-fp3gmye9.js.map
