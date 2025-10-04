<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import { m } from '$lib/paraglide/messages';

	let {
		autoScroll = $bindable(),
		isStreaming = false,
		disabled = false,
		onStart,
		onStop,
		onClear,
		onRefresh
	}: {
		autoScroll: boolean;
		isStreaming?: boolean;
		disabled?: boolean;
		onStart?: () => void;
		onStop?: () => void;
		onClear?: () => void;
		onRefresh?: () => void;
	} = $props();
</script>

<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
	<label class="flex items-center gap-2">
		<input type="checkbox" bind:checked={autoScroll} class="size-4" />
		<span class="text-sm font-medium">{m.common_autoscroll()}</span>
	</label>

	<div class="flex items-center gap-2">
		<Button variant="outline" size="sm" class="text-xs font-medium" onclick={onClear}>
			{m.common_clear()}
		</Button>
		{#if isStreaming}
			<Button variant="outline" size="sm" class="text-xs font-medium" onclick={onStop}>
				{m.common_stop()}
			</Button>
		{:else}
			<Button variant="outline" size="sm" class="text-xs font-medium" onclick={onStart} {disabled}>
				{m.common_start()}
			</Button>
		{/if}
		<Button variant="outline" size="sm" class="px-2" onclick={onRefresh} aria-label="Refresh logs" title="Refresh">
			<RefreshCwIcon class="size-4" />
		</Button>
	</div>
</div>
