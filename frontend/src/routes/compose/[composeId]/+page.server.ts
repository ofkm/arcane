import { getStack } from '$lib/services/docker/stack-custom-service';
import { getSettings } from '$lib/services/settings-service';
import { getContainer } from '$lib/services/docker/container-service';
import { listAgents } from '$lib/services/agent/agent-manager';
import type { PageServerLoad } from './$types';
import { tryCatch } from '$lib/utils/try-catch';
import type { PortBinding, ContainerInspectInfo } from 'dockerode';

export const load: PageServerLoad = async ({ params }) => {
	const { composeId } = params;

	// Handle local stacks only
	const stackResult = await tryCatch(getStack(composeId));
	if (stackResult.error || !stackResult.data) {
		console.error(`Error loading stack ${composeId}:`, stackResult.error);
		const errorMessage = stackResult.error?.message ?? 'Stack not found or failed to load';
		return {
			stack: null,
			error: `Stack not found or failed to load: ${errorMessage}`,
			editorState: {
				name: '',
				composeContent: '',
				envContent: '',
				originalName: '',
				originalComposeContent: '',
				originalEnvContent: '',
				autoUpdate: false
			},
			isAgentStack: false
		};
	}
	const stack = stackResult.data;

	const editorState = {
		name: stack.name,
		composeContent: stack.composeContent || '',
		envContent: stack.envContent || '',
		originalName: stack.name,
		originalComposeContent: stack.composeContent || '',
		originalEnvContent: stack.envContent || '',
		autoUpdate: false // Will be loaded from database if available
	};

	const settingsResult = await tryCatch(getSettings());
	const settings = settingsResult.data;

	const servicePorts: Record<string, string[]> = {};
	if (stack.services) {
		for (const service of stack.services) {
			if (service.id) {
				const containerResult = await tryCatch(getContainer(service.id));
				const containerData: ContainerInspectInfo | null = containerResult.data;

				if (!containerResult.error && containerData && containerData.NetworkSettings?.Ports) {
					const portBindings = containerData.NetworkSettings.Ports;
					const parsedPorts: string[] = [];

					for (const containerPort in portBindings) {
						if (Object.prototype.hasOwnProperty.call(portBindings, containerPort)) {
							const bindings: PortBinding[] | null = portBindings[containerPort];
							if (bindings && Array.isArray(bindings) && bindings.length > 0) {
								bindings.forEach((binding: PortBinding) => {
									if (binding.HostPort) {
										const portType = containerPort.split('/')[1] || 'tcp';
										parsedPorts.push(`${binding.HostPort}:${containerPort.split('/')[0]}/${portType}`);
									}
								});
							}
						}
					}

					servicePorts[service.id] = parsedPorts;
				} else if (containerResult.error) {
					console.error(`Failed to fetch ports for service ${service.id}:`, containerResult.error);
				}
			}
		}
	}

	const agents = await listAgents();

	// Calculate actual status on server side
	const now = new Date();
	const timeout = 5 * 60 * 1000; // 5 minutes

	const agentsWithStatus = agents.map((agent) => {
		const lastSeen = new Date(agent.lastSeen);
		const timeSinceLastSeen = now.getTime() - lastSeen.getTime();

		return {
			...agent,
			status: timeSinceLastSeen > timeout ? 'offline' : agent.status
		};
	});

	return {
		stack,
		servicePorts,
		editorState,
		settings,
		agents: agentsWithStatus,
		isAgentStack: false
	};
};
