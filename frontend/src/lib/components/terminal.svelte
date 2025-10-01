<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Terminal } from '@xterm/xterm';
	import { FitAddon } from '@xterm/addon-fit';
	import '@xterm/xterm/css/xterm.css';
	import { m } from '$lib/paraglide/messages';

	let {
		websocketUrl,
		height = '100%',
		onConnected,
		onDisconnected
	}: {
		websocketUrl: string;
		height?: string;
		onConnected?: () => void;
		onDisconnected?: () => void;
	} = $props();

	let container: HTMLDivElement;
	let terminal: Terminal | null = null;
	let fitAddon: FitAddon | null = null;
	let ws: WebSocket | null = null;
	let isReconnecting = false;

	function initializeTerminal() {
		if (!container) return;

		if (terminal) {
			terminal.dispose();
		}

		terminal = new Terminal({
			cursorBlink: true,
			fontSize: 14,
			fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
			theme: {
				background: '#09090b',
				foreground: '#e4e4e7',
				cursor: '#e4e4e7',
				black: '#18181b',
				red: '#f87171',
				green: '#4ade80',
				yellow: '#facc15',
				blue: '#60a5fa',
				magenta: '#c084fc',
				cyan: '#22d3ee',
				white: '#e4e4e7',
				brightBlack: '#52525b',
				brightRed: '#fca5a5',
				brightGreen: '#86efac',
				brightYellow: '#fde047',
				brightBlue: '#93c5fd',
				brightMagenta: '#d8b4fe',
				brightCyan: '#67e8f9',
				brightWhite: '#fafafa'
			}
		});

		fitAddon = new FitAddon();
		terminal.loadAddon(fitAddon);
		terminal.open(container);
		fitAddon.fit();

		terminal.onData((data) => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(data);
			}
		});
	}

	function connectWebSocket() {
		if (ws) {
			ws.onclose = null;
			ws.onerror = null;
			ws.onmessage = null;
			ws.close();
			ws = null;
		}

		isReconnecting = true;
		ws = new WebSocket(websocketUrl);
		ws.binaryType = 'arraybuffer';

		ws.onopen = () => {
			isReconnecting = false;
			onConnected?.();
		};

		ws.onmessage = (event) => {
			if (!terminal) return;
			if (event.data instanceof ArrayBuffer) {
				const uint8Array = new Uint8Array(event.data);
				const text = new TextDecoder().decode(uint8Array);
				terminal.write(text);
			} else {
				terminal.write(event.data);
			}
		};

		ws.onerror = () => {
			if (!isReconnecting && terminal) {
				terminal.writeln(`\r\n\x1b[31m${m.terminal_websocket_error()}\x1b[0m`);
			}
		};

		ws.onclose = () => {
			if (!isReconnecting && terminal) {
				terminal.writeln(`\r\n\x1b[33m${m.terminal_connection_closed()}\x1b[0m`);
				onDisconnected?.();
			}
		};
	}

	function handleResize() {
		if (fitAddon) {
			fitAddon.fit();
		}
	}

	onMount(() => {
		initializeTerminal();
		connectWebSocket();
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			isReconnecting = true;
			ws?.close();
			terminal?.dispose();
		};
	});

	$effect(() => {
		if (websocketUrl && terminal) {
			terminal.clear();
			connectWebSocket();
		}
	});

	onDestroy(() => {
		isReconnecting = true;
		ws?.close();
		terminal?.dispose();
	});
</script>

<div bind:this={container} class="h-full w-full" style="height: {height}"></div>
