<script lang="ts">
	import { type HealthConfig, type ContainerCreateOptions, type VolumeInspectInfo, type NetworkInspectInfo } from 'dockerode';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { AlertCircle, Eye, EyeOff, Loader2, Plus, Trash } from '@lucide/svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { parseBytes } from '$lib/utils/bytes.util';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import Switch from '$lib/components/ui/switch/switch.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ContainerAPIService from '$lib/services/api/container-api-service';
	import type { ServiceImage } from '$lib/types/docker';
	import ArcaneButton from '$lib/components/arcane-button.svelte';

	interface Props {
		open?: boolean;
		volumes?: VolumeInspectInfo[];
		networks?: NetworkInspectInfo[];
		images?: ServiceImage[];
		onClose?: () => void;
	}

	let { open = $bindable(false), volumes = [], networks = [], images = [], onClose: onCloseProp = () => {} }: Props = $props();

	const containerApi = new ContainerAPIService();

	let isCreating = $state(false);
	let containerName = $state('');
	let selectedImage = $state('');
	let selectedTab = $state('basic');

	let ports = $state<
		{
			hostPort: string;
			containerPort: string;
			protocol?: 'tcp' | 'udp' | 'sctp';
			hostError?: string;
			containerError?: string;
		}[]
	>([{ hostPort: '', containerPort: '', protocol: 'tcp' }]);

	let volumeMounts = $state<{ source: string; target: string; readOnly?: boolean }[]>([{ source: '', target: '', readOnly: false }]);

	let envVars = $state<{ key: string; value: string; sensitive?: boolean }[]>([{ key: '', value: '', sensitive: true }]);

	const restartPolicyOptions = [
		{ value: 'no', label: 'No' },
		{ value: 'always', label: 'Always' },
		{ value: 'on-failure', label: 'On Failure' },
		{ value: 'unless-stopped', label: 'Unless Stopped' }
	];

	let networkMode = $state('');
	let restartPolicy = $state('unless-stopped');

	const selectedRestartPolicyLabel = $derived(restartPolicyOptions.find((opt) => opt.value === restartPolicy)?.label || restartPolicy);

	let ipv4Address = $state('');
	let ipv6Address = $state('');

	let enableHealthcheck = $state(false);
	let healthcheckTest = $state<string[]>(['']);
	let healthcheckInterval = $state<number | undefined>(undefined);
	let healthcheckTimeout = $state<number | undefined>(undefined);
	let healthcheckRetries = $state<number | undefined>(undefined);
	let healthcheckStartPeriod = $state<number | undefined>(undefined);

	let labels = $state<{ key: string; value: string }[]>([{ key: '', value: '' }]);

	let commandOverride = $state('');
	let runAsUser = $state('');
	let memoryLimitStr = $state('');
	let cpuLimitStr = $state('');

	let autoUpdate = $state(false);

	function handleClose() {
		open = false;
		if (onCloseProp) {
			onCloseProp();
		}
		// Optionally reset form fields here
	}

	function validatePortNumber(port: string | number): {
		isValid: boolean;
		error?: string;
	} {
		const portStr = typeof port === 'number' ? port.toString() : port;
		if (!portStr || !portStr.trim()) return { isValid: true }; // Empty is fine, will be filtered
		const portNum = parseInt(portStr, 10);
		if (isNaN(portNum) || portNum.toString() !== portStr.trim()) {
			return { isValid: false, error: 'Invalid port number' };
		}
		if (portNum < 1 || portNum > 65535) {
			return { isValid: false, error: 'Port must be between 1-65535' };
		}
		// Warning for privileged ports can be handled by UI, not strict validation fail
		return { isValid: true };
	}

	$effect(() => {
		ports.forEach((port, index) => {
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

	function addPort() {
		ports = [...ports, { hostPort: '', containerPort: '', protocol: 'tcp' }];
	}

	function removePort(index: number) {
		ports = ports.filter((_, i) => i !== index);
		if (ports.length === 0) addPort(); // Ensure at least one port row
	}

	function addVolumeMount() {
		volumeMounts = [...volumeMounts, { source: '', target: '', readOnly: false }];
	}

	function removeVolumeMount(index: number) {
		volumeMounts = volumeMounts.filter((_, i) => i !== index);
		if (volumeMounts.length === 0) addVolumeMount(); // Ensure at least one volume row
	}

	function addEnvVar() {
		envVars = [...envVars, { key: '', value: '', sensitive: true }];
	}

	function removeEnvVar(index: number) {
		envVars = envVars.filter((_, i) => i !== index);
		if (envVars.length === 0) addEnvVar(); // Ensure at least one env var row
	}

	function addLabel() {
		labels = [...labels, { key: '', value: '' }];
	}

	function removeLabel(index: number) {
		labels = labels.filter((_, i) => i !== index);
		if (labels.length === 0) addLabel(); // Ensure at least one label row
	}

	const isUserDefinedNetworkSelected = $derived(networkMode && networkMode !== '' && networkMode !== 'host' && networkMode !== 'none' && networkMode !== 'bridge');

	async function handleSubmit() {
		if (!selectedImage) {
			toast.error('Image selection is required');
			return;
		}

		if (!containerName.trim()) {
			toast.error('Container name is required');
			return;
		}

		if (isCreating) {
			return; // Already processing
		}

		// Console log for debugging
		console.log('Creating container with options:', {
			Name: containerName.trim(),
			Image: selectedImage
			// log other important options
		});

		let hasInvalidPort = false;
		ports.forEach((port) => {
			if ((port.hostPort && validatePortNumber(port.hostPort).error && validatePortNumber(port.hostPort).error !== 'Privileged port (<1024)') || (port.containerPort && validatePortNumber(port.containerPort).error && validatePortNumber(port.containerPort).error !== 'Privileged port (<1024)')) {
				hasInvalidPort = true;
			}
		});

		if (hasInvalidPort) {
			toast.error('Please fix invalid port numbers before submitting.');
			return;
		}

		isCreating = true;

		// Construct Docker.ContainerCreateOptions
		const finalLabels = labels
			.filter((l) => l.key.trim())
			.reduce(
				(acc, label) => {
					acc[label.key.trim()] = label.value.trim();
					return acc;
				},
				{} as { [key: string]: string }
			);

		if (autoUpdate) {
			finalLabels['arcane.auto-update'] = 'true';
		}

		const exposedPorts: { [port: string]: Record<string, never> } = {};
		const portBindings: { [portAndProtocol: string]: { HostPort: string }[] } = {};

		ports
			.filter((p) => p.hostPort.trim() && p.containerPort.trim())
			.forEach((p) => {
				const key = `${p.containerPort.trim()}/${p.protocol || 'tcp'}`;
				exposedPorts[key] = {};
				portBindings[key] = [{ HostPort: p.hostPort.trim() }];
			});

		const binds = volumeMounts.filter((v) => v.source.trim() && v.target.trim()).map((v) => `${v.source.trim()}:${v.target.trim()}${v.readOnly ? ':ro' : ''}`);

		const env = envVars.filter((e) => e.key.trim()).map((e) => `${e.key.trim()}=${e.value}`);

		let healthcheckConfig: HealthConfig | undefined = undefined;
		if (enableHealthcheck && healthcheckTest.length > 0 && healthcheckTest[0].trim() !== '') {
			const toNano = (seconds: number | undefined) => (seconds ? seconds * 1_000_000_000 : undefined);
			healthcheckConfig = {
				Test: healthcheckTest.filter((t) => t.trim() !== ''), // Ensure Test is not empty strings
				Interval: toNano(healthcheckInterval),
				Timeout: toNano(healthcheckTimeout),
				Retries: healthcheckRetries,
				StartPeriod: toNano(healthcheckStartPeriod)
			};
			if (healthcheckConfig && healthcheckConfig.Test && healthcheckConfig.Test.length === 0) healthcheckConfig = undefined;
		}

		let memoryBytes: number | undefined;
		try {
			memoryBytes = memoryLimitStr.trim() ? parseBytes(memoryLimitStr.trim()) : undefined;
		} catch (e) {
			console.error('Invalid memory format:', e);
			toast.error(`Invalid memory format: ${memoryLimitStr}`);
			isCreating = false;
			return;
		}

		let nanoCPUs: number | undefined;
		try {
			const cpuVal = cpuLimitStr.trim() ? parseFloat(cpuLimitStr.trim()) : undefined;
			if (cpuVal !== undefined) {
				if (isNaN(cpuVal) || cpuVal <= 0) {
					throw new Error('CPU Limit must be a positive number');
				}
				nanoCPUs = cpuVal * 1_000_000_000;
			}
		} catch (e: any) {
			console.error('Invalid CPU format:', e);
			toast.error(e.message || `Invalid CPU format: ${cpuLimitStr}`);
			isCreating = false;
			return;
		}

		const createOptions: ContainerCreateOptions = {
			name: containerName.trim(),
			Image: selectedImage,
			Cmd: commandOverride.trim() ? commandOverride.trim().split(/\s+/) : undefined,
			User: runAsUser.trim() || undefined,
			Labels: Object.keys(finalLabels).length > 0 ? finalLabels : undefined,
			Env: env.length > 0 ? env : undefined,
			ExposedPorts: Object.keys(exposedPorts).length > 0 ? exposedPorts : undefined,
			Healthcheck: healthcheckConfig,
			HostConfig: {
				PortBindings: Object.keys(portBindings).length > 0 ? portBindings : undefined,
				Binds: binds.length > 0 ? binds : undefined,
				RestartPolicy: { Name: restartPolicy as 'no' | 'always' | 'on-failure' | 'unless-stopped' },
				Memory: memoryBytes,
				NanoCpus: nanoCPUs,
				NetworkMode: networkMode || undefined // Default is 'bridge' if empty string
			}
		};

		if (isUserDefinedNetworkSelected && (ipv4Address.trim() || ipv6Address.trim())) {
			createOptions.NetworkingConfig = {
				EndpointsConfig: {
					[networkMode]: {
						// networkMode here is the name of the user-defined network
						IPAMConfig: {
							IPv4Address: ipv4Address.trim() || undefined,
							IPv6Address: ipv6Address.trim() || undefined
						}
					}
				}
			};
			// If using NetworkingConfig for a specific network, NetworkMode in HostConfig might be redundant
			// or should match. Docker typically handles this, but for clarity, if networkMode is a custom one,
			// it's often set in HostConfig.NetworkMode.
			if (createOptions.HostConfig) {
				createOptions.HostConfig.NetworkMode = networkMode;
			}
		} else if (networkMode && createOptions.HostConfig) {
			// For standard modes like 'bridge', 'host', 'none'
			createOptions.HostConfig.NetworkMode = networkMode;
		}

		handleApiResultWithCallbacks({
			result: await tryCatch(containerApi.create(createOptions)), // Pass ContainerCreateOptions
			message: 'Failed to Create Container',
			setLoadingState: (value) => (isCreating = value),
			onSuccess: async () => {
				toast.success(`Container "${createOptions.name}" created successfully!`);
				await invalidateAll();
				handleClose();
			},
			onError: () => {
				// Ensure isCreating is reset on error too
				isCreating = false;
			}
		});
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
				<div class="space-y-6">
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
											{#each images as image (image.Id)}
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
										<span>{selectedRestartPolicyLabel}</span>
									</Select.Trigger>
									<Select.Content>
										{#each restartPolicyOptions as option (option.value)}
											<Select.Item label={option.label} value={option.value}>{option.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						</div>
					</Tabs.Content>

					<!-- Port Mappings -->
					<Tabs.Content value="ports">
						<div class="space-y-4">
							{#each ports as port, index (index)}
								<div class="flex space-x-3 items-end">
									<div class="flex-1 grid grid-cols-3 gap-4">
										<div>
											<Label for={`host-port-${index}`} class="mb-2 block text-sm">Host Port</Label>
											<Input id={`host-port-${index}`} bind:value={port.hostPort} placeholder="e.g., 8080" disabled={isCreating} type="text" pattern="[0-9]*" inputmode="numeric" class={port.hostError && port.hostPort && port.hostError !== 'Privileged port (<1024)' ? 'border-red-500' : ''} />
											{#if port.hostError && port.hostPort}
												<div class="flex items-center text-xs mt-1 {port.hostError === 'Privileged port (<1024)' ? 'text-amber-600' : 'text-red-500'}">
													<AlertCircle class="mr-1 size-3" />
													{port.hostError}
												</div>
											{/if}
										</div>

										<div>
											<Label for={`container-port-${index}`} class="mb-2 block text-sm">Container Port</Label>
											<Input id={`container-port-${index}`} bind:value={port.containerPort} placeholder="e.g., 80" disabled={isCreating} type="text" pattern="[0-9]*" inputmode="numeric" class={port.containerError && port.containerPort && port.containerError !== 'Privileged port (<1024)' ? 'border-red-500' : ''} />
											{#if port.containerError && port.containerPort}
												<div class="flex items-center text-xs mt-1 {port.containerError === 'Privileged port (<1024)' ? 'text-amber-600' : 'text-red-500'}">
													<AlertCircle class="mr-1 size-3" />
													{port.containerError}
												</div>
											{/if}
										</div>
										<div>
											<Label for={`port-protocol-${index}`} class="mb-2 block text-sm">Protocol</Label>
											<Select.Root type="single" bind:value={port.protocol} disabled={isCreating}>
												<Select.Trigger class="w-full">
													<span>{port.protocol?.toUpperCase() || 'TCP'}</span>
												</Select.Trigger>
												<Select.Content>
													<Select.Item value="tcp">TCP</Select.Item>
													<Select.Item value="udp">UDP</Select.Item>
													<Select.Item value="sctp">SCTP</Select.Item>
												</Select.Content>
											</Select.Root>
										</div>
									</div>

									<Button variant="destructive" size="icon" type="button" onclick={() => removePort(index)} disabled={(ports.length <= 1 && !ports[0].hostPort && !ports[0].containerPort) || isCreating} class="shrink-0">
										<Trash class="size-4" />
									</Button>
								</div>
							{/each}
							<Button variant="outline" type="button" onclick={addPort} class="w-full" disabled={isCreating}>
								<Plus class="mr-2 size-4" /> Add Port Mapping
							</Button>
						</div>
					</Tabs.Content>

					<!-- Volume Mounts -->
					<Tabs.Content value="volumes">
						<div class="space-y-4">
							{#each volumeMounts as mount, index (index)}
								<div class="flex space-x-3 items-end">
									<div class="flex-1 grid grid-cols-2 gap-4 items-center">
										<div>
											<Label for={`volume-source-${index}`} class="mb-2 block">Host Path / Volume Name</Label>
											<Input id={`volume-source-${index}`} bind:value={mount.source} placeholder="e.g., /path/on/host or my_volume" disabled={isCreating} />
											<!-- 
                                                Future improvement: Differentiate between selecting existing named volumes 
                                                and entering a host path. For now, user types it.
                                            -->
										</div>
										<div>
											<Label for={`volume-target-${index}`} class="mb-2 block">Container Path</Label>
											<Input id={`volume-target-${index}`} bind:value={mount.target} placeholder="/data_in_container" disabled={isCreating} />
										</div>
									</div>
									<div class="flex items-center pt-6">
										<Switch id={`volume-readonly-${index}`} bind:checked={mount.readOnly} disabled={isCreating} />
										<Label for={`volume-readonly-${index}`} class="ml-2 text-sm">Read-only</Label>
									</div>
									<Button variant="destructive" size="icon" type="button" onclick={() => removeVolumeMount(index)} disabled={(volumeMounts.length <= 1 && !volumeMounts[0].source && !volumeMounts[0].target) || isCreating} class="shrink-0">
										<Trash class="size-4" />
									</Button>
								</div>
							{/each}
							<Button variant="outline" type="button" onclick={addVolumeMount} class="w-full" disabled={isCreating}>
								<Plus class="mr-2 size-4" /> Add Volume Mount
							</Button>
						</div>
					</Tabs.Content>

					<!-- Environment Variables -->
					<Tabs.Content value="env">
						<div class="space-y-4">
							{#each envVars as env, index (index)}
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
														<Eye class="size-4" />
													{:else}
														<EyeOff class="size-4" />
													{/if}
												</Button>
											</div>
										</div>
									</div>
									<Button variant="destructive" size="icon" type="button" onclick={() => removeEnvVar(index)} disabled={(envVars.length <= 1 && !envVars[0].key && !envVars[0].value) || isCreating} class="shrink-0">
										<Trash class="size-4" />
									</Button>
								</div>
							{/each}
							<Button variant="outline" type="button" onclick={addEnvVar} class="w-full" disabled={isCreating}>
								<Plus class="mr-2 size-4" /> Add Environment Variable
							</Button>
						</div>
					</Tabs.Content>

					<!-- Network Settings -->
					<Tabs.Content value="network">
						<div class="space-y-4">
							<div class="grid grid-cols-1 gap-2">
								<Label for="container-network">Network Mode / Name</Label>
								<Select.Root type="single" bind:value={networkMode} disabled={isCreating}>
									<Select.Trigger class="w-full">
										<span>{networkMode || 'Default (bridge)'}</span>
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="">Default (bridge)</Select.Item>
										<Select.Item value="host">Host</Select.Item>
										<Select.Item value="none">None</Select.Item>
										{#each networks.filter((n) => n.Name !== 'bridge' && n.Name !== 'host' && n.Name !== 'none') as net (net.Id)}
											<Select.Item value={net.Name}>
												{net.Name} ({net.Driver})
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>

							{#if isUserDefinedNetworkSelected}
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
								<Switch id="enable-healthcheck" bind:checked={enableHealthcheck} disabled={isCreating} />
								<Label for="enable-healthcheck" class="cursor-pointer">Enable Healthcheck</Label>
							</div>

							{#if enableHealthcheck}
								<div class="space-y-6 border-t pt-6 mt-4">
									<div class="space-y-2">
										<Label for="healthcheck-test">Test Command</Label>
										<Input id="healthcheck-test" bind:value={healthcheckTest[0]} placeholder="e.g., CMD-SHELL curl -f http://localhost:80 || exit 1" disabled={isCreating} />
										<p class="text-xs text-muted-foreground">Command to run inside the container. Use `CMD` or `CMD-SHELL`. For multiple arguments, use advanced settings or configure directly in compose.</p>
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
								{#each labels as label, index (index)}
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
										<Button variant="destructive" size="icon" type="button" onclick={() => removeLabel(index)} disabled={(labels.length <= 1 && !labels[0].key && !labels[0].value) || isCreating} class="shrink-0">
											<Trash class="size-4" />
										</Button>
									</div>
								{/each}
								<Button variant="outline" type="button" onclick={addLabel} class="w-full" disabled={isCreating}>
									<Plus class="mr-2 size-4" /> Add Label
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
										<Label for="cpu-limit">CPU Limit (cores)</Label>
										<Input id="cpu-limit" bind:value={cpuLimitStr} placeholder="e.g., 0.5, 1, 2" disabled={isCreating} type="number" step="0.1" min="0.01" />
										<p class="text-xs text-muted-foreground">Number of CPU cores (e.g., 1.5 = 1.5 cores).</p>
									</div>
								</div>
							</div>

							<!-- Auto-update -->
							<div class="flex items-center space-x-2 py-4 border-t">
								<Switch id="auto-update" name="autoUpdate" bind:checked={autoUpdate} />
								<Label for="auto-update" class="font-medium">Enable auto-update</Label>
								<p class="text-xs text-muted-foreground">When enabled, Arcane will periodically check for newer versions of this container's image and automatically update it.</p>
							</div>
						</div>
					</Tabs.Content>
				</div>
			</div>
		</Tabs.Root>

		<Dialog.Footer class="pt-4">
			<ArcaneButton action="cancel" onClick={handleClose} disabled={isCreating} class="mr-2" />
			<ArcaneButton action="create" loading={isCreating} onClick={handleSubmit} disabled={isCreating || !containerName.trim() || !selectedImage} />
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
