<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import type { Icon as IconType } from '@lucide/svelte';
	import { page } from '$app/state';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';

	let {
		items,
		label
	}: {
		label: string;
		items: {
			title: string;
			url: string;
			icon?: typeof IconType;
			items?: {
				title: string;
				url: string;
				icon?: typeof IconType;
			}[];
		}[];
	} = $props();

	const sidebar = useSidebar();

	function isActiveItem(url: string): boolean {
		return page.url.pathname === url || (page.url.pathname.startsWith(url) && url !== '/');
	}

	function hasActiveChild(items?: { url: string }[]): boolean {
		return items?.some((child) => isActiveItem(child.url)) ?? false;
	}

	const enhancedItems = $derived(
		items.map((item) => {
			const isItemActive = isActiveItem(item.url);
			const hasActiveSubItem = hasActiveChild(item.items);
			const isActive = isItemActive || hasActiveSubItem;

			return {
				...item,
				isActive,
				items: item.items?.map((subItem) => ({
					...subItem,
					isActive: isActiveItem(subItem.url)
				}))
			};
		})
	);
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>{label}</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each enhancedItems as item (item.title)}
			{#if (item.items?.length ?? 0) > 0}
				<Collapsible.Root open={item.isActive || (sidebar.state === 'collapsed' && sidebar.isHovered)} class="group/collapsible">
					{#snippet child({ props })}
						<Sidebar.MenuItem {...props}>
							<Collapsible.Trigger>
								{#snippet child({ props })}
									{@const Icon = item.icon}
									<Sidebar.MenuButton tooltipContent={item.title} isActive={item.isActive}>
										{#snippet child({ props })}
											<a href={item.url} {...props}>
												{#if item.icon}
													<Icon />
												{/if}
												<span>{item.title}</span>
												<ChevronRightIcon
													class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
												/>
											</a>
										{/snippet}
									</Sidebar.MenuButton>
								{/snippet}
							</Collapsible.Trigger>
							<Collapsible.Content>
								<Sidebar.MenuSub
									class={sidebar.state === 'collapsed' && !sidebar.isHovered ? 'hidden' : undefined}
								>
									{#each item.items ?? [] as subItem (subItem.title)}
										<Sidebar.MenuSubItem>
											<Sidebar.MenuSubButton isActive={subItem.isActive}>
												{#snippet child({ props })}
													{@const SubIcon = subItem.icon}
													<a href={subItem.url} {...props}>
														{#if subItem.icon}
															<SubIcon />
														{/if}
														<span>{subItem.title}</span>
													</a>
												{/snippet}
											</Sidebar.MenuSubButton>
										</Sidebar.MenuSubItem>
									{/each}
								</Sidebar.MenuSub>
							</Collapsible.Content>
						</Sidebar.MenuItem>
					{/snippet}
				</Collapsible.Root>
			{:else}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={item.isActive} tooltipContent={item.title}>
						{#snippet child({ props })}
							{@const Icon = item.icon}
							<a href={item.url} {...props}>
								{#if item.icon}
									<Icon />
								{/if}
								<span>{item.title}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/if}
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
