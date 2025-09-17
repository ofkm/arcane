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

<div class="mb-3 flex items-center justify-between">
	<div class="flex items-center gap-2">
		<TerminalIcon class="size-5" />
		<h2 class="text-xl font-semibold">{m.compose_logs_title()}</h2>
	</div>
	<div class="flex items-center gap-3">
		<label class="flex items-center gap-2">
			<input type="checkbox" bind:checked={autoScroll} class="size-4" />
			{m.common_autoscroll()}
		</label>
		<Button variant="outline" size="sm" onclick={() => viewer?.clearLogs()}>{m.common_clear()}</Button>
		{#if isStreaming}
			<div class="flex items-center gap-2">
				<div class="size-2 animate-pulse rounded-full bg-green-500"></div>
				<span class="text-sm font-medium text-green-600">{m.common_live()}</span>
			</div>
			<Button variant="outline" size="sm" onclick={() => viewer?.stopLogStream()}>{m.common_stop()}</Button>
		{:else}
			<Button variant="outline" size="sm" onclick={() => viewer?.startLogStream()} disabled={!projectId}>
				{m.common_start()}
			</Button>
		{/if}
		<Button
			variant="outline"
			size="sm"
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

<Card.Root class="overflow-hidden border">
	<Card.Content class="p-0">
		<div class="w-full overflow-hidden">
			<LogViewer
				bind:this={viewer}
				bind:autoScroll
				{projectId}
				type="project"
				maxLines={500}
				showTimestamps={true}
				height="600px"
				{onStart}
				{onStop}
				{onClear}
				{onToggleAutoScroll}
			/>
		</div>
	</Card.Content>
</Card.Root>
