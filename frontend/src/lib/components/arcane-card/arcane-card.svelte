<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		onclick,
		children
	}: {
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children?: any;
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

<Card.Root
	class={cn(
		'bg-card/80 supports-[backdrop-filter]:bg-card/60 ring-border/40 group relative isolate gap-0 overflow-hidden p-0 backdrop-blur-sm transition-all duration-300 dark:shadow-none',
		onclick ? 'cursor-pointer [&:not(:has(button:hover,a:hover,[role=button]:hover))]:hover:bg-muted/50 [&:not(:has(button:hover,a:hover,[role=button]:hover))]:hover:shadow-md' : '',
		className
	)}
	onclick={onclick ? handleClick : undefined}
>
	{@render children?.()}
</Card.Root>
