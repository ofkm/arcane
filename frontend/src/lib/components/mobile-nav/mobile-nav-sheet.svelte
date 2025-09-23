<script lang="ts">
	import { navigationItems } from '$lib/config/navigation-config';
	import type { NavigationItem } from '$lib/config/navigation-config';
	import { cn } from '$lib/utils';
	import { SwipeGestureDetector, type SwipeDirection } from '$lib/hooks/use-swipe-gesture.svelte';
	import { page } from '$app/state';
	import userStore from '$lib/stores/user-store';
	import { m } from '$lib/paraglide/messages';
	import * as Button from '$lib/components/ui/button/index.js';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import { onMount } from 'svelte';

	let {
		open = $bindable(false),
		user = null,
		versionInformation = null
	}: {
		open: boolean;
		user?: any;
		versionInformation?: any;
	} = $props();

	let menuElement: HTMLElement;
	let storeUser: any = $state(null);
	
	// Bottom sheet drag state
	let isDragging = $state(false);
	let dragStartY = $state(0);
	let currentDragY = $state(0);
	let dragTranslateY = $state(0);
	let isAtScrollTop = $state(true);
	let isAtScrollBottom = $state(false);
	let isOverscrolling = $state(false);
	let overscrollStartY = $state(0);
	let maxSheetHeight = $state(0);
	
	// Trackpad/wheel scroll state
	let wheelCloseThreshold = $state(0);
	let lastWheelTime = $state(0);
	let isWheelDragging = $state(false);
	let wheelResetTimeout: ReturnType<typeof setTimeout> | null = null;
	let wheelStartedAtTop = $state(false);
	let isClosing = $state(false);
	
	$effect(() => {
		const unsub = userStore.subscribe((u) => (storeUser = u));
		return unsub;
	});
	
	// Use memoized values defined later for better performance
	const currentPath = $derived(page.url.pathname);

	// Track scroll position for bottom sheet behavior
	function updateScrollPosition() {
		if (!menuElement) return;
		
		const scrollTop = menuElement.scrollTop;
		const scrollHeight = menuElement.scrollHeight;
		const clientHeight = menuElement.clientHeight;
		
		isAtScrollTop = scrollTop <= 2; // Small tolerance for smooth scrolling
		isAtScrollBottom = Math.abs(scrollHeight - clientHeight - scrollTop) <= 2;
		
		// Calculate max sheet height (85vh as per CSS)
		maxSheetHeight = Math.min(window.innerHeight * 0.85, clientHeight);
	}

	// Enhanced touch handling for overscroll sheet behavior
	function handleTouchStart(e: TouchEvent) {
		if (!open || !menuElement) return;
		
		const touch = e.touches[0];
		dragStartY = touch.clientY;
		currentDragY = touch.clientY;
		overscrollStartY = touch.clientY;
		
		// Check if touch is on the handle
		const target = e.target as HTMLElement;
		const isOnHandle = target.closest('[data-drag-handle]');
		
		// Always enable dragging for handle, or prepare for potential overscroll
		if (isOnHandle) {
			isDragging = true;
			isOverscrolling = false;
		} else {
			isDragging = false;
			isOverscrolling = false;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (!open || isClosing) return;
		
		const touch = e.touches[0];
		currentDragY = touch.clientY;
		const deltaY = currentDragY - dragStartY;
		
		// Check if we're on the drag handle
		const isOnHandle = e.target && (e.target as HTMLElement).closest('[data-drag-handle]');
		
		// Handle drag handle behavior (always works)
		if (isDragging && isOnHandle && deltaY > 0) {
			dragTranslateY = deltaY;
			e.preventDefault();
			return;
		}
		
		// Handle overscroll behavior
		if (!isDragging && !isOnHandle) {
			// Check for overscroll conditions
			const canOverscrollDown = isAtScrollTop && deltaY > 0; // Trying to scroll up when at top
			const canOverscrollUp = isAtScrollBottom && deltaY < 0; // Trying to scroll down when at bottom
			
			if (canOverscrollDown) {
				// Start overscroll drag
				if (!isOverscrolling) {
					isOverscrolling = true;
					overscrollStartY = touch.clientY;
					isDragging = true;
				}
				
				// Calculate drag distance from overscroll start
				const overscrollDelta = touch.clientY - overscrollStartY;
				if (overscrollDelta > 0) {
					dragTranslateY = overscrollDelta * 0.6; // Add some resistance
					e.preventDefault();
				}
			}
		}
		
		// Reset drag if moving upward and not on handle
		if (deltaY < 0 && !isOnHandle) {
			dragTranslateY = 0;
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!isDragging) return;
		
		const deltaY = currentDragY - dragStartY;
		
		// Calculate half of max sheet height for snap close
		const snapCloseThreshold = maxSheetHeight * 0.5;
		
		// Close if dragged down more than half the max height
		const shouldClose = dragTranslateY > snapCloseThreshold;
		
		if (shouldClose) {
			closeSheet();
		} else {
			// Reset drag state only if not closing
			isDragging = false;
			dragTranslateY = 0;
			dragStartY = 0;
			currentDragY = 0;
			isOverscrolling = false;
			overscrollStartY = 0;
		}
	}

	// Handle trackpad/wheel scrolling for overscroll behavior
	function handleWheel(e: WheelEvent) {
		if (!open || !menuElement || isClosing) return;
		
		const now = Date.now();
		const timeDelta = now - lastWheelTime;
		lastWheelTime = now;
		
		const scrollTop = menuElement.scrollTop;
		const isAtTop = scrollTop <= 1;
		const isScrollingUp = e.deltaY < 0; // Negative deltaY means scrolling up
		
		// Reset threshold on new gesture (gap > 100ms indicates new gesture)
		if (timeDelta > 100) {
			wheelCloseThreshold = 0;
			isWheelDragging = false;
		}
		
		// Check for overscroll condition - trying to scroll up when at top
		const canOverscroll = isAtTop && isScrollingUp;
		
		if (canOverscroll) {
			// Accumulate overscroll attempts
			wheelCloseThreshold += Math.abs(e.deltaY);
			
			// Start visual feedback after small threshold
			if (wheelCloseThreshold > 15) {
				isWheelDragging = true;
				// Scale down for wheel input and apply resistance
				const dragDistance = Math.min((wheelCloseThreshold - 15) * 0.4, maxSheetHeight * 0.6);
				dragTranslateY = dragDistance;
				
				// Prevent page scroll
				e.preventDefault();
				
				// Close if dragged past half max height
				const snapCloseThreshold = maxSheetHeight * 0.5;
				if (dragDistance > snapCloseThreshold) {
					closeSheet();
				} else {
					// Auto-reset if no more wheel events
					scheduleWheelReset();
				}
			}
		} else {
			// Reset if conditions not met
			resetWheelState();
		}
	}
	
	function resetWheelState() {
		wheelCloseThreshold = 0;
		isWheelDragging = false;
		if (!isDragging && !isClosing) {
			dragTranslateY = 0;
		}
		if (wheelResetTimeout) {
			clearTimeout(wheelResetTimeout);
			wheelResetTimeout = null;
		}
	}
	
	function closeSheet() {
		isClosing = true;
		// Don't reset visual state immediately - let the closing animation handle it
		// Just reset the interaction states
		isWheelDragging = false;
		isDragging = false;
		isOverscrolling = false;
		overscrollStartY = 0;
		
		// Close immediately - let CSS transitions handle the smooth animation
		open = false;
		
		// Reset remaining state after animation completes
		setTimeout(() => {
			dragTranslateY = 0;
			isClosing = false;
		}, 500); // Match the CSS transition duration
	}
	
	// Auto-reset wheel state after inactivity
	function scheduleWheelReset() {
		if (wheelResetTimeout) {
			clearTimeout(wheelResetTimeout);
		}
		wheelResetTimeout = setTimeout(() => {
			resetWheelState();
		}, 200);
	}

	// Swipe gesture to close menu (keep existing horizontal swipes)
	const swipeDetector = new SwipeGestureDetector((direction: SwipeDirection) => {
		if ((direction === 'left' || direction === 'right') && open) {
			open = false;
		}
	}, { threshold: 60, velocity: 0.4 });

	$effect(() => {
		if (menuElement) {
			swipeDetector.setElement(menuElement);
			
			// Add scroll listener
			menuElement.addEventListener('scroll', updateScrollPosition, { passive: true });
			
			// Add touch listeners for drag-to-close
			menuElement.addEventListener('touchstart', handleTouchStart, { passive: false });
			menuElement.addEventListener('touchmove', handleTouchMove, { passive: false });
			menuElement.addEventListener('touchend', handleTouchEnd, { passive: false });
			
			// Add wheel listener for trackpad/mouse wheel support
			menuElement.addEventListener('wheel', handleWheel, { passive: false });
			
			// Initial scroll position check
			updateScrollPosition();
			
			return () => {
				menuElement.removeEventListener('scroll', updateScrollPosition);
				menuElement.removeEventListener('touchstart', handleTouchStart);
				menuElement.removeEventListener('touchmove', handleTouchMove);
				menuElement.removeEventListener('touchend', handleTouchEnd);
				menuElement.removeEventListener('wheel', handleWheel);
			};
		}
	});

	// Handle keyboard navigation
	onMount(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!open) return;
			
			if (e.key === 'Escape') {
				e.preventDefault();
				open = false;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	// Focus management and body scroll prevention for accessibility
	$effect(() => {
		if (open) {
			// Prevent body scroll when menu is open but allow menu content to scroll
			const originalOverflow = document.body.style.overflow;
			const originalPosition = document.body.style.position;
			const originalTop = document.body.style.top;
			const originalWidth = document.body.style.width;
			const scrollY = window.scrollY;
			
			// Properly lock the body while preserving menu scrollability
			document.body.style.overflow = 'hidden';
			document.body.style.position = 'fixed';
			document.body.style.top = `-${scrollY}px`;
			document.body.style.width = '100%';
			document.body.style.left = '0';
			document.body.style.right = '0';
			
			// Ensure the menu element can scroll independently
			if (menuElement) {
				// Reset any overflow restrictions that might interfere
				menuElement.style.overflowY = 'auto';
				(menuElement.style as any).webkitOverflowScrolling = 'touch';
				menuElement.style.touchAction = 'pan-y'; // Allow vertical scrolling only
				
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
				document.body.style.width = originalWidth;
				document.body.style.left = '';
				document.body.style.right = '';
				
				// Restore scroll position
				window.scrollTo(0, scrollY);
				
				// Clean up menu styles
				if (menuElement) {
					menuElement.style.overflowY = '';
					(menuElement.style as any).webkitOverflowScrolling = '';
					menuElement.style.touchAction = '';
				}
			};
		}
	});

	// Memoize the effective user computation
	const memoizedUser = $derived.by(() => user ?? storeUser);
	const memoizedIsAdmin = $derived.by(() => !!memoizedUser?.roles?.includes('admin'));

	function handleItemClick(item: NavigationItem) {
		// Close menu when navigating
		open = false;
	}

	function isActiveItem(item: NavigationItem): boolean {
		return currentPath === item.url || currentPath.startsWith(item.url + '/');
	}
</script>

<!-- Backdrop -->
{#if open}
	<div
		class={cn(
			"fixed inset-0 z-40 bg-background/20 backdrop-blur-md",
			(isDragging || isWheelDragging || isOverscrolling) && !isClosing ? "transition-none" : "transition-opacity duration-300"
		)}
		style={`
			${(isDragging || isWheelDragging || isOverscrolling) && !isClosing ? 
				`opacity: ${Math.max(0.1, 1 - (dragTranslateY / 400))};` : 
				''
			}
			touch-action: manipulation;
		`}
		onclick={() => open = false}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				open = false;
			}
		}}
		ontouchstart={(e) => {
			// Only prevent if touch is outside menu area
			if (!menuElement || !menuElement.contains(e.target as Node)) {
				e.preventDefault();
			}
		}}
		ontouchmove={(e) => {
			// Only prevent if touch is outside menu area
			if (!menuElement || !menuElement.contains(e.target as Node)) {
				e.preventDefault();
			}
		}}
		aria-hidden="true"
		role="presentation"
	></div>
{/if}

