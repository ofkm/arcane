<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import ImageMinusIcon from '@lucide/svelte/icons/image-minus';
	import SaveIcon from '@lucide/svelte/icons/save';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import InfoIcon from '@lucide/svelte/icons/info';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { toast } from 'svelte-sonner';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { z } from 'zod/v4';
	import { createForm } from '$lib/utils/form.utils';

	let { data } = $props();
	let currentSettings = $state<Settings>(data.settings);

	let isLoading = $state({ saving: false, testing: false });

	const formSchema = z.object({
		pollingEnabled: z.boolean(),
		pollingInterval: z.number().int(),
		autoUpdateEnabled: z.boolean(),
		autoUpdateInterval: z.number().int(),
		dockerPruneMode: z.enum(['all', 'dangling'])
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, currentSettings));

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

	function handleDockerSettingUpdates() {
		isLoading.saving = true;

		const dataValidated = form.validate();
		if (!dataValidated) {
			isLoading.saving = false;
			return;
		}

		updateSettingsConfig({
			dockerPruneMode: dataValidated.dockerPruneMode,
			autoUpdateEnabled: dataValidated.autoUpdateEnabled,
			pollingEnabled: dataValidated.pollingEnabled,
			pollingInterval: dataValidated.pollingInterval,
			autoUpdateInterval: dataValidated.autoUpdateInterval
		})
			.then(() => {
				toast.success(`Settings Saved Successfully`);
			})
			.catch((error) => {
				toast.error('Failed to save settings');
				console.error('Settings save error:', error);
			})
			.finally(() => {
				isLoading.saving = false;
			});
	}

	let pruneModeValue = $derived($formInputs.dockerPruneMode.value);
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
				<Button
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
				</Button>
			</div>
		</div>

		{#if $formInputs.autoUpdateEnabled.value && $formInputs.pollingEnabled.value}
			<div class="settings-alert">
				<Alert.Root variant="warning">
					<ZapIcon class="size-4" />
					<Alert.Title>Auto-update Enabled</Alert.Title>
					<Alert.Description>Automatic container updates are active with polling enabled</Alert.Description>
				</Alert.Root>
			</div>
		{/if}

		<div class="settings-grid grid gap-6 md:grid-cols-1">
			<div class="grid grid-cols-1 gap-6">
				<Card.Root class="rounded-lg border shadow-sm">
					<Card.Header class="pb-2">
						<div class="flex items-center gap-3">
							<div class="rounded-md bg-emerald-500/10 p-2.5">
								<ClockIcon class="size-5 text-emerald-600" />
							</div>
							<div>
								<Card.Title class="text-lg">Image Automation</Card.Title>
								<Card.Description class="text-sm">Control automatic image polling and updates</Card.Description>
							</div>
						</div>
					</Card.Header>
					<Card.Content class="space-y-6 pt-0">
						<FormInput
							bind:input={$formInputs.pollingEnabled}
							type="switch"
							id="pollingEnabled"
							label="Enable Image Polling"
							description="Periodically check registries for newer image versions"
						/>

						{#if $formInputs.pollingEnabled.value}
							<div class="space-y-4 pl-4">
								<FormInput
									bind:input={$formInputs.pollingInterval}
									type="number"
									id="pollingInterval"
									label="Polling Interval (minutes)"
									placeholder="60"
									description="How often to check for new images (5-1440 minutes)"
								/>

								{#if $formInputs.pollingInterval.value < 30}
									<Alert.Root variant="warning">
										<ZapIcon class="size-4" />
										<Alert.Title>Rate Limiting Warning</Alert.Title>
										<Alert.Description
											>Polling intervals below 30 minutes may trigger rate limits on Docker registries, potentially blocking your
											account temporarily. Consider using longer intervals for production environments.</Alert.Description
										>
									</Alert.Root>
								{/if}

								<FormInput
									bind:input={$formInputs.autoUpdateEnabled}
									type="switch"
									id="autoUpdateSwitch"
									label="Auto-update Containers"
									description="Automatically update containers when newer images are found"
								/>

								{#if $formInputs.autoUpdateEnabled.value}
									<div class="pl-4">
										<FormInput
											bind:input={$formInputs.autoUpdateInterval}
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
										{#if $formInputs.autoUpdateEnabled.value}
											<li>Images checked every {$formInputs.pollingInterval.value || 60} minutes</li>
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

			<Card.Root class="rounded-lg border shadow-sm">
				<Card.Header class="pb-2">
					<div class="flex items-center gap-3">
						<div class="rounded-md bg-purple-500/10 p-2.5">
							<ImageMinusIcon class="size-5 text-purple-600" />
						</div>
						<div>
							<Card.Title class="text-lg">Image Pruning</Card.Title>
							<Card.Description class="text-sm">Configure cleanup behavior for unused Docker images</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="pt-0">
					<div class="space-y-4">
						<Label for="pruneMode" class="text-base font-medium">Prune Action Behavior</Label>

						<RadioGroup.Root
							value={$formInputs.dockerPruneMode.value}
							onValueChange={(val) => {
								$formInputs.dockerPruneMode.value = val as 'all' | 'dangling';
								updateSettingsConfig({ dockerPruneMode: $formInputs.dockerPruneMode.value }).catch((error) => {
									toast.error('Failed to update prune mode');
									console.error('Error updating prune mode:', error);
								});
							}}
							class="space-y-3"
							id="pruneMode"
						>
							<div class="hover:bg-muted/50 flex items-start space-x-3 rounded-lg border p-3 transition-colors">
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

							<div class="hover:bg-muted/50 flex items-start space-x-3 rounded-lg border p-3 transition-colors">
								<RadioGroup.Item value="dangling" id="prune-dangling" class="mt-0.5" />
								<div class="space-y-1">
									<Label for="prune-dangling" class="cursor-pointer font-medium">Dangling Images Only</Label>
									<p class="text-muted-foreground text-sm">
										Remove only untagged images (equivalent to <code class="bg-background rounded px-1 py-0.5 text-xs"
											>docker image prune</code
										>)
									</p>
								</div>
							</div>
						</RadioGroup.Root>

						<div class="bg-muted/50 rounded-lg p-3">
							<p class="text-muted-foreground text-sm">
								<strong>Note:</strong> This setting affects the "Prune Unused Images" action on the Images page.
								{pruneModeValue === 'all'
									? 'All unused images will be removed, which frees up more space but may require re-downloading images later.'
									: 'Only dangling images will be removed, which is safer but may leave some unused images behind.'}
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
