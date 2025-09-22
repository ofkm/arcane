<script lang="ts">
	import { persistedNavigationStore } from '$lib/utils/persisted-state';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Button } from '$lib/components/ui/button';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import settingsStore from '$lib/stores/config-store';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import MousePointerClickIcon from '@lucide/svelte/icons/mouse-pointer-click';
	import ScrollTextIcon from '@lucide/svelte/icons/scroll-text';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import { toast } from 'svelte-sonner';

	let isOpen = $state(false);
	let persistedState = $state($persistedNavigationStore);
	let serverSettings = $state($settingsStore);

	// Subscribe to changes
	$effect(() => {
		persistedNavigationStore.subscribe(state => {
			persistedState = state;
		});
	});

	$effect(() => {
		settingsStore.subscribe(settings => {
			serverSettings = settings;
		});
	});

	// Local state for switches - use derived to track changes
	let showLabelsOverride = $derived(persistedState.overrides.showLabels);
	let scrollToHideOverride = $derived(persistedState.overrides.scrollToHide);
	let tapToHideOverride = $derived(persistedState.overrides.tapToHide);


	function updateShowLabels(checked: boolean | undefined) {
		const isDefault = checked === serverSettings.navigationShowLabels;
		const override = isDefault ? undefined : checked;
		persistedNavigationStore.setOverride('showLabels', override);
	}

	function updateScrollToHide(checked: boolean | undefined) {
		const isDefault = checked === serverSettings.navigationScrollToHide;
		const override = isDefault ? undefined : checked;
		persistedNavigationStore.setOverride('scrollToHide', override);
	}

	function updateTapToHide(checked: boolean | undefined) {
		const isDefault = checked === serverSettings.navigationTapToHide;
		const override = isDefault ? undefined : checked;
		persistedNavigationStore.setOverride('tapToHide', override);
	}

	function clearAllOverrides() {
		persistedNavigationStore.clearOverrides();
		toast.success('All navigation overrides cleared');
	}

	// Check if any overrides are active
	const hasOverrides = $derived(
		Object.keys(persistedState.overrides).length > 0
	);

	// Get effective values (considering overrides)
	const effectiveShowLabels = $derived(
		showLabelsOverride !== undefined ? showLabelsOverride : serverSettings.navigationShowLabels
	);
	const effectiveScrollToHide = $derived(
		scrollToHideOverride !== undefined ? scrollToHideOverride : serverSettings.navigationScrollToHide
	);
	const effectiveTapToHide = $derived(
		tapToHideOverride !== undefined ? tapToHideOverride : serverSettings.navigationTapToHide
	);
</script>

<Card.Root class="pt-0 overflow-hidden border-dashed">
	<Collapsible.Root bind:open={isOpen}>
		<Collapsible.Trigger>
			<Card.Header class="!py-4 bg-muted/20 border-b hover:bg-muted/30 transition-colors cursor-pointer">
				<button class="w-full flex items-center justify-between p-0 h-auto bg-transparent border-none cursor-pointer">
					<div class="flex items-center gap-3">
						<div class="bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20 flex size-8 items-center justify-center rounded-lg ring-1">
							<SettingsIcon class="size-4" />
						</div>
						<div class="text-left">
							<Card.Title class="text-base">Local Navigation Settings</Card.Title>
							<Card.Description class="text-xs">
								Override server settings for this device only
								{#if hasOverrides}
									<span class="text-orange-600 dark:text-orange-400 font-medium">• {Object.keys(persistedState.overrides).length} override{Object.keys(persistedState.overrides).length === 1 ? '' : 's'} active</span>
								{/if}
							</Card.Description>
						</div>
					</div>
					<ChevronDownIcon class={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
				</button>
			</Card.Header>
		</Collapsible.Trigger>
		
		<Collapsible.Content>
			<Card.Content class="px-3 py-4 sm:px-6">
				<div class="text-xs text-muted-foreground p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md mb-4">
					<p class="font-medium mb-1 text-orange-700 dark:text-orange-300">How this works:</p>
					<p>These settings only apply to your current device. They override the global server settings for your personal use. Toggles that match the server default will be automatically cleared.</p>
				</div>

				<div class="space-y-3">
					<div class={showLabelsOverride !== undefined ? 'border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 rounded-md p-3' : ''}>
						<SwitchWithLabel
							id="navigation-show-labels"
							label="Show Labels"
							description={`Server default: ${serverSettings.navigationShowLabels ? 'ON' : 'OFF'}${showLabelsOverride !== undefined ? ' (overridden)' : ''}`}
							checked={effectiveShowLabels}
							onCheckedChange={(checked) => updateShowLabels(checked)}
						/>
					</div>

					<div class={scrollToHideOverride !== undefined ? 'border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 rounded-md p-3' : ''}>
						<SwitchWithLabel
							id="navigation-scroll-to-hide"
							label="Scroll to Hide"
							description={`Server default: ${serverSettings.navigationScrollToHide ? 'ON' : 'OFF'}${scrollToHideOverride !== undefined ? ' (overridden)' : ''}`}
							checked={effectiveScrollToHide}
							onCheckedChange={(checked) => updateScrollToHide(checked)}
						/>
					</div>

					<div class={tapToHideOverride !== undefined ? 'border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 rounded-md p-3' : ''}>
						<SwitchWithLabel
							id="navigation-tap-to-hide"
							label="Tap to Hide"
							description={`Server default: ${serverSettings.navigationTapToHide ? 'ON' : 'OFF'}${tapToHideOverride !== undefined ? ' (overridden)' : ''}`}
							checked={effectiveTapToHide}
							onCheckedChange={(checked) => updateTapToHide(checked)}
						/>
					</div>
				</div>

				{#if hasOverrides}
					<div class="flex justify-between items-center pt-2 border-t">
						<div class="text-xs text-muted-foreground">
							{Object.keys(persistedState.overrides).length} local override{Object.keys(persistedState.overrides).length === 1 ? '' : 's'} active
						</div>
						<Button variant="outline" size="sm" onclick={clearAllOverrides} class="text-xs">
							<RotateCcwIcon class="w-3 h-3 mr-1" />
							Reset to Defaults
						</Button>
					</div>
				{/if}
			</Card.Content>
		</Collapsible.Content>
	</Collapsible.Root>
</Card.Root>
