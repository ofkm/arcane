<script lang="ts">
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';
	import GeneralSettingsForm from '../forms/general-settings-form.svelte';
	import SettingsIcon from '@lucide/svelte/icons/settings';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	async function updateSettingsConfig(updatedSettings: Partial<Settings>) {
		try {
			await settingsAPI.updateSettings(updatedSettings as any);
			currentSettings = { ...currentSettings, ...updatedSettings };
			settingsStore.set(currentSettings);
			settingsStore.reload();
		} catch (error) {
			console.error('Error updating settings:', error);
			throw error;
		}
	}
</script>

<div class="settings-page px-4 py-6">
	<div
		class="from-background/60 via-background/40 to-background/60 relative overflow-hidden rounded-xl border bg-gradient-to-br p-6 shadow-sm"
	>
		<div class="bg-primary/10 pointer-events-none absolute -right-10 -top-10 size-40 rounded-full blur-3xl"></div>
		<div class="bg-muted/40 pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full blur-3xl"></div>
		<div class="relative flex items-start gap-4">
			<div class="bg-primary/10 text-primary ring-primary/20 flex size-10 items-center justify-center rounded-lg ring-1">
				<SettingsIcon class="size-5" />
			</div>
			<div>
				<h1 class="settings-title">General Settings</h1>
				<p class="settings-description">Core configuration for how Arcane operates</p>
			</div>
		</div>
	</div>

	<div class="settings-grid settings-grid-single">
		<GeneralSettingsForm settings={currentSettings} callback={updateSettingsConfig} />
	</div>
</div>
