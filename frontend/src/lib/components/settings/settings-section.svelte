<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import XIcon from '@lucide/svelte/icons/x';
	import { m } from '$lib/paraglide/messages';
	import type { Component, Snippet } from 'svelte';

	interface Props {
		title: string;
		description: string;
		icon: Component;
		isOverridden: boolean;
		isLoading?: boolean;
		onClearOverride: () => void;
		onEnableOverride: () => void;
		children?: Snippet;
	}

	let {
		title,
		description,
		icon: Icon,
		isOverridden,
		isLoading = false,
		onClearOverride,
		onEnableOverride,
		children
	}: Props = $props();
</script>

<div
	class={`rounded-lg border p-3 transition-colors ${isOverridden ? 'border-orange-500 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20' : 'bg-muted/30'}`}
>
	<div class="flex items-center justify-between gap-3">
		<div class="flex items-center gap-2">
			<div
				class={`flex size-8 flex-shrink-0 items-center justify-center rounded-lg ${isOverridden ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-primary/10 text-primary'}`}
			>
				<Icon class="size-4" />
			</div>
			<div>
				<h4 class="text-sm font-medium">{title}</h4>
				<p class="text-muted-foreground text-xs">
					{description}
				</p>
			</div>
		</div>
		{#if isOverridden}
			<Button variant="ghost" size="icon" class="size-7 flex-shrink-0" onclick={onClearOverride} disabled={isLoading}>
				<XIcon class="size-4" />
			</Button>
		{:else}
			<Button variant="outline" size="sm" onclick={onEnableOverride} disabled={isLoading}>
				{m.override()}
			</Button>
		{/if}
	</div>

	{#if isOverridden && children}
		<div class="mt-3">
			{@render children()}
		</div>
	{/if}
</div>
