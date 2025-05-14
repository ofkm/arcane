<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { Cog } from '@lucide/svelte';
	import type { PageData } from '../$types';
	import { settingsStore } from '$lib/stores/settings-store';
	import type { FormInput as FormInputType } from '$lib/types/form.type';

	let { data } = $props<{ data: PageData }>();

	// Initialize settings from page data once
	let initialized = false;
	$effect(() => {
		if (data.settings && !initialized) {
			settingsStore.update((current) => ({
				...current,
				...data.settings
			}));
			initialized = true;
		}
	});

	// Create local form state with initial values
	let stacksDirectoryInput = $state<FormInputType<string>>({
		value: $settingsStore.stacksDirectory || '',
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	let baseServerUrlInput = $state<FormInputType<string>>({
		value: $settingsStore.baseServerUrl || '',
		valid: true,
		touched: false,
		error: null,
		errors: []
	});

	let maturityThresholdInput = $state<FormInputType<number>>({
		value: $settingsStore.maturityThresholdDays || 30,
		valid: true,
		touched: false,
		error: null,
		errors: []
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
		// The value from the input element (via bind:input) might be a string.
		const rawValue = maturityThresholdInput.value;
		const numericValue = parseInt(String(rawValue), 10);

		if (!isNaN(numericValue)) {
			// Update the local state's value to be a number for type consistency
			maturityThresholdInput.value = numericValue;
			settingsStore.update((settings) => ({
				...settings,
				maturityThresholdDays: numericValue
			}));
			maturityThresholdInput.valid = true;
			maturityThresholdInput.error = null;
		} else {
			// If parsing fails (e.g., empty input), mark as invalid.
			// The maturityThresholdInput.value will remain the unparsed (e.g. empty string) value.
			maturityThresholdInput.valid = false;
			maturityThresholdInput.error = 'Please enter a valid whole number.';
			// The store is not updated with NaN.
		}
	}
</script>

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
					placeholder="/opt/arcane/stacks"
					required
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

				<FormInput bind:input={maturityThresholdInput} type="number" id="maturityThresholdDays" label="Image Maturity Threshold (days)" placeholder="30" required description="The number of days after an image release before it's considered 'matured'." warningText="Higher values mean more caution with new images." oninput={() => onMaturityThresholdChange()} />
			</div>
		</Card.Content>
	</Card.Root>
</div>
