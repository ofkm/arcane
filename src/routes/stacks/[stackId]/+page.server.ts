import { getStack } from '$lib/services/docker/stack-service';
import { getSettings } from '$lib/services/settings-service';
import { getContainer } from '$lib/services/docker/container-service';
import type { PageServerLoad } from './$types';
import { tryCatch } from '$lib/utils/try-catch';
import type { PortBinding, ContainerInspectInfo } from 'dockerode';

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

	return {
		stack,
		servicePorts,
		editorState,
		settings
	};
};

// export const actions: Actions = {
// 	update: async ({ params, request }) => {
// 		const { stackId } = params;
// 		const formData = await request.formData();

// 		const name = formData.get('name')?.toString() || '';
// 		const composeContent = formData.get('composeContent')?.toString() || '';
// 		const autoUpdate = formData.get('autoUpdate') === 'on';

// 		const result = await tryCatch(updateStack(stackId, { name, composeContent, autoUpdate }));
// 		if (!result.error) {
// 			return {
// 				success: true,
// 				message: 'Stack updated successfully'
// 			};
// 		} else {
// 			console.error('Error updating stack:', result.error);
// 			return {
// 				success: false,
// 				error: result.error instanceof Error ? result.error.message : 'Failed to update stack'
// 			};
// 		}
// 	}
// };
