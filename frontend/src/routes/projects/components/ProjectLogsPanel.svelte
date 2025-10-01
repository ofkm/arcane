<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import LogViewer from '$lib/components/log-viewer.svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		projectId,
		autoScroll = $bindable()
	}: {
		projectId: string;
		autoScroll: boolean;
	} = $props();

	let isStreaming = $state(false);
	let viewer = $state<LogViewer>();

	function onStart() {
		isStreaming = true;
	}
	function onStop() {
		isStreaming = false;
	}
	function onClear() {}
	function onToggleAutoScroll() {}
</script>

<Card.Root class="gap-0 p-0">
	<Card.Header class="bg-muted rounded-t-xl p-4">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-2">
				<TerminalIcon class="text-primary size-5" />
				<Card.Title class="text-lg">{m.compose_logs_title()}</Card.Title>
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
						<Button
							variant="outline"
							size="sm"
							class="text-xs font-medium"
							onclick={() => viewer?.startLogStream()}
							disabled={!projectId}
						>
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
		<Card.Description>Real-time project logs</Card.Description>
	</Card.Header>
	<Card.Content class="p-0">
		<LogViewer
			bind:this={viewer}
			bind:autoScroll
			{projectId}
			type="project"
			maxLines={500}
			showTimestamps={true}
			height="calc(100vh - 320px)"
			{onStart}
			{onStop}
			{onClear}
			{onToggleAutoScroll}
		/>
	</Card.Content>
</Card.Root>
