<script lang="ts">
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import DockerSettingsForm from '../forms/docker-settings-form.svelte';
	import BoxesIcon from '@lucide/svelte/icons/boxes';
	import { m } from '$lib/paraglide/messages';
	import { getContext } from 'svelte';
	import { settingsService } from '$lib/services/settings-service';
	import { SettingsPageLayout } from '$lib/layouts/index.js';

	let { data } = $props();
	let currentSettings = $state<Settings>(data.settings);
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
			console.error('Error updating settings:', error);
			throw error;
		}
	}
</script>

<SettingsPageLayout
	title={m.docker_title()}
	description={m.docker_description()}
	icon={BoxesIcon}
	pageType="form"
	showReadOnlyTag={isReadOnly}
>
	{#snippet mainContent()}
		<DockerSettingsForm settings={currentSettings} callback={updateSettingsConfig} bind:hasChanges bind:isLoading />
	{/snippet}
</SettingsPageLayout>
