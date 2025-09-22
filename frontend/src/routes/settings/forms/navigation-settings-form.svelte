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
	import { persistedNavigationStore, getEffectiveNavigationSetting } from '$lib/utils/persisted-state';
	import NavigationSettingControl from '$lib/components/navigation-setting-control.svelte';
	import settingsStore from '$lib/stores/config-store';

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
		mobileNavigationShowLabels: z.boolean(),
		mobileNavigationScrollToHide: z.boolean(),
		mobileNavigationTapToHide: z.boolean()
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, settings));

	const formHasChanges = $derived.by(
		() =>
			$formInputs.mobileNavigationShowLabels.value !== settings.mobileNavigationShowLabels ||
			$formInputs.mobileNavigationScrollToHide.value !== settings.mobileNavigationScrollToHide ||
			$formInputs.mobileNavigationTapToHide.value !== settings.mobileNavigationTapToHide
	);

	$effect(() => {
		hasChanges = formHasChanges;
	});

	function setLocalOverride(key: 'showLabels' | 'scrollToHide' | 'tapToHide', value: boolean | undefined) {
		persistedNavigationStore.setOverride(key, value);
	}

	function clearLocalOverride(key: 'showLabels' | 'scrollToHide' | 'tapToHide') {
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
			.then(() => toast.success('Navigation settings saved successfully'))
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
		<!-- Navigation Behavior Settings Card -->
		<Card.Root class="pt-0 overflow-hidden">
			<Card.Header class="!py-4 bg-muted/20 border-b">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
						<NavigationIcon class="size-4" />
					</div>
					<div>
						<Card.Title class="text-base">Mobile Navigation Behavior</Card.Title>
						<Card.Description class="text-xs">Configure global defaults and personal overrides for mobile navigation behavior</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="px-3 py-3 sm:px-6 sm:py-4">
				<div class="grid grid-cols-1 lg:grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-3 sm:gap-4">
					<NavigationSettingControl
						id="mobileNavigationShowLabels"
						label="Show Labels"
						description="Display text labels below navigation icons for better clarity and accessibility"
						icon={EyeIcon}
						serverValue={$formInputs.mobileNavigationShowLabels.value}
						localOverride={persistedState.overrides.showLabels}
						onServerChange={(value) => { $formInputs.mobileNavigationShowLabels.value = value; }}
						onLocalOverride={(value) => setLocalOverride('showLabels', value)}
						onClearOverride={() => clearLocalOverride('showLabels')}
						serverDisabled={uiConfigDisabled}
					/>

					<NavigationSettingControl
						id="mobileNavigationScrollToHide"
						label="Scroll to Hide"
						description="Automatically hide the navigation bar when scrolling down for a cleaner viewing experience"
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
						label="Tap to Hide"
						description="Allow users to tap outside the navigation area to quickly show or hide the navigation bar"
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
