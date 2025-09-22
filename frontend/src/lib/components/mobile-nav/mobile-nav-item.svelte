<script lang="ts">
	import type { NavigationItem } from '$lib/config/navigation-config';
	import { cn } from '$lib/utils';
	import * as Button from '$lib/components/ui/button/index.js';

	let {
		item,
		active = false,
		class: className = ''
	}: {
		item: NavigationItem;
		active?: boolean;
		class?: string;
	} = $props();
</script>

<Button.Root
	variant="ghost"
	size="icon"
	href={item.url}
	aria-label={`${item.title}${active ? ' (current page)' : ''}`}
	aria-current={active ? 'page' : undefined}
	class={cn(
		'h-12 w-12 rounded-full transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
		'hover:bg-accent hover:text-accent-foreground hover:scale-105',
		'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
		'focus-visible:ring-offset-background focus-visible:scale-105',
		'active:scale-95',
		active && 'bg-primary text-primary-foreground hover:bg-primary/90',
		className
	)}
	data-testid="mobile-nav-item"
>
	{@const IconComponent = item.icon}
	<IconComponent size={24} aria-hidden="true" />
	<span class="sr-only">{item.title}</span>
</Button.Root>
