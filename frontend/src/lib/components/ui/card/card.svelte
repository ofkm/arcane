<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'default',
		onclick,
		children,
		...restProps
	}: WithElementRef<
		HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'subtle' | 'outlined'; onclick?: (e: MouseEvent) => void }
	> = $props();

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

	function getVariantClasses(variant: 'default' | 'subtle' | 'outlined') {
		switch (variant) {
			case 'default':
				return 'bg-card/80 supports-[backdrop-filter]:bg-card/60 ring-border/40 shadow-sm backdrop-blur-sm dark:shadow-none';
			case 'subtle':
				return 'bg-muted/30 border-transparent';
			case 'outlined':
				return 'bg-card/80 supports-[backdrop-filter]:bg-card/60 border-border/50';
		}
	}
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		'text-card-foreground group relative isolate gap-0 overflow-hidden rounded-xl border p-0 transition-all duration-300',
		getVariantClasses(variant),
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
