<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Terminal } from '@xterm/xterm';
	import { FitAddon } from '@xterm/addon-fit';
	import '@xterm/xterm/css/xterm.css';

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

	function initializeTerminal() {
		if (!container) return;

		if (terminal) {
			terminal.dispose();
		}

		terminal = new Terminal({
			cursorBlink: true,
			fontSize: 14,
			fontFamily: 'Menlo, Monaco, "Courier New", monospace',
			theme: {
				background: '#1e1e1e',
				foreground: '#d4d4d4'
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
			ws.close();
		}

		ws = new WebSocket(websocketUrl);
		ws.binaryType = 'arraybuffer';

		ws.onopen = () => {
			terminal?.writeln('Connected to container shell...');
			onConnected?.();
		};

		ws.onmessage = (event) => {
			if (terminal) {
				if (event.data instanceof ArrayBuffer) {
					const uint8Array = new Uint8Array(event.data);
					const text = new TextDecoder().decode(uint8Array);
					terminal.write(text);
				} else {
					terminal.write(event.data);
				}
			}
		};

		ws.onerror = () => {
			terminal?.writeln('\r\n\x1b[31mWebSocket error occurred\x1b[0m');
		};

		ws.onclose = () => {
			terminal?.writeln('\r\n\x1b[33mConnection closed\x1b[0m');
			onDisconnected?.();
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
		ws?.close();
		terminal?.dispose();
	});
</script>

<div bind:this={container} class="h-full w-full" style="height: {height}"></div>
