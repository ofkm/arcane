<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { toast } from 'svelte-sonner';
	import { Loader2, Plus, Trash2 } from '@lucide/svelte';

	interface PortMapping {
		host: string;
		container: string;
	}

	interface VolumeMount {
		host: string;
		container: string;
	}

	interface EnvironmentVariable {
		key: string;
		value: string;
	}

	interface ContainerConfiguration {
		imageName: string;
		containerName?: string;
		ports: PortMapping[];
		volumes: VolumeMount[];
		envVars: EnvironmentVariable[];
		detached: boolean;
		autoRemove: boolean;
		restartPolicy: 'no' | 'always' | 'unless-stopped' | 'on-failure';
	}

	interface Props {
		agentId: string;
		onClose: () => void;
		onRun: (data: ContainerConfiguration) => Promise<void>;
	}

	let { onClose, onRun }: Props = $props();

	let running = $state(false);
	let containerName = $state('');
	let imageName = $state('');
	let ports = $state<PortMapping[]>([]);
	let volumes = $state<VolumeMount[]>([]);
	let envVars = $state<EnvironmentVariable[]>([]);
	let detached = $state(true);
	let autoRemove = $state(false);
	let restartPolicy = $state<ContainerConfiguration['restartPolicy']>('no');

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
		// Basic validation
		if (!imageName.trim()) {
			toast.error('Please enter an image name');
			return;
		}

		// Validate container name if provided
		if (containerName.trim()) {
			const containerNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
			if (!containerNameRegex.test(containerName.trim())) {
				toast.error('Container name must start with alphanumeric character and can only contain letters, numbers, underscores, periods, and hyphens');
				return;
			}
		}

		// Validate ports
		for (let i = 0; i < ports.length; i++) {
			const port = ports[i];

			// Skip empty port mappings
			if (!port.host && !port.container) continue;

			// Both host and container ports must be provided
			if (!port.host || !port.container) {
				toast.error(`Port mapping ${i + 1}: Both host and container ports must be specified`);
				return;
			}

			// Validate host port
			const hostPort = parseInt(port.host);
			if (isNaN(hostPort) || hostPort < 1 || hostPort > 65535) {
				toast.error(`Port mapping ${i + 1}: Host port must be a number between 1 and 65535`);
				return;
			}

			// Validate container port
			const containerPort = parseInt(port.container);
			if (isNaN(containerPort) || containerPort < 1 || containerPort > 65535) {
				toast.error(`Port mapping ${i + 1}: Container port must be a number between 1 and 65535`);
				return;
			}
		}

		// Check for duplicate host ports
		const hostPorts = ports.filter((p) => p.host && p.container).map((p) => parseInt(p.host));
		const uniqueHostPorts = new Set(hostPorts);
		if (hostPorts.length !== uniqueHostPorts.size) {
			toast.error('Duplicate host ports are not allowed');
			return;
		}

		// Validate volumes
		for (let i = 0; i < volumes.length; i++) {
			const volume = volumes[i];

			// Skip empty volume mappings
			if (!volume.host && !volume.container) continue;

			// Both host and container paths must be provided
			if (!volume.host || !volume.container) {
				toast.error(`Volume mapping ${i + 1}: Both host and container paths must be specified`);
				return;
			}

			// Validate host path format
			if (!volume.host.trim()) {
				toast.error(`Volume mapping ${i + 1}: Host path cannot be empty`);
				return;
			}

			// Basic path validation (should start with / on Unix systems or contain : on Windows)
			const hostPath = volume.host.trim();
			if (!hostPath.startsWith('/') && !hostPath.match(/^[a-zA-Z]:/)) {
				toast.error(`Volume mapping ${i + 1}: Host path should be an absolute path (e.g., /path/to/dir or C:/path/to/dir)`);
				return;
			}

			// Validate container path format
			const containerPath = volume.container.trim();
			if (!containerPath.startsWith('/')) {
				toast.error(`Volume mapping ${i + 1}: Container path must be an absolute path starting with /`);
				return;
			}

			// Check for reserved container paths
			const reservedPaths = ['/proc', '/sys', '/dev'];
			if (reservedPaths.some((reserved) => containerPath.startsWith(reserved))) {
				toast.error(`Volume mapping ${i + 1}: Cannot mount to reserved system path ${containerPath}`);
				return;
			}
		}

		// Check for duplicate container mount points
		const containerPaths = volumes.filter((v) => v.host && v.container).map((v) => v.container.trim());
		const uniqueContainerPaths = new Set(containerPaths);
		if (containerPaths.length !== uniqueContainerPaths.size) {
			toast.error('Duplicate container mount points are not allowed');
			return;
		}

		// Validate environment variables
		for (let i = 0; i < envVars.length; i++) {
			const envVar = envVars[i];

			// Skip empty environment variables
			if (!envVar.key && !envVar.value) continue;

			// Both key and value must be provided
			if (!envVar.key || !envVar.value) {
				toast.error(`Environment variable ${i + 1}: Both key and value must be specified`);
				return;
			}

			// Validate environment variable key format
			const envKeyRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
			if (!envKeyRegex.test(envVar.key.trim())) {
				toast.error(`Environment variable ${i + 1}: Key must start with letter or underscore and contain only letters, numbers, and underscores`);
				return;
			}

			// Check for reserved environment variables
			const reservedEnvVars = ['PATH', 'HOME', 'USER', 'SHELL'];
			if (reservedEnvVars.includes(envVar.key.trim().toUpperCase())) {
				toast.error(`Environment variable ${i + 1}: Cannot override reserved variable ${envVar.key}`);
				return;
			}
		}

		// Check for duplicate environment variable keys
		const envKeys = envVars.filter((e) => e.key && e.value).map((e) => e.key.trim().toUpperCase());
		const uniqueEnvKeys = new Set(envKeys);
		if (envKeys.length !== uniqueEnvKeys.size) {
			toast.error('Duplicate environment variable keys are not allowed');
			return;
		}

		running = true;
		try {
			const data: ContainerConfiguration = {
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
				<Plus class="mr-1 size-4" />
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
				<Plus class="mr-1 size-4" />
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
				<Plus class="mr-1 size-4" />
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
				<p class="text-muted-foreground text-sm">Run container in detached mode</p>
			</div>
			<Switch bind:checked={detached} disabled={running} />
		</div>

		<div class="flex items-center justify-between">
			<div>
				<Label>Auto Remove</Label>
				<p class="text-muted-foreground text-sm">Remove container when it stops</p>
			</div>
			<Switch bind:checked={autoRemove} disabled={running} />
		</div>

		<div class="space-y-2">
			<Label for="restartPolicy">Restart Policy</Label>
			<select id="restartPolicy" bind:value={restartPolicy} disabled={running} class="border-input bg-background w-full rounded-md border px-3 py-2">
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
				<Loader2 class="mr-2 size-4 animate-spin" />
			{/if}
			Run Container
		</Button>
	</div>
</div>
