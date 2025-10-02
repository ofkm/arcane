<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		onclick,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement> & { onclick?: (e: MouseEvent) => void }> = $props();

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
		'bg-card/80 supports-[backdrop-filter]:bg-card/60 ring-border/40 text-card-foreground group relative isolate gap-0 overflow-hidden rounded-xl border p-0 shadow-sm backdrop-blur-sm transition-all duration-300 dark:shadow-none',
		onclick
			? '[&:not(:has(button:hover,a:hover,[role=button]:hover))]:hover:bg-muted/50 cursor-pointer [&:not(:has(button:hover,a:hover,[role=button]:hover))]:hover:shadow-md'
			: '',
		className
	)}
	onclick={onclick ? handleClick : undefined}
	{...restProps}
>
	{@render children?.()}
</div>
