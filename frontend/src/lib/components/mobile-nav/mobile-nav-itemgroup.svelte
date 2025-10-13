<script lang="ts">
	import type { NavigationItem } from '$lib/config/navigation-config';
	import { cn } from '$lib/utils';
	import { page } from '$app/state';

	let {
		label,
		items,
		onItemClick
	}: {
		label: string;
		items: NavigationItem[];
		onItemClick: (item: NavigationItem) => void;
	} = $props();

	const currentPath = $derived(page.url.pathname);

	function isActiveItem(item: NavigationItem): boolean {
		return currentPath === item.url || currentPath.startsWith(item.url + '/');
	}
</script>

<section>
	<h4 class="text-muted-foreground/70 mb-4 px-3 text-[11px] font-bold tracking-widest uppercase">
		{label}
	</h4>
	<div class="space-y-2">
		{#each items as item}
			{#if item.items && item.items.length > 0}
				{@const IconComponent = item.icon}
				<div class="space-y-2">
					<a
						href={item.url}
						onclick={() => onItemClick(item)}
						class={cn(
							'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-out',
							'focus-visible:ring-muted-foreground/50 hover:scale-[1.01] focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
							isActiveItem(item) ? 'bg-muted text-foreground hover:bg-muted/70 shadow-sm' : 'text-foreground hover:bg-muted/50'
						)}
						aria-current={isActiveItem(item) ? 'page' : undefined}
					>
						<IconComponent size={20} />
						<span>{item.title}</span>
					</a>
					<div class="ml-6 space-y-1">
						{#each item.items as subItem}
							{@const SubIconComponent = subItem.icon}
							<a
								href={subItem.url}
								onclick={() => onItemClick(subItem)}
								class={cn(
									'flex items-center gap-3 rounded-xl px-4 py-2 text-sm transition-all duration-200 ease-out',
									'focus-visible:ring-muted-foreground/50 hover:scale-[1.01] focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
									isActiveItem(subItem)
										? 'bg-muted/70 text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
								)}
								aria-current={isActiveItem(subItem) ? 'page' : undefined}
							>
								<SubIconComponent size={16} />
								<span>{subItem.title}</span>
							</a>
						{/each}
					</div>
				</div>
			{:else}
				{@const IconComponent = item.icon}
				<a
					href={item.url}
					onclick={() => onItemClick(item)}
					class={cn(
						'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-out',
						'focus-visible:ring-muted-foreground/50 hover:scale-[1.01] focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
						isActiveItem(item) ? 'bg-muted text-foreground hover:bg-muted/70 shadow-sm' : 'text-foreground hover:bg-muted/50'
					)}
					aria-current={isActiveItem(item) ? 'page' : undefined}
				>
					<IconComponent size={20} />
					<span>{item.title}</span>
				</a>
			{/if}
		{/each}
	</div>
</section>
