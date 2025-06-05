import { loadComposeStacks, discoverExternalStacks } from "../../../chunks/stack-custom-service.js";
import { l as listAgents } from "../../../chunks/agent-manager.js";
import { a as getAllAgentStacks } from "../../../chunks/agent-stack-service.js";
import { t as tryCatch } from "../../../chunks/try-catch.js";
const load = async ({ fetch }) => {
  const [managedResult, externalResult, agentsResult] = await Promise.all([tryCatch(loadComposeStacks()), tryCatch(discoverExternalStacks()), tryCatch(listAgents())]);
  if (managedResult.error || externalResult.error) {
    console.error("Failed to load stacks:", managedResult.error || externalResult.error);
    const errorMessage = (managedResult.error?.message || externalResult.error?.message) ?? "Unknown error";
    return {
      stacks: [],
      error: "Failed to load Docker Compose stacks: " + errorMessage
    };
  }
  const managedStacks = managedResult.data;
  const externalStacks = externalResult.data;
  const agents = agentsResult.data || [];
  const onlineAgents = agents.filter((agent) => {
    const now = /* @__PURE__ */ new Date();
    const lastSeen = new Date(agent.lastSeen);
    const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
    const timeout = 5 * 60 * 1e3;
    return timeSinceLastSeen <= timeout && agent.status === "online";
  });
  const agentStacksResult = await tryCatch(getAllAgentStacks(onlineAgents, { fetch }));
  const agentStacks = agentStacksResult.data || [];
  const agentStackNames = new Set(agentStacks.map((stack) => stack.name));
  const combinedStacks = [...managedStacks];
  for (const externalStack of externalStacks) {
    const isDuplicate = combinedStacks.some((stack) => stack.id === externalStack.id) || agentStackNames.has(externalStack.name);
    if (!isDuplicate) {
      combinedStacks.push(externalStack);
    }
  }
  for (const agentStack of agentStacks) {
    const uniqueId = `agent:${agentStack.agentId}:${agentStack.name || agentStack.id}`;
    if (!combinedStacks.some((stack) => stack.id === uniqueId || stack.name === agentStack.name && stack.agentId === agentStack.agentId)) {
      combinedStacks.push({
        ...agentStack,
        id: uniqueId,
        // Ensure unique ID
        status: agentStack.status || "unknown"
        // Ensure status is always defined
      });
    }
  }
  return {
    stacks: combinedStacks,
    agents: onlineAgents,
    agentError: agentStacksResult.error ? `Failed to fetch agent stacks: ${agentStacksResult.error.message}` : null
  };
};
export {
  load
};
