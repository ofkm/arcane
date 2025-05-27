<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	interface LogEntry {
		timestamp: string;
		level: 'stdout' | 'stderr' | 'info' | 'error';
		message: string;
		service?: string; // Add service field for stack logs
		containerId?: string;
	}

	interface Props {
		containerId?: string | null;
		stackId?: string | null; // Add stackId prop
		type?: 'container' | 'stack';
		maxLines?: number;
		autoScroll?: boolean;
		showTimestamps?: boolean;
		height?: string;
		onClear?: () => void;
		onToggleAutoScroll?: () => void;
		onStart?: () => void;
		onStop?: () => void;
	}

	let { containerId = null, stackId = null, type = 'container', maxLines = 1000, autoScroll = $bindable(true), showTimestamps = true, height = '400px', onClear, onToggleAutoScroll, onStart, onStop }: Props = $props();

	let logs: LogEntry[] = $state([]);
	let logContainer: HTMLElement | undefined = $state();
	let isStreaming = $state(false);
	let error: string | null = $state(null);
	let eventSource: EventSource | null = null;

	// Expose functions for parent components
	export function startLogStream() {
		const targetId = type === 'stack' ? stackId : containerId;

		if (!targetId || !browser) return;

		try {
			isStreaming = true;
			error = null;
			onStart?.();

			// Use different API endpoint based on type
			const endpoint = type === 'stack' ? `/api/stacks/${stackId}/logs?follow=true&tail=100&timestamps=true` : `/api/containers/${containerId}/logs/stream`;

			console.log(`Starting ${type} log stream for ${targetId}:`, endpoint);

			// Create SSE connection for log streaming
			eventSource = new EventSource(endpoint);

			eventSource.onmessage = (event) => {
				try {
					// Both stack and container logs now come as JSON
					const logData = JSON.parse(event.data);
					addLogEntry(logData);
				} catch (parseError) {
					console.error('Failed to parse log data:', parseError, 'Raw data:', event.data);
					// Fallback: treat as plain text
					addLogEntry({
						level: 'info',
						message: event.data,
						timestamp: new Date().toISOString()
					});
				}
			};

			eventSource.onopen = () => {
				console.log(`${type} log stream connected`);
				error = null;
			};

			eventSource.onerror = (event) => {
				console.error('Log stream error:', event);
				error = `Connection to ${type} log stream lost`;
				isStreaming = false;

				// Try to get more specific error info
				if (eventSource?.readyState === EventSource.CLOSED) {
					error = `${type} log stream was closed by server`;
				}
			};
		} catch (err) {
			console.error('Failed to start log stream:', err);
			error = `Failed to connect to ${type} log stream`;
			isStreaming = false;
		}
	}

	export function stopLogStream() {
		if (eventSource) {
			console.log(`Stopping ${type} log stream`);
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

	function addLogEntry(logData: { level: string; message: string; timestamp?: string; service?: string; containerId?: string }) {
		const entry: LogEntry = {
			timestamp: logData.timestamp || new Date().toISOString(),
			level: logData.level as LogEntry['level'],
			message: logData.message,
			service: logData.service,
			containerId: logData.containerId
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
		const targetId = type === 'stack' ? stackId : containerId;
		if (targetId) {
			startLogStream();
		}
	});

	onDestroy(() => {
		stopLogStream();
	});

	$effect(() => {
		const targetId = type === 'stack' ? stackId : containerId;
		if (targetId && browser) {
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
					No {type} selected
				{:else if !isStreaming}
					No logs available. Start streaming to see logs.
				{:else}
					Waiting for logs...
				{/if}
			</div>
		{:else}
			{#each logs as log (log.timestamp + log.message + (log.service || ''))}
				<div class="flex px-3 py-1 hover:bg-gray-900/50 border-l-2 border-transparent hover:border-blue-500 transition-colors">
					{#if showTimestamps}
						<span class="text-gray-500 text-xs mr-3 flex-shrink-0 w-20">
							{formatTimestamp(log.timestamp)}
						</span>
					{/if}

					<span class="text-xs mr-2 flex-shrink-0 w-12 {getLevelClass(log.level)}">
						{log.level.toUpperCase()}
					</span>

					{#if type === 'stack' && log.service}
						<span class="text-blue-400 text-xs mr-2 flex-shrink-0 w-16 truncate" title={log.service}>
							{log.service}
						</span>
					{/if}

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
