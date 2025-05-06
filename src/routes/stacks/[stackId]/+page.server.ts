import { getStack, updateStack, startStack, stopStack, restartStack, removeStack, fullyRedeployStack } from '$lib/services/docker/stack-service';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { stackId } = params;

	try {
		const stack = await getStack(stackId);

		// Create editor state with all current values
		const editorState = {
			name: stack.name,
			composeContent: stack.composeContent || '',
			envContent: stack.envContent || '', // Include env content
			autoUpdate: stack.meta?.autoUpdate || false,
			originalName: stack.name,
			originalComposeContent: stack.composeContent || '',
			originalEnvContent: stack.envContent || '' // Include original env content
		};

		return {
			stack,
			editorState
		};
	} catch (err: unknown) {
		console.error(`Error loading stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		return {
			stack: null,
			error: `Stack not found or failed to load: ${errorMessage}`,
			editorState: {
				name: '',
				composeContent: '',
				envContent: '', // Include env content
				originalName: '',
				originalComposeContent: '',
				originalEnvContent: '', // Include original env content
				autoUpdate: false
			}
		};
	}
};

export const actions: Actions = {
	update: async ({ params, request }) => {
		const { stackId } = params;
		const formData = await request.formData();

		const name = formData.get('name')?.toString() || '';
		const composeContent = formData.get('composeContent')?.toString() || '';
		const autoUpdate = formData.get('autoUpdate') === 'on';

		try {
			await updateStack(stackId, { name, composeContent, autoUpdate });
			return {
				success: true,
				message: 'Stack updated successfully'
			};
		} catch (err: unknown) {
			console.error('Error updating stack:', err);
			return {
				success: false,
				error: err instanceof Error ? err.message : 'Failed to update stack'
			};
		}
	},

	start: async ({ params }) => {
		try {
			await startStack(params.stackId);
			return { success: true };
		} catch (err: unknown) {
			console.error('Error starting stack:', err);
			return {
				success: false,
				error: err instanceof Error ? err.message : 'Failed to start stack'
			};
		}
	},

	stop: async ({ params }) => {
		try {
			await stopStack(params.stackId);
			return { success: true };
		} catch (err: unknown) {
			console.error('Error stopping stack:', err);
			return {
				success: false,
				error: err instanceof Error ? err.message : 'Failed to stop stack'
			};
		}
	},

	restart: async ({ params }) => {
		try {
			await restartStack(params.stackId);
			return { success: true };
		} catch (err: unknown) {
			console.error('Error restarting stack:', err);
			return {
				success: false,
				error: err instanceof Error ? err.message : 'Failed to restart stack'
			};
		}
	},

	remove: async ({ params }) => {
		try {
			const success = await removeStack(params.stackId);
			if (success) {
				return { success: true, message: 'Stack removal initiated' };
			}
			return { success: false, error: 'Failed to remove stack' };
		} catch (err: unknown) {
			console.error('Error removing stack:', err);
			return {
				success: false,
				error: err instanceof Error ? err.message : 'Failed to remove stack'
			};
		}
	},

	redeploy: async ({ params }) => {
		try {
			await fullyRedeployStack(params.stackId);
			return { success: true, message: 'Stack redeployment initiated' };
		} catch (err: unknown) {
			console.error('Error redeploying stack:', err);
			return {
				success: false,
				error: err instanceof Error ? err.message : 'Failed to redeploy stack'
			};
		}
	}
};
