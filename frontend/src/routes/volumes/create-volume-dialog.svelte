<script lang="ts">
	import { preventDefault } from '$lib/utils/form.utils';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import type { VolumeCreateOptions } from 'dockerode';
	import ArcaneButton from '$lib/components/arcane-button.svelte';

	interface Props {
		open?: boolean;
		isCreating?: boolean;
		onSubmit?: (data: VolumeCreateOptions) => void;
	}

	let { open = $bindable(false), isCreating = false, onSubmit = () => {} }: Props = $props();

	let volumeCreateStates = $state({
		volumeName: '',
		volumeDriver: 'local',
		volumeOptText: '',
		volumeLabels: ''
	});

	const drivers = [
		{ label: 'Local', value: 'local' },
		{ label: 'NFS', value: 'nfs' },
		{ label: 'AWS EBS', value: 'awsElasticBlockStore' },
		{ label: 'Azure Disk', value: 'azure_disk' },
		{ label: 'GCE Persistent Disk', value: 'gcePersistentDisk' }
	];

	function parseKeyValuePairs(text: string): Record<string, string> {
		if (!text.trim()) return {};

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
		if (!volumeCreateStates.volumeName.trim()) return;

		const driverOpts = parseKeyValuePairs(volumeCreateStates.volumeOptText);
		const labels = parseKeyValuePairs(volumeCreateStates.volumeLabels);

		const volumeOptions: VolumeCreateOptions = {
			Name: volumeCreateStates.volumeName.trim(),
			Driver: volumeCreateStates.volumeDriver,
			DriverOpts: Object.keys(driverOpts).length ? driverOpts : undefined,
			Labels: Object.keys(labels).length ? labels : undefined
		};

		onSubmit(volumeOptions);
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Create New Volume</Dialog.Title>
			<Dialog.Description>Enter the details for the new Docker volume.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="volume-name" class="text-right">Name</Label>
				<Input id="volume-name" bind:value={volumeCreateStates.volumeName} class="col-span-3" placeholder="e.g., my-app-data" required disabled={isCreating} />
			</div>

			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="volume-driver" class="text-right">Driver</Label>
				<div class="col-span-3">
					<Select.Root type="single" bind:value={volumeCreateStates.volumeDriver} disabled={isCreating}>
						<Select.Trigger class="w-full">
							<span>{drivers.find((d) => d.value === volumeCreateStates.volumeDriver)?.label || 'Select a driver'}</span>
						</Select.Trigger>
						<Select.Content>
							{#each drivers as driverOption (driverOption.value)}
								<Select.Item value={driverOption.value}>
									{driverOption.label}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<Accordion.Root type="single">
				<Accordion.Item value="advanced">
					<Accordion.Trigger>Advanced Settings</Accordion.Trigger>
					<Accordion.Content>
						<div class="grid gap-4 pt-2">
							<div>
								<Label for="driver-opts">Driver Options</Label>
								<Textarea id="driver-opts" bind:value={volumeCreateStates.volumeOptText} placeholder="key=value&#10;key2=value2" disabled={isCreating} />
								<p class="text-xs text-muted-foreground mt-1">Enter driver-specific options as key=value pairs, one per line</p>
							</div>
							<div>
								<Label for="labels">Labels</Label>
								<Textarea id="labels" bind:value={volumeCreateStates.volumeLabels} placeholder="com.example.description=Production data&#10;com.example.department=Finance" disabled={isCreating} />
								<p class="text-xs text-muted-foreground mt-1">Enter metadata labels as key=value pairs, one per line</p>
							</div>
						</div>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</form>

		<Dialog.Footer>
			<ArcaneButton action="cancel" onClick={() => (open = false)} disabled={isCreating} />

			<ArcaneButton action="create" customLabel="Create Volume" onClick={handleSubmit} loading={isCreating} loadingLabel="Creating..." disabled={isCreating || !volumeCreateStates.volumeName.trim()} />
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
