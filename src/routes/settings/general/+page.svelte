<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Cog, Save, RefreshCw } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { settingsStore, saveSettingsToServer, updateSettingsStore } from '$lib/stores/settings-store';
	import type { FormInput as FormInputType } from '$lib/types/form.type';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';

	let { data }: { data: PageData } = $props();

	// Initialize form inputs
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

	// Loading states
	let isLoading = $state({
		saving: false
	});

	// Synchronize values when settings change
	$effect(() => {
		// Get the latest values from the store
		const settings = $settingsStore;

		// Update form inputs with values from the store
		stacksDirectoryInput.value = settings.stacksDirectory || 'data/stacks';
		baseServerUrlInput.value = settings.baseServerUrl || 'localhost';
		maturityThresholdInput.value = settings.maturityThresholdDays || 30;
	});

	// Initialize settings from page data once
	let initialized = false;
	$effect(() => {
		if (data.settings) {
			updateSettingsStore(data.settings);
		}
	});

	// No automatic syncing - just event handlers for changes
	function onStacksDirectoryChange() {
		stacksDirectoryInput.touched = true;
		settingsStore.update((settings) => ({
			...settings,
			stacksDirectory: stacksDirectoryInput.value
		}));
	}

	function onBaseServerUrlChange() {
		baseServerUrlInput.touched = true;
		settingsStore.update((settings) => ({
			...settings,
			baseServerUrl: baseServerUrlInput.value
		}));
	}

	function onMaturityThresholdChange() {
		maturityThresholdInput.touched = true;
		const rawValue = maturityThresholdInput.value;
		const numericValue = parseInt(String(rawValue), 10);

		if (!isNaN(numericValue)) {
			maturityThresholdInput.value = numericValue;
			settingsStore.update((settings) => ({
				...settings,
				maturityThresholdDays: numericValue
			}));
			maturityThresholdInput.valid = true;
			maturityThresholdInput.error = null;
		} else {
			maturityThresholdInput.valid = false;
			maturityThresholdInput.error = 'Please enter a valid whole number.';
		}
	}

	// Save settings function
	async function saveSettings() {
		if (isLoading.saving) return;
		isLoading.saving = true;

		handleApiResultWithCallbacks({
			result: await tryCatch(saveSettingsToServer()),
			message: 'Error Saving Settings',
			setLoadingState: (value) => (isLoading.saving = value),
			onSuccess: async () => {
				toast.success(`Settings Saved Successfully`);
				await invalidateAll();
			}
		});
	}
</script>

<svelte:head>
	<title>General Settings - Arcane</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">General Settings</h1>
			<p class="text-sm text-muted-foreground mt-1">Core configuration for how Arcane operates</p>
		</div>

		<Button onclick={saveSettings} disabled={isLoading.saving} class="h-10 arcane-button-save">
			{#if isLoading.saving}
				<RefreshCw class="animate-spin size-4" />
				Saving...
			{:else}
				<Save class="size-4" />
				Save Settings
			{/if}
		</Button>
	</div>

	<div class="grid auto-cols-auto lg:auto-cols-auto gap-6">
		<Card.Root class="border shadow-sm">
			<Card.Header class="pb-3">
				<div class="flex items-center gap-2">
					<div class="bg-primary/10 p-2 rounded-full">
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
						oninput={() => onStacksDirectoryChange()}
					/>

					<FormInput
						bind:input={baseServerUrlInput}
						type="text"
						id="baseServerUrl"
						label="Default Service Access URL"
						placeholder="localhost"
						description="When Arcane provides links to your services (e.g., web UIs), this URL (like 'localhost' or an IP address) is used as the default. This is primarily for services not on directly accessible networks (e.g., macvlan)."
						oninput={() => onBaseServerUrlChange()}
					/>

					<FormInput bind:input={maturityThresholdInput} type="number" id="maturityThresholdDays" label="Image Maturity Threshold (days)" placeholder="30" description="The number of days after an image release before it's considered 'matured'." warningText="Higher values mean more caution with new images." oninput={() => onMaturityThresholdChange()} />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Hidden CSRF token if needed -->
	<input type="hidden" id="csrf_token" value={data.csrf} />
</div>
