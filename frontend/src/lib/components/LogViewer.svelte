<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	interface LogEntry {
		timestamp: string;
		level: 'stdout' | 'stderr' | 'info' | 'error';
		message: string;
		service?: string;
		containerId?: string;
	}

	interface Props {
		containerId?: string | null;
		stackId?: string | null;
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

	let {
		containerId = null,
		stackId = null,
		type = 'container',
		maxLines = 1000,
		autoScroll = $bindable(true),
		showTimestamps = true,
		height = '400px',
		onClear,
		onToggleAutoScroll,
		onStart,
		onStop
	}: Props = $props();

	let logs: LogEntry[] = $state([]);
	let logContainer: HTMLElement | undefined = $state();
	let isStreaming = $state(false);
	let error: string | null = $state(null);
	let eventSource: EventSource | null = null;

	export function startLogStream() {
		const targetId = type === 'stack' ? stackId : containerId;

		if (!targetId || !browser) return;

		try {
			isStreaming = true;
			error = null;
			onStart?.();

			const endpoint =
				type === 'stack'
					? `/api/stacks/${stackId}/logs/stream?follow=true&tail=100&timestamps=${showTimestamps}`
					: `/api/containers/${containerId}/logs/stream?follow=true&tail=100&timestamps=${showTimestamps}`;

			eventSource = new EventSource(endpoint);

			eventSource.addEventListener('log', (event) => {
				try {
					const logData = JSON.parse(event.data);

					if (logData.message !== undefined) {
						// Stack log format
						addLogEntry({
							level: logData.level || 'info',
							message: logData.message,
							timestamp: logData.timestamp || new Date().toISOString(),
							service: logData.service,
							containerId: logData.containerId
						});
					} else if (logData.data !== undefined) {
						// Container log format
						addLogEntry({
							level: logData.data.includes('[STDERR]') ? 'stderr' : 'stdout',
							message: logData.data.replace('[STDERR] ', ''),
							timestamp: logData.timestamp || new Date().toISOString(),
							service: logData.service,
							containerId: logData.containerId
						});
					}
				} catch (parseError) {
					console.error('Failed to parse log event data:', parseError, 'Raw data:', event.data);
					addLogEntry({
						level: 'info',
						message: event.data,
						timestamp: new Date().toISOString()
					});
				}
			});

			// Handle container logs (come as default messages)
			eventSource.onmessage = (event) => {
				try {
					const logData = JSON.parse(event.data);

					if (logData.data) {
						addLogEntry({
							level: logData.data.includes('[STDERR]') ? 'stderr' : 'stdout',
							message: logData.data.replace('[STDERR] ', ''),
							timestamp: logData.timestamp || new Date().toISOString(),
							service: logData.service,
							containerId: logData.containerId
						});
					} else {
						addLogEntry({
							level: logData.level || 'info',
							message: logData.message || logData.data || event.data,
							timestamp: logData.timestamp || new Date().toISOString(),
							service: logData.service,
							containerId: logData.containerId
						});
					}
				} catch (parseError) {
					console.error('Failed to parse log data:', parseError, 'Raw data:', event.data);
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

	export function getIsStreaming() {
		return isStreaming;
	}

	export function getLogCount() {
		return logs.length;
	}

	function addLogEntry(logData: {
		level: string;
		message: string;
		timestamp?: string;
		service?: string;
		containerId?: string;
	}) {
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

<div class="log-viewer rounded-md border bg-black text-white">
	{#if error}
		<div class="border-b border-red-700 bg-red-900/20 p-3 text-sm text-red-200">
			{error}
		</div>
	{/if}

	<div
		bind:this={logContainer}
		class="log-viewer overflow-y-auto rounded-lg border bg-black font-mono text-sm text-white"
		style="height: {height}"
	>
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
				<div
					class="flex border-l-2 border-transparent px-3 py-1 transition-colors hover:border-blue-500 hover:bg-gray-900/50"
				>
					{#if showTimestamps}
						<span class="mr-3 w-20 shrink-0 text-xs text-gray-500">
							{formatTimestamp(log.timestamp)}
						</span>
					{/if}

					<span class="mr-2 w-12 shrink-0 text-xs {getLevelClass(log.level)}">
						{log.level.toUpperCase()}
					</span>

					{#if type === 'stack' && log.service}
						<span class="mr-2 w-16 shrink-0 truncate text-xs text-blue-400" title={log.service}>
							{log.service}
						</span>
					{/if}

					<span class="break-all whitespace-pre-wrap text-gray-300">
						{log.message}
					</span>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.log-viewer {
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
	}
</style>
