<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import LogViewer from '$lib/components/log-viewer.svelte';
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
		onStart();
	}

	function handleStop() {
		isStreaming = false;
		onStop();
	}

	function handleClear() {
		onClear();
	}

	function handleToggleAutoScroll() {
		onToggleAutoScroll();
	}
</script>

<Card.Root class="gap-0 p-0">
	<Card.Header class="bg-muted rounded-t-xl p-4">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-2">
				<FileTextIcon class="text-primary size-5" />
				<Card.Title class="text-lg">
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
			
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={autoScroll} class="size-4" />
					<span class="text-sm font-medium">{m.common_autoscroll()}</span>
				</label>
				
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" class="text-xs font-medium" onclick={() => viewer?.clearLogs()}>
						{m.common_clear()}
					</Button>
					{#if isStreaming}
						<Button variant="outline" size="sm" class="text-xs font-medium" onclick={() => viewer?.stopLogStream()}>
							{m.common_stop()}
						</Button>
					{:else}
						<Button variant="outline" size="sm" class="text-xs font-medium" onclick={() => viewer?.startLogStream()} disabled={!containerId}>
							{m.common_start()}
						</Button>
					{/if}
					<Button
						variant="outline"
						size="sm"
						class="px-2"
						onclick={() => {
							viewer?.stopLogStream();
							viewer?.startLogStream();
						}}
						aria-label="Refresh logs"
						title="Refresh"
					>
						<RefreshCwIcon class="size-4" />
					</Button>
				</div>
			</div>
		</div>
		<Card.Description>{m.containers_logs_description()}</Card.Description>
	</Card.Header>
	<Card.Content class="p-0">
		<div class="rounded-lg border bg-card/50 p-0">
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
				onToggleAutoScroll={handleToggleAutoScroll}
			/>
		</div>
	</Card.Content>
</Card.Root>
