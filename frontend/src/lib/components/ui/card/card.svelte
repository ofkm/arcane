<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		onclick,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		onclick?: (e: MouseEvent) => void;
	} = $props();

	function handleClick(e: MouseEvent) {
		if (onclick) {
			// Check if the clicked element is interactive (button, link, or has onclick)
			const target = e.target as HTMLElement;
			const isInteractive = target.closest('button, a, [onclick], [role="button"]');

			if (!isInteractive) {
				onclick(e);
			}
		}
	}
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		'bg-card/80 supports-[backdrop-filter]:bg-card/60 text-card-foreground flex flex-col rounded-xl border ring-border/40 group relative isolate overflow-hidden backdrop-blur-sm transition-all duration-300 dark:shadow-none',
		onclick ? 'cursor-pointer [&:not(:has(button:hover,a:hover,[role=button]:hover))]:hover:bg-muted/50 [&:not(:has(button:hover,a:hover,[role=button]:hover))]:hover:shadow-md' : 'shadow-sm',
		className
	)}
	onclick={onclick ? handleClick : undefined}
	{...restProps}
>
	{@render children?.()}
</div>
