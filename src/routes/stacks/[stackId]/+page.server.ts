import { getStack, updateStack, startStack, stopStack, restartStack, removeStack, fullyRedeployStack } from '$lib/services/docker/stack-service';
import { getSettings } from '$lib/services/settings-service';
import { getContainer } from '$lib/services/docker/container-service';
import type { PageServerLoad, Actions } from './$types';
import { tryCatch } from '$lib/utils/try-catch';

export const load: PageServerLoad = async ({ params }) => {
	const { stackId } = params;

	const stackResult = await tryCatch(getStack(stackId));
	if (stackResult.error || !stackResult.data) {
		console.error(`Error loading stack ${stackId}:`, stackResult.error);
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
			}
		};
	}
	const stack = stackResult.data;

	const editorState = {
		name: stack.name,
		composeContent: stack.composeContent || '',
		envContent: stack.envContent || '',
		originalName: stack.name,
		originalComposeContent: stack.composeContent || '',
		originalEnvContent: stack.envContent || ''
	};

	const settingsResult = await tryCatch(getSettings());
	const settings = settingsResult.data;

	const servicePorts: Record<string, string[]> = {};
	if (stack.services) {
		for (const service of stack.services) {
			if (service.id) {
				const containerResult = await tryCatch(getContainer(service.id));
				if (!containerResult.error && containerResult.data && containerResult.data.networkSettings?.Ports) {
					const portBindings = containerResult.data.networkSettings.Ports;
					const parsedPorts: string[] = [];

					for (const containerPort in portBindings) {
						if (portBindings.hasOwnProperty(containerPort)) {
							const bindings = portBindings[containerPort];
							if (bindings && Array.isArray(bindings) && bindings.length > 0) {
								bindings.forEach((binding: any) => {
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

	return {
		stack,
		servicePorts,
		editorState,
		settings
	};
};

export const actions: Actions = {
	update: async ({ params, request }) => {
		const { stackId } = params;
		const formData = await request.formData();

		const name = formData.get('name')?.toString() || '';
		const composeContent = formData.get('composeContent')?.toString() || '';
		const autoUpdate = formData.get('autoUpdate') === 'on';

		const result = await tryCatch(updateStack(stackId, { name, composeContent, autoUpdate }));
		if (!result.error) {
			return {
				success: true,
				message: 'Stack updated successfully'
			};
		} else {
			console.error('Error updating stack:', result.error);
			return {
				success: false,
				error: result.error instanceof Error ? result.error.message : 'Failed to update stack'
			};
		}
	},

	start: async ({ params }) => {
		const result = await tryCatch(startStack(params.stackId));
		if (!result.error) {
			return { success: true };
		} else {
			console.error('Error starting stack:', result.error);
			return {
				success: false,
				error: result.error instanceof Error ? result.error.message : 'Failed to start stack'
			};
		}
	},

	stop: async ({ params }) => {
		const result = await tryCatch(stopStack(params.stackId));
		if (!result.error) {
			return { success: true };
		} else {
			console.error('Error stopping stack:', result.error);
			return {
				success: false,
				error: result.error instanceof Error ? result.error.message : 'Failed to stop stack'
			};
		}
	},

	restart: async ({ params }) => {
		const result = await tryCatch(restartStack(params.stackId));
		if (!result.error) {
			return { success: true };
		} else {
			console.error('Error restarting stack:', result.error);
			return {
				success: false,
				error: result.error instanceof Error ? result.error.message : 'Failed to restart stack'
			};
		}
	},

	remove: async ({ params }) => {
		const result = await tryCatch(removeStack(params.stackId));
		if (!result.error && result.data) {
			return { success: true, message: 'Stack removal initiated' };
		} else {
			console.error('Error removing stack:', result.error);
			return {
				success: false,
				error: result.error instanceof Error ? result.error.message : 'Failed to remove stack'
			};
		}
	},

	redeploy: async ({ params }) => {
		const result = await tryCatch(fullyRedeployStack(params.stackId));
		if (!result.error) {
			return { success: true, message: 'Stack redeployment initiated' };
		} else {
			console.error('Error redeploying stack:', result.error);
			return {
				success: false,
				error: result.error instanceof Error ? result.error.message : 'Failed to redeploy stack'
			};
		}
	}
};
