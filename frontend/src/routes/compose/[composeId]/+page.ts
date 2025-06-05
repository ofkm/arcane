import type { PageLoad } from './$types';
import { stackAPI, settingsAPI, containerAPI, agentAPI } from '$lib/services/api';
import type { PortBinding, ContainerInspectInfo } from 'dockerode';

// Define types for the API responses
interface StackService {
	id: string;
	name: string;
	image?: string;
	status?: string;
	// Add other service properties as needed
}

interface Stack {
	id: string;
	name: string;
	composeContent: string;
	envContent?: string;
	services?: StackService[];
	// Add other stack properties as needed
}

export const load: PageLoad = async ({ params }) => {
	const { composeId } = params;

	try {
		// Get stack from API
		const stack: Stack = await stackAPI.get(composeId).catch((err) => {
			console.error(`Error loading stack ${composeId}:`, err);
			throw new Error(`Stack not found or failed to load: ${err.message}`);
		});

		if (!stack) {
			return {
				stack: null,
				error: 'Stack not found or failed to load',
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

		const editorState = {
			name: stack.name,
			composeContent: stack.composeContent || '',
			envContent: stack.envContent || '',
			originalName: stack.name,
			originalComposeContent: stack.composeContent || '',
			originalEnvContent: stack.envContent || '',
			autoUpdate: false // Will be loaded from database if available
		};

		// Get settings from API
		const settings = await settingsAPI.getSettings().catch((err) => {
			console.warn('Failed to load settings:', err);
			return null;
		});

		// Get service ports from API
		const servicePorts: Record<string, string[]> = {};
		if (stack.services) {
			await Promise.all(
				stack.services.map(async (service: StackService) => {
					if (service.id) {
						try {
							const containerData = (await containerAPI.inspect(service.id)) as ContainerInspectInfo;

							if (containerData?.NetworkSettings?.Ports) {
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
							}
						} catch (error) {
							console.error(`Failed to fetch ports for service ${service.id}:`, error);
						}
					}
				})
			);
		}

		// Get agents with status from API
		const agents = await agentAPI.listWithStatus().catch((err) => {
			console.warn('Failed to load agents:', err);
			return [];
		});

		return {
			stack,
			servicePorts,
			editorState,
			settings,
			agents,
			isAgentStack: false
		};
	} catch (err) {
		console.error('Unexpected error loading compose page:', err);
		return {
			stack: null,
			error: err instanceof Error ? err.message : 'An unexpected error occurred',
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
};
