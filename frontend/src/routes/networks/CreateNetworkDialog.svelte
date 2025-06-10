<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { X } from '@lucide/svelte';
	import type { NetworkCreateOptions } from 'dockerode';
	import { preventDefault } from '$lib/utils/form.utils';
	import ArcaneButton from '$lib/components/arcane-button.svelte';

	type Props = {
		open: boolean;
		isCreating: boolean;
		onSubmit: (options: NetworkCreateOptions) => void;
	};

	let { open = $bindable(), isCreating = false, onSubmit }: Props = $props();

	let name = $state('');
	let driver = $state('bridge');
	let checkDuplicate = $state(true);
	let internal = $state(false);
	let labels = $state<{ key: string; value: string }[]>([{ key: '', value: '' }]);
	let enableIpam = $state(false);
	let subnet = $state('');
	let gateway = $state('');

	function addLabel() {
		labels = [...labels, { key: '', value: '' }];
	}

	function removeLabel(index: number) {
		labels = labels.filter((_, i) => i !== index);
	}

	function handleSubmit() {
		const finalLabels: Record<string, string> = {};
		labels.forEach((label) => {
			if (label.key.trim()) {
				finalLabels[label.key.trim()] = label.value.trim();
			}
		});

		const options: NetworkCreateOptions = {
			Name: name.trim(),
			Driver: driver,
			CheckDuplicate: checkDuplicate,
			Internal: internal,
			Labels: Object.keys(finalLabels).length > 0 ? finalLabels : undefined
		};

		if (enableIpam && (subnet.trim() || gateway.trim())) {
			const ipamConfig: { Subnet?: string; Gateway?: string } = {};
			const trimmedSubnet = subnet.trim();
			const trimmedGateway = gateway.trim();

			if (trimmedSubnet) {
				ipamConfig.Subnet = trimmedSubnet;
			}
			if (trimmedGateway) {
				ipamConfig.Gateway = trimmedGateway;
			}

			if (Object.keys(ipamConfig).length > 0) {
				options.IPAM = {
					Driver: 'default',
					Config: [ipamConfig]
				};
			}
		}

		onSubmit(options);
	}

	$effect(() => {
		if (!open) {
			name = '';
			driver = 'bridge';
			checkDuplicate = true;
			internal = false;
			labels = [{ key: '', value: '' }];
			enableIpam = false;
			subnet = '';
			gateway = '';
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title data-testid="create-network-dialog-header">Create Network</Dialog.Title>
			<Dialog.Description>Configure and create a new Docker network.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="network-name" class="text-right">Name</Label>
				<Input
					id="network-name"
					bind:value={name}
					required
					class="col-span-3"
					placeholder="e.g., my-app-network"
					disabled={isCreating}
				/>
			</div>

			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="network-driver" class="text-right">Driver</Label>
				<Select.Root type="single" bind:value={driver}>
					<Select.Trigger class="col-span-3" id="network-driver" disabled={isCreating}>
						<span>{driver}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="bridge">bridge</Select.Item>
						<Select.Item value="overlay">overlay</Select.Item>
						<Select.Item value="macvlan">macvlan</Select.Item>
						<Select.Item value="ipvlan">ipvlan</Select.Item>
						<Select.Item value="none">none</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>

			<div class="grid grid-cols-4 items-center gap-4">
				<span class="text-right text-sm font-medium">Options</span>
				<div class="col-span-3 flex items-center space-x-4">
					<div class="flex items-center space-x-2">
						<Checkbox id="check-duplicate" bind:checked={checkDuplicate} disabled={isCreating} />
						<Label for="check-duplicate" class="text-sm font-normal">Check Duplicate</Label>
					</div>
					<div class="flex items-center space-x-2">
						<Checkbox id="internal" bind:checked={internal} disabled={isCreating} />
						<Label for="internal" class="text-sm font-normal">Internal</Label>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-4 items-start gap-4">
				<Label class="pt-2 text-right">Labels</Label>
				<div class="col-span-3 space-y-2">
					{#each labels as label, index (index)}
						<div class="flex items-center gap-2">
							<Input
								placeholder="Key"
								bind:value={label.key}
								class="flex-1"
								disabled={isCreating}
							/>
							<Input
								placeholder="Value"
								bind:value={label.value}
								class="flex-1"
								disabled={isCreating}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onclick={() => removeLabel(index)}
								disabled={isCreating || labels.length <= 1}
								class="text-destructive hover:text-destructive"
								title="Remove Label"
							>
								<X class="size-4" />
							</Button>
						</div>
					{/each}
					<ArcaneButton
						action="create"
						customLabel="Add Label"
						onClick={addLabel}
						disabled={isCreating}
						size="sm"
					/>
				</div>
			</div>

			<div class="mt-2 grid grid-cols-4 items-start gap-4 border-t pt-4">
				<div class="col-span-4 flex items-center space-x-2">
					<Checkbox id="enable-ipam" bind:checked={enableIpam} disabled={isCreating} />
					<Label for="enable-ipam" class="text-sm font-medium">Enable IPAM Configuration</Label>
				</div>
				{#if enableIpam}
					<div class="col-span-4 grid grid-cols-4 items-center gap-4">
						<Label for="subnet" class="text-right">Subnet</Label>
						<Input
							id="subnet"
							bind:value={subnet}
							placeholder="e.g., 172.20.0.0/16"
							class="col-span-3"
							disabled={isCreating}
						/>
					</div>
					<div class="col-span-4 grid grid-cols-4 items-center gap-4">
						<Label for="gateway" class="text-right">Gateway</Label>
						<Input
							id="gateway"
							bind:value={gateway}
							placeholder="e.g., 172.20.0.1"
							class="col-span-3"
							disabled={isCreating}
						/>
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<ArcaneButton action="cancel" onClick={() => (open = false)} disabled={isCreating} />
				<ArcaneButton
					action="create"
					customLabel="Create Network"
					onClick={handleSubmit}
					loading={isCreating}
					loadingLabel="Creating..."
					disabled={isCreating || !name.trim()}
				/>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
