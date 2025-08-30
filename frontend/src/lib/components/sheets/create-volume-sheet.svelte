<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import type { VolumeCreateOptions } from 'dockerode';
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import SelectWithLabel from '../form/select-with-label.svelte';

	type CreateVolumeFormProps = {
		open: boolean;
		onSubmit: (data: VolumeCreateOptions) => void;
		isLoading: boolean;
	};

	let { open = $bindable(false), onSubmit, isLoading }: CreateVolumeFormProps = $props();

	const drivers = [
		{ value: 'local', label: 'Local' },
		{ value: 'nfs', label: 'NFS' },
		{ value: 'awsElasticBlockStore', label: 'AWS EBS' },
		{ value: 'azure_disk', label: 'Azure Disk' },
		{ value: 'gcePersistentDisk', label: 'GCE Persistent Disk' }
	];

	const formSchema = z.object({
		volumeName: z.string().min(1, 'Volume name is required'),
		volumeDriver: z.string().min(1, 'Driver is required'),
		volumeOptText: z.string().optional().default(''),
		volumeLabels: z.string().optional().default('')
	});

	let formData = $derived({
		volumeName: '',
		volumeDriver: 'local',
		volumeOptText: '',
		volumeLabels: ''
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	function parseKeyValuePairs(text: string): Record<string, string> {
		if (!text?.trim()) return {};

		const result: Record<string, string> = {};
		const lines = text.split('\n');

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || !trimmed.includes('=')) continue;

			const [key, ...valueParts] = trimmed.split('=');
			const value = valueParts.join('=');

			if (key.trim()) {
				result[key.trim()] = value.trim();
			}
		}

		return result;
	}

	function handleSubmit() {
		const data = form.validate();
		if (!data) return;

		const driverOpts = parseKeyValuePairs(data.volumeOptText || '');
		const labels = parseKeyValuePairs(data.volumeLabels || '');

		const volumeOptions: VolumeCreateOptions = {
			Name: data.volumeName.trim(),
			Driver: data.volumeDriver,
			DriverOpts: Object.keys(driverOpts).length ? driverOpts : undefined,
			Labels: Object.keys(labels).length ? labels : undefined
		};

		onSubmit(volumeOptions);
	}

	function handleOpenChange(newOpenState: boolean) {
		open = newOpenState;
		if (!newOpenState) {
			$inputs.volumeName.value = '';
			$inputs.volumeDriver.value = 'local';
			$inputs.volumeOptText.value = '';
			$inputs.volumeLabels.value = '';
		}
	}
</script>

<Sheet.Root bind:open onOpenChange={handleOpenChange}>
	<Sheet.Content class="p-6">
		<Sheet.Header class="space-y-3 border-b pb-6">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
					<HardDriveIcon class="text-primary size-5" />
				</div>
				<div>
					<Sheet.Title data-testid="create-volume-header" class="text-xl font-semibold">Create New Volume</Sheet.Title>
					<Sheet.Description class="text-muted-foreground mt-1 text-sm"
						>Enter the details for the new Docker volume.</Sheet.Description
					>
				</div>
			</div>
		</Sheet.Header>

		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
			<FormInput
				label="Volume Name *"
				id="volume-name"
				type="text"
				placeholder="e.g., my-app-data"
				description="Unique name for the volume"
				disabled={isLoading}
				bind:input={$inputs.volumeName}
			/>

			<SelectWithLabel
				id="driver-select"
				bind:value={$inputs.volumeDriver.value}
				label="Volume Driver"
				description="Choose the storage driver for your volume"
				options={drivers}
				placeholder="Select a driver"
			/>

			<Accordion.Root type="single" class="w-full">
				<Accordion.Item value="advanced">
					<Accordion.Trigger class="text-sm font-medium">Advanced Settings</Accordion.Trigger>
					<Accordion.Content class="pt-4">
						<div class="space-y-4">
							<FormInput
								label="Driver Options"
								type="textarea"
								placeholder="key=value&#10;key2=value2"
								description="Enter driver-specific options as key=value pairs, one per line"
								disabled={isLoading}
								rows={3}
								bind:input={$inputs.volumeOptText}
							/>

							<FormInput
								label="Labels"
								type="textarea"
								placeholder="com.example.description=Production data&#10;com.example.department=Finance"
								description="Enter metadata labels as key=value pairs, one per line"
								disabled={isLoading}
								rows={3}
								bind:input={$inputs.volumeLabels}
							/>
						</div>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>

			<Sheet.Footer class="flex flex-row gap-2">
				<Button
					type="button"
					class="arcane-button-cancel flex-1"
					variant="outline"
					onclick={() => (open = false)}
					disabled={isLoading}>Cancel</Button
				>
				<Button type="submit" class="arcane-button-create flex-1" disabled={isLoading}>
					{#if isLoading}
						<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
						Creating...
					{:else}
						<HardDriveIcon class="mr-2 size-4" />
						Create Volume
					{/if}
				</Button>
			</Sheet.Footer>
		</form>
	</Sheet.Content>
</Sheet.Root>
