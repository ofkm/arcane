<script lang="ts">
	import type { PageData } from './$types';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';
	import SecuritySettingsForm from '../forms/security-settings-form.svelte';
	import LockIcon from '@lucide/svelte/icons/lock';
	import { m } from '$lib/paraglide/messages';

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

<div class="settings-page px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
	<div
		class="from-background/60 via-background/40 to-background/60 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 sm:p-6 shadow-sm"
	>
		<div class="bg-primary/10 pointer-events-none absolute -right-10 -top-10 size-40 rounded-full blur-3xl"></div>
		<div class="bg-muted/40 pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full blur-3xl"></div>
		<div class="relative flex items-start gap-3 sm:gap-4">
			<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 sm:size-10 items-center justify-center rounded-lg ring-1 shrink-0">
				<LockIcon class="size-4 sm:size-5" />
			</div>
			<div class="min-w-0">
				<h1 class="settings-title text-xl sm:text-3xl">{m.security_title()}</h1>
				<p class="settings-description text-sm sm:text-base">{m.security_description()}</p>
			</div>
		</div>
	</div>

	<div class="settings-grid settings-grid-single mt-6 sm:mt-8">
		<SecuritySettingsForm settings={currentSettings} oidcStatus={data.oidcStatus} callback={updateSettingsConfig} />
	</div>
</div>
