import { error } from '@sveltejs/kit';
import { getStack, updateStack, startStack, stopStack, restartStack, removeStack, fullyRedeployStack } from '$lib/services/docker/stack-service';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const { stackId } = params;

	try {
		const stack = await getStack(stackId);

		// Pre-populate the editor state values for SSR
		return {
			stack,
			error: null,
			// These will be available directly in the svelte component's data prop
			editorState: {
				name: stack.name || '',
				composeContent: stack.composeContent || '',
				originalName: stack.name || '',
				originalComposeContent: stack.composeContent || ''
			}
		};
	} catch (err) {
		console.error(`Error loading stack ${stackId}:`, err);
		const errorMessage = err instanceof Error ? err.message : String(err);
		return {
			stack: null,
			error: `Stack not found or failed to load: ${errorMessage}`,
			editorState: {
				name: '',
				composeContent: '',
				originalName: '',
				originalComposeContent: ''
			}
		};
	}
}

/** @type {import('./$types').Actions} */
export const actions = {
	update: async ({ params, request }) => {
		const { stackId } = params;
		const formData = await request.formData();

		const name = formData.get('name')?.toString() || '';
		const composeContent = formData.get('composeContent')?.toString() || '';

		try {
			await updateStack(stackId, { name, composeContent });
			return {
				success: true,
				message: 'Stack updated successfully'
			};
		} catch (err) {
			console.error('Error updating stack:', err);
			// Consider using fail() for form action errors
			// import { fail } from '@sveltejs/kit';
			// return fail(422, { // Example: Unprocessable Entity
			//  name, // Return submitted values for repopulation
			//  composeContent,
			//  error: err instanceof Error ? err.message : 'Failed to update stack'
			// });
			// Or keep the simple return for now:
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
		} catch (err) {
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
		} catch (err) {
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
		} catch (err) {
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
				// Redirect can be handled differently, maybe client-side after success
				// Or use SvelteKit's redirect helper if needed server-side
				return { success: true, message: 'Stack removal initiated' };
			}
			return { success: false, error: 'Failed to remove stack' };
		} catch (err) {
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
		} catch (err) {
			console.error('Error redeploying stack:', err);
			return {
				success: false,
				error: err instanceof Error ? err.message : 'Failed to redeploy stack'
			};
		}
	}
};
