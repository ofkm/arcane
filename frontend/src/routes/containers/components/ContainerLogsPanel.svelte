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

<div class="mb-8 flex flex-col gap-4 sm:hidden">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="bg-primary/10 rounded-lg p-2.5">
				<FileTextIcon class="text-primary size-6" />
			</div>
			<h2 class="text-foreground text-2xl font-bold tracking-tight">{m.containers_logs_title()}</h2>
		</div>
		{#if isStreaming}
			<div class="flex items-center gap-2">
				<div class="size-2.5 animate-pulse rounded-full bg-green-500"></div>
				<span class="text-sm font-semibold text-green-600">{m.common_live()}</span>
			</div>
		{/if}
	</div>

	<div class="flex items-center justify-between gap-4">
		<label class="flex items-center gap-3">
			<input type="checkbox" bind:checked={autoScroll} class="size-4" />
			<span class="text-sm font-medium">{m.common_autoscroll()}</span>
		</label>
		<div class="flex items-center gap-3">
			<Button variant="outline" size="sm" class="font-medium" onclick={() => viewer?.clearLogs()}>{m.common_clear()}</Button>
			{#if isStreaming}
				<Button variant="outline" size="sm" class="font-medium" onclick={() => viewer?.stopLogStream()}>
					{m.common_stop()}
				</Button>
			{:else}
				<Button variant="outline" size="sm" class="font-medium" onclick={() => viewer?.startLogStream()} disabled={!containerId}>
					{m.common_start()}
				</Button>
			{/if}
			<Button
				variant="outline"
				size="sm"
				class="font-medium"
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

<div class="mb-8 hidden items-center justify-between sm:flex">
	<div class="flex items-center gap-4">
		<div class="bg-muted/50 rounded-lg p-2.5">
			<FileTextIcon class="text-muted-foreground size-6" />
		</div>
		<h2 class="text-foreground text-2xl font-bold tracking-tight">{m.containers_logs_title()}</h2>
		{#if isStreaming}
			<div class="flex items-center gap-3">
				<div class="size-3 animate-pulse rounded-full bg-green-500"></div>
				<span class="text-base font-semibold text-green-600">{m.common_live()}</span>
			</div>
		{/if}
	</div>
	<div class="flex items-center gap-4">
		<label class="flex items-center gap-3">
			<input type="checkbox" bind:checked={autoScroll} class="size-4" />
			<span class="font-medium">{m.common_autoscroll()}</span>
		</label>
		<Button variant="outline" size="sm" class="font-medium" onclick={() => viewer?.clearLogs()}>{m.common_clear()}</Button>
		{#if isStreaming}
			<Button variant="outline" size="sm" class="font-medium" onclick={() => viewer?.stopLogStream()}>{m.common_stop()}</Button>
		{:else}
			<Button variant="outline" size="sm" class="font-medium" onclick={() => viewer?.startLogStream()} disabled={!containerId}>
				{m.common_start()}
			</Button>
		{/if}
		<Button
			variant="outline"
			size="sm"
			class="font-medium"
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

<Card.Root>
	<Card.Content class="p-0">
		<LogViewer
			bind:this={viewer}
			bind:autoScroll
			type="container"
			{containerId}
			maxLines={500}
			showTimestamps={true}
			height="calc(100vh - 280px)"
			onStart={handleStart}
			onStop={handleStop}
			onClear={handleClear}
			onToggleAutoScroll={handleToggleAutoScroll}
		/>
	</Card.Content>
</Card.Root>
