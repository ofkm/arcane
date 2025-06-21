<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Cog, Save, RefreshCw, Folder, Globe, Calendar } from '@lucide/svelte';
	import type { FormInput as FormInputType } from '$lib/utils/form.utils';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	async function updateSettingsConfig(updatedSettings: Partial<Settings>) {
		currentSettings = await settingsAPI.updateSettings({
			...currentSettings,
			...updatedSettings
		});
		settingsStore.reload();
	}

	function handleGeneralSettingUpdates() {
		isLoading.saving = true;
		updateSettingsConfig({
			stacksDirectory: stacksDirectoryInput.value,
			baseServerUrl: baseServerUrlInput.value,
			maturityThresholdDays: maturityThresholdInput.value
		})
			.then(async () => {
				toast.success(`Settings Saved Successfully`);
				await invalidateAll();
			})
			.finally(() => {
				isLoading.saving = false;
			});
	}

	let stacksDirectoryInput = $state<FormInputType<string>>({
		value: '',
		error: null
	});

	let baseServerUrlInput = $state<FormInputType<string>>({
		value: '',
		error: null
	});

	let maturityThresholdInput = $state<FormInputType<number>>({
		value: 30,
		error: null
	});

	let isLoading = $state({
		saving: false
	});

	$effect(() => {
		stacksDirectoryInput.value = currentSettings.stacksDirectory;
		baseServerUrlInput.value = currentSettings.baseServerUrl || 'localhost';
		maturityThresholdInput.value = currentSettings.maturityThresholdDays;
	});
</script>

<svelte:head>
	<title>General Settings - Arcane</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">General Settings</h1>
			<p class="text-muted-foreground mt-1 text-sm">Core configuration for how Arcane operates and manages your containers</p>
		</div>

		<Button onclick={() => handleGeneralSettingUpdates()} disabled={isLoading.saving} class="h-10 min-w-[120px]">
			{#if isLoading.saving}
				<RefreshCw class="size-4 animate-spin" />
				Saving...
			{:else}
				<Save class="size-4" />
				Save Settings
			{/if}
		</Button>
	</div>

	<!-- Settings Cards -->
	<div class="grid gap-6">
		<!-- Storage Configuration -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-blue-500/10 p-2">
						<Folder class="size-5 text-blue-600" />
					</div>
					<div>
						<Card.Title>Storage Configuration</Card.Title>
						<Card.Description>Configure where Arcane stores stack files and data</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<FormInput label="Stacks Directory" placeholder="data/stacks" bind:input={stacksDirectoryInput} helpText="Directory where Docker Compose stack files are stored" />
			</Card.Content>
		</Card.Root>

		<!-- Network Configuration -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-green-500/10 p-2">
						<Globe class="size-5 text-green-600" />
					</div>
					<div>
						<Card.Title>Network Configuration</Card.Title>
						<Card.Description>Configure base server URL and network settings</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<FormInput label="Base Server URL" placeholder="localhost" bind:input={baseServerUrlInput} helpText="Base URL for accessing Arcane (used for webhooks and notifications)" />
			</Card.Content>
		</Card.Root>

		<!-- Container Management -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-purple-500/10 p-2">
						<Calendar class="size-5 text-purple-600" />
					</div>
					<div>
						<Card.Title>Container Management</Card.Title>
						<Card.Description>Configure container lifecycle and update policies</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<FormInput type="number" label="Image Maturity Threshold (Days)" placeholder="30" bind:input={maturityThresholdInput} helpText="Number of days to wait before considering an image update stable" />
			</Card.Content>
		</Card.Root>
	</div>
</div>
