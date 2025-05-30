<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { toast } from 'svelte-sonner';
	import { Loader2, Plus, Trash2 } from '@lucide/svelte';

	interface Props {
		agentId: string;
		onClose: () => void;
		onRun: (data: any) => Promise<void>;
	}

	let { agentId, onClose, onRun }: Props = $props();

	let running = $state(false);
	let containerName = $state('');
	let imageName = $state('');
	let ports = $state<{ host: string; container: string }[]>([]);
	let volumes = $state<{ host: string; container: string }[]>([]);
	let envVars = $state<{ key: string; value: string }[]>([]);
	let detached = $state(true);
	let autoRemove = $state(false);
	let restartPolicy = $state('no');

	function addPort() {
		ports = [...ports, { host: '', container: '' }];
	}

	function removePort(index: number) {
		ports = ports.filter((_, i) => i !== index);
	}

	function addVolume() {
		volumes = [...volumes, { host: '', container: '' }];
	}

	function removeVolume(index: number) {
		volumes = volumes.filter((_, i) => i !== index);
	}

	function addEnvVar() {
		envVars = [...envVars, { key: '', value: '' }];
	}

	function removeEnvVar(index: number) {
		envVars = envVars.filter((_, i) => i !== index);
	}

	async function handleRun() {
		if (!imageName.trim()) {
			toast.error('Please enter an image name');
			return;
		}

		running = true;
		try {
			const data = {
				imageName: imageName.trim(),
				containerName: containerName.trim() || undefined,
				ports: ports.filter((p) => p.host && p.container),
				volumes: volumes.filter((v) => v.host && v.container),
				envVars: envVars.filter((e) => e.key && e.value),
				detached,
				autoRemove,
				restartPolicy
			};

			await onRun(data);
			onClose();
			toast.success(`Started container from ${imageName}`);
		} catch (err) {
			console.error('Run error:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to run container');
		} finally {
			running = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Basic Configuration -->
	<div class="space-y-4">
		<div class="space-y-2">
			<Label for="imageName">Image Name *</Label>
			<Input id="imageName" bind:value={imageName} placeholder="nginx:alpine" disabled={running} />
		</div>

		<div class="space-y-2">
			<Label for="containerName">Container Name (Optional)</Label>
			<Input id="containerName" bind:value={containerName} placeholder="my-container" disabled={running} />
		</div>
	</div>

	<!-- Port Mappings -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<Label>Port Mappings</Label>
			<Button variant="outline" size="sm" onclick={addPort} disabled={running}>
				<Plus class="size-4 mr-1" />
				Add Port
			</Button>
		</div>
		{#each ports as port, index}
			<div class="flex items-center gap-2">
				<Input bind:value={port.host} placeholder="8080" disabled={running} class="flex-1" />
				<span class="text-muted-foreground">:</span>
				<Input bind:value={port.container} placeholder="80" disabled={running} class="flex-1" />
				<Button variant="outline" size="sm" onclick={() => removePort(index)} disabled={running}>
					<Trash2 class="size-4" />
				</Button>
			</div>
		{/each}
	</div>

	<!-- Volume Mounts -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<Label>Volume Mounts</Label>
			<Button variant="outline" size="sm" onclick={addVolume} disabled={running}>
				<Plus class="size-4 mr-1" />
				Add Volume
			</Button>
		</div>
		{#each volumes as volume, index}
			<div class="flex items-center gap-2">
				<Input bind:value={volume.host} placeholder="/host/path" disabled={running} class="flex-1" />
				<span class="text-muted-foreground">:</span>
				<Input bind:value={volume.container} placeholder="/container/path" disabled={running} class="flex-1" />
				<Button variant="outline" size="sm" onclick={() => removeVolume(index)} disabled={running}>
					<Trash2 class="size-4" />
				</Button>
			</div>
		{/each}
	</div>

	<!-- Environment Variables -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<Label>Environment Variables</Label>
			<Button variant="outline" size="sm" onclick={addEnvVar} disabled={running}>
				<Plus class="size-4 mr-1" />
				Add Variable
			</Button>
		</div>
		{#each envVars as envVar, index}
			<div class="flex items-center gap-2">
				<Input bind:value={envVar.key} placeholder="VARIABLE_NAME" disabled={running} class="flex-1" />
				<span class="text-muted-foreground">=</span>
				<Input bind:value={envVar.value} placeholder="value" disabled={running} class="flex-1" />
				<Button variant="outline" size="sm" onclick={() => removeEnvVar(index)} disabled={running}>
					<Trash2 class="size-4" />
				</Button>
			</div>
		{/each}
	</div>

	<!-- Container Options -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<div>
				<Label>Run in Background</Label>
				<p class="text-sm text-muted-foreground">Run container in detached mode</p>
			</div>
			<Switch bind:checked={detached} disabled={running} />
		</div>

		<div class="flex items-center justify-between">
			<div>
				<Label>Auto Remove</Label>
				<p class="text-sm text-muted-foreground">Remove container when it stops</p>
			</div>
			<Switch bind:checked={autoRemove} disabled={running} />
		</div>

		<div class="space-y-2">
			<Label for="restartPolicy">Restart Policy</Label>
			<select id="restartPolicy" bind:value={restartPolicy} disabled={running} class="w-full px-3 py-2 border border-input bg-background rounded-md">
				<option value="no">No</option>
				<option value="always">Always</option>
				<option value="unless-stopped">Unless Stopped</option>
				<option value="on-failure">On Failure</option>
			</select>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex justify-end space-x-2">
		<Button variant="outline" onclick={onClose} disabled={running}>Cancel</Button>
		<Button onclick={handleRun} disabled={running || !imageName.trim()}>
			{#if running}
				<Loader2 class="size-4 mr-2 animate-spin" />
			{/if}
			Run Container
		</Button>
	</div>
</div>
