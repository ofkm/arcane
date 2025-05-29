import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_PATH = path.join(__dirname, 'data');

const AGENTS_DIR = path.join(BASE_PATH, 'agents');

// Ensure agents directory exists
await fs.mkdir(AGENTS_DIR, { recursive: true });

const server = createServer();
const wss = new WebSocketServer({
	noServer: true,
	perMessageDeflate: false
});

// Keep in-memory connections map
const agents = new Map();

// Agent management functions (simplified versions)
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
		// Update existing agent
		return await updateAgent(agentData.id, {
			...agentData,
			status: 'online',
			lastSeen: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});
	} else {
		// Create new agent
		const newAgent = {
			...agentData,
			status: 'online',
			lastSeen: new Date().toISOString(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		return await saveAgent(newAgent);
	}
}

wss.on('connection', (ws, request) => {
	console.log('🔗 New agent connection attempt from:', request.socket.remoteAddress);

	// Set up ping/pong for connection health
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
						// Save agent to file system
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

						// Update agent's last seen in file
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
		// Find and remove the disconnected agent
		for (const [agentId, connection] of agents.entries()) {
			if (connection.ws === ws) {
				agents.delete(agentId);
				console.log(`🔌 Agent ${agentId} disconnected (code: ${code}, reason: ${reason})`);
				console.log(`📊 Total agents: ${agents.size}`);

				// Update agent status in file
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

// Health check interval - ping agents and remove dead connections
setInterval(async () => {
	const now = new Date();
	const timeout = 90000; // 90 seconds timeout

	console.log(`🔍 Health check: ${agents.size} agents, ${wss.clients.size} WebSocket connections`);

	// Check WebSocket connections
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

	// Check agent heartbeats
	for (const [agentId, connection] of agents.entries()) {
		const timeSinceHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();

		if (timeSinceHeartbeat > timeout) {
			console.log(`⏰ Agent ${agentId} timed out, removing connection`);
			if (connection.ws.readyState === connection.ws.OPEN) {
				connection.ws.terminate();
			}
			agents.delete(agentId);

			// Update agent status in file
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
			// Send ping to check if agent is still alive
			connection.ws.send(
				JSON.stringify({
					type: 'ping',
					timestamp: now.toISOString()
				})
			);
		}
	}
}, 30000); // Check every 30 seconds

const port = 3001;
server.listen(port, () => {
	console.log(`🚀 WebSocket server for agents listening on port ${port}`);
	console.log(`🔗 Agents should connect to: ws://localhost:${port}/agent/connect`);
	console.log(`📁 Agent data will be saved to: ${AGENTS_DIR}`);
});
