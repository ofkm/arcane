import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Docker system info endpoint
export const GET: RequestHandler = async () => {
	try {
		// Replace with actual Docker API call
		// const docker = new Docker();
		// const info = await docker.info();
		const info = {
			version: '25.0.0',
			containers: 3,
			images: 12,
			os: 'Linux',
			arch: 'x86_64'
		};

		return json(info);
	} catch (error) {
		console.error('Error fetching Docker info:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch Docker info' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
