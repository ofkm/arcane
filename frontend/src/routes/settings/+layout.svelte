<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { setContext } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import SaveIcon from '@lucide/svelte/icons/save';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let currentPath = $derived(page.url.pathname);
	let isSubPage = $derived(currentPath !== '/settings');
	let currentPageName = $derived(page.url.pathname.split('/').pop() || 'settings');
	
	// Get sidebar context to handle spacing
	const sidebar = useSidebar();
	
	// Calculate left position based on sidebar state to match sidebar spacing system
	// Uses the same CSS variables and spacing as the sidebar component
	const leftPosition = $derived(() => {
		const margin = '1rem'; // Standard spacing-4 equivalent
		
		if (sidebar.isMobile) {
			// Mobile sidebar is overlay - uses standard margin
			return margin;
		}
		
		if (sidebar.state === 'expanded') {
			// Full sidebar width + standard margin
			return `calc(var(--sidebar-width) + ${margin})`;
		} else {
			// For floating variant with icon collapsible:
			// sidebar-width-icon + spacing(4) + 2px padding + standard margin
			// This matches the exact calculation from sidebar.svelte line 84
			return `calc(var(--sidebar-width-icon) + 1rem + 2px + ${margin})`;
		}
	});
	
	// Get page title based on current path
	let pageTitle = $derived(() => {
		switch (currentPageName) {
			case 'general': return m.general_title();
			case 'docker': return m.docker_title();
			case 'security': return m.security_title();
			case 'users': return m.users_title();
			default: return 'Settings';
		}
	});

	// Create a custom event to communicate with form components
	let formState = $state({
		hasChanges: false,
		isLoading: false,
		saveFunction: null as (() => Promise<void>) | null,
		resetFunction: null as (() => void) | null
	});

	// Set context so forms can update the header state
	setContext('settingsFormState', formState);

	function goBackToSettings() {
		goto('/settings');
	}

	async function handleSave() {
		if (formState.saveFunction) {
			await formState.saveFunction();
		}
	}
</script>

<!-- Breadcrumb Navigation - only show on sub-pages -->
{#if isSubPage}
	<div 
		class="fixed top-4 z-[5] border border-border/50 bg-background/80 backdrop-blur-md shadow-lg rounded-lg transition-all duration-200"
		style="left: {leftPosition()}; right: 1rem;"
	>
		<div class="px-4 py-3">
			<div class="flex items-center justify-between gap-4">
				<div class="flex items-center gap-2 min-w-0">
					<!-- Back Button -->
					<Button 
						variant="ghost" 
						size="sm"
						onclick={goBackToSettings}
						class="gap-2 text-muted-foreground hover:text-foreground shrink-0"
					>
						<ArrowLeftIcon class="size-4" />
						<span class="hidden sm:inline">Back</span>
					</Button>
					
					<!-- Breadcrumb -->
					<nav class="flex items-center gap-2 text-sm min-w-0">
						<button 
							onclick={goBackToSettings}
							class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
						>
							<SettingsIcon class="size-4" />
							<span>Settings</span>
						</button>
						<ChevronRightIcon class="size-4 text-muted-foreground shrink-0" />
						<span class="font-medium text-foreground truncate">{pageTitle()}</span>
					</nav>
				</div>

				<!-- Save Section - Desktop only -->
				<div class="hidden sm:flex items-center gap-3 shrink-0">
					{#if formState.hasChanges}
						<span class="text-xs text-orange-600 dark:text-orange-400">
							Unsaved changes
						</span>
					{:else if !formState.hasChanges && formState.saveFunction}
						<span class="text-xs text-green-600 dark:text-green-400">
							All changes saved
						</span>
					{/if}
					
					{#if formState.hasChanges && formState.resetFunction}
						<Button 
							variant="outline" 
							size="sm"
							onclick={() => formState.resetFunction && formState.resetFunction()}
							disabled={formState.isLoading}
							class="gap-2"
						>
							{m.common_reset()}
						</Button>
					{/if}
					
					<Button 
						onclick={handleSave}
						disabled={formState.isLoading || !formState.hasChanges || !formState.saveFunction}
						size="sm"
						class="gap-2 min-w-[80px]"
					>
						{#if formState.isLoading}
							<div class="size-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
							{m.common_saving()}
						{:else}
							<SaveIcon class="size-4" />
							{m.common_save()}
						{/if}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}

<div class="settings-container">
	<div class="settings-content w-full max-w-none" class:pt-20={isSubPage}>
		{@render children()}
	</div>
</div>

<!-- Mobile Floating Action Buttons -->
{#if isSubPage}
	<div class="sm:hidden fixed bottom-4 right-4 z-50 flex flex-col gap-3">
		{#if formState.hasChanges && formState.resetFunction}
			<Button 
				variant="outline" 
				size="lg"
				onclick={() => formState.resetFunction && formState.resetFunction()}
				disabled={formState.isLoading}
				class="size-14 rounded-full shadow-lg bg-background/80 backdrop-blur-md border-2"
			>
				<RotateCcwIcon class="size-5" />
			</Button>
		{/if}
		
		<Button 
			onclick={handleSave}
			disabled={formState.isLoading || !formState.hasChanges || !formState.saveFunction}
			size="lg"
			class="size-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
		>
			{#if formState.isLoading}
				<div class="size-5 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
			{:else}
				<SaveIcon class="size-5" />
			{/if}
		</Button>
		
		<!-- Status indicator for mobile -->
		{#if formState.hasChanges}
			<div class="absolute -top-2 -left-2 size-3 bg-orange-500 rounded-full animate-pulse"></div>
		{/if}
	</div>
{/if}
