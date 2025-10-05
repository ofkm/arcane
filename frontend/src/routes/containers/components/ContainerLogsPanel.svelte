<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import LogViewer from '$lib/components/logs/log-viewer.svelte';
	import LogControls from '$lib/components/logs/log-controls.svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		containerId,
		autoScroll = $bindable(),
		onStart,
		onStop,
		onClear,
		onToggleAutoScroll
	}: {
		containerId: string | undefined;
		autoScroll: boolean;
		onStart: () => void;
		onStop: () => void;
		onClear: () => void;
		onToggleAutoScroll: () => void;
	} = $props();

	let isStreaming = $state(false);
	let viewer = $state<LogViewer>();

	function handleStart() {
		isStreaming = true;
		viewer?.startLogStream();
		onStart();
	}

	function handleStop() {
		isStreaming = false;
		viewer?.stopLogStream();
	}

	function handleClear() {
		viewer?.clearLogs();
		onClear();
	}

	function handleRefresh() {
		viewer?.stopLogStream();
		viewer?.startLogStream();
	}
</script>

<Card.Root>
	<Card.Header icon={FileTextIcon}>
		<div class="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center gap-2">
					<Card.Title>
						<h2>
							{m.containers_logs_title()}
						</h2>
					</Card.Title>
					{#if isStreaming}
						<div class="flex items-center gap-2">
							<div class="size-2 animate-pulse rounded-full bg-green-500"></div>
							<span class="text-xs font-semibold text-green-600 sm:text-sm">{m.common_live()}</span>
						</div>
					{/if}
				</div>
				<Card.Description>{m.containers_logs_description()}</Card.Description>
			</div>
			<LogControls
				bind:autoScroll
				{isStreaming}
				disabled={!containerId}
				onStart={handleStart}
				onStop={handleStop}
				onClear={handleClear}
				onRefresh={handleRefresh}
			/>
		</div>
	</Card.Header>
	<Card.Content class="p-0">
		<div class="bg-card/50 rounded-lg border p-0">
			<LogViewer
				bind:this={viewer}
				bind:autoScroll
				type="container"
				{containerId}
				maxLines={500}
				showTimestamps={true}
				height="calc(100vh - 320px)"
				onStart={handleStart}
				onStop={handleStop}
				onClear={handleClear}
			/>
		</div>
	</Card.Content>
</Card.Root>
