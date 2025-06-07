import { stackAPI } from '$lib/services/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		// Get the stack by ID
		const response = await stackAPI.get(params.composeId);

		// Extract stack from the API response
		const stack = response.stack || response;

		if (!stack) {
			return {
				stack: null,
				error: 'Stack not found',
				editorState: {
					name: '',
					composeContent: '',
					envContent: '',
					originalName: '',
					originalComposeContent: '',
					originalEnvContent: ''
				},
				servicePorts: {},
				agents: [],
				settings: {}
			};
		}

		// Set up editor state with the stack data
		const editorState = {
			name: stack.name || '',
			composeContent: stack.composeContent || '',
			envContent: stack.envContent || '',
			originalName: stack.name || '',
			originalComposeContent: stack.composeContent || '',
			originalEnvContent: stack.envContent || ''
		};

		return {
			stack,
			editorState,
			servicePorts: {}, // TODO: Extract from stack services if needed
			agents: [], // TODO: Implement if needed
			settings: {
				baseServerUrl: 'localhost'
			},
			error: null
		};
	} catch (error) {
		console.error('Failed to load compose page:', error);
		return {
			stack: null,
			error: error instanceof Error ? error.message : 'Failed to load stack',
			editorState: {
				name: '',
				composeContent: '',
				envContent: '',
				originalName: '',
				originalComposeContent: '',
				originalEnvContent: ''
			},
			servicePorts: {},
			agents: [],
			settings: {}
		};
	}
};
