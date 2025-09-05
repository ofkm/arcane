<script lang="ts">
	import type { PageData } from './$types';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';
	import SecuritySettingsForm from '../forms/security-settings-form.svelte';
	import LockIcon from '@lucide/svelte/icons/lock';

	let { data }: { data: PageData } = $props();
	let currentSettings = $state<Settings>(data.settings);

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
				<LockIcon class="size-5" />
			</div>
			<div>
				<h1 class="settings-title">Security Settings</h1>
				<p class="settings-description">Configure authentication methods, session policies, and security settings.</p>
			</div>
		</div>
	</div>

	<div class="settings-grid settings-grid-single">
		<SecuritySettingsForm settings={currentSettings} oidcStatus={data.oidcStatus} callback={updateSettingsConfig} />
	</div>
</div>
