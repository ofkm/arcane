<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import type { FormInput as FormInputType } from '$lib/types/form.type';
	import { Button } from '$lib/components/ui/button/index.js';
	import { RefreshCw, ImageMinus, Server, Save } from '@lucide/svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';
	import FormInput from '$lib/components/form/form-input.svelte';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	let isLoading = $state({
		saving: false
	});

	async function updateSettingsConfig(updatedSettings: Partial<Settings>) {
		currentSettings = await settingsAPI.updateSettings({
			...currentSettings,
			...updatedSettings
		});

		settingsStore.reload();
	}

	function handleDockerSettingUpdates() {
		isLoading.saving = true;
		updateSettingsConfig({
			dockerHost: dockerHostInput.value,
			pruneMode: 'all',
			autoUpdate: autoUpdateSwitch.value,
			pollingEnabled: pollingEnabledSwitch.value,
			pollingInterval: pollingIntervalInput.value,
			autoUpdateInterval: autoUpdateIntervalInput.value
		})
			.then(async () => {
				toast.success(`Settings Saved Successfully`);
				await invalidateAll();
			})
			.finally(() => {
				isLoading.saving = false;
			});
	}

	let pollingIntervalInput = $state<FormInputType<number>>({
		value: 0,
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	let pollingEnabledSwitch = $state<FormInputType<boolean>>({
		value: false,
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	let autoUpdateSwitch = $state<FormInputType<boolean>>({
		value: false,
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	let autoUpdateIntervalInput = $state<FormInputType<number>>({
		value: 5,
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	let dockerHostInput = $state<FormInputType<string>>({
		value: '',
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	$effect(() => {
		pollingIntervalInput.value = currentSettings.pollingInterval;
		pollingEnabledSwitch.value = currentSettings.pollingEnabled;
		autoUpdateSwitch.value = currentSettings.autoUpdate;
		autoUpdateIntervalInput.value = currentSettings.autoUpdateInterval;
		dockerHostInput.value = currentSettings.dockerHost;
	});
</script>

<svelte:head>
	<title>Docker Settings - Arcane</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Docker Settings</h1>
			<p class="text-sm text-muted-foreground mt-1">
				Configure Docker connection and automation settings
			</p>
		</div>

		<Button
			onclick={() => handleDockerSettingUpdates()}
			disabled={isLoading.saving}
			class="h-10 arcane-button-save"
		>
			{#if isLoading.saving}
				<RefreshCw class="animate-spin size-4" />
				Saving...
			{:else}
				<Save class="size-4" />
				Save Settings
			{/if}
		</Button>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<Card.Root class="border shadow-sm">
			<Card.Header class="pb-3">
				<div class="flex items-center gap-2">
					<div class="bg-blue-500/10 p-2 rounded-full">
						<Server class="text-blue-500 size-5" />
					</div>
					<div>
						<Card.Title>Docker Connection</Card.Title>
						<Card.Description>Configure Docker daemon connection settings</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="space-y-2">
						<FormInput
							bind:input={dockerHostInput}
							type="text"
							id="dockerHost"
							label="Docker Host"
							placeholder="unix:///var/run/docker.sock"
							description="For local Docker: unix:///var/run/docker.sock (Unix)"
						/>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<div class="space-y-6">
			<Card.Root class="border shadow-sm">
				<Card.Header class="pb-3">
					<div class="flex items-center gap-2">
						<div class="bg-amber-500/10 p-2 rounded-full">
							<RefreshCw class="text-amber-500 size-5" />
						</div>
						<div>
							<Card.Title>Image Polling</Card.Title>
							<Card.Description>Control container image polling</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
						<FormInput
							bind:input={pollingEnabledSwitch}
							type="switch"
							id="pollingEnabled"
							label="Check for New Images"
							description="Periodically check for newer versions of container images"
						/>
					</div>

					{#if currentSettings.pollingEnabled}
						<div class="space-y-2 px-1">
							<FormInput
								bind:input={pollingIntervalInput}
								type="number"
								id="pollingInterval"
								label="Polling Interval (Minutes)"
								placeholder="60"
								description="Set between 5-60 minutes."
							/>
						</div>

						<div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
							<FormInput
								bind:input={autoUpdateSwitch}
								type="switch"
								id="autoUpdateSwitch"
								label="Auto Update Containers"
								description="Automatically update containers when newer images are available"
							/>
						</div>

						{#if currentSettings.autoUpdate}
							<div class="space-y-2 mt-4">
								<FormInput
									bind:input={autoUpdateIntervalInput}
									type="number"
									id="autoUpdateInterval"
									label="Auto-update check interval (minutes)"
									placeholder="60"
									description="How often Arcane will check for container and stack updates (minimum 5 minutes, maximum 24 hours)"
								/>
							</div>
						{/if}
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root class="border shadow-sm">
				<Card.Header class="pb-3">
					<div class="flex items-center gap-2">
						<div class="bg-purple-500/10 p-2 rounded-full">
							<ImageMinus class="text-purple-500 size-5" />
						</div>
						<div>
							<Card.Title>Image Pruning</Card.Title>
							<Card.Description>Configure image prune behavior</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div>
						<Label for="pruneMode" class="text-base font-medium block mb-2"
							>Prune Action Behavior</Label
						>
						<RadioGroup.Root
							value={currentSettings.pruneMode}
							onValueChange={(val) => {
								settingsAPI.updateSettings({
									...currentSettings,
									pruneMode: val as 'all' | 'dangling'
								});
								settingsStore.reload();
							}}
							class="flex flex-col space-y-1"
							id="pruneMode"
						>
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value="all" id="prune-all" />
								<Label for="prune-all" class="font-normal"
									>All Unused Images (like `docker image prune -a`)</Label
								>
							</div>
							<div class="flex items-center space-x-2">
								<RadioGroup.Item value="dangling" id="prune-dangling" />
								<Label for="prune-dangling" class="font-normal"
									>Dangling Images Only (like `docker image prune`)</Label
								>
							</div>
						</RadioGroup.Root>
						<p class="text-xs text-muted-foreground mt-2">
							Select which images are removed by the "Prune Unused" action on the Images page.
						</p>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<!-- Hidden CSRF token if needed -->
	<input type="hidden" id="csrf_token" value={data.csrf} />
</div>
