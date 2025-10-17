<script lang="ts">
	import { navigationItems } from '$lib/config/navigation-config';
	import type { NavigationItem } from '$lib/config/navigation-config';
	import { cn } from '$lib/utils';
	import { SwipeGestureDetector, type SwipeDirection } from '$lib/hooks/use-swipe-gesture.svelte';
	import { page } from '$app/state';
	import userStore from '$lib/stores/user-store';
	import { m } from '$lib/paraglide/messages';
	import { onMount, tick } from 'svelte';
	import MobileUserCard from './mobile-user-card.svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		open = $bindable(false),
		user = null,
		versionInformation = null,
		navigationMode = 'floating'
	}: {
		open: boolean;
		user?: any;
		versionInformation?: any;
		navigationMode?: 'floating' | 'docked';
	} = $props();

	let menuElement = $state<HTMLElement | undefined>(undefined);
	let storeUser: any = $state(null);

	// Interaction state
	interface InteractionState {
		isDragging: boolean;
		dragDistance: number;
		startY: number;
		startX: number;
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
		startX: 0,
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
		interaction.startX = 0;
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

		// Don't interfere with interactive elements
		if (target.closest('button, a, input, select, textarea, [role="button"]')) {
			return;
		}

		const isOnHandle = target.closest('[data-drag-handle]');

		// Check current scroll position in real-time
		const currentScrollTop = menuElement.scrollTop;
		const isAtScrollTop = currentScrollTop === 0;

		// Initialize interaction state but don't start dragging yet
		interaction.startY = touch.clientY;
		interaction.startX = touch.clientX;
		interaction.currentY = touch.clientY;
		interaction.inputType = 'touch';
		interaction.dragStartedFromHandle = !!isOnHandle;

		// Determine if we can drag to close (handle always qualifies, otherwise needs to be at top)
		interaction.canDragToClose = !!isOnHandle || isAtScrollTop;

		// Don't set isDragging yet - wait for touchmove to determine intent
		interaction.isDragging = false;
		interaction.dragDistance = 0;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!open || interaction.inputType !== 'touch') return;

		const touch = e.touches[0];
		interaction.currentY = touch.clientY;
		const deltaY = interaction.currentY - interaction.startY;
		const deltaX = touch.clientX - interaction.startX;

		// Check if this is a horizontal swipe - if so, don't interfere
		if (Math.abs(deltaX) > Math.abs(deltaY) && !interaction.isDragging) {
			return;
		}

		// For handle-based drags, always allow
		// For content-based drags, ensure we're still at scroll top AND moving down
		let canContinueDrag = interaction.dragStartedFromHandle;

		if (!interaction.dragStartedFromHandle) {
			const currentScrollTop = menuElement?.scrollTop ?? 0;
			const isAtScrollTop = currentScrollTop === 0;
			// Only allow content drag if at top AND pulling down (not scrolling up)
			canContinueDrag = isAtScrollTop && interaction.canDragToClose && deltaY > 0;
		}

		// Only start dragging if moving downward past threshold and conditions allow
		// Use larger threshold for content (15px) vs handle (5px)
		const threshold = interaction.dragStartedFromHandle ? 5 : 15;

		if (deltaY > threshold && canContinueDrag && !interaction.isDragging) {
			// Now we can start dragging
			interaction.isDragging = true;
			provideFeedback('grab');
			// Prevent default to stop background scroll
			e.preventDefault();
		}

		if (interaction.isDragging) {
			// Prevent scrolling background when dragging
			e.preventDefault();

			// Apply resistance
			const rawDistance = Math.max(0, deltaY);
			interaction.dragDistance = rawDistance * PHYSICS.resistanceFactor;
		} else if (deltaY < 0 && menuElement) {
			// Scrolling up - allow native scroll but prevent background interaction
			// This ensures smooth scrolling within the sheet
			const currentScrollTop = menuElement.scrollTop;
			if (currentScrollTop === 0 && deltaY < 0) {
				// At top and trying to scroll up more - prevent overscroll
				e.preventDefault();
			}
		} else if (deltaY > threshold && !canContinueDrag) {
			// Lost the conditions for dragging (e.g., scrolled down)
			resetInteractionState();
		}
		// If not dragging, let the native scroll work (don't preventDefault)
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
				if (menuElement) {
					menuElement.removeEventListener('scroll', updateScrollPosition);
					menuElement.removeEventListener('touchstart', handleTouchStart);
					menuElement.removeEventListener('touchmove', handleTouchMove);
					menuElement.removeEventListener('touchend', handleTouchEnd);
					menuElement.removeEventListener('wheel', handleWheel);
				}
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

	// Proper body scroll locking that prevents background scroll but allows sheet scroll
	$effect(() => {
		if (open && menuElement) {
			// Store original styles
			const scrollY = window.scrollY;
			const bodyStyle = document.body.style;
			const htmlStyle = document.documentElement.style;

			const originalBodyOverflow = bodyStyle.overflow;
			const originalBodyPosition = bodyStyle.position;
			const originalBodyTop = bodyStyle.top;
			const originalBodyWidth = bodyStyle.width;
			const originalHtmlOverflow = htmlStyle.overflow;

			// Lock background scroll - iOS and desktop compatible
			bodyStyle.overflow = 'hidden';
			bodyStyle.position = 'fixed';
			bodyStyle.top = `-${scrollY}px`;
			bodyStyle.width = '100%';
			bodyStyle.left = '0';
			bodyStyle.right = '0';
			htmlStyle.overflow = 'hidden';

			// Wait for layout then setup sheet scrolling
			tick().then(() => {
				if (!menuElement || !open) return;

				// Ensure the menu element can scroll independently
				menuElement.style.overflowY = 'auto';
				menuElement.style.touchAction = 'pan-y';
				(menuElement.style as any).webkitOverflowScrolling = 'touch';

				// Multiple layout recalculations to ensure content renders
				// First recalculation
				void menuElement.offsetHeight;

				// Second recalculation after a frame
				requestAnimationFrame(() => {
					if (menuElement && open) {
						// Force reflow to ensure proper rendering
						void menuElement.offsetHeight;
						// Reset scroll to top to ensure all content is visible
						menuElement.scrollTop = 0;
						// Focus for accessibility
						menuElement.focus();
					}
				});
			});

			return () => {
				// Clean up menu styles immediately
				if (menuElement) {
					menuElement.style.overflowY = '';
					menuElement.style.touchAction = '';
					(menuElement.style as any).webkitOverflowScrolling = '';
				}

				// Restore immediately, not deferred
				bodyStyle.overflow = originalBodyOverflow;
				bodyStyle.position = originalBodyPosition;
				bodyStyle.top = originalBodyTop;
				bodyStyle.width = originalBodyWidth;
				bodyStyle.left = '';
				bodyStyle.right = '';
				htmlStyle.overflow = originalHtmlOverflow;

				// Restore scroll position after a single frame
				requestAnimationFrame(() => {
					window.scrollTo(0, scrollY);
				});
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

{#if open}
	<div
		class={cn(
			'bg-background/20 fixed inset-0 z-40 backdrop-blur-md',
			interaction.isDragging && !isClosing ? 'transition-none' : 'transition-opacity duration-200'
		)}
		style={`
			opacity: ${interaction.isDragging && !isClosing ? Math.max(0.1, 1 - interaction.dragDistance / 400) : '1'};
			touch-action: none;
			-webkit-user-select: none;
			user-select: none;
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
		aria-hidden="true"
		role="presentation"
	></div>
{/if}

<!-- Menu Content -->
{#if open}
	<div
		bind:this={menuElement}
		transition:fly={{ y: 500, duration: 300, easing: cubicOut }}
		class={cn(
			'bg-background/60 border-border/30 fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t shadow-sm backdrop-blur-xl',
			'max-h-[85vh] overflow-y-auto',
			interaction.isDragging && !isClosing ? 'transition-none' : 'transition-transform duration-200 ease-out'
		)}
		style={`
			touch-action: pan-y; 
			-webkit-overflow-scrolling: touch;
			overscroll-behavior: contain;
			scroll-behavior: smooth;
			transform-origin: bottom center;
			${
				interaction.isDragging && !isClosing
					? `transform: translateY(${interaction.dragDistance}px); opacity: ${Math.max(0.3, 1 - interaction.dragDistance / 300)};`
					: 'transform: translateY(0); opacity: 1;'
			}
		`}
		data-testid="mobile-nav-sheet"
		role="dialog"
		aria-modal="true"
		aria-label="Main navigation sheet"
		tabindex={0}
	>
		<!-- Handle indicator -->
		<div class="flex justify-center pb-3 pt-4" data-drag-handle>
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

		<div class="px-6 pb-4">
			<!-- User Profile Section -->
			{#if memoizedUser}
				<MobileUserCard user={memoizedUser} class="mb-6" />
			{/if}

			<!-- Navigation Sections -->
			<div class="space-y-8">
				<!-- Management -->
				<section>
					<h4 class="text-muted-foreground/70 mb-4 px-3 text-[11px] font-bold uppercase tracking-widest">
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
					<h4 class="text-muted-foreground/70 mb-4 px-3 text-[11px] font-bold uppercase tracking-widest">
						{m.sidebar_customization()}
					</h4>
					<div class="space-y-2">
						{#each navigationItems.customizationItems as item}
							{#if item.items}
								<!-- Customization with subitems -->
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
										'focus-visible:ring-muted-foreground/50 hover:scale-[1.01] focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
										isActiveItem(item)
											? 'bg-muted text-foreground hover:bg-muted/70 shadow-sm'
											: 'text-foreground hover:bg-muted/50'
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

				<!-- Admin Sections -->
				{#if memoizedIsAdmin}
					<!-- Environments -->
					{#if navigationItems.environmentItems}
						<section>
							<h4 class="text-muted-foreground/70 mb-4 px-3 text-[11px] font-bold uppercase tracking-widest">
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
							<h4 class="text-muted-foreground/70 mb-4 px-3 text-[11px] font-bold uppercase tracking-widest">
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
				<div class={cn('border-border/30 mt-6 border-t pt-4', navigationMode === 'docked' ? 'pb-24' : 'pb-6')}>
					<div class="text-muted-foreground/60 text-center text-xs">
						<p class="font-medium">Arcane v{versionInformation.currentVersion}</p>
						{#if versionInformation.updateAvailable}
							<p class="text-primary/80 mt-1 font-medium">Update available</p>
						{/if}
					</div>
				</div>
			{:else}
				<!-- Add padding even if no version info to prevent content hiding behind nav -->
				<div class="pb-20"></div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Ensure smooth scrolling and prevent overscroll issues */
	div[data-testid='mobile-nav-sheet'] {
		overscroll-behavior: contain;
		/* Prevent white background showing through */
		background-clip: padding-box;
		/* Ensure smooth momentum scrolling on iOS */
		-webkit-overflow-scrolling: touch;
		/* Force GPU acceleration */
		transform: translateZ(0);
		will-change: transform, opacity;
		/* Ensure proper stacking context for content */
		position: fixed;
		/* Ensure the container doesn't collapse */
		display: flex;
		flex-direction: column;
		/* Fix potential layout issues when scrolled far down page */
		pointer-events: auto;
		contain: layout;
	}

	/* Remove focus outline from dialog container since it's focused for accessibility */
	div[data-testid='mobile-nav-sheet']:focus {
		outline: none;
	}

	/* Ensure content scrolls properly inside the container */
	div[data-testid='mobile-nav-sheet'] > * {
		/* Ensure child elements don't cause layout issues */
		min-height: 0;
	}
</style>
