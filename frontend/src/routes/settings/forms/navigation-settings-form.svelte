<script lang="ts">
	import { z } from 'zod/v4';
	import { getContext, onMount } from 'svelte';
	import { createForm } from '$lib/utils/form.utils';
	import * as Card from '$lib/components/ui/card';
	import type { Settings } from '$lib/types/settings.type';
	import { toast } from 'svelte-sonner';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import MousePointerClickIcon from '@lucide/svelte/icons/mouse-pointer-click';
	import ScrollTextIcon from '@lucide/svelte/icons/scroll-text';
	import NavigationIcon from '@lucide/svelte/icons/navigation';
	import { persistedNavigationStore } from '$lib/utils/persisted-state';
	import NavigationSettingControl from '$lib/components/navigation-setting-control.svelte';
	import NavigationModeSettingControl from '$lib/components/navigation-mode-setting-control.svelte';
	import settingsStore from '$lib/stores/config-store';
	import { m } from '$lib/paraglide/messages';

	let {
		settings,
		callback,
		hasChanges = $bindable(),
		isLoading = $bindable(false)
	}: {
		settings: Settings;
		callback: (appConfig: Partial<Settings>) => Promise<void>;
		hasChanges: boolean;
		isLoading: boolean;
	} = $props();

	const uiConfigDisabled = $state($settingsStore.uiConfigDisabled);

	// Track local override state
	let persistedState = $state($persistedNavigationStore);
	$effect(() => {
		persistedNavigationStore.subscribe(state => {
			persistedState = state;
		});
	});

	const formSchema = z.object({
		mobileNavigationMode: z.enum(['floating', 'docked']),
		mobileNavigationShowLabels: z.boolean(),
		mobileNavigationScrollToHide: z.boolean(),
		mobileNavigationTapToHide: z.boolean()
	});

	// Ensure settings have default values for mobile navigation settings
	const settingsWithDefaults = $derived({
		...settings,
		mobileNavigationMode: settings.mobileNavigationMode ?? 'floating',
		mobileNavigationShowLabels: settings.mobileNavigationShowLabels ?? true,
		mobileNavigationScrollToHide: settings.mobileNavigationScrollToHide ?? true,
		mobileNavigationTapToHide: settings.mobileNavigationTapToHide ?? false
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, settingsWithDefaults));

	const formHasChanges = $derived.by(
		() =>
			$formInputs.mobileNavigationShowLabels.value !== settings.mobileNavigationShowLabels ||
			$formInputs.mobileNavigationScrollToHide.value !== settings.mobileNavigationScrollToHide ||
			$formInputs.mobileNavigationTapToHide.value !== settings.mobileNavigationTapToHide
	);

	$effect(() => {
		hasChanges = formHasChanges;
	});

	function setLocalOverride(key: 'mode' | 'showLabels' | 'scrollToHide' | 'tapToHide', value: any) {
		persistedNavigationStore.setOverride(key, value);
	}

	function clearLocalOverride(key: 'mode' | 'showLabels' | 'scrollToHide' | 'tapToHide') {
		persistedNavigationStore.setOverride(key, undefined);
		toast.success(`Local override cleared for ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
	}

	async function onSubmit() {
		const data = form.validate();
		if (!data) {
			toast.error('Please check the form for errors');
			return;
		}
		isLoading = true;

		await callback(data)
					.then(() => toast.success(m.navigation_settings_saved()))
			.catch((error) => {
				console.error('Failed to save navigation settings:', error);
				toast.error('Failed to save navigation settings. Please try again.');
			})
			.finally(() => (isLoading = false));
	}

	function resetForm() {
		$formInputs.mobileNavigationShowLabels.value = settings.mobileNavigationShowLabels;
		$formInputs.mobileNavigationScrollToHide.value = settings.mobileNavigationScrollToHide;
		$formInputs.mobileNavigationTapToHide.value = settings.mobileNavigationTapToHide;
	}

	onMount(() => {
		const formState = getContext('settingsFormState') as any;
		if (formState) {
			formState.saveFunction = onSubmit;
			formState.resetFunction = resetForm;
		}
	});
</script>

<fieldset disabled={uiConfigDisabled} class="relative">
	<div class="space-y-4 sm:space-y-6">
		<!-- Mobile Navigation Appearance Card -->
		<Card.Root class="pt-0 overflow-hidden">
			<Card.Header class="!py-4 bg-muted/20 border-b">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
						<NavigationIcon class="size-4" />
					</div>
					<div>
						<Card.Title class="text-base">{m.navigation_mobile_appearance_title()}</Card.Title>
						<Card.Description class="text-xs">{m.navigation_mobile_appearance_description()}</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="px-3 py-3 sm:px-6 sm:py-4">
				<div class="grid grid-cols-1 lg:grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-3 sm:gap-4">
					<NavigationModeSettingControl
						id="mobileNavigationMode"
						label={m.navigation_mode_label()}
						description={m.navigation_mode_description()}
						icon={NavigationIcon}
						serverValue={$formInputs.mobileNavigationMode.value}
						localOverride={persistedState.overrides.mode}
						onServerChange={(value) => { $formInputs.mobileNavigationMode.value = value; }}
						onLocalOverride={(value) => setLocalOverride('mode', value)}
						onClearOverride={() => clearLocalOverride('mode')}
						serverDisabled={uiConfigDisabled}
					/>

					<NavigationSettingControl
						id="mobileNavigationShowLabels"
						label={m.navigation_show_labels_label()}
						description={m.navigation_show_labels_description()}
						icon={EyeIcon}
						serverValue={$formInputs.mobileNavigationShowLabels.value}
						localOverride={persistedState.overrides.showLabels}
						onServerChange={(value) => { $formInputs.mobileNavigationShowLabels.value = value; }}
						onLocalOverride={(value) => setLocalOverride('showLabels', value)}
						onClearOverride={() => clearLocalOverride('showLabels')}
						serverDisabled={uiConfigDisabled}
					/>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Mobile Navigation Behavior Card -->
		<Card.Root class="pt-0 overflow-hidden">
			<Card.Header class="!py-4 bg-muted/20 border-b">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
						<NavigationIcon class="size-4" />
					</div>
					<div>
						<Card.Title class="text-base">{m.navigation_mobile_behavior_title()}</Card.Title>
						<Card.Description class="text-xs">{m.navigation_mobile_behavior_description()}</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="px-3 py-3 sm:px-6 sm:py-4">
				<div class="grid grid-cols-1 lg:grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-3 sm:gap-4">
					<NavigationSettingControl
						id="mobileNavigationScrollToHide"
						label={m.navigation_scroll_to_hide_label()}
						description={m.navigation_scroll_to_hide_description()}
						icon={ScrollTextIcon}
						serverValue={$formInputs.mobileNavigationScrollToHide.value}
						localOverride={persistedState.overrides.scrollToHide}
						onServerChange={(value) => { $formInputs.mobileNavigationScrollToHide.value = value; }}
						onLocalOverride={(value) => setLocalOverride('scrollToHide', value)}
						onClearOverride={() => clearLocalOverride('scrollToHide')}
						serverDisabled={uiConfigDisabled}
					/>

					<NavigationSettingControl
						id="mobileNavigationTapToHide"
						label={m.navigation_tap_to_hide_label()}
						description={m.navigation_tap_to_hide_description()}
						icon={MousePointerClickIcon}
						serverValue={$formInputs.mobileNavigationTapToHide.value}
						localOverride={persistedState.overrides.tapToHide}
						onServerChange={(value) => { $formInputs.mobileNavigationTapToHide.value = value; }}
						onLocalOverride={(value) => setLocalOverride('tapToHide', value)}
						onClearOverride={() => clearLocalOverride('tapToHide')}
						serverDisabled={uiConfigDisabled}
					/>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</fieldset>
