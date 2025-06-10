<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Cog, Save, RefreshCw } from '@lucide/svelte';
	import type { FormInput as FormInputType } from '$lib/types/form.type';
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
		updateSettingsConfig({
			stacksDirectory: stacksDirectoryInput.value,
			baseServerUrl: baseServerUrlInput.value,
			maturityThresholdDays: maturityThresholdInput.value
		}).then(async () => {
			toast.success(`Settings Saved Successfully`);
			await invalidateAll();
		});
	}

	let stacksDirectoryInput = $state<FormInputType<string>>({
		value: '',
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	let baseServerUrlInput = $state<FormInputType<string>>({
		value: '',
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	let maturityThresholdInput = $state<FormInputType<number>>({
		value: 30,
		valid: true,
		touched: false,
		error: null,
		errors: []
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
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">General Settings</h1>
			<p class="text-muted-foreground mt-1 text-sm">Core configuration for how Arcane operates</p>
		</div>

		<Button
			onclick={() => handleGeneralSettingUpdates()}
			disabled={isLoading.saving}
			class="arcane-button-save h-10"
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

	<div class="grid auto-cols-auto gap-6 lg:auto-cols-auto">
		<Card.Root class="border shadow-sm">
			<Card.Header class="pb-3">
				<div class="flex items-center gap-2">
					<div class="bg-primary/10 rounded-full p-2">
						<Cog class="text-primary size-5" />
					</div>
					<div>
						<Card.Title>Core Arcane Configuration</Card.Title>
						<Card.Description>Essential settings for how Arcane operates.</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-6">
					<FormInput
						bind:input={stacksDirectoryInput}
						type="text"
						id="stacksDirectory"
						label="Stack Projects Directory"
						placeholder="data/stacks"
						description="The primary folder where Arcane will store and manage your Docker Compose stack projects. This path is inside Arcane's container."
						warningText="Important: Changing this path will not automatically move existing stack projects."
					/>

					<FormInput
						bind:input={baseServerUrlInput}
						type="text"
						id="baseServerUrl"
						label="Default Service Access URL"
						placeholder="localhost"
						description="When Arcane provides links to your services (e.g., web UIs), this URL (like 'localhost' or an IP address) is used as the default. This is primarily for services not on directly accessible networks (e.g., macvlan)."
					/>

					<FormInput
						bind:input={maturityThresholdInput}
						type="number"
						id="maturityThresholdDays"
						label="Image Maturity Threshold (days)"
						placeholder="30"
						description="The number of days after an image release before it's considered 'matured'."
						warningText="Higher values mean more caution with new images."
					/>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Hidden CSRF token if needed -->
	<input type="hidden" id="csrf_token" value={data.csrf} />
</div>
