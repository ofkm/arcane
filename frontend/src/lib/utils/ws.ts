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
}

export class ReconnectingWebSocket<T = unknown> {
	private ws: WebSocket | null = null;
	private closed = true;
	private attempt = 0;
	private readonly maxBackoff: number;
	private opts: ReconnectWSOptions<T>;
	private connecting = false;

	constructor(opts: ReconnectWSOptions<T>) {
		this.opts = opts;
		this.maxBackoff = opts.maxBackoff ?? 30000;
		if (opts.autoConnect) this.connect();
	}

	async connect() {
		this.closed = false;
		this.attempt = 0;
		await this.connectOnce();
	}

	async connectOnce() {
		if (this.closed || this.connecting) return;
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

		try {
			this.ws = new WebSocket(url);
		} catch (err) {
			this.connecting = false;
			this.scheduleReconnect();
			this.opts.onError?.(err as Error);
			return;
		}

		this.ws.onopen = () => {
			this.attempt = 0;
			this.connecting = false;
			this.opts.onOpen?.();
		};

		this.ws.onmessage = (evt) => {
			try {
				const parser =
					this.opts.parseMessage ??
					((e: MessageEvent) => {
						// default: try JSON.parse for string payloads, else return raw data
						if (typeof e.data === 'string') return JSON.parse(e.data) as unknown as T;
						return e.data as unknown as T;
					});
				const msg = parser(evt);
				this.opts.onMessage?.(msg);
			} catch (err) {
				this.opts.onError?.(err as Error);
			}
		};

		this.ws.onerror = (e) => {
			this.opts.onError?.(e);
		};

		this.ws.onclose = () => {
			this.opts.onClose?.();
			this.ws = null;
			if (!this.closed) this.scheduleReconnect();
		};
	}

	private scheduleReconnect() {
		this.attempt++;
		const exp = Math.min(1000 * Math.pow(1.5, this.attempt), this.maxBackoff);
		const jitter = Math.random() * 0.3 * exp;
		const backoff = exp - jitter;
		setTimeout(() => {
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
		try {
			this.ws?.close();
		} catch {
			// ignore
		}
		this.ws = null;
		this.connecting = false;
	}

	isConnected() {
		return !!this.ws && this.ws.readyState === WebSocket.OPEN;
	}
}

/* small convenience wrapper for the dashboard stats (keeps existing shape) */
export function createStatsWebSocket(opts: {
	getEnvId: () => string;
	onMessage: (data: SystemStats) => void;
	onOpen?: () => void;
	onClose?: () => void;
	onError?: (err: Event | Error) => void;
	maxBackoff?: number;
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
		maxBackoff: opts.maxBackoff
	});
}
