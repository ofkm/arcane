<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import type { FormInput as FormInputType } from '$lib/utils/form.utils';
	import { Button } from '$lib/components/ui/button/index.js';
	import { RefreshCw, ImageMinus, Save, Clock, Zap, InfoIcon } from '@lucide/svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';
	import FormInput from '$lib/components/form/form-input.svelte';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	let isLoading = $state({
		saving: false,
		testing: false
	});

	async function updateSettingsConfig(updatedSettings: Partial<Settings>) {
		try {
			currentSettings = await settingsAPI.updateSettings({
				...currentSettings,
				...updatedSettings
			});
			settingsStore.reload();
		} catch (error) {
			console.error('Error updating settings:', error);
			throw error;
		}
	}

	function handleDockerSettingUpdates() {
		isLoading.saving = true;
		updateSettingsConfig({
			dockerPruneMode: 'all',
			autoUpdateEnabled: autoUpdateSwitch.value,
			pollingEnabled: pollingEnabledSwitch.value,
			pollingInterval: pollingIntervalInput.value,
			autoUpdateInterval: autoUpdateIntervalInput.value
		})
			.then(async () => {
				toast.success(`Settings Saved Successfully`);
				await invalidateAll();
			})
			.catch((error) => {
				toast.error('Failed to save settings');
				console.error('Settings save error:', error);
			})
			.finally(() => {
				isLoading.saving = false;
			});
	}

	let pollingIntervalInput = $state<FormInputType<number>>({
		value: 0,
		error: null
	});

	let pollingEnabledSwitch = $state<FormInputType<boolean>>({
		value: false,
		error: null
	});

	let autoUpdateSwitch = $state<FormInputType<boolean>>({
		value: false,
		error: null
	});

	let autoUpdateIntervalInput = $state<FormInputType<number>>({
		value: 5,
		error: null
	});

	$effect(() => {
		pollingIntervalInput.value = currentSettings.pollingInterval || 60;
		pollingEnabledSwitch.value = currentSettings.pollingEnabled || false;
		autoUpdateSwitch.value = currentSettings.autoUpdateEnabled || false;
		autoUpdateIntervalInput.value = currentSettings.autoUpdateInterval || 60;
	});

	let isPollingConfigValid = $derived(
		!pollingEnabledSwitch.value ||
			(pollingIntervalInput.value >= 5 && pollingIntervalInput.value <= 1440)
	);

	let isAutoUpdateConfigValid = $derived(
		!autoUpdateSwitch.value ||
			(autoUpdateIntervalInput.value >= 5 && autoUpdateIntervalInput.value <= 1440)
	);

	let canSave = $derived(isPollingConfigValid && isAutoUpdateConfigValid);
</script>

