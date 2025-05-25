<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	interface LogEntry {
		timestamp: string;
		level: 'stdout' | 'stderr' | 'info' | 'error';
		message: string;
	}

	interface Props {
		containerId?: string | null;
		maxLines?: number;
		autoScroll?: boolean;
		showTimestamps?: boolean;
		height?: string;
		onClear?: () => void;
		onToggleAutoScroll?: () => void;
		onStart?: () => void;
		onStop?: () => void;
	}

	let { containerId = null, maxLines = 1000, autoScroll = $bindable(true), showTimestamps = true, height = '400px', onClear, onToggleAutoScroll, onStart, onStop }: Props = $props();

	let logs: LogEntry[] = $state([]);
	let logContainer: HTMLElement | undefined = $state();
	let isStreaming = $state(false);
	let error: string | null = $state(null);
	let eventSource: EventSource | null = null;

	// Expose functions for parent components
	export function startLogStream() {
		if (!containerId || !browser) return;

		try {
			isStreaming = true;
			error = null;
			onStart?.();

			// Create SSE connection for log streaming
			eventSource = new EventSource(`/api/containers/${containerId}/logs/stream`);

			eventSource.onmessage = (event) => {
				const logData = JSON.parse(event.data);
				addLogEntry(logData);
			};

			eventSource.onerror = (event) => {
				console.error('Log stream error:', event);
				error = 'Connection to log stream lost';
				isStreaming = false;
			};
		} catch (err) {
			console.error('Failed to start log stream:', err);
			error = 'Failed to connect to log stream';
			isStreaming = false;
		}
	}

	export function stopLogStream() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		isStreaming = false;
		onStop?.();
	}

	export function clearLogs() {
		logs = [];
		onClear?.();
	}

	export function toggleAutoScroll() {
		autoScroll = !autoScroll;
		onToggleAutoScroll?.();
	}

	// Expose state getters
	export function getIsStreaming() {
		return isStreaming;
	}

	export function getLogCount() {
		return logs.length;
	}

	function addLogEntry(logData: { level: string; message: string; timestamp?: string }) {
		const entry: LogEntry = {
			timestamp: logData.timestamp || new Date().toISOString(),
			level: logData.level as LogEntry['level'],
			message: logData.message
		};

		logs = [...logs.slice(-(maxLines - 1)), entry];

		if (autoScroll && logContainer) {
			setTimeout(() => {
				if (logContainer) {
					logContainer.scrollTop = logContainer.scrollHeight;
				}
			}, 10);
		}
	}

	function formatTimestamp(timestamp: string): string {
		return new Date(timestamp).toLocaleTimeString();
	}

	function getLevelClass(level: LogEntry['level']): string {
		switch (level) {
			case 'stderr':
			case 'error':
				return 'text-red-400';
			case 'stdout':
			case 'info':
				return 'text-green-400';
			default:
				return 'text-gray-300';
		}
	}

	onMount(() => {
		if (containerId) {
			startLogStream();
		}
	});

	onDestroy(() => {
		stopLogStream();
	});

	$effect(() => {
		if (containerId && browser) {
			stopLogStream();
			logs = [];
			startLogStream();
		}
	});
</script>

<div class="log-viewer bg-black text-white border rounded-md">
	<!-- Error Display -->
	{#if error}
		<div class="p-3 bg-red-900/20 border-b border-red-700 text-red-200 text-sm">
			{error}
		</div>
	{/if}

	<!-- Log Content -->
	<div bind:this={logContainer} class="log-viewer overflow-y-auto font-mono text-sm bg-black text-white border rounded-lg" style="height: {height}">
		{#if logs.length === 0}
			<div class="p-4 text-center text-gray-500">
				{#if !containerId}
					No container selected
				{:else if !isStreaming}
					No logs available. Start streaming to see logs.
				{:else}
					Waiting for logs...
				{/if}
			</div>
		{:else}
			{#each logs as log (log.timestamp + log.message)}
				<div class="flex px-3 py-1 hover:bg-gray-900/50 border-l-2 border-transparent hover:border-blue-500 transition-colors">
					{#if showTimestamps}
						<span class="text-gray-500 text-xs mr-3 flex-shrink-0 w-20">
							{formatTimestamp(log.timestamp)}
						</span>
					{/if}

					<span class="text-xs mr-2 flex-shrink-0 w-12 {getLevelClass(log.level)}">
						{log.level.toUpperCase()}
					</span>

					<span class="text-gray-300 whitespace-pre-wrap break-all">
						{log.message}
					</span>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.log-viewer {
		font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
	}
</style>
