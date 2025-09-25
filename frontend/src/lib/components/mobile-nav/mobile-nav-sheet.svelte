<script lang="ts">
	import { navigationItems } from '$lib/config/navigation-config';
	import type { NavigationItem } from '$lib/config/navigation-config';
	import { cn } from '$lib/utils';
	import { SwipeGestureDetector, type SwipeDirection } from '$lib/hooks/use-swipe-gesture.svelte';
	import { page } from '$app/state';
	import userStore from '$lib/stores/user-store';
	import { m } from '$lib/paraglide/messages';
	import { onMount } from 'svelte';
	import MobileUserCard from './mobile-user-card.svelte';

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

	// Interaction state
	interface InteractionState {
		isDragging: boolean;
		dragDistance: number;
		startY: number;
		currentY: number;
		inputType: 'touch' | 'wheel' | 'none';
		isAtScrollTop: boolean;
		isAtScrollBottom: boolean;
		canDragToClose: boolean;
		dragStartedFromHandle: boolean;
	}

	let interaction = $state<InteractionState>({
		isDragging: false,
		dragDistance: 0,
		startY: 0,
		currentY: 0,
		inputType: 'none',
		isAtScrollTop: true,
		isAtScrollBottom: false,
		canDragToClose: false,
		dragStartedFromHandle: false
	});

	let maxSheetHeight = $state(0);
	let resetTimeout: ReturnType<typeof setTimeout> | null = null;
	let isClosing = $state(false);

	// Physics configuration
	const PHYSICS = {
		closeThreshold: 0.3, // 30% of sheet height
		resistanceFactor: 0.8, // Resistance when dragging
		velocityThreshold: 0.5, // Minimum velocity for quick close
		snapAnimationDuration: 200, // ms
		wheelSensitivity: 2.0, // Wheel scroll sensitivity (higher for trackpads)
		resetDelay: 150 // ms before resetting wheel state
	} as const;

	$effect(() => {
		const unsub = userStore.subscribe((u) => (storeUser = u));
		return unsub;
	});

	// Use memoized values defined later for better performance
	const currentPath = $derived(page.url.pathname);

	// Physics functions
	function updateScrollPosition() {
		if (!menuElement) return;

		const scrollTop = menuElement.scrollTop;
		const scrollHeight = menuElement.scrollHeight;
		const clientHeight = menuElement.clientHeight;

		interaction.isAtScrollTop = scrollTop === 0;
		interaction.isAtScrollBottom = Math.abs(scrollHeight - clientHeight - scrollTop) <= 2;

		// Calculate max sheet height (85vh as per CSS)
		maxSheetHeight = Math.min(window.innerHeight * 0.85, clientHeight);
	}

	function calculateDragDistance(currentY: number): number {
		const deltaY = currentY - interaction.startY;
		if (deltaY <= 0) return 0;

		// Apply consistent resistance curve for all input types
		const rawDistance = deltaY * PHYSICS.resistanceFactor;
		return Math.min(rawDistance, maxSheetHeight * 0.8);
	}

	function shouldCloseSheet(distance: number, velocity: number = 0): boolean {
		const thresholdDistance = maxSheetHeight * PHYSICS.closeThreshold;
		return distance > thresholdDistance || velocity > PHYSICS.velocityThreshold;
	}

	function resetInteractionState() {
		interaction.isDragging = false;
		interaction.dragDistance = 0;
		interaction.startY = 0;
		interaction.currentY = 0;
		interaction.inputType = 'none';
		interaction.canDragToClose = false;
		interaction.dragStartedFromHandle = false;

		if (resetTimeout) {
			clearTimeout(resetTimeout);
			resetTimeout = null;
		}
	}

	function provideFeedback(type: 'grab' | 'close' | 'reset' | 'tap' = 'tap') {
		if (!('vibrate' in navigator)) return;

		const patterns = {
			grab: 5,
			close: 20,
			reset: 10,
			tap: 10
		};

		navigator.vibrate(patterns[type]);
	}

	// Touch handling
	function handleTouchStart(e: TouchEvent) {
		if (!open || !menuElement || isClosing) return;

		const touch = e.touches[0];
		const target = e.target as HTMLElement;
		const isOnHandle = target.closest('[data-drag-handle]');

		// Check current scroll position in real-time
		const currentScrollTop = menuElement.scrollTop;
		const isAtScrollTop = currentScrollTop === 0;

		// Initialize interaction state
		interaction.startY = touch.clientY;
		interaction.currentY = touch.clientY;
		interaction.inputType = 'touch';
		interaction.dragStartedFromHandle = !!isOnHandle;

		// Determine if we can drag to close (handle always works, content only at scroll top)
		interaction.canDragToClose = !!isOnHandle || isAtScrollTop;

		if (interaction.canDragToClose) {
			interaction.isDragging = true;
			provideFeedback('grab');
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (!open || isClosing || !interaction.isDragging) return;

		const touch = e.touches[0];
		interaction.currentY = touch.clientY;

		// For handle-based drags, always allow
		// For content-based drags, ensure we're still at scroll top
		let canContinueDrag = interaction.dragStartedFromHandle;

		if (!interaction.dragStartedFromHandle) {
			const currentScrollTop = menuElement.scrollTop;
			const isAtScrollTop = currentScrollTop === 0;
			canContinueDrag = isAtScrollTop;
		}

		// Calculate drag distance using unified physics
		const newDistance = calculateDragDistance(interaction.currentY);

		// Only update if dragging downward and we can continue the drag
		if (newDistance > 0 && canContinueDrag) {
			interaction.dragDistance = newDistance;
			e.preventDefault();
		} else if (interaction.currentY < interaction.startY || !canContinueDrag) {
			// Reset if dragging upward or conditions no longer allow dragging
			resetInteractionState();
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!interaction.isDragging || interaction.inputType !== 'touch') return;

		const deltaY = interaction.currentY - interaction.startY;
		const dragVelocity = Math.abs(deltaY) / (performance.now() - (e.timeStamp || Date.now()));

		// Use unified physics to determine if sheet should close
		if (shouldCloseSheet(interaction.dragDistance, dragVelocity)) {
			closeSheet();
		} else {
			// Provide reset feedback if significant drag occurred
			if (interaction.dragDistance > 30) {
				provideFeedback('reset');
			}
			resetInteractionState();
		}
	}

	// Unified wheel handling
	function handleWheel(e: WheelEvent) {
		if (!open || !menuElement || isClosing) return;

		// Check current scroll position in real-time
		const currentScrollTop = menuElement.scrollTop;
		const isAtScrollTop = currentScrollTop === 0;
		const isScrollingUp = e.deltaY < 0;

		// Only handle wheel drag when exactly at scroll top AND scrolling up
		if (isAtScrollTop && isScrollingUp) {
			// Initialize wheel interaction if not already active
			if (interaction.inputType === 'none') {
				interaction.inputType = 'wheel';
				interaction.startY = 0; // Virtual start position for wheel
				interaction.canDragToClose = true;
				interaction.isDragging = true;
				interaction.dragDistance = 0; // Reset accumulated distance
			}

			// Only accumulate if we're still at the top and in wheel mode
			if (interaction.inputType === 'wheel' && isAtScrollTop) {
				const wheelDistance = Math.abs(e.deltaY) * PHYSICS.wheelSensitivity;

				// For wheel events, we accumulate raw distance and apply resistance directly
				const rawDistance = interaction.dragDistance + wheelDistance;
				const resistedDistance = rawDistance * PHYSICS.resistanceFactor;
				interaction.dragDistance = Math.min(resistedDistance, maxSheetHeight * 0.8);

				e.preventDefault();

				// Check if should close using unified physics
				if (shouldCloseSheet(interaction.dragDistance)) {
					closeSheet();
					return;
				}

				// Schedule reset after wheel stops
				scheduleReset();
			}
		} else {
			// Reset when conditions change (not at top or not scrolling up)
			if (interaction.inputType === 'wheel') {
				resetInteractionState();
			}
		}
	}

	function scheduleReset() {
		if (resetTimeout) {
			clearTimeout(resetTimeout);
		}
		resetTimeout = setTimeout(() => {
			if (interaction.inputType === 'wheel') {
				resetInteractionState();
			}
		}, PHYSICS.resetDelay);
	}

	function closeSheet() {
		isClosing = true;
		provideFeedback('close');

		// Reset all interaction states immediately
		resetInteractionState();

		// Close immediately - let CSS transitions handle the smooth animation
		open = false;
		isClosing = false;
	}

	// Swipe gesture to close menu (keep existing horizontal swipes)
	const swipeDetector = new SwipeGestureDetector(
		(direction: SwipeDirection) => {
			if ((direction === 'left' || direction === 'right') && open) {
				open = false;
			}
		},
		{ threshold: 60, velocity: 0.4 }
	);

	$effect(() => {
		if (menuElement) {
			swipeDetector.setElement(menuElement);

			// Add scroll listener
			menuElement.addEventListener('scroll', updateScrollPosition, { passive: true });

			// Add touch listeners for drag-to-close with optimized passive settings
			menuElement.addEventListener('touchstart', handleTouchStart, { passive: true });
			menuElement.addEventListener('touchmove', handleTouchMove, { passive: false }); // Needs to prevent default
			menuElement.addEventListener('touchend', handleTouchEnd, { passive: true });

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
				provideFeedback('close');
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
				// Disable momentum scrolling to prevent glidy feeling when closing
				(menuElement.style as any).webkitOverflowScrolling = 'auto';
				menuElement.style.touchAction = 'pan-y'; // Allow vertical scrolling only

				// Focus the menu container itself for accessibility without highlighting specific elements
				requestAnimationFrame(() => {
					menuElement.focus();
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
		provideFeedback('tap');
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
			'bg-background/20 fixed inset-0 z-40 backdrop-blur-md',
			interaction.isDragging && !isClosing ? 'transition-none' : 'transition-opacity duration-200'
		)}
		style={`
			${interaction.isDragging && !isClosing ? `opacity: ${Math.max(0.1, 1 - interaction.dragDistance / 400)};` : ''}
			touch-action: manipulation;
		`}
		onclick={() => {
			provideFeedback('close');
			open = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				provideFeedback('close');
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
		'bg-background/60 border-border/30 fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t shadow-sm backdrop-blur-xl',
		'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
		'max-h-[85vh] overflow-y-auto overscroll-contain',
		open ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
		interaction.isDragging && !isClosing ? 'transition-none' : ''
	)}
	style={`
		touch-action: pan-y; 
		-webkit-overflow-scrolling: touch;
		${
			interaction.isDragging && !isClosing
				? `transform: translateY(${interaction.dragDistance}px); opacity: ${Math.max(0.3, 1 - interaction.dragDistance / 300)};`
				: ''
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
				'h-1.5 w-10 rounded-full transition-all duration-150',
				interaction.isDragging && !isClosing ? 'bg-muted-foreground/50 h-2 w-12' : 'bg-muted-foreground/20',
				'hover:bg-muted-foreground/30 active:bg-muted-foreground/50'
			)}
			style={`transform: ${interaction.isDragging && !isClosing ? 'scale(1.15)' : 'scale(1)'};
				transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 150ms ease;`}
		></div>
	</div>

	<div class="px-6 pb-8">
		<!-- User Profile Section -->
		{#if memoizedUser}
			<MobileUserCard user={memoizedUser} class="mb-6" />
		{/if}

		<!-- Navigation Sections -->
		<div class="space-y-8">
			<!-- Management -->
			<section>
				<h4 class="text-muted-foreground/70 mb-4 px-3 text-[11px] font-bold tracking-widest uppercase">
					{m.sidebar_management()}
				</h4>
				<div class="space-y-2">
					{#each navigationItems.managementItems as item}
						{@const IconComponent = item.icon}
						<a
							href={item.url}
							onclick={() => handleItemClick(item)}
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
					{/each}
				</div>
			</section>

			<!-- Customization -->
			<section>
				<h4 class="text-muted-foreground/70 mb-4 px-3 text-[11px] font-bold tracking-widest uppercase">
					{m.sidebar_customization()}
				</h4>
				<div class="space-y-2">
					{#each navigationItems.customizationItems as item}
						{@const IconComponent = item.icon}
						<a
							href={item.url}
							onclick={() => handleItemClick(item)}
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
					{/each}
				</div>
			</section>

			<!-- Admin Sections -->
			{#if memoizedIsAdmin}
				<!-- Environments -->
				{#if navigationItems.environmentItems}
					<section>
						<h4 class="text-muted-foreground/70 mb-4 px-3 text-[11px] font-bold tracking-widest uppercase">
							{m.sidebar_environments()}
						</h4>
						<div class="space-y-2">
							{#each navigationItems.environmentItems as item}
								{@const IconComponent = item.icon}
								<a
									href={item.url}
									onclick={() => handleItemClick(item)}
									class={cn(
										'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-out',
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
						<h4 class="text-muted-foreground/70 mb-4 px-3 text-[11px] font-bold tracking-widest uppercase">
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
												'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-out',
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
										onclick={() => handleItemClick(item)}
										class={cn(
											'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-out',
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
			<div class="border-border/30 mt-6 border-t pt-4">
				<div class="text-muted-foreground/60 text-center text-xs">
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
		div[data-testid='mobile-nav-sheet'] {
			overscroll-behavior: contain;
		}
	}

	/* Remove focus outline from dialog container since it's focused for accessibility */
	div[data-testid='mobile-nav-sheet']:focus {
		outline: none;
	}

	/* Respect reduced motion preferences */
	@media (prefers-reduced-motion: reduce) {
		div[data-testid='mobile-nav-sheet'] {
			transition: none;
		}

		/* Instantly show/hide without animation */
		div[data-testid='mobile-nav-sheet']:not([aria-hidden='true']) {
			transform: translateY(0);
			opacity: 1;
		}

		div[data-testid='mobile-nav-sheet'][aria-hidden='true'] {
			transform: translateY(100%);
			opacity: 0;
		}
	}
</style>
