<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';
	import DockerSettingsForm from '../forms/docker-settings-form.svelte';

	let { data } = $props();
	let currentSettings = $state<Settings>(data.settings);

	let isLoading = $state({ saving: false, testing: false });

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

	// function handleDockerSettingUpdates() {
	// 	isLoading.saving = true;

	// 	const dataValidated = form.validate();
	// 	if (!dataValidated) {
	// 		isLoading.saving = false;
	// 		return;
	// 	}

	// 	updateSettingsConfig({
	// 		dockerPruneMode: dataValidated.dockerPruneMode,
	// 		autoUpdateEnabled: dataValidated.autoUpdateEnabled,
	// 		pollingEnabled: dataValidated.pollingEnabled,
	// 		pollingInterval: dataValidated.pollingInterval,
	// 		autoUpdateInterval: dataValidated.autoUpdateInterval
	// 	})
	// 		.then(() => {
	// 			toast.success(`Settings Saved Successfully`);
	// 		})
	// 		.catch((error) => {
	// 			toast.error('Failed to save settings');
	// 			console.error('Settings save error:', error);
	// 		})
	// 		.finally(() => {
	// 			isLoading.saving = false;
	// 		});
	// }

	let canSave = $derived(!isLoading.saving);
</script>

<div class="settings-page">
	<div class="space-y-8">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="space-y-1">
				<h1 class="settings-title text-3xl font-bold tracking-tight">Docker Settings</h1>
				<p class="settings-description text-muted-foreground max-w-2xl text-sm">
					Configure Docker automation behavior and container management settings
				</p>
			</div>

			<div class="settings-actions">
				<!-- <Button
					onclick={() => handleDockerSettingUpdates()}
					disabled={isLoading.saving || !canSave}
					class="arcane-button-save h-10 min-w-[140px]"
				>
					{#if isLoading.saving}
						<RefreshCwIcon class="size-4 animate-spin" />
						Saving...
					{:else}
						<SaveIcon class="size-4" />
						Save Settings
					{/if}
				</Button> -->
			</div>
		</div>

		<div class="settings-grid grid gap-6 md:grid-cols-1">
			<div class="grid grid-cols-1 gap-6">
				<Card.Root class="rounded-lg border shadow-sm">
					<Card.Header class="pb-2">
						<div class="flex items-center gap-3">
							<div class="rounded-md bg-emerald-500/10 p-2.5">
								<ClockIcon class="size-5 text-emerald-600" />
							</div>
							<div>
								<Card.Title class="text-lg">Docker Settings</Card.Title>
								<Card.Description class="text-sm">Control automatic image polling and updates</Card.Description>
							</div>
						</div>
					</Card.Header>
					<Card.Content class="space-y-6 pt-0">
						<DockerSettingsForm settings={currentSettings} callback={updateSettingsConfig} />
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
</div>
