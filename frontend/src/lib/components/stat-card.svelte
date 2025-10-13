<script lang="ts">
	import { cn } from '$lib/utils.js';
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

<div
	class={cn(
		'bg-card hover:bg-accent/50 group flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors',
		className
	)}
>
	<div class="flex-1 space-y-1">
		<p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</p>
		<p class="text-xl font-bold tabular-nums">{value}</p>
		{#if subtitle}
			<p class="text-muted-foreground text-xs">{subtitle}</p>
		{/if}
	</div>
	<div class="flex-shrink-0 rounded-md p-2 transition-colors {bgColor} group-hover:scale-105">
		<Icon class="{iconColor} size-4" />
	</div>
</div>
