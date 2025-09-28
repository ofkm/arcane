<script lang="ts">
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsService } from '$lib/services/settings-service';
	import NavigationSettingsForm from '../forms/navigation-settings-form.svelte';
	import NavigationIcon from '@lucide/svelte/icons/navigation';
	import { m } from '$lib/paraglide/messages';
	import { getContext } from 'svelte';
	import { SettingsPageLayout } from '$lib/layouts/index.js';

	let { data } = $props();
	let currentSettings = $state(data.settings);
	let hasChanges = $state(false);
	let isLoading = $state(false);

	const isReadOnly = $derived.by(() => $settingsStore.uiConfigDisabled);

	const formState = getContext('settingsFormState') as any;

	$effect(() => {
		if (formState) {
			formState.hasChanges = hasChanges;
			formState.isLoading = isLoading;
		}
	});

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
</script>

<SettingsPageLayout
	title={m.navigation_title()}
	description={m.navigation_description()}
	icon={NavigationIcon}
	pageType="form"
	showReadOnlyTag={isReadOnly}
>
	{#snippet mainContent()}
		<NavigationSettingsForm settings={currentSettings} callback={updateSettingsConfig} bind:hasChanges bind:isLoading />
	{/snippet}
</SettingsPageLayout>
