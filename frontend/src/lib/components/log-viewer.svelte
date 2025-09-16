<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { dev } from '$app/environment';
	import { get } from 'svelte/store';
	import { environmentStore } from '$lib/stores/environment.store';
	import { m } from '$lib/paraglide/messages';

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
	const humanType = type === 'stack' ? m.common_stack() : m.common_container();

	const DOCKER_TS_ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z?\s*/;
	const DOCKER_TS_SLASH_RE = /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s*/;

	async function buildLogStreamEndpoint(): Promise<string> {
		await environmentStore.ready;
		const currentEnvironment = get(environmentStore.selected);
		const envId = currentEnvironment?.id || 'local';

		const baseEndpoint =
			type === 'stack'
				? `/api/environments/${envId}/stacks/${stackId}/logs/stream`
				: `/api/environments/${envId}/containers/${containerId}/logs/stream`;

		return `${baseEndpoint}?follow=true&tail=100&timestamps=${showTimestamps}`;
	}

	export async function startLogStream() {
		const targetId = type === 'stack' ? stackId : containerId;

		if (!targetId) return;

		try {
			isStreaming = true;
			error = null;
			onStart?.();

			const endpoint = await buildLogStreamEndpoint();

			eventSource = new EventSource(endpoint);

			eventSource.addEventListener('log', (event) => {
				try {
					const logData = JSON.parse(event.data);

					if (logData.message !== undefined) {
						addLogEntry({
							level: logData.level || 'info',
							message: logData.message,
							timestamp: logData.timestamp || new Date().toISOString(),
							service: logData.service,
							containerId: logData.containerId
						});
					} else if (logData.data !== undefined) {
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
				if (dev) console.log(m.log_viewer_connected({ type: humanType }));
				error = null;
			};

			eventSource.onerror = (event) => {
				console.error('Log stream error:', event);
				error = m.log_stream_connection_lost({ type: humanType });
				isStreaming = false;

				if (eventSource?.readyState === EventSource.CLOSED) {
					error = m.log_stream_closed_by_server({ type: humanType });
				}
			};
		} catch (err) {
			console.error('Failed to start log stream:', err);
			error = m.log_stream_failed_connect({ type: humanType });
			isStreaming = false;
		}
	}

	export function stopLogStream() {
		if (eventSource) {
			if (dev) console.log(m.log_viewer_stopping({ type: humanType }));
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

	function addLogEntry(logData: { level: string; message: string; timestamp?: string; service?: string; containerId?: string }) {
		let cleanMessage = logData.message;
		let timestamp = logData.timestamp || new Date().toISOString();

		if (DOCKER_TS_ISO_RE.test(cleanMessage)) {
			cleanMessage = cleanMessage.replace(DOCKER_TS_ISO_RE, '').trim();
		}
		if (DOCKER_TS_SLASH_RE.test(cleanMessage)) {
			cleanMessage = cleanMessage.replace(DOCKER_TS_SLASH_RE, '').trim();
		}

		const entry: LogEntry = {
			timestamp,
			level: logData.level as LogEntry['level'],
			message: cleanMessage,
			service: logData.service,
			containerId: logData.containerId
		};

		logs = [...logs.slice(-(maxLines - 1)), entry];

		if (autoScroll && logContainer) {
			requestAnimationFrame(() => {
				if (logContainer) {
					logContainer.scrollTop = logContainer.scrollHeight;
				}
			});
		}
	}

	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
			if (logContainer) {
				logContainer.scrollTop = logContainer.scrollHeight;
			}
		}
	});

	onDestroy(() => {
		stopLogStream();
	});

	$effect(() => {
		const targetId = type === 'stack' ? stackId : containerId;
		if (targetId) {
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
		role="log"
		aria-live={isStreaming ? 'polite' : 'off'}
		aria-relevant="additions"
		aria-busy={isStreaming}
		tabindex="-1"
		data-auto-scroll={autoScroll}
		data-is-streaming={isStreaming}
	>
		{#if logs.length === 0}
			<div class="p-4 text-center text-gray-500">
				{#if !containerId}
					{m.log_viewer_no_selection({ type: humanType })}
				{:else if !isStreaming}
					{m.log_viewer_no_logs_available()}
				{:else}
					{m.log_viewer_waiting_for_logs()}
				{/if}
			</div>
		{:else}
			{#each logs as log (log.timestamp + log.message + (log.service || ''))}
				<div class="flex border-l-2 border-transparent px-3 py-1 transition-colors hover:border-blue-500 hover:bg-gray-900/50">
					{#if showTimestamps}
						<span class="mr-3 min-w-fit shrink-0 text-xs text-gray-500">
							{formatTimestamp(log.timestamp)}
						</span>
					{/if}

					<span class="mr-2 shrink-0 text-xs {getLevelClass(log.level)} min-w-fit">
						{log.level.toUpperCase()}
					</span>

					{#if type === 'stack' && log.service}
						<span class="mr-2 min-w-fit shrink-0 truncate text-xs text-blue-400" title={log.service}>
							{log.service}
						</span>
					{/if}

					<span class="flex-1 whitespace-pre-wrap break-words text-gray-300">
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
