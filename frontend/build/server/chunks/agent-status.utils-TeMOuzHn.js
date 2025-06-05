const AGENT_TIMEOUT_MS = 5 * 60 * 1e3;
function isAgentOffline(agent) {
  if (!agent.lastSeen) return true;
  const now = /* @__PURE__ */ new Date();
  const lastSeen = new Date(agent.lastSeen);
  const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
  return timeSinceLastSeen > AGENT_TIMEOUT_MS;
}
function getActualAgentStatus(agent) {
  return isAgentOffline(agent) ? "offline" : agent.status;
}

export { getActualAgentStatus as g };
//# sourceMappingURL=agent-status.utils-TeMOuzHn.js.map
