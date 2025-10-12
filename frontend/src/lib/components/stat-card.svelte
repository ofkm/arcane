<script lang="ts">
	import * as Item from '$lib/components/ui/item/index.js';
	import type { Icon as IconType } from '@lucide/svelte';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		title: string;
		value: string | number;
		icon: typeof IconType;
		iconColor?: string;
		bgColor?: string;
		subtitle?: string;
		class?: ClassValue;
	}

	let {
		title,
		value,
		icon: Icon,
		iconColor = 'text-primary',
		bgColor = 'bg-primary/10',
		subtitle,
		class: className
	}: Props = $props();
</script>

<Item.Root variant="outline" class={className}>
	<Item.Media>
		<div class="rounded-md p-2 transition-colors {bgColor}">
			<Icon class="{iconColor} size-5" />
		</div>
	</Item.Media>
	<Item.Content>
		<Item.Title class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
			{title}
		</Item.Title>
		<Item.Description class="text-foreground text-xl font-bold tabular-nums">
			{value}
		</Item.Description>
		{#if subtitle}
			<p class="text-muted-foreground mt-1 text-xs">{subtitle}</p>
		{/if}
	</Item.Content>
</Item.Root>
