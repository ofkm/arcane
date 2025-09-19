import { environmentAPI } from '$lib/services/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const project = await environmentAPI.getProject(params.projectId);

	const editorState = {
		name: project.name || '',
		composeContent: project.composeContent || '',
		envContent: project.envContent || '',
		originalName: project.name || '',
		originalComposeContent: project.composeContent || '',
		originalEnvContent: project.envContent || ''
	};

	return {
		project,
		editorState,
		error: null
	};
};
