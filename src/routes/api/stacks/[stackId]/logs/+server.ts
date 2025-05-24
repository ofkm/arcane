import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deployStack } from '$lib/services/docker/stack-custom-service';

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const { stackId } = params;

	if (!stackId) {
		return json({ error: 'Stack ID is required' }, { status: 400 });
	}

	// Set headers for Server-Sent Events
	setHeaders({
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'Cache-Control'
	});

	// Create a readable stream for SSE
	const stream = new ReadableStream({
		start(controller) {
			let isStreaming = true;
			let isClosed = false;

			// Function to send SSE data
			const sendEvent = (type: string, data: any) => {
				if (isStreaming && !isClosed) {
					try {
						const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
						controller.enqueue(new TextEncoder().encode(message));
					} catch (error) {
						console.error('Error sending SSE event:', error);
						isStreaming = false;
					}
				}
			};

			// Log callback function that streams real Docker output
			const logCallback = (message: string) => {
				if (message.trim() && isStreaming && !isClosed) {
					sendEvent('log', { message: message });
				}
			};

			// Start deployment with real-time logging
			async function startDeployment() {
				try {
					const result = await deployStack(stackId, logCallback);

					if (result && isStreaming && !isClosed) {
						sendEvent('complete', { message: 'Stack deployed successfully' });
					} else if (isStreaming && !isClosed) {
						sendEvent('error', { message: 'Deployment failed' });
					}
				} catch (error) {
					if (isStreaming && !isClosed) {
						sendEvent('error', {
							message: `Deployment failed: ${error instanceof Error ? error.message : String(error)}`
						});
					}
				} finally {
					if (isStreaming && !isClosed) {
						try {
							controller.close();
							isClosed = true;
						} catch (closeError) {
							console.error('Error closing controller:', closeError);
						}
					}
				}
			}

			// Start the deployment
			startDeployment();

			// Cleanup on stream close
			return () => {
				isStreaming = false;
				if (!isClosed) {
					try {
						controller.close();
						isClosed = true;
					} catch (error) {
						// Ignore close errors during cleanup
					}
				}
			};
		}
	});

	return new Response(stream);
};