<!-- Menu Content -->
<div
	bind:this={menuElement}
	class={cn(
		'fixed inset-x-0 bottom-0 z-50 bg-background/60 backdrop-blur-xl rounded-t-3xl border-t border-border/30 shadow-sm',
		'transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
		'max-h-[85vh] overflow-y-auto overscroll-contain',
		open ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
		(isDragging || isWheelDragging || isOverscrolling) && !isClosing ? 'transition-none' : ''
	)}
	style={`
		touch-action: pan-y; 
		-webkit-overflow-scrolling: touch;
		${(isDragging || isWheelDragging || isOverscrolling) && !isClosing ? 
			`transform: translateY(${dragTranslateY}px); opacity: ${Math.max(0.3, 1 - (dragTranslateY / 300))};` : 
			''
		}
	`}
	data-testid="mobile-nav-sheet"
	role="dialog"
	aria-modal="true"
	aria-label="Main navigation sheet"
	aria-hidden={!open}
	tabindex={open ? 0 : -1}
>
	<!-- Handle indicator -->
	<div class="flex justify-center pt-4 pb-3" data-drag-handle>
		<div 
			class={cn(
				"w-10 h-1.5 rounded-full transition-all duration-200",
				(isDragging || isWheelDragging || isOverscrolling) && !isClosing ? "bg-muted-foreground/40 w-12 h-2" : "bg-muted-foreground/20",
				"hover:bg-muted-foreground/30 active:bg-muted-foreground/40"
			)}
			style={`transform: ${(isDragging || isWheelDragging || isOverscrolling) && !isClosing ? 'scale(1.1)' : 'scale(1)'}`}
		></div>
	</div>

	<div class="px-6 pb-8">
		<!-- User Profile Section -->
		{#if memoizedUser}
			<div class="flex items-center gap-4 p-5 mb-6 bg-muted/30 rounded-3xl border border-border/20">
				<div class="w-14 h-14 bg-muted/50 rounded-2xl flex items-center justify-center">
					<span class="text-xl font-semibold text-foreground">
						{memoizedUser.username?.charAt(0).toUpperCase() || 'U'}
					</span>
				</div>
				<div class="flex-1">
					<h3 class="font-semibold text-foreground text-lg">{memoizedUser.username || 'User'}</h3>
					<p class="text-sm text-muted-foreground/80">
						{memoizedUser.roles?.join(', ') || 'User'}
					</p>
				</div>
				<form action="/auth/logout" method="POST">
					<Button.Root
						variant="ghost"
						size="icon"
						type="submit"
						title={m.common_logout()}
						class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-12 w-12 rounded-2xl transition-all duration-200 hover:scale-105"
					>
						<LogOutIcon size={18} />
					</Button.Root>
				</form>
			</div>
		{/if}

		<!-- Navigation Sections -->
		<div class="space-y-8">
			<!-- Management -->
			<section>
				<h4 class="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-4 px-3">
					{m.sidebar_management()}
				</h4>
				<div class="space-y-2">
					{#each navigationItems.managementItems as item}
						{@const IconComponent = item.icon}
						<a
							href={item.url}
							onclick={() => handleItemClick(item)}
							class={cn(
								'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ease-out',
								'focus-visible:ring-1 focus-visible:ring-muted-foreground/50 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent hover:scale-[1.01]',
								isActiveItem(item)
									? 'bg-muted text-foreground hover:bg-muted/70 shadow-sm'
									: 'text-foreground hover:bg-muted/50'
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
				<h4 class="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-4 px-3">
					{m.sidebar_customization()}
				</h4>
				<div class="space-y-2">
					{#each navigationItems.customizationItems as item}
						{@const IconComponent = item.icon}
						<a
							href={item.url}
							onclick={() => handleItemClick(item)}
							class={cn(
								'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ease-out',
								'focus-visible:ring-1 focus-visible:ring-muted-foreground/50 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent hover:scale-[1.01]',
								isActiveItem(item)
									? 'bg-muted text-foreground hover:bg-muted/70 shadow-sm'
									: 'text-foreground hover:bg-muted/50'
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
						<h4 class="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-4 px-3">
							{m.sidebar_environments()}
						</h4>
						<div class="space-y-2">
							{#each navigationItems.environmentItems as item}
								{@const IconComponent = item.icon}
								<a
									href={item.url}
									onclick={() => handleItemClick(item)}
									class={cn(
										'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ease-out',
										isActiveItem(item)
											? 'bg-muted text-foreground hover:bg-muted/70 shadow-sm'
											: 'text-foreground hover:bg-muted/50'
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
						<h4 class="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-4 px-3">
							{m.sidebar_administration()}
						</h4>
						<div class="space-y-2">
							{#each navigationItems.settingsItems as item}
								{#if item.items}
									<!-- Settings with subitems -->
									{@const IconComponent = item.icon}
									<div class="space-y-2">
										<a
											href={item.url}
											onclick={() => handleItemClick(item)}
											class={cn(
												'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ease-out',
												isActiveItem(item)
													? 'bg-muted text-foreground hover:bg-muted/70 shadow-sm'
													: 'text-foreground hover:bg-muted/50'
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
														'flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition-all duration-200 ease-out',
														'focus-visible:ring-1 focus-visible:ring-muted-foreground/50 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent hover:scale-[1.01]',
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
										onclick={() => handleItemClick(item)}
										class={cn(
											'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ease-out',
											isActiveItem(item)
												? 'bg-muted text-foreground hover:bg-muted/70 shadow-sm'
												: 'text-foreground hover:bg-muted/50'
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
			<div class="mt-8 pt-6 border-t border-border/30">
				<div class="text-center text-xs text-muted-foreground/60">
					<p class="font-medium">Arcane v{versionInformation.currentVersion}</p>
					{#if versionInformation.updateAvailable}
						<p class="text-primary/80 mt-1 font-medium">Update available</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Ensure smooth scrolling and prevent overscroll issues */
	@supports (overscroll-behavior: contain) {
		div[data-testid="mobile-nav-sheet"] {
			overscroll-behavior: contain;
		}
	}

	/* Respect reduced motion preferences */
	@media (prefers-reduced-motion: reduce) {
		div[data-testid="mobile-nav-sheet"] {
			transition: none;
		}
		
		/* Instantly show/hide without animation */
		div[data-testid="mobile-nav-sheet"]:not([aria-hidden="true"]) {
			transform: translateY(0);
			opacity: 1;
		}
		
		div[data-testid="mobile-nav-sheet"][aria-hidden="true"] {
			transform: translateY(100%);
			opacity: 0;
		}
	}
</style>
