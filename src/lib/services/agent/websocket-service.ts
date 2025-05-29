import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { registerAgent, updateAgentHeartbeat } from './agent-manager';

interface AgentConnection {
	id: string;
	ws: any;
	lastHeartbeat: Date;
	metadata?: Record<string, any>;
}

class AgentWebSocketManager {
	private wss: WebSocketServer;
	private agents = new Map<string, AgentConnection>();

	constructor() {
		this.wss = new WebSocketServer({ noServer: true });
		this.setupWebSocketServer();
		this.startHeartbeatMonitor();
	}

	private setupWebSocketServer() {
		this.wss.on('connection', (ws: any, request: IncomingMessage) => {
			console.log('New agent connection attempt');

			ws.on('message', async (data: Buffer) => {
				try {
					const message = JSON.parse(data.toString());
					await this.handleMessage(ws, message);
				} catch (error) {
					console.error('Error processing agent message:', error);
					ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
				}
			});

			ws.on('close', () => {
				this.handleDisconnection(ws);
			});

			ws.on('error', (error: any) => {
				console.error('WebSocket error:', error);
				this.handleDisconnection(ws);
			});
		});
	}

	private async handleMessage(ws: any, message: any) {
		const { type, agent_id, data } = message;

		switch (type) {
			case 'register':
				await this.handleAgentRegistration(ws, agent_id, data);
				break;
			case 'heartbeat':
				await this.handleHeartbeat(agent_id);
				break;
			case 'task_result':
				await this.handleTaskResult(agent_id, data);
				break;
			case 'pong':
				await this.handlePong(agent_id);
				break;
			default:
				console.log(`Unknown message type: ${type}`);
		}
	}

	private async handleAgentRegistration(ws: any, agentId: string, data: any) {
		try {
			// Register agent in the system
			await registerAgent({
				id: agentId,
				hostname: data.hostname || 'unknown',
				platform: data.platform || 'unknown',
				version: data.version || '1.0.0',
				capabilities: data.capabilities || [],
				status: 'online',
				lastSeen: new Date().toISOString(),
				createdAt: new Date().toISOString()
			});

			// Store connection
			this.agents.set(agentId, {
				id: agentId,
				ws,
				lastHeartbeat: new Date(),
				metadata: data
			});

			// Send registration confirmation
			ws.send(
				JSON.stringify({
					type: 'registered',
					agent_id: agentId,
					status: 'success'
				})
			);

			console.log(`Agent ${agentId} registered successfully`);
		} catch (error) {
			console.error(`Failed to register agent ${agentId}:`, error);
			ws.send(
				JSON.stringify({
					type: 'error',
					message: 'Registration failed'
				})
			);
		}
	}

	private async handleHeartbeat(agentId: string) {
		const connection = this.agents.get(agentId);
		if (connection) {
			connection.lastHeartbeat = new Date();
			await updateAgentHeartbeat(agentId);
		}
	}

	private async handleTaskResult(agentId: string, data: any) {
		console.log(`Task result from ${agentId}:`, data);
		// TODO: Save task result to database/file
	}

	private async handlePong(agentId: string) {
		const connection = this.agents.get(agentId);
		if (connection) {
			connection.lastHeartbeat = new Date();
		}
	}

	private handleDisconnection(ws: any) {
		for (const [agentId, connection] of this.agents.entries()) {
			if (connection.ws === ws) {
				this.agents.delete(agentId);
				console.log(`Agent ${agentId} disconnected`);
				break;
			}
		}
	}

	private startHeartbeatMonitor() {
		setInterval(() => {
			const now = new Date();
			const timeout = 60000; // 60 seconds

			for (const [agentId, connection] of this.agents.entries()) {
				const timeSinceHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();

				if (timeSinceHeartbeat > timeout) {
					console.log(`Agent ${agentId} timed out, removing connection`);
					connection.ws.terminate();
					this.agents.delete(agentId);
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
	}

	// Fixed method - this is what agent-manager calls
	public sendMessageToAgent(agentId: string, message: any): boolean {
		const connection = this.agents.get(agentId);
		if (!connection || connection.ws.readyState !== connection.ws.OPEN) {
			console.log(`Cannot send message to agent ${agentId} - not connected`);
			return false;
		}

		try {
			connection.ws.send(JSON.stringify(message));
			console.log(`Message sent to agent ${agentId}:`, message.type);
			return true;
		} catch (error) {
			console.error(`Failed to send message to agent ${agentId}:`, error);
			return false;
		}
	}

	public handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
		const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;

		if (pathname === '/agent/connect') {
			this.wss.handleUpgrade(request, socket, head, (ws) => {
				this.wss.emit('connection', ws, request);
			});
		} else {
			socket.destroy();
		}
	}

	public getConnectedAgents() {
		return Array.from(this.agents.values())
			.filter((conn) => conn.ws.readyState === conn.ws.OPEN)
			.map((conn) => ({
				id: conn.id,
				lastHeartbeat: conn.lastHeartbeat,
				metadata: conn.metadata
			}));
	}
}

export const agentWSManager = new AgentWebSocketManager();
