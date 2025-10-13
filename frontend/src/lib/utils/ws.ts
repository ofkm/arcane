import type { SystemStats } from '$lib/types/system-stats.type';

export interface ReconnectWSOptions<T> {
	buildUrl: () => string | Promise<string>;
	parseMessage?: (evt: MessageEvent) => T;
	onMessage?: (msg: T) => void;
	onOpen?: () => void;
	onClose?: () => void;
	onError?: (err: Event | Error) => void;
	maxBackoff?: number;
	autoConnect?: boolean;
	shouldReconnect?: () => boolean;
	enablePWAKeepAlive?: boolean;
	heartbeatInterval?: number;
}

export class ReconnectingWebSocket<T = unknown> {
	private ws: WebSocket | null = null;
	private closed = true;
	private attempt = 0;
	private readonly maxBackoff: number;
	private opts: ReconnectWSOptions<T>;
	private connecting = false;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	private visibilityChangeHandler: (() => void) | null = null;
	private wakeLockSentinel: any = null;

	constructor(opts: ReconnectWSOptions<T>) {
		this.opts = opts;
		this.maxBackoff = opts.maxBackoff ?? 30000;

		if (opts.enablePWAKeepAlive && typeof document !== 'undefined') {
			this.setupPWAKeepAlive();
		}

		if (opts.autoConnect) this.connect();
	}

	private setupPWAKeepAlive() {
		this.visibilityChangeHandler = () => {
			if (document.visibilityState === 'visible') {
				if (!this.isConnected() && !this.closed) {
					// Delay reconnection to allow iOS to restore network stack
					setTimeout(() => {
						if (!this.isConnected() && !this.closed) {
							this.connectOnce();
						}
					}, 1000); // 1 second delay for iOS
				}
			}
		};
		document.addEventListener('visibilitychange', this.visibilityChangeHandler);

		this.requestWakeLock();
	}

	private async requestWakeLock() {
		try {
			if ('wakeLock' in navigator) {
				this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');

				document.addEventListener('visibilitychange', async () => {
					if (document.visibilityState === 'visible' && this.wakeLockSentinel?.released && !this.closed) {
						try {
							this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
						} catch (err) {
							console.debug('Failed to reacquire wake lock:', err);
						}
					}
				});
			}
		} catch (err) {
			console.debug('Wake Lock not available or failed:', err);
		}
	}