<div class="settings-page">
	<!-- Header Section -->
	<div class="settings-header">
		<div class="settings-header-content">
			<h1 class="settings-title">Docker Settings</h1>
			<p class="settings-description">
				Configure Docker automation behavior and container management settings
			</p>
		</div>

		<div class="settings-actions">
			<Button
				onclick={() => handleDockerSettingUpdates()}
				disabled={isLoading.saving || !canSave}
				class="arcane-button-save"
			>
				{#if isLoading.saving}
					<RefreshCw class="size-4 animate-spin" />
					Saving...
				{:else}
					<Save class="size-4" />
					Save Settings
				{/if}
			</Button>
		</div>
	</div>

	<!-- Alert Section -->
	{#if currentSettings.autoUpdateEnabled && currentSettings.pollingEnabled}
		<div class="settings-alert">
			<Alert.Root variant="warning">
				<Zap class="size-4" />
				<Alert.Title>Auto-update Enabled</Alert.Title>
				<Alert.Description
					>Automatic container updates are active with polling enabled</Alert.Description
				>
			</Alert.Root>
		</div>
	{/if}

	<!-- Settings Grid -->
	<div class="settings-grid settings-grid-single">
		<div class="grid grid-cols-1 gap-6">
			<Card.Root class="border shadow-sm">
				<Card.Header class="pb-4">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-emerald-500/10 p-2.5">
							<Clock class="size-5 text-emerald-600" />
						</div>
						<div>
							<Card.Title class="text-lg">Image Automation</Card.Title>
							<Card.Description>Control automatic image polling and updates</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="space-y-6">
					<FormInput
						bind:input={pollingEnabledSwitch}
						type="switch"
						id="pollingEnabled"
						label="Enable Image Polling"
						description="Periodically check registries for newer image versions"
					/>

					{#if currentSettings.pollingEnabled}
						<div class="space-y-4 pl-4">
							<FormInput
								bind:input={pollingIntervalInput}
								type="number"
								id="pollingInterval"
								label="Polling Interval (minutes)"
								placeholder="60"
								description="How often to check for new images (5-1440 minutes)"
							/>

							{#if pollingIntervalInput.value < 30}
								<Alert.Root variant="warning">
									<Zap class="size-4" />
									<Alert.Title>Rate Limiting Warning</Alert.Title>
									<Alert.Description
										>Polling intervals below 30 minutes may trigger rate limits on Docker
										registries, potentially blocking your account temporarily. Consider using longer
										intervals for production environments.</Alert.Description
									>
								</Alert.Root>
							{/if}

							<FormInput
								bind:input={autoUpdateSwitch}
								type="switch"
								id="autoUpdateSwitch"
								label="Auto-update Containers"
								description="Automatically update containers when newer images are found"
							/>

							{#if currentSettings.autoUpdateEnabled}
								<div class="pl-4">
									<FormInput
										bind:input={autoUpdateIntervalInput}
										type="number"
										id="autoUpdateInterval"
										label="Auto-update Interval (minutes)"
										placeholder="60"
										description="How often to perform automatic updates (5-1440 minutes)"
									/>
								</div>
							{/if}
						</div>

						<Alert.Root>
							<InfoIcon />
							<Alert.Title>Automation Summary</Alert.Title>
							<Alert.Description>
								<ul class="list-inside list-disc text-sm">
									{#if currentSettings.autoUpdateEnabled}
										<li>Images checked every {pollingIntervalInput.value || 60} minutes</li>
									{:else}
										<li>Manual updates only (auto-update disabled)</li>
									{/if}
								</ul>
							</Alert.Description>
						</Alert.Root>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<Card.Root>
			<Card.Header class="pb-4">
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-purple-500/10 p-2.5">
						<ImageMinus class="size-5 text-purple-600" />
					</div>
					<div>
						<Card.Title class="text-lg">Image Pruning</Card.Title>
						<Card.Description>Configure cleanup behavior for unused Docker images</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<Label for="pruneMode" class="text-base font-medium">Prune Action Behavior</Label>

					<RadioGroup.Root
						value={currentSettings.dockerPruneMode || 'all'}
						onValueChange={(val) => {
							updateSettingsConfig({
								dockerPruneMode: val as 'all' | 'dangling'
							}).catch((error) => {
								toast.error('Failed to update prune mode');
								console.error('Error updating prune mode:', error);
							});
						}}
						class="space-y-3"
						id="pruneMode"
					>
						<div
							class="hover:bg-muted/50 flex items-start space-x-3 rounded-lg border p-3 transition-colors"
						>
							<RadioGroup.Item value="all" id="prune-all" class="mt-0.5" />
							<div class="space-y-1">
								<Label for="prune-all" class="cursor-pointer font-medium">All Unused Images</Label>
								<p class="text-muted-foreground text-sm">
									Remove all images not referenced by containers (equivalent to <code
										class="bg-background rounded px-1 py-0.5 text-xs">docker image prune -a</code
									>)
								</p>
							</div>
						</div>

						<div
							class="hover:bg-muted/50 flex items-start space-x-3 rounded-lg border p-3 transition-colors"
						>
							<RadioGroup.Item value="dangling" id="prune-dangling" class="mt-0.5" />
							<div class="space-y-1">
								<Label for="prune-dangling" class="cursor-pointer font-medium"
									>Dangling Images Only</Label
								>
								<p class="text-muted-foreground text-sm">
									Remove only untagged images (equivalent to <code
										class="bg-background rounded px-1 py-0.5 text-xs">docker image prune</code
									>)
								</p>
							</div>
						</div>
					</RadioGroup.Root>

					<div class="bg-muted/50 rounded-lg p-3">
						<p class="text-muted-foreground text-sm">
							<strong>Note:</strong> This setting affects the "Prune Unused Images" action on the
							Images page.
							{(currentSettings.dockerPruneMode || 'all') === 'all'
								? 'All unused images will be removed, which frees up more space but may require re-downloading images later.'
								: 'Only dangling images will be removed, which is safer but may leave some unused images behind.'}
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
