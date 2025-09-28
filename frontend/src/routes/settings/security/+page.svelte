<script lang="ts">
	import type { PageData } from './$types';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import SecuritySettingsForm from '../forms/security-settings-form.svelte';
	import LockIcon from '@lucide/svelte/icons/lock';
	import { m } from '$lib/paraglide/messages';
	import { getContext } from 'svelte';
	import { settingsService } from '$lib/services/settings-service';
	import { SettingsPageLayout } from '$lib/layouts/index.js';

	let { data }: { data: PageData } = $props();
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
	title={m.security_title()}
	description={m.security_description()}
	icon={LockIcon}
	pageType="form"
	showReadOnlyTag={isReadOnly}
>
	{#snippet mainContent()}
		<SecuritySettingsForm
			settings={currentSettings}
			oidcStatus={data.oidcStatus}
			callback={updateSettingsConfig}
			bind:hasChanges
			bind:isLoading
		/>
	{/snippet}
</SettingsPageLayout>
