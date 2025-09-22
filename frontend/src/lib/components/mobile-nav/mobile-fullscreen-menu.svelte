<script lang="ts">
	import { navigationItems } from '$lib/config/navigation-config';
	import type { NavigationItem } from '$lib/config/navigation-config';
	import { mobileNavStore } from '$lib/stores/mobile-nav-store';
	import { cn } from '$lib/utils';
	import { SwipeGestureDetector, type SwipeDirection } from '$lib/hooks/use-swipe-gesture.svelte';
	import { page } from '$app/state';
	import userStore from '$lib/stores/user-store';
	import { m } from '$lib/paraglide/messages';
	import * as Button from '$lib/components/ui/button/index.js';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import { onMount } from 'svelte';

	let {
		open = false,
		user = null,
		versionInformation = null
	}: {
		open: boolean;
		user?: any;
		versionInformation?: any;
	} = $props();

	let menuElement: HTMLElement;
	let storeUser: any = $state(null);
	
	$effect(() => {
		const unsub = userStore.subscribe((u) => (storeUser = u));
		return unsub;
	});
	
	// Use memoized values defined later for better performance
	const currentPath = $derived(page.url.pathname);

	// Swipe gesture to close menu
	const swipeDetector = new SwipeGestureDetector((direction: SwipeDirection) => {
		if ((direction === 'left' || direction === 'right') && open) {
			mobileNavStore.setMenuOpen(false);
		}
	}, { threshold: 60, velocity: 0.4 });

	$effect(() => {
		if (menuElement) {
			swipeDetector.setElement(menuElement);
		}
	});

	// Handle scroll to top to close menu and keyboard navigation
	onMount(() => {
		const handleScroll = () => {
			if (open && window.scrollY <= 0) {
				// User is trying to over-scroll at the top
				const scrollThreshold = -20; // Allow some over-scroll
				if (window.scrollY < scrollThreshold) {
					mobileNavStore.setMenuOpen(false);
				}
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (!open) return;
			
			if (e.key === 'Escape') {
				e.preventDefault();
				mobileNavStore.setMenuOpen(false);
			}
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('keydown', handleKeyDown);
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	// Focus management and body scroll prevention for accessibility
	$effect(() => {
		if (open) {
			// Prevent body scroll when menu is open
			const originalOverflow = document.body.style.overflow;
			const originalPosition = document.body.style.position;
			const originalTop = document.body.style.top;
			const scrollY = window.scrollY;
			
			document.body.style.overflow = 'hidden';
			document.body.style.position = 'fixed';
			document.body.style.top = `-${scrollY}px`;
			document.body.style.width = '100%';
			
			if (menuElement) {
				// Focus the menu when opened - use requestAnimationFrame for better performance
				requestAnimationFrame(() => {
					const firstFocusable = menuElement.querySelector('a, button') as HTMLElement;
					if (firstFocusable) {
						firstFocusable.focus();
					}
				});
			}
			
			return () => {
				// Restore body scroll when menu closes
				document.body.style.overflow = originalOverflow;
				document.body.style.position = originalPosition;
				document.body.style.top = originalTop;
				document.body.style.width = '';
				window.scrollTo(0, scrollY);
			};
		}
	});

	// Memoize the effective user computation
	const memoizedUser = $derived.by(() => user ?? storeUser);
	const memoizedIsAdmin = $derived.by(() => !!memoizedUser?.roles?.includes('admin'));

	function handleItemClick(item: NavigationItem) {
		// Close menu when navigating
		mobileNavStore.setMenuOpen(false);
	}

	function isActiveItem(item: NavigationItem): boolean {
		return currentPath === item.url || currentPath.startsWith(item.url + '/');
	}
</script>

<!-- Backdrop -->
{#if open}
	<div
		class="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-300 touch-none"
		onclick={() => mobileNavStore.setMenuOpen(false)}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				mobileNavStore.setMenuOpen(false);
			}
		}}
		ontouchstart={(e) => e.preventDefault()}
		ontouchmove={(e) => e.preventDefault()}
		aria-hidden="true"
		role="presentation"
		style="touch-action: none;"
	></div>
{/if}

<!-- Menu Content -->
<div
	bind:this={menuElement}
	class={cn(
		'fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl border-t border-border shadow-2xl',
		'transform transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
		'max-h-[85vh] overflow-y-auto overscroll-contain',
		open ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
	)}
	data-testid="mobile-fullscreen-menu"
	role="dialog"
	aria-modal="true"
	aria-label="Main navigation menu"
	aria-hidden={!open}
	tabindex={open ? 0 : -1}
>
	<!-- Handle indicator -->
	<div class="flex justify-center pt-3 pb-2">
		<div class="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
	</div>

	<div class="px-6 pb-6">
		<!-- User Profile Section -->
		{#if memoizedUser}
			<div class="flex items-center gap-4 p-4 mb-6 bg-muted/50 rounded-2xl">
				<div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
					<span class="text-lg font-medium text-primary">
						{memoizedUser.username?.charAt(0).toUpperCase() || 'U'}
					</span>
				</div>
				<div class="flex-1">
					<h3 class="font-medium text-foreground">{memoizedUser.username || 'User'}</h3>
					<p class="text-sm text-muted-foreground">
						{memoizedUser.roles?.join(', ') || 'User'}
					</p>
				</div>
				<form action="/auth/logout" method="POST">
					<Button.Root
						variant="ghost"
						size="icon"
						type="submit"
						title={m.common_logout()}
						class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 w-10 rounded-xl"
					>
						<LogOutIcon size={18} />
					</Button.Root>
				</form>
			</div>
		{/if}

		<!-- Navigation Sections -->
		<div class="space-y-6">
			<!-- Management -->
			<section>
				<h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
					{m.sidebar_management()}
				</h4>
				<div class="space-y-1">
					{#each navigationItems.managementItems as item}
						{@const IconComponent = item.icon}
						<a
							href={item.url}
							onclick={() => handleItemClick(item)}
							class={cn(
								'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
								'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
								isActiveItem(item)
									? 'bg-primary text-primary-foreground'
									: 'text-foreground hover:bg-muted/70'
							)}
							aria-current={isActiveItem(item) ? 'page' : undefined}
						>
							<IconComponent size={20} />
							<span>{item.title}</span>
						</a>
					{/each}
				</div>
			</section>

			<!-- Customization -->
			<section>
				<h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
					{m.sidebar_customization()}
				</h4>
				<div class="space-y-1">
					{#each navigationItems.customizationItems as item}
						{@const IconComponent = item.icon}
						<a
							href={item.url}
							onclick={() => handleItemClick(item)}
							class={cn(
								'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
								'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
								isActiveItem(item)
									? 'bg-primary text-primary-foreground'
									: 'text-foreground hover:bg-muted/70'
							)}
							aria-current={isActiveItem(item) ? 'page' : undefined}
						>
							<IconComponent size={20} />
							<span>{item.title}</span>
						</a>
					{/each}
				</div>
			</section>

			<!-- Admin Sections -->
			{#if memoizedIsAdmin}
				<!-- Environments -->
				{#if navigationItems.environmentItems}
					<section>
						<h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
							{m.sidebar_environments()}
						</h4>
						<div class="space-y-1">
							{#each navigationItems.environmentItems as item}
								{@const IconComponent = item.icon}
								<a
									href={item.url}
									onclick={() => handleItemClick(item)}
									class={cn(
										'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
										isActiveItem(item)
											? 'bg-primary text-primary-foreground'
											: 'text-foreground hover:bg-muted/70'
									)}
								>
									<IconComponent size={20} />
									<span>{item.title}</span>
								</a>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Administration -->
				{#if navigationItems.settingsItems}
					<section>
						<h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
							{m.sidebar_administration()}
						</h4>
						<div class="space-y-1">
							{#each navigationItems.settingsItems as item}
								{#if item.items}
									<!-- Settings with subitems -->
									{@const IconComponent = item.icon}
									<div class="space-y-1">
										<a
											href={item.url}
											onclick={() => handleItemClick(item)}
											class={cn(
												'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
												isActiveItem(item)
													? 'bg-primary text-primary-foreground'
													: 'text-foreground hover:bg-muted/70'
											)}
										>
											<IconComponent size={20} />
											<span>{item.title}</span>
										</a>
										<!-- Sub-items -->
										<div class="ml-6 space-y-1">
											{#each item.items as subItem}
												{@const SubIconComponent = subItem.icon}
												<a
													href={subItem.url}
													onclick={() => handleItemClick(subItem)}
													class={cn(
														'flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors',
														'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
														isActiveItem(subItem)
															? 'bg-primary/80 text-primary-foreground'
															: 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
										onclick={() => handleItemClick(item)}
										class={cn(
											'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
											isActiveItem(item)
												? 'bg-primary text-primary-foreground'
												: 'text-foreground hover:bg-muted/70'
										)}
									>
										<IconComponent size={20} />
										<span>{item.title}</span>
									</a>
								{/if}
							{/each}
						</div>
					</section>
				{/if}
			{/if}
		</div>

		<!-- Version Information -->
		{#if versionInformation}
			<div class="mt-8 pt-6 border-t border-border">
				<div class="text-center text-xs text-muted-foreground">
					<p>Arcane v{versionInformation.version}</p>
					{#if versionInformation.updateAvailable}
						<p class="text-primary mt-1">Update available</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Ensure smooth scrolling and prevent overscroll issues */
	@supports (overscroll-behavior: contain) {
		div[data-testid="mobile-fullscreen-menu"] {
			overscroll-behavior: contain;
		}
	}

	/* Respect reduced motion preferences */
	@media (prefers-reduced-motion: reduce) {
		div[data-testid="mobile-fullscreen-menu"] {
			transition: none;
		}
		
		/* Instantly show/hide without animation */
		div[data-testid="mobile-fullscreen-menu"]:not([aria-hidden="true"]) {
			transform: translateY(0);
			opacity: 1;
		}
		
		div[data-testid="mobile-fullscreen-menu"][aria-hidden="true"] {
			transform: translateY(100%);
			opacity: 0;
		}
	}
</style>
