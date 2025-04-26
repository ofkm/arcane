<script lang="ts">
	import { preventDefault } from 'svelte/legacy';
	import type { ContainerConfig } from '$lib/types/docker/container.type';
	import type { HealthConfig } from 'dockerode';

	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { AlertCircle, Eye, EyeOff, Loader2, Plus, Trash } from '@lucide/svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { parseBytes } from '$lib/utils/bytes';

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	// Functions for events
	export function onClose() {
		open = false;
		dispatch('close');
	}
	interface Props {
		open?: boolean;
		isCreating?: boolean;
		volumes?: { name: string }[];
		networks?: { name: string; driver: string }[];
		images?: { id: string; repo: string; tag: string }[];
		onSubmit?: (data: ContainerConfig) => void;
	}

	let { open = $bindable(false), isCreating = false, volumes = [], networks = [], images = [], onSubmit = (data: ContainerConfig) => {} }: Props = $props();

	// Internal state
	let containerName = $state('');
	let selectedImage = $state('');
	let selectedTab = $state('basic');

	// Ports mapping (host:container)
	let ports = $state<
		{
			hostPort: string;
			containerPort: string;
			hostError?: string;
			containerError?: string;
		}[]
	>([{ hostPort: '', containerPort: '' }]);

	// Volume mounts
	let volumeMounts = $state<{ source: string; target: string }[]>([{ source: '', target: '' }]);

	// Environment variables
	let envVars = $state<{ key: string; value: string; sensitive?: boolean }[]>([{ key: '', value: '', sensitive: true }]);

	// Network and restart policy
	let network = $state('');
	let restartPolicy = $state('no'); // "no", "always", "on-failure", "unless-stopped"

	// Add state for IP addresses
	let ipv4Address = $state('');
	let ipv6Address = $state('');

	// Add state for Healthcheck
	let enableHealthcheck = $state(false);
	let healthcheckTest = $state<string[]>(['']); // Dockerode expects string[]
	let healthcheckInterval = $state<number | undefined>(undefined); // In nanoseconds
	let healthcheckTimeout = $state<number | undefined>(undefined); // In nanoseconds
	let healthcheckRetries = $state<number | undefined>(undefined);
	let healthcheckStartPeriod = $state<number | undefined>(undefined); // In nanoseconds

	// Add state for Labels
	let labels = $state<{ key: string; value: string }[]>([{ key: '', value: '' }]);

	// Add state for Command, User, Resources
	let commandOverride = $state(''); // Input as string, will split later
	let runAsUser = $state('');
	let memoryLimitStr = $state(''); // Input as string (e.g., "512m", "1g")
	let cpuLimitStr = $state(''); // Input as string (e.g., "0.5", "1")

	// Port validation - improved
	function validatePortNumber(port: string | number): {
		isValid: boolean;
		error?: string;
	} {
		// Convert to string if it's not already one
		const portStr = typeof port === 'number' ? port.toString() : port;

		// Check if empty
		if (!portStr || !portStr.trim()) return { isValid: true };

		const portNum = parseInt(portStr, 10);

		// Check if it's a valid number
		if (isNaN(portNum) || portNum.toString() !== portStr.trim()) {
			return { isValid: false, error: 'Invalid port number' };
		}

		// Check port range (1-65535)
		if (portNum < 1 || portNum > 65535) {
			return { isValid: false, error: 'Port must be between 1-65535' };
		}

		// Warning for privileged ports
		if (portNum < 1024) {
			return { isValid: true, error: 'Privileged port (<1024)' };
		}
		return { isValid: true };
	}

	// Auto-validate on input
	$effect(() => {
		// Validate all ports when they change
		ports.forEach((port, index) => {
			// Only validate if there's content
			if (port.hostPort !== undefined && port.hostPort !== '') {
				const hostValidation = validatePortNumber(port.hostPort);
				ports[index].hostError = hostValidation.error;
			} else {
				ports[index].hostError = undefined;
			}

			if (port.containerPort !== undefined && port.containerPort !== '') {
				const containerValidation = validatePortNumber(port.containerPort);
				ports[index].containerError = containerValidation.error;
			} else {
				ports[index].containerError = undefined;
			}
		});
	});

	// We can still keep this function for the submission check
	function validatePort(index: number, type: 'host' | 'container'): void {
		const port = type === 'host' ? ports[index].hostPort : ports[index].containerPort;
		const validation = validatePortNumber(port);

		if (type === 'host') {
			ports[index].hostError = validation.error;
		} else {
			ports[index].containerError = validation.error;
		}
	}

	// Add/remove functions for arrays
	function addPort() {
		ports = [...ports, { hostPort: '', containerPort: '' }];
	}

	function removePort(index: number) {
		ports = ports.filter((_, i) => i !== index);
	}

	function addVolumeMount() {
		volumeMounts = [...volumeMounts, { source: '', target: '' }];
	}

	function removeVolumeMount(index: number) {
		volumeMounts = volumeMounts.filter((_, i) => i !== index);
	}

	function addEnvVar() {
		envVars = [...envVars, { key: '', value: '', sensitive: true }];
	}

	function removeEnvVar(index: number) {
		envVars = envVars.filter((_, i) => i !== index);
	}

	function addLabel() {
		labels = [...labels, { key: '', value: '' }];
	}

	function removeLabel(index: number) {
		labels = labels.filter((_, i) => i !== index);
	}

	// Reactive check to see if the selected network is user-defined
	const isUserDefinedNetwork = $derived(network && network !== '' && network !== 'host' && network !== 'none' && network !== 'bridge');

	function handleSubmit() {
		if (!selectedImage || !containerName.trim()) return;

		// Validate all ports
		let hasInvalidPort = false;
		ports.forEach((port) => {
			// Check for invalid ports with content
			if ((port.hostPort && !validatePortNumber(port.hostPort).isValid) || (port.containerPort && !validatePortNumber(port.containerPort).isValid)) {
				hasInvalidPort = true;
			}
		});

		if (hasInvalidPort) {
			return; // Stop submission if there are invalid ports
		}

		// Filter out empty entries
		const filteredPorts = ports.filter((p) => p.hostPort.trim() && p.containerPort.trim()).map(({ hostPort, containerPort }) => ({ hostPort, containerPort })); // Remove error properties

		const filteredVolumes = volumeMounts.filter((v) => v.source.trim() && v.target.trim());
		const filteredEnvVars = envVars.filter((e) => e.key.trim());

		// Filter and format labels
		const filteredLabels = labels
			.filter((l) => l.key.trim())
			.reduce(
				(acc, label) => {
					acc[label.key.trim()] = label.value.trim();
					return acc;
				},
				{} as { [key: string]: string }
			);

		// Prepare healthcheck config if enabled and test command is provided
		let healthcheckConfig: HealthConfig | undefined = undefined;
		if (enableHealthcheck && healthcheckTest.length > 0 && healthcheckTest[0].trim() !== '') {
			// Convert seconds to nanoseconds for Docker API
			const toNano = (seconds: number | undefined) => (seconds ? seconds * 1_000_000_000 : undefined);

			healthcheckConfig = {
				Test: healthcheckTest,
				Interval: toNano(healthcheckInterval),
				Timeout: toNano(healthcheckTimeout),
				Retries: healthcheckRetries,
				StartPeriod: toNano(healthcheckStartPeriod)
			};
		}

		// Parse command override (split by space, respecting quotes if needed - simple split for now)
		const commandArray = commandOverride.trim() ? commandOverride.trim().split(/\s+/) : undefined;

		// Parse resource limits
		let memoryBytes: number | undefined;
		try {
			memoryBytes = memoryLimitStr.trim() ? parseBytes(memoryLimitStr.trim()) : undefined;
		} catch (e) {
			console.error('Invalid memory format:', e);
			return; // Stop submission on invalid format
		}

		let cpuUnits: number | undefined;
		try {
			cpuUnits = cpuLimitStr.trim() ? parseFloat(cpuLimitStr.trim()) : undefined;
			if (cpuUnits !== undefined && isNaN(cpuUnits)) {
				throw new Error('CPU Limit must be a number');
			}
		} catch (e) {
			console.error('Invalid CPU format:', e);
			return; // Stop submission on invalid format
		}

		const containerConfig: ContainerConfig = {
			name: containerName.trim(),
			image: selectedImage,
			ports: filteredPorts.length > 0 ? filteredPorts : undefined,
			volumes: filteredVolumes.length > 0 ? filteredVolumes : undefined,
			envVars: filteredEnvVars.length > 0 ? filteredEnvVars : undefined,
			network: network || undefined,
			restart: restartPolicy as 'no' | 'always' | 'on-failure' | 'unless-stopped',
			networkConfig:
				isUserDefinedNetwork && (ipv4Address.trim() || ipv6Address.trim())
					? {
							ipv4Address: ipv4Address.trim() || undefined,
							ipv6Address: ipv6Address.trim() || undefined
						}
					: undefined,
			healthcheck: healthcheckConfig,
			labels: Object.keys(filteredLabels).length > 0 ? filteredLabels : undefined,
			command: commandArray,
			user: runAsUser.trim() || undefined,
			memoryLimit: memoryBytes,
			cpuLimit: cpuUnits
		};

		onSubmit(containerConfig);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[700px]">
		<Dialog.Header>
			<Dialog.Title>Create Container</Dialog.Title>
			<Dialog.Description>Configure and run a new Docker container</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root value={selectedTab} class="w-full">
			<Tabs.List class="w-full grid grid-cols-7">
				<Tabs.Trigger value="basic" class="px-1 text-xs sm:text-sm">Basic</Tabs.Trigger>
				<Tabs.Trigger value="ports" class="px-1 text-xs sm:text-sm">Ports</Tabs.Trigger>
				<Tabs.Trigger value="volumes" class="px-1 text-xs sm:text-sm">Volumes</Tabs.Trigger>
				<Tabs.Trigger value="env" class="px-1 text-xs sm:text-sm">Environment</Tabs.Trigger>
				<Tabs.Trigger value="network" class="px-1 text-xs sm:text-sm">Network</Tabs.Trigger>
				<Tabs.Trigger value="healthcheck" class="px-1 text-xs sm:text-sm">Healthcheck</Tabs.Trigger>
				<Tabs.Trigger value="advanced" class="px-1 text-xs sm:text-sm">Advanced</Tabs.Trigger>
			</Tabs.List>

			<div class="p-4 max-h-[60vh] overflow-y-auto">
				<form onsubmit={preventDefault(handleSubmit)} class="space-y-6">
					<!-- Basic Settings -->
					<Tabs.Content value="basic">
						<div class="space-y-4">
							<div class="grid grid-cols-1 gap-2">
								<Label for="container-name">Name</Label>
								<Input id="container-name" bind:value={containerName} placeholder="e.g., my-container" disabled={isCreating} />
							</div>

							<div class="grid grid-cols-1 gap-2">
								<Label for="container-image">Image</Label>
								<Select.Root type="single" bind:value={selectedImage} disabled={isCreating}>
									<Select.Trigger class="w-full">
										<span>{selectedImage || 'Select an image'}</span>
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each images as image}
												<Select.Item value={image.repo + ':' + image.tag}>
													{image.repo + ':' + image.tag}
												</Select.Item>
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</div>

							<div class="grid grid-cols-1 gap-2">
								<Label for="restart-policy">Restart Policy</Label>
								<Select.Root type="single" bind:value={restartPolicy} disabled={isCreating}>
									<Select.Trigger class="w-full">
										<span>{restartPolicy}</span>
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="no">no</Select.Item>
										<Select.Item value="always">always</Select.Item>
										<Select.Item value="on-failure">on-failure</Select.Item>
										<Select.Item value="unless-stopped">unless-stopped</Select.Item>
									</Select.Content>
								</Select.Root>
							</div>
						</div>
					</Tabs.Content>

					<!-- Port Mappings -->
					<Tabs.Content value="ports">
						<div class="space-y-4">
							{#each ports as port, index}
								<div class="flex space-x-3 items-end">
									<div class="flex-1 grid grid-cols-2 gap-4">
										<div>
											<Label for={`host-port-${index}`} class="mb-2 block text-sm">Host Port</Label>
											<Input id={`host-port-${index}`} bind:value={port.hostPort} placeholder="e.g., 8080" disabled={isCreating} type="text" pattern="[0-9]*" inputmode="numeric" class={port.hostError && port.hostPort ? 'border-red-500' : ''} />
											{#if port.hostError && port.hostPort}
												<div class="flex items-center text-xs text-red-500 mt-1">
													<AlertCircle class="h-3 w-3 mr-1" />
													{port.hostError}
												</div>
											{/if}
										</div>

										<div>
											<Label for={`container-port-${index}`} class="mb-2 block text-sm">Container Port</Label>
											<Input id={`container-port-${index}`} bind:value={port.containerPort} placeholder="e.g., 80" disabled={isCreating} type="text" pattern="[0-9]*" inputmode="numeric" class={port.containerError && port.containerPort ? 'border-red-500' : ''} />
											{#if port.containerError && port.containerPort}
												<div class="flex items-center text-xs text-red-500 mt-1">
													<AlertCircle class="h-3 w-3 mr-1" />
													{port.containerError}
												</div>
											{/if}
										</div>
									</div>

									<Button variant="destructive" size="icon" type="button" onclick={() => removePort(index)} disabled={ports.length <= 1 || isCreating} class="flex-shrink-0">
										<Trash class="h-4 w-4" />
									</Button>
								</div>
							{/each}
							<Button variant="outline" type="button" onclick={addPort} class="w-full" disabled={isCreating}>
								<Plus class="h-4 w-4 mr-2" /> Add Port Mapping
							</Button>
						</div>
					</Tabs.Content>

					<!-- Volume Mounts -->
					<Tabs.Content value="volumes">
						<div class="space-y-4">
							{#each volumeMounts as mount, index}
								<div class="flex space-x-3 items-end">
									<div class="flex-1 grid grid-cols-2 gap-4">
										<div>
											<Label for={`volume-source-${index}`} class="mb-2 block">Source Volume</Label>
											<Select.Root type="single" bind:value={mount.source} disabled={isCreating}>
												<Select.Trigger class="w-full">
													<span>{mount.source || 'Select volume'}</span>
												</Select.Trigger>
												<Select.Content>
													{#each volumes as volume}
														<Select.Item value={volume.name}>
															{volume.name}
														</Select.Item>
													{/each}
												</Select.Content>
											</Select.Root>
										</div>
										<div>
											<Label for={`volume-target-${index}`} class="mb-2 block">Container Path</Label>
											<Input id={`volume-target-${index}`} bind:value={mount.target} placeholder="/data" disabled={isCreating} />
										</div>
									</div>
									<Button variant="destructive" size="icon" type="button" onclick={() => removeVolumeMount(index)} disabled={volumeMounts.length <= 1 || isCreating} class="flex-shrink-0">
										<Trash class="h-4 w-4" />
									</Button>
								</div>
							{/each}
							<Button variant="outline" type="button" onclick={addVolumeMount} class="w-full" disabled={isCreating}>
								<Plus class="h-4 w-4 mr-2" /> Add Volume Mount
							</Button>
						</div>
					</Tabs.Content>

					<!-- Environment Variables -->
					<Tabs.Content value="env">
						<div class="space-y-4">
							{#each envVars as env, index}
								<div class="flex space-x-3 items-end">
									<div class="flex-1 grid grid-cols-2 gap-4">
										<div>
											<Label for={`env-key-${index}`} class="mb-2 block">Key</Label>
											<Input id={`env-key-${index}`} bind:value={env.key} placeholder="MYSQL_ROOT_PASSWORD" disabled={isCreating} />
										</div>
										<div>
											<Label for={`env-value-${index}`} class="mb-2 block">Value</Label>
											<div class="flex items-center gap-2">
												<Input id={`env-value-${index}`} bind:value={env.value} type={env.sensitive ? 'password' : 'text'} placeholder="secret" disabled={isCreating} />
												<Button
													variant="outline"
													size="icon"
													type="button"
													onclick={() => {
														env.sensitive = !env.sensitive;
													}}
													disabled={isCreating}
													title={env.sensitive ? 'Show value' : 'Hide value'}
												>
													{#if env.sensitive}
														<Eye class="h-4 w-4" />
													{:else}
														<EyeOff class="h-4 w-4" />
													{/if}
												</Button>
											</div>
										</div>
									</div>
									<Button variant="destructive" size="icon" type="button" onclick={() => removeEnvVar(index)} disabled={envVars.length <= 1 || isCreating} class="flex-shrink-0">
										<Trash class="h-4 w-4" />
									</Button>
								</div>
							{/each}
							<Button variant="outline" type="button" onclick={addEnvVar} class="w-full" disabled={isCreating}>
								<Plus class="h-4 w-4 mr-2" /> Add Environment Variable
							</Button>
						</div>
					</Tabs.Content>

					<!-- Network Settings -->
					<Tabs.Content value="network">
						<div class="space-y-4">
							<div class="grid grid-cols-1 gap-2">
								<Label for="container-network">Network</Label>
								<Select.Root type="single" bind:value={network} disabled={isCreating}>
									<Select.Trigger class="w-full">
										<span>{network || 'Default Bridge'}</span>
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="">Default Bridge</Select.Item>
										{#each networks.filter((n) => n.name !== 'bridge' && n.name !== 'host' && n.name !== 'none') as net (net.name)}
											<Select.Item value={net.name}>
												{net.name} ({net.driver})
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>

							{#if isUserDefinedNetwork}
								<div class="border-t pt-4 mt-4 space-y-4">
									<p class="text-sm text-muted-foreground">Optional: Assign static IP addresses (requires network with IPAM configured).</p>
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div class="grid grid-cols-1 gap-2">
											<Label for="ipv4-address">IPv4 Address</Label>
											<Input id="ipv4-address" bind:value={ipv4Address} placeholder="e.g., 172.20.0.10" disabled={isCreating} />
										</div>
										<div class="grid grid-cols-1 gap-2">
											<Label for="ipv6-address">IPv6 Address</Label>
											<Input id="ipv6-address" bind:value={ipv6Address} placeholder="e.g., 2001:db8::10" disabled={isCreating} />
										</div>
									</div>
								</div>
							{/if}
						</div>
					</Tabs.Content>

					<!-- Healthcheck Settings -->
					<Tabs.Content value="healthcheck">
						<div class="space-y-4">
							<div class="flex items-center space-x-2">
								<input type="checkbox" id="enable-healthcheck" bind:checked={enableHealthcheck} disabled={isCreating} class="form-checkbox h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
								<Label for="enable-healthcheck" class="cursor-pointer">Enable Healthcheck</Label>
							</div>

							{#if enableHealthcheck}
								<div class="space-y-6 border-t pt-6 mt-4">
									<div class="space-y-2">
										<Label for="healthcheck-test">Test Command</Label>
										<Input id="healthcheck-test" bind:value={healthcheckTest[0]} placeholder="e.g., CMD-SHELL curl -f http://localhost:80 || exit 1" disabled={isCreating} />
										<p class="text-xs text-muted-foreground">Command to run inside the container. Use `CMD` or `CMD-SHELL`.</p>
									</div>

									<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
										<div class="space-y-2">
											<Label for="healthcheck-interval">Interval (s)</Label>
											<Input id="healthcheck-interval" type="number" min="1" bind:value={healthcheckInterval} placeholder="e.g., 30" disabled={isCreating} />
										</div>
										<div class="space-y-2">
											<Label for="healthcheck-timeout">Timeout (s)</Label>
											<Input id="healthcheck-timeout" type="number" min="1" bind:value={healthcheckTimeout} placeholder="e.g., 10" disabled={isCreating} />
										</div>
										<div class="space-y-2">
											<Label for="healthcheck-retries">Retries</Label>
											<Input id="healthcheck-retries" type="number" min="1" bind:value={healthcheckRetries} placeholder="e.g., 3" disabled={isCreating} />
										</div>
										<div class="space-y-2">
											<Label for="healthcheck-start-period">Start Period (s)</Label>
											<Input id="healthcheck-start-period" type="number" min="0" bind:value={healthcheckStartPeriod} placeholder="e.g., 60" disabled={isCreating} />
											<p class="text-xs text-muted-foreground">Grace period for startup.</p>
										</div>
									</div>
								</div>
							{/if}
						</div>
					</Tabs.Content>

					<!-- Advanced Settings -->
					<Tabs.Content value="advanced">
						<div class="space-y-6">
							<!-- Labels -->
							<div class="space-y-4 border-b pb-6">
								<h3 class="text-lg font-medium">Labels</h3>
								{#each labels as label, index}
									<div class="flex space-x-3 items-end">
										<div class="flex-1 grid grid-cols-2 gap-4">
											<div>
												<Label for={`label-key-${index}`} class="mb-2 block text-sm">Key</Label>
												<Input id={`label-key-${index}`} bind:value={label.key} placeholder="e.g., com.example.project" disabled={isCreating} />
											</div>
											<div>
												<Label for={`label-value-${index}`} class="mb-2 block text-sm">Value</Label>
												<Input id={`label-value-${index}`} bind:value={label.value} placeholder="e.g., my-app" disabled={isCreating} />
											</div>
										</div>
										<Button variant="destructive" size="icon" type="button" onclick={() => removeLabel(index)} disabled={labels.length <= 1 || isCreating} class="flex-shrink-0">
											<Trash class="h-4 w-4" />
										</Button>
									</div>
								{/each}
								<Button variant="outline" type="button" onclick={addLabel} class="w-full" disabled={isCreating}>
									<Plus class="h-4 w-4 mr-2" /> Add Label
								</Button>
							</div>

							<!-- Command & User -->
							<div class="space-y-4 border-b pb-6">
								<h3 class="text-lg font-medium">Execution</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div class="space-y-2">
										<Label for="command-override">Command Override</Label>
										<Input id="command-override" bind:value={commandOverride} placeholder="e.g., /app/run --config /etc/config.yml" disabled={isCreating} />
										<p class="text-xs text-muted-foreground">Overrides the image's default command. Separate arguments with spaces.</p>
									</div>
									<div class="space-y-2">
										<Label for="run-as-user">Run as User</Label>
										<Input id="run-as-user" bind:value={runAsUser} placeholder="e.g., 1000:1000 or node" disabled={isCreating} />
										<p class="text-xs text-muted-foreground">Specify user/group ID or name.</p>
									</div>
								</div>
							</div>

							<!-- Resource Limits -->
							<div class="space-y-4">
								<h3 class="text-lg font-medium">Resource Limits</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div class="space-y-2">
										<Label for="memory-limit">Memory Limit</Label>
										<Input id="memory-limit" bind:value={memoryLimitStr} placeholder="e.g., 512m, 1g" disabled={isCreating} />
										<p class="text-xs text-muted-foreground">Format: number + unit (b, k, m, g). Minimum 4m.</p>
									</div>
									<div class="space-y-2">
										<Label for="cpu-limit">CPU Limit</Label>
										<Input id="cpu-limit" bind:value={cpuLimitStr} placeholder="e.g., 0.5, 1, 2" disabled={isCreating} type="number" step="0.1" min="0" />
										<p class="text-xs text-muted-foreground">Number of CPU cores (e.g., 1.5 = 1.5 cores).</p>
									</div>
								</div>
							</div>
						</div>
					</Tabs.Content>
				</form>
			</div>
		</Tabs.Root>

		<Dialog.Footer class="pt-4">
			<Button variant="outline" onclick={onClose} disabled={isCreating} class="mr-2">Cancel</Button>
			<Button type="button" onclick={handleSubmit} disabled={isCreating || !containerName.trim() || !selectedImage}>
				{#if isCreating}
					<Loader2 class="h-4 w-4 mr-2 animate-spin" /> Creating...
				{:else}
					Create Container
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
