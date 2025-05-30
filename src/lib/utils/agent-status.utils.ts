import type { Agent } from '$lib/types/agent.type';

const AGENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function isAgentOffline(agent: Agent): boolean {
	if (!agent.lastSeen) return true;

	const now = new Date();
	const lastSeen = new Date(agent.lastSeen);
	const timeSinceLastSeen = now.getTime() - lastSeen.getTime();

	return timeSinceLastSeen > AGENT_TIMEOUT_MS;
}

export function getActualAgentStatus(agent: Agent): 'online' | 'offline' {
	return isAgentOffline(agent) ? 'offline' : agent.status;
}

export function getAgentStatusClasses(agent: Agent): string {
	const actualStatus = getActualAgentStatus(agent);
	if (actualStatus === 'online') {
		return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
	}
	return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
}

export function getAgentStatusText(agent: Agent): string {
	const actualStatus = getActualAgentStatus(agent);
	return actualStatus === 'online' ? 'Online' : 'Offline';
}

export function canSendCommandsToAgent(agent: Agent): boolean {
	return getActualAgentStatus(agent) === 'online';
}
