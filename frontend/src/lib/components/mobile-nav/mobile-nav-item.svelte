<script lang="ts">
	import type { NavigationItem } from '$lib/config/navigation-config';
	import { cn } from '$lib/utils';
	import * as Button from '$lib/components/ui/button/index.js';

	let {
		item,
		active = false,
		showLabels = false,
		class: className = ''
	}: {
		item: NavigationItem;
		active?: boolean;
		showLabels?: boolean;
		class?: string;
	} = $props();
</script>

<Button.Root
	variant="ghost"
	size={showLabels ? "sm" : "icon"}
	href={item.url}
	aria-label={`${item.title}${active ? ' (current page)' : ''}`}
	aria-current={active ? 'page' : undefined}
	class={cn(
		'flex-1 transition-all duration-200 ease-out',
		'hover:bg-muted/50 hover:text-foreground hover:scale-[1.02]',
		'focus-visible:ring-1 focus-visible:ring-muted-foreground/50 focus-visible:ring-offset-1',
		'focus-visible:ring-offset-transparent focus-visible:scale-[1.02]',
		'active:scale-[0.98]',
		showLabels 
			? 'h-12 px-3 py-1.5 rounded-2xl flex-col gap-0.5 min-w-[60px]' 
			: 'h-11 w-11 rounded-2xl',
		active && 'bg-muted text-foreground hover:bg-muted/70 shadow-sm',
		className
	)}
	data-testid="mobile-nav-item"
>
	{@const IconComponent = item.icon}
	<IconComponent size={showLabels ? 20 : 24} aria-hidden="true" />
	{#if showLabels}
		<span class="text-[10px] font-normal leading-none text-muted-foreground">{item.title}</span>
	{:else}
		<span class="sr-only">{item.title}</span>
	{/if}
</Button.Root>
