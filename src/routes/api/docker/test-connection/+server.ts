import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDockerInfo } from '$lib/services/docker/core'; // Adjust path if needed

export const GET: RequestHandler = async ({ url }) => {
	// Get the host to test from query parameters
	const hostToTest = url.searchParams.get('host');

	if (!hostToTest) {
		return json(
			{ success: false, error: 'Missing "host" query parameter.' },
			{ status: 400 } // Bad Request
		);
	}

	try {
		// Pass the host from the query param to the service function
		await getDockerInfo();
		return json({
			success: true,
			message: `Successfully connected to Docker Engine at ${hostToTest}.`
		});
	} catch (error: any) {
		console.error(`Docker connection test failed for host ${hostToTest}:`, error);
		return json(
			{
				success: false,
				error: error.message || `Failed to connect to Docker Engine at ${hostToTest}.`
			},
			{ status: 503 }
		);
	}
};
