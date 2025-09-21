<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { mobileNavigationItems } from '$lib/config/navigation-config';
	import type { NavigationItem } from '$lib/config/navigation-config';
	import { Button } from '$lib/components/ui/button/index.js';

	const isActive = (item: NavigationItem) => {
		return page.url.pathname === item.url || page.url.pathname.startsWith(item.url + '/');
	};

	const handleNavigation = (url: string) => {
		goto(url);
	};
</script>

<div class="flex items-center justify-around px-1 sm:px-2 py-1.5 sm:py-3">
	{#each mobileNavigationItems as item}
		<Button
			variant="ghost"
			class="flex flex-col items-center justify-center flex-1 min-w-0 h-full py-2 px-1 text-xs font-medium transition-all duration-200 rounded-xl mx-0.5 {isActive(item)
				? 'text-foreground bg-muted/80 shadow-sm'
				: 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}"
			onclick={() => handleNavigation(item.url)}
		>
			{@const IconComponent = item.icon}
			<IconComponent class="flex-shrink-0 size-[16px] sm:size-[20px]" />
			<span class="truncate w-full leading-none text-center text-[10px] sm:text-xs">{item.title}</span>
		</Button>
	{/each}
</div>
