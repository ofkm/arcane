import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';
import url from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_PATH = path.join(__dirname, 'data');
const AGENTS_DIR = path.join(BASE_PATH, 'agents');

// Ensure agents directory exists
await fs.mkdir(AGENTS_DIR, { recursive: true });

const server = createServer();
const wss = new WebSocketServer({ noServer: true });

// Keep in-memory connections map
const agents = new Map();

// Agent management functions
async function saveAgent(agent) {
	const filePath = path.join(AGENTS_DIR, `${agent.id}.json`);
	await fs.writeFile(filePath, JSON.stringify(agent, null, 2));
	return agent;
}

async function getAgent(agentId) {
	try {
		const filePath = path.join(AGENTS_DIR, `${agentId}.json`);
		const agentData = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(agentData);
	} catch (error) {
		return null;
	}
}

async function updateAgent(agentId, updates) {
	const existing = await getAgent(agentId);
	if (!existing) {
		throw new Error('Agent not found');
	}

	const updated = {
		...existing,
		...updates,
		updatedAt: new Date().toISOString()
	};

	await saveAgent(updated);
	return updated;
}

async function registerAgent(agentData) {
	const existing = await getAgent(agentData.id);
	if (existing) {
		return await updateAgent(agentData.id, {
			...agentData,
			status: 'online',
			lastSeen: new Date().toISOString()
		});
	} else {
		const newAgent = {
			...agentData,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			status: 'online',
			lastSeen: new Date().toISOString()
		};
		return await saveAgent(newAgent);
	}
}

// Add a function to send tasks to agents
function sendTaskToAgent(agentId, taskData) {
	const connection = agents.get(agentId);
	if (!connection || connection.ws.readyState !== connection.ws.OPEN) {
		console.log(`❌ Cannot send task to agent ${agentId} - not connected`);
		return false;
	}

	try {
		const message = {
			type: 'task',
			agent_id: agentId,
			timestamp: new Date().toISOString(),
			data: taskData
		};

		connection.ws.send(JSON.stringify(message));
		console.log(`📋 Task sent to agent ${agentId}:`, taskData.type);
		return true;
	} catch (error) {
		console.error(`❌ Failed to send task to agent ${agentId}:`, error);
		return false;
	}
}

// Handle HTTP requests
server.on('request', async (req, res) => {
	// Add CORS headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	// Handle preflight requests
	if (req.method === 'OPTIONS') {
		res.writeHead(200);
		res.end();
		return;
	}

	console.log(`📥 HTTP ${req.method} ${req.url}`);

	try {
		const parsedUrl = url.parse(req.url, true);
		const pathParts = parsedUrl.pathname.split('/').filter((part) => part);

		// Handle /api/agents/{agentId}/tasks
		if (req.method === 'POST' && pathParts.length === 4 && pathParts[0] === 'api' && pathParts[1] === 'agents' && pathParts[3] === 'tasks') {
			const agentId = pathParts[2];

			let body = '';
			req.on('data', (chunk) => {
				body += chunk.toString();
			});

			req.on('end', async () => {
				try {
					const { type, payload } = JSON.parse(body);
					console.log(`📋 Task request for agent ${agentId}: ${type}`);

					// Check if agent is connected
					const connection = agents.get(agentId);
					if (!connection || connection.ws.readyState !== connection.ws.OPEN) {
						console.log(`❌ Agent ${agentId} not connected`);
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Agent not connected' }));
						return;
					}

					// Create task data
					const taskData = {
						id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
						type,
						payload
					};

					// Send task to agent
					const sent = sendTaskToAgent(agentId, taskData);
					if (sent) {
						console.log(`✅ Task ${taskData.id} sent to agent ${agentId}`);
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(
							JSON.stringify({
								success: true,
								taskId: taskData.id,
								message: `Task sent to agent ${agentId}`
							})
						);
					} else {
						console.log(`❌ Failed to send task to agent ${agentId}`);
						res.writeHead(500, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Failed to send task to agent' }));
					}
				} catch (error) {
					console.error('❌ Error parsing task request:', error);
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
				}
			});

			req.on('error', (error) => {
				console.error('❌ Request error:', error);
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Request error' }));
			});
		} else {
			// Handle other routes or return 404
			console.log(`❌ Route not found: ${req.method} ${req.url}`);
			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Not found' }));
		}
	} catch (error) {
		console.error('❌ Server error:', error);
		res.writeHead(500, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Internal server error' }));
	}
});

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
	const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
	console.log(`🔄 WebSocket upgrade request for: ${pathname}`);

	if (pathname === '/agent/connect') {
		console.log('✅ Valid agent connection path');
		wss.handleUpgrade(request, socket, head, (ws) => {
			wss.emit('connection', ws, request);
		});
	} else {
		console.log('❌ Invalid path, destroying socket');
		socket.destroy();
	}
});

