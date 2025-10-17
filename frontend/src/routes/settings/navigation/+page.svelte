<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { z } from 'zod/v4';
	import { getContext, onMount } from 'svelte';
	import { createForm } from '$lib/utils/form.utils';
	import type { Settings } from '$lib/types/settings.type';
	import { toast } from 'svelte-sonner';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import MousePointerClickIcon from '@lucide/svelte/icons/mouse-pointer-click';
	import ScrollTextIcon from '@lucide/svelte/icons/scroll-text';
	import NavigationIcon from '@lucide/svelte/icons/navigation';
	import SidebarIcon from '@lucide/svelte/icons/sidebar';
	import NavigationSettingControl from '$lib/components/navigation-setting-control.svelte';
	import NavigationModeSettingControl from '$lib/components/navigation-mode-setting-control.svelte';
	import settingsStore from '$lib/stores/config-store';
	import { m } from '$lib/paraglide/messages';
	import { navigationSettingsOverridesStore, resetNavigationVisibility } from '$lib/utils/navigation.utils';
	import { settingsService } from '$lib/services/settings-service';
	import { SettingsPageLayout } from '$lib/layouts';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';

	let { data } = $props();
	let currentSettings = $state(data.settings!);
	let hasChanges = $state(false);
	let isLoading = $state(false);

	const isReadOnly = $derived.by(() => $settingsStore.uiConfigDisabled);
	const formState = getContext('settingsFormState') as any;
	const formSchema = z.object({
		mobileNavigationMode: z.enum(['floating', 'docked']),
		mobileNavigationShowLabels: z.boolean(),
		mobileNavigationScrollToHide: z.boolean(),
		sidebarHoverExpansion: z.boolean()
	});

	// Track local override state using the shared store
	let persistedState = $state(navigationSettingsOverridesStore.current);

	// Sidebar context is only available in desktop view
	let sidebar: ReturnType<typeof useSidebar> | null = null;

	try {
		sidebar = useSidebar();
	} catch (e) {
		// Sidebar context not available (mobile view)
	}

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, currentSettings));
	const formHasChanges = $derived.by(
		() =>
			$formInputs.mobileNavigationMode.value !== currentSettings.mobileNavigationMode ||
			$formInputs.mobileNavigationShowLabels.value !== currentSettings.mobileNavigationShowLabels ||
			$formInputs.mobileNavigationScrollToHide.value !== currentSettings.mobileNavigationScrollToHide ||
			$formInputs.sidebarHoverExpansion.value !== currentSettings.sidebarHoverExpansion
	);

	$effect(() => {
		hasChanges = formHasChanges;
		if (formState) {
			formState.hasChanges = hasChanges;
			formState.isLoading = isLoading;
		}
	});

		function setLocalOverride(key: 'mode' | 'showLabels' | 'scrollToHide', value: any) {
		const currentOverrides = navigationSettingsOverridesStore.current;
		navigationSettingsOverridesStore.current = {
			...currentOverrides,
			[key]: value
		};
		persistedState = navigationSettingsOverridesStore.current;

		// Reset navigation bar visibility when behavior settings change
		if (key === 'scrollToHide') {
			resetNavigationVisibility();
		}
	}

	function clearLocalOverride(key: 'mode' | 'showLabels' | 'scrollToHide') {
		const currentOverrides = navigationSettingsOverridesStore.current;
		const newOverrides = { ...currentOverrides };
		delete newOverrides[key];
		navigationSettingsOverridesStore.current = newOverrides;
		persistedState = navigationSettingsOverridesStore.current;

		// Reset navigation bar visibility when behavior settings change
		if (key === 'scrollToHide') {
			resetNavigationVisibility();
		}

		toast.success(`Local override cleared for ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
	}

	async function updateSettingsConfig(updatedSettings: Partial<Settings>) {
		try {
			await settingsService.updateSettings(updatedSettings as any);
			currentSettings = { ...currentSettings, ...updatedSettings };
			settingsStore.set(currentSettings);
			settingsStore.reload();
		} catch (error) {
			console.error('Error updating navigation settings:', error);
			throw error;
		}
	}

	async function onSubmit() {
		const formData = form.validate();
		if (!formData) {
			toast.error('Please check the form for errors');
			return;
		}
		isLoading = true;

		// Check if behavior settings changed
		const behaviorChanged =
			formData.mobileNavigationScrollToHide !== currentSettings.mobileNavigationScrollToHide;

		await updateSettingsConfig(formData)
			.then(() => {
				toast.success(m.navigation_settings_saved());

				// Reset navigation bar visibility if behavior settings changed
				if (behaviorChanged) {
					resetNavigationVisibility();
				}
			})
			.catch((error) => {
				console.error('Failed to save navigation settings:', error);
				toast.error('Failed to save navigation settings. Please try again.');
			})
			.finally(() => (isLoading = false));
	}

	function resetForm() {
		$formInputs.mobileNavigationMode.value = currentSettings.mobileNavigationMode;
		$formInputs.mobileNavigationShowLabels.value = currentSettings.mobileNavigationShowLabels;
		$formInputs.mobileNavigationScrollToHide.value = currentSettings.mobileNavigationScrollToHide;
	}

	onMount(() => {
		if (formState) {
			formState.saveFunction = onSubmit;
			formState.resetFunction = resetForm;
		}
	});
</script>

<SettingsPageLayout
	title={m.navigation_title()}
	description={m.navigation_description()}
	icon={NavigationIcon}
	pageType="form"
	showReadOnlyTag={isReadOnly}
>
	{#snippet mainContent()}
		<div class="space-y-4 sm:space-y-6">
			<Card.Root>
				<Card.Header icon={SidebarIcon}>
					<div class="flex flex-col space-y-1.5">
						<Card.Title>{m.navigation_desktop_sidebar_title()}</Card.Title>
						<Card.Description>{m.navigation_desktop_sidebar_description()}</Card.Description>
					</div>
				</Card.Header>
				<Card.Content class="px-3 py-3 sm:px-6 sm:py-4">
					<div class="flex items-start gap-3 rounded-lg border p-3 sm:p-4">
						<div
							class="bg-primary/10 text-primary ring-primary/20 flex size-7 flex-shrink-0 items-center justify-center rounded-lg ring-1 sm:size-8"
						>
							<SidebarIcon class="size-3 sm:size-4" />
						</div>
						<div class="flex flex-1 flex-col gap-3">
							<div>
								<h4 class="mb-1 text-sm font-medium leading-tight">{m.navigation_sidebar_hover_expansion_label()}</h4>
								<p class="text-muted-foreground text-xs leading-relaxed">
									{m.navigation_sidebar_hover_expansion_description()}
								</p>
							</div>
							<div class="flex items-center gap-2">
								<Switch
									id="sidebarHoverExpansion"
									checked={$formInputs.sidebarHoverExpansion.value}
									disabled={isReadOnly}
									onCheckedChange={(checked) => {
										$formInputs.sidebarHoverExpansion.value = checked;
										// Update the sidebar immediately if context is available
										if (sidebar) {
											sidebar.setHoverExpansion(checked);
										}
									}}
								/>
								<label for="sidebarHoverExpansion" class="text-xs font-medium">
									{$formInputs.sidebarHoverExpansion.value
										? m.navigation_sidebar_hover_expansion_enabled()
										: m.navigation_sidebar_hover_expansion_disabled()}
								</label>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header icon={NavigationIcon}>
					<div class="flex flex-col space-y-1.5">
						<Card.Title>{m.navigation_mobile_appearance_title()}</Card.Title>
						<Card.Description>{m.navigation_mobile_appearance_description()}</Card.Description>
					</div>
				</Card.Header>
				<Card.Content class="px-3 py-3 sm:px-6 sm:py-4">
					<div class="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[repeat(auto-fit,minmax(400px,1fr))]">
						<NavigationModeSettingControl
							id="mobileNavigationMode"
							label={m.navigation_mode_label()}
							description={m.navigation_mode_description()}
							icon={NavigationIcon}
							serverValue={$formInputs.mobileNavigationMode.value}
							localOverride={persistedState.mode}
							onServerChange={(value) => {
								$formInputs.mobileNavigationMode.value = value;
							}}
							onLocalOverride={(value) => setLocalOverride('mode', value)}
							onClearOverride={() => clearLocalOverride('mode')}
							serverDisabled={isReadOnly}
						/>

						<NavigationSettingControl
							id="mobileNavigationShowLabels"
							label={m.navigation_show_labels_label()}
							description={m.navigation_show_labels_description()}
							icon={EyeIcon}
							serverValue={$formInputs.mobileNavigationShowLabels.value}
							localOverride={persistedState.showLabels}
							onServerChange={(value) => {
								$formInputs.mobileNavigationShowLabels.value = value;
							}}
							onLocalOverride={(value) => setLocalOverride('showLabels', value)}
							onClearOverride={() => clearLocalOverride('showLabels')}
							serverDisabled={isReadOnly}
						/>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header icon={NavigationIcon}>
					<div class="flex flex-col space-y-1.5">
						<Card.Title>{m.navigation_mobile_behavior_title()}</Card.Title>
						<Card.Description>{m.navigation_mobile_behavior_description()}</Card.Description>
					</div>
				</Card.Header>
				<Card.Content class="px-3 py-3 sm:px-6 sm:py-4">
					<div class="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[repeat(auto-fit,minmax(400px,1fr))]">
						<NavigationSettingControl
							id="mobileNavigationScrollToHide"
							label={m.navigation_scroll_to_hide_label()}
							description={m.navigation_scroll_to_hide_description()}
							icon={ScrollTextIcon}
							serverValue={$formInputs.mobileNavigationScrollToHide.value}
							localOverride={persistedState.scrollToHide}
							onServerChange={(value) => {
								$formInputs.mobileNavigationScrollToHide.value = value;
							}}
							onLocalOverride={(value) => setLocalOverride('scrollToHide', value)}
							onClearOverride={() => clearLocalOverride('scrollToHide')}
							serverDisabled={isReadOnly}
						/>

					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/snippet}
</SettingsPageLayout>
