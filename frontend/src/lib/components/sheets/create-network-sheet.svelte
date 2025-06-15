<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Loader2, Network, X } from '@lucide/svelte';
	import type { NetworkCreateOptions } from 'dockerode';
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import SelectWithLabel from '../form/select-with-label.svelte';

	type CreateNetworkFormProps = {
		open: boolean;
		onSubmit: (data: NetworkCreateOptions) => void;
		isLoading: boolean;
	};

	let { open = $bindable(false), onSubmit, isLoading }: CreateNetworkFormProps = $props();

	const drivers = [
		{ value: 'bridge', label: 'Bridge' },
		{ value: 'overlay', label: 'Overlay' },
		{ value: 'macvlan', label: 'Macvlan' },
		{ value: 'ipvlan', label: 'IPvlan' },
		{ value: 'none', label: 'None' }
	];

	const formSchema = z.object({
		networkName: z.string().min(1, 'Network name is required'),
		networkDriver: z.string().min(1, 'Driver is required'),
		checkDuplicate: z.boolean().default(true),
		internal: z.boolean().default(false),
		networkLabels: z.string().optional().default(''),
		enableIpam: z.boolean().default(false),
		subnet: z.string().optional().default(''),
		gateway: z.string().optional().default('')
	});

	let formData = $derived({
		networkName: '',
		networkDriver: 'bridge',
		checkDuplicate: true,
		internal: false,
		networkLabels: '',
		enableIpam: false,
		subnet: '',
		gateway: ''
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	// Dynamic labels state for the key-value pairs
	let labels = $state<{ key: string; value: string }[]>([{ key: '', value: '' }]);

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

	function addLabel() {
		labels = [...labels, { key: '', value: '' }];
	}

	function removeLabel(index: number) {
		labels = labels.filter((_, i) => i !== index);
	}

	function handleSubmit() {
		const data = form.validate();
		if (!data) return;

		// Combine textarea labels with dynamic labels
		const textareaLabels = parseKeyValuePairs(data.networkLabels || '');
		const dynamicLabels: Record<string, string> = {};

		labels.forEach((label) => {
			if (label.key.trim()) {
				dynamicLabels[label.key.trim()] = label.value.trim();
			}
		});

		const finalLabels = { ...textareaLabels, ...dynamicLabels };

		const options: NetworkCreateOptions = {
			Name: data.networkName.trim(),
			Driver: data.networkDriver,
			CheckDuplicate: data.checkDuplicate,
			Internal: data.internal,
			Labels: Object.keys(finalLabels).length > 0 ? finalLabels : undefined
		};

		// Add IPAM configuration if enabled
		if (data.enableIpam && (data.subnet?.trim() || data.gateway?.trim())) {
			const ipamConfig: { Subnet?: string; Gateway?: string } = {};

			if (data.subnet?.trim()) {
				ipamConfig.Subnet = data.subnet.trim();
			}
			if (data.gateway?.trim()) {
				ipamConfig.Gateway = data.gateway.trim();
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

	function handleOpenChange(newOpenState: boolean) {
		open = newOpenState;
		if (!newOpenState) {
			// Reset form data
			$inputs.networkName.value = '';
			$inputs.networkDriver.value = 'bridge';
			$inputs.checkDuplicate.value = true;
			$inputs.internal.value = false;
			$inputs.networkLabels.value = '';
			$inputs.enableIpam.value = false;
			$inputs.subnet.value = '';
			$inputs.gateway.value = '';
			labels = [{ key: '', value: '' }];
		}
	}
</script>

<Sheet.Root bind:open onOpenChange={handleOpenChange}>
	<Sheet.Content class="p-6">
		<Sheet.Header data-testid="create-network-dialog-header" class="space-y-3 pb-6 border-b">
			<div class="flex items-center gap-3">
				<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
					<Network class="size-5 text-primary" />
				</div>
				<div>
					<Sheet.Title class="text-xl font-semibold">Create New Network</Sheet.Title>
					<Sheet.Description class="text-sm text-muted-foreground mt-1">Configure and create a new Docker network.</Sheet.Description>
				</div>
			</div>
		</Sheet.Header>

		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
			<div class="space-y-2">
				<Label for="network-name" class="text-sm font-medium">Network Name *</Label>
				<Input id="network-name" type="text" placeholder="e.g., my-app-network" disabled={isLoading} bind:value={$inputs.networkName.value} class={$inputs.networkName.error ? 'border-destructive' : ''} />
				{#if $inputs.networkName.error}
					<p class="text-xs text-destructive">{$inputs.networkName.error}</p>
				{/if}
				<p class="text-xs text-muted-foreground">Unique name for the network</p>
			</div>

			<SelectWithLabel id="driver-select" bind:value={$inputs.networkDriver.value} label="Network Driver" description="Choose the network driver type" options={drivers} placeholder="Select a driver" />

			<div class="space-y-4">
				<div class="flex items-center space-x-4">
					<div class="flex items-center space-x-2">
						<Checkbox id="check-duplicate" bind:checked={$inputs.checkDuplicate.value} disabled={isLoading} />
						<Label for="check-duplicate" class="text-sm font-normal">Check Duplicate</Label>
					</div>
					<div class="flex items-center space-x-2">
						<Checkbox id="internal" bind:checked={$inputs.internal.value} disabled={isLoading} />
						<Label for="internal" class="text-sm font-normal">Internal Network</Label>
					</div>
				</div>
			</div>

			<Accordion.Root type="single" class="w-full">
				<Accordion.Item value="labels">
					<Accordion.Trigger class="text-sm font-medium">Labels</Accordion.Trigger>
					<Accordion.Content class="pt-4">
						<div class="space-y-4">
							<div class="space-y-2">
								<Label class="text-sm font-medium">Key-Value Labels</Label>
								{#each labels as label, index (index)}
									<div class="flex items-center gap-2">
										<Input type="text" placeholder="Key" bind:value={label.key} disabled={isLoading} class="flex-1" />
										<Input type="text" placeholder="Value" bind:value={label.value} disabled={isLoading} class="flex-1" />
										<Button type="button" variant="ghost" size="icon" onclick={() => removeLabel(index)} disabled={isLoading || labels.length <= 1} class="text-destructive hover:text-destructive" title="Remove Label">
											<X class="size-4" />
										</Button>
									</div>
								{/each}
								<Button type="button" variant="outline" size="sm" onclick={addLabel} disabled={isLoading}>Add Label</Button>
							</div>

							<div class="space-y-2">
								<Label for="network-labels" class="text-sm font-medium">Additional Labels (Text Format)</Label>
								<Textarea id="network-labels" placeholder="com.example.description=Production network&#10;com.example.department=Backend" disabled={isLoading} rows={3} bind:value={$inputs.networkLabels.value} class={$inputs.networkLabels.error ? 'border-destructive' : ''} />
								{#if $inputs.networkLabels.error}
									<p class="text-xs text-destructive">{$inputs.networkLabels.error}</p>
								{/if}
								<p class="text-xs text-muted-foreground">Enter additional labels as key=value pairs, one per line</p>
							</div>
						</div>
					</Accordion.Content>
				</Accordion.Item>

				<Accordion.Item value="ipam">
					<Accordion.Trigger class="text-sm font-medium">IPAM Configuration</Accordion.Trigger>
					<Accordion.Content class="pt-4">
						<div class="space-y-4">
							<div class="flex items-center space-x-2">
								<Checkbox id="enable-ipam" bind:checked={$inputs.enableIpam.value} disabled={isLoading} />
								<Label for="enable-ipam" class="text-sm font-medium">Enable IPAM Configuration</Label>
							</div>

							{#if $inputs.enableIpam.value}
								<div class="space-y-4 pl-6 border-l-2 border-muted">
									<div class="space-y-2">
										<Label for="subnet" class="text-sm font-medium">Subnet</Label>
										<Input id="subnet" type="text" placeholder="e.g., 172.20.0.0/16" disabled={isLoading} bind:value={$inputs.subnet.value} class={$inputs.subnet.error ? 'border-destructive' : ''} />
										{#if $inputs.subnet.error}
											<p class="text-xs text-destructive">{$inputs.subnet.error}</p>
										{/if}
										<p class="text-xs text-muted-foreground">Network subnet in CIDR notation</p>
									</div>

									<div class="space-y-2">
										<Label for="gateway" class="text-sm font-medium">Gateway</Label>
										<Input id="gateway" type="text" placeholder="e.g., 172.20.0.1" disabled={isLoading} bind:value={$inputs.gateway.value} class={$inputs.gateway.error ? 'border-destructive' : ''} />
										{#if $inputs.gateway.error}
											<p class="text-xs text-destructive">{$inputs.gateway.error}</p>
										{/if}
										<p class="text-xs text-muted-foreground">Gateway IP address for the network</p>
									</div>
								</div>
							{/if}
						</div>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>

			<Sheet.Footer class="flex flex-row gap-2">
				<Button type="button" class="arcane-button-cancel flex-1" variant="outline" onclick={() => (open = false)} disabled={isLoading}>Cancel</Button>
				<Button type="submit" class="arcane-button-create flex-1" disabled={isLoading}>
					{#if isLoading}
						<Loader2 class="mr-2 size-4 animate-spin" />
						Creating...
					{:else}
						<Network class="mr-2 size-4" />
						Create Network
					{/if}
				</Button>
			</Sheet.Footer>
		</form>
	</Sheet.Content>
</Sheet.Root>