// WebSocket connection handling
wss.on('connection', (ws, request) => {
	console.log('🔗 New agent connection attempt from:', request.socket.remoteAddress);

	ws.isAlive = true;
	ws.on('pong', () => {
		ws.isAlive = true;
	});

	ws.on('message', async (data) => {
		try {
			const message = JSON.parse(data.toString());
			console.log('📨 Received message:', message);

			switch (message.type) {
				case 'register':
					const agentId = message.agent_id;
					const agentData = {
						id: agentId,
						hostname: message.data?.hostname || 'unknown',
						platform: message.data?.platform || 'unknown',
						version: message.data?.version || '1.0.0',
						capabilities: message.data?.capabilities || [],
						dockerInfo: message.data?.dockerInfo || undefined,
						metadata: message.data
					};

					try {
						const savedAgent = await registerAgent(agentData);
						console.log('💾 Agent saved to file:', savedAgent.id);

						// Keep in memory for WebSocket communication
						agents.set(agentId, {
							ws,
							lastHeartbeat: new Date(),
							data: message.data
						});

						// Send registration confirmation
						ws.send(
							JSON.stringify({
								type: 'registered',
								agent_id: agentId,
								status: 'success'
							})
						);

						console.log(`✅ Agent ${agentId} registered successfully`);
						console.log(`📊 Total agents: ${agents.size}`);
					} catch (error) {
						console.error('❌ Failed to register agent:', error);
						ws.send(
							JSON.stringify({
								type: 'error',
								message: 'Failed to register agent'
							})
						);
					}
					break;

				case 'heartbeat':
					const connection = agents.get(message.agent_id);
					if (connection) {
						connection.lastHeartbeat = new Date();
						console.log(`💓 Heartbeat from ${message.agent_id}`);

						try {
							await updateAgent(message.agent_id, {
								status: 'online',
								lastSeen: new Date().toISOString()
							});
						} catch (error) {
							console.error('Failed to update agent heartbeat in file:', error);
						}
					}
					break;

				case 'pong':
					console.log(`🏓 Pong received from ${message.agent_id}`);
					break;

				case 'task_result':
					console.log(`📋 Task result from ${message.agent_id}:`, message.data);
					break;

				default:
					console.log(`❓ Unknown message type: ${message.type}`);
			}
		} catch (error) {
			console.error('❌ Error processing agent message:', error);
			if (ws.readyState === ws.OPEN) {
				ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
			}
		}
	});

	ws.on('close', async (code, reason) => {
		for (const [agentId, connection] of agents.entries()) {
			if (connection.ws === ws) {
				agents.delete(agentId);
				console.log(`🔌 Agent ${agentId} disconnected (code: ${code}, reason: ${reason})`);
				console.log(`📊 Total agents: ${agents.size}`);

				try {
					await updateAgent(agentId, {
						status: 'offline',
						lastSeen: new Date().toISOString()
					});
					console.log(`📝 Updated agent ${agentId} status to offline`);
				} catch (error) {
					console.error('Failed to update agent status to offline:', error);
				}
				break;
			}
		}
	});

	ws.on('error', (error) => {
		console.error('❌ WebSocket error:', error);
	});
});

// Health check interval
setInterval(async () => {
	const now = new Date();
	const timeout = 90000; // 90 seconds

	console.log(`🔍 Health check: ${agents.size} agents, ${wss.clients.size} WebSocket connections`);

	wss.clients.forEach((ws) => {
		if (!ws.isAlive) {
			console.log('💀 Terminating dead connection');
			return ws.terminate();
		}

		ws.isAlive = false;
		if (ws.readyState === ws.OPEN) {
			ws.ping();
		}
	});

	for (const [agentId, connection] of agents.entries()) {
		const timeSinceHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();

		if (timeSinceHeartbeat > timeout) {
			console.log(`⏰ Agent ${agentId} timed out, removing connection`);
			if (connection.ws.readyState === connection.ws.OPEN) {
				connection.ws.terminate();
			}
			agents.delete(agentId);

			try {
				await updateAgent(agentId, {
					status: 'offline',
					lastSeen: new Date().toISOString()
				});
				console.log(`📝 Updated timed-out agent ${agentId} status to offline`);
			} catch (error) {
				console.error('Failed to update timed-out agent status:', error);
			}
		} else if (connection.ws.readyState === connection.ws.OPEN) {
			connection.ws.send(
				JSON.stringify({
					type: 'ping',
					timestamp: now.toISOString()
				})
			);
		}
	}
}, 30000);

const port = 3001;
server.listen(port, () => {
	console.log(`🚀 WebSocket development server running on port ${port}`);
	console.log(`📡 Agent connection endpoint: ws://localhost:${port}/agent/connect`);
	console.log(`🌐 HTTP API endpoint: http://localhost:${port}/api/agents/{agentId}/tasks`);
});