	private startHeartbeat() {
		if (this.heartbeatTimer || !this.opts.enablePWAKeepAlive) return;

		const interval = this.opts.heartbeatInterval ?? 30000;

		this.heartbeatTimer = setInterval(() => {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				try {
					this.ws.send(JSON.stringify({ type: 'ping' }));
				} catch (err) {
					console.debug('Heartbeat ping failed:', err);
				}
			}
		}, interval);
	}

	private stopHeartbeat() {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}

	async connect() {
		if (this.ws && !this.closed) {
			this.close();
		}
		this.closed = false;
		this.attempt = 0;
		await this.connectOnce();
	}

	async connectOnce() {
		if (this.closed || this.connecting) return;

		if (this.ws) {
			try {
				this.ws.close();
			} catch {}
			this.ws = null;
		}

		this.connecting = true;
		let url: string;
		try {
			url = await this.opts.buildUrl();
		} catch (err) {
			this.connecting = false;
			this.scheduleReconnect();
			this.opts.onError?.(err as Error);
			return;
		}

		let socket: WebSocket;
		try {
			socket = new WebSocket(url);
		} catch (err) {
			this.connecting = false;
			this.scheduleReconnect();
			this.opts.onError?.(err as Error);
			return;
		}

		this.ws = socket;

		socket.onopen = () => {
			if (socket !== this.ws) return;
			this.attempt = 0;
			this.connecting = false;
			this.opts.onOpen?.();

			if (this.opts.enablePWAKeepAlive) {
				this.startHeartbeat();
			}
		};

		socket.onmessage = (evt) => {
			if (socket !== this.ws) return;
			try {
				const parser =
					this.opts.parseMessage ??
					((e: MessageEvent) => {
						if (typeof e.data === 'string') return JSON.parse(e.data) as unknown as T;
						return e.data as unknown as T;
					});
				const msg = parser(evt);
				this.opts.onMessage?.(msg);
			} catch (err) {
				this.opts.onError?.(err as Error);
			}
		};

		socket.onerror = (e) => {
			if (socket !== this.ws) return;
			this.opts.onError?.(e);
		};

		socket.onclose = () => {
			if (socket !== this.ws) return;
			this.stopHeartbeat();
			this.opts.onClose?.();
			this.ws = null;
			this.connecting = false;
			if (!this.closed) this.scheduleReconnect();
		};

		return;
	}

	private scheduleReconnect() {
		if (this.opts.shouldReconnect && !this.opts.shouldReconnect()) {
			return;
		}

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		this.attempt++;
		const exp = Math.min(1000 * Math.pow(1.5, this.attempt), this.maxBackoff);
		const jitter = Math.random() * 0.3 * exp;
		let backoff = exp - jitter;

		// iOS PWA fix: Add extra delay for first reconnect attempt
		// iOS has a bug where WebSocket connections created immediately after
		// app foreground use CONNECT method instead of proper WebSocket upgrade
		const isIOSPWA =
			typeof navigator !== 'undefined' &&
			/iPhone|iPad|iPod/.test(navigator.userAgent) &&
			'standalone' in (navigator as any) &&
			(navigator as any).standalone === true;

		if (isIOSPWA && this.attempt === 1) {
			backoff = Math.max(backoff, 2000); // Minimum 2 second delay for iOS PWA
		}

		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			if (!this.closed) this.connectOnce();
		}, backoff);
	}

	send(payload: string | ArrayBuffer | Blob) {
		try {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				this.ws.send(payload as any);
				return true;
			}
		} catch (err) {
			this.opts.onError?.(err as Error);
		}
		return false;
	}

	close() {
		this.closed = true;
		this.attempt = 0;

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		this.stopHeartbeat();

		if (this.visibilityChangeHandler && typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
			this.visibilityChangeHandler = null;
		}

		if (this.wakeLockSentinel) {
			this.wakeLockSentinel.release().catch(() => {});
			this.wakeLockSentinel = null;
		}

		try {
			this.ws?.close();
		} catch {}
		this.connecting = false;
	}

	isConnected() {
		return !!this.ws && this.ws.readyState === WebSocket.OPEN;
	}
}

export function createStatsWebSocket(opts: {
	getEnvId: () => string;
	onMessage: (data: SystemStats) => void;
	onOpen?: () => void;
	onClose?: () => void;
	onError?: (err: Event | Error) => void;
	maxBackoff?: number;
	enablePWAKeepAlive?: boolean;
	heartbeatInterval?: number;
}) {
	const buildUrl = () => {
		const envId = opts.getEnvId() || '0';
		const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
		return `${protocol}://${location.host}/api/environments/${envId}/system/stats/ws`;
	};

	return new ReconnectingWebSocket<SystemStats>({
		buildUrl,
		parseMessage: (evt) => JSON.parse(evt.data as string) as SystemStats,
		onMessage: opts.onMessage,
		onOpen: opts.onOpen,
		onClose: opts.onClose,
		onError: opts.onError,
		maxBackoff: opts.maxBackoff,
		enablePWAKeepAlive: opts.enablePWAKeepAlive ?? false,
		heartbeatInterval: opts.heartbeatInterval
	});
}

export function createContainerStatsWebSocket(opts: {
	getEnvId: () => string;
	containerId: string;
	onMessage: (data: any) => void;
	onOpen?: () => void;
	onClose?: () => void;
	onError?: (err: Event | Error) => void;
	maxBackoff?: number;
	shouldReconnect?: () => boolean;
	enablePWAKeepAlive?: boolean;
	heartbeatInterval?: number;
}) {
	const buildUrl = () => {
		const envId = opts.getEnvId() || '0';
		const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
		return `${protocol}://${location.host}/api/environments/${envId}/containers/${opts.containerId}/stats/ws`;
	};

	return new ReconnectingWebSocket<any>({
		buildUrl,
		parseMessage: (evt) => JSON.parse(evt.data as string),
		onMessage: opts.onMessage,
		onOpen: opts.onOpen,
		onClose: opts.onClose,
		onError: opts.onError,
		maxBackoff: opts.maxBackoff,
		autoConnect: false,
		shouldReconnect: opts.shouldReconnect,
		enablePWAKeepAlive: opts.enablePWAKeepAlive ?? false,
		heartbeatInterval: opts.heartbeatInterval
	});
}
