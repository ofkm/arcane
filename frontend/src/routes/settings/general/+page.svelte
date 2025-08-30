<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import SaveIcon from '@lucide/svelte/icons/save';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import type { FormInput as FormInputType } from '$lib/utils/form.utils';
	import { toast } from 'svelte-sonner';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	async function updateSettingsConfig(updatedSettings: Partial<Settings>) {
		try {
			currentSettings = await settingsAPI.updateSettings({
				...currentSettings,
				...updatedSettings
			});
			settingsStore.set(currentSettings);
			settingsStore.reload();
		} catch (error) {
			console.error('Error updating settings:', error);
			throw error;
		}
	}

	function handleGeneralSettingUpdates() {
		isLoading.saving = true;
		updateSettingsConfig({
			stacksDirectory: projectsDirectoryInput.value,
			baseServerUrl: baseServerUrlInput.value
		})
			.then(async () => {
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

	let projectsDirectoryInput = $state<FormInputType<string>>({
		value: '',
		error: null
	});

	let baseServerUrlInput = $state<FormInputType<string>>({
		value: '',
		error: null
	});

	let isLoading = $state({
		saving: false
	});

	$effect(() => {
		const s = $settingsStore ?? currentSettings;
		if (!s) return;

		currentSettings = s;

		if (!isLoading.saving) {
			projectsDirectoryInput.value = s.stacksDirectory || '';
			baseServerUrlInput.value = s.baseServerUrl || 'localhost';
		}
	});
</script>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="space-y-1">
			<h1 class="text-3xl font-bold tracking-tight">General Settings</h1>
			<p class="text-muted-foreground max-w-2xl text-sm">
				Core configuration for how Arcane operates and manages your containers.
			</p>
		</div>

		<Button onclick={() => handleGeneralSettingUpdates()} disabled={isLoading.saving} class="h-10 min-w-[140px]">
			{#if isLoading.saving}
				<RefreshCwIcon class="size-4 animate-spin" />
				Saving...
			{:else}
				<SaveIcon class="size-4" />
				Save Settings
			{/if}
		</Button>
	</div>

	<!-- Settings Cards -->
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Storage Configuration -->
		<Card.Root class="rounded-lg border shadow-sm">
			<Card.Header class="pb-2">
				<div class="flex items-center gap-3">
					<div class="rounded-md bg-blue-500/10 p-2">
						<FolderIcon class="size-5 text-blue-600" />
					</div>
					<div>
						<Card.Title class="text-lg">Storage Configuration</Card.Title>
						<Card.Description class="text-sm">Configure where Arcane stores stack files and data</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="pt-0">
				<FormInput
					label="Projects Directory"
					placeholder="data/projects"
					bind:input={projectsDirectoryInput}
					helpText="Directory where Docker Compose files are stored (this is inside the container)"
				/>
			</Card.Content>
		</Card.Root>

		<!-- Network Configuration -->
		<Card.Root class="rounded-lg border shadow-sm">
			<Card.Header class="pb-2">
				<div class="flex items-center gap-3">
					<div class="rounded-md bg-green-500/10 p-2">
						<GlobeIcon class="size-5 text-green-600" />
					</div>
					<div>
						<Card.Title class="text-lg">Network Configuration</Card.Title>
						<Card.Description class="text-sm">Configure base server URL and network settings</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="pt-0">
				<FormInput
					label="Base Server URL"
					placeholder="localhost"
					bind:input={baseServerUrlInput}
					helpText="Base URL for accessing Arcane (used for webhooks and notifications)"
				/>
			</Card.Content>
		</Card.Root>
	</div>
</div>
