<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import ContainerIcon from '@lucide/svelte/icons/container';
	import XIcon from '@lucide/svelte/icons/x';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import type { ContainerCreateOptions } from 'dockerode';
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import SelectWithLabel from '../form/select-with-label.svelte';
	import { m } from '$lib/paraglide/messages';

	type CreateContainerFormProps = {
		open: boolean;
		onSubmit: (data: ContainerCreateOptions) => void;
		isLoading: boolean;
		availableImages?: string[];
		availableNetworks?: string[];
		availableVolumes?: string[];
	};

	let {
		open = $bindable(false),
		onSubmit,
		isLoading,
		availableImages = [],
		availableNetworks = [],
		availableVolumes = []
	}: CreateContainerFormProps = $props();

	const restartPolicies = [
		{ value: 'no', label: m.common_no() },
		{ value: 'always', label: m.common_always() },
		{ value: 'unless-stopped', label: m.restart_policy_unless_stopped() },
		{ value: 'on-failure', label: m.restart_policy_on_failure() }
	];

	const formSchema = z.object({
		containerName: z.string().min(1, m.container_name_required()),
		image: z.string().min(1, m.container_image_required()),
		command: z.string().optional().default(''),
		workingDir: z.string().optional().default(''),
		user: z.string().optional().default(''),
		hostname: z.string().optional().default(''),
		domainname: z.string().optional().default(''),
		attachStdout: z.boolean().default(true),
		attachStderr: z.boolean().default(true),
		attachStdin: z.boolean().default(false),
		tty: z.boolean().default(false),
		openStdin: z.boolean().default(false),
		stdinOnce: z.boolean().default(false),
		networkDisabled: z.boolean().default(false),
		publishAllPorts: z.boolean().default(false),
		privileged: z.boolean().default(false),
		readonlyRootfs: z.boolean().default(false),
		autoRemove: z.boolean().default(false),
		restartPolicy: z.string().default('no'),
		restartMaxRetries: z.number().min(0).optional().default(0),
		environmentVars: z.string().optional().default(''),
		labels: z.string().optional().default(''),
		exposedPorts: z.string().optional().default(''),
		portBindings: z.string().optional().default(''),
		volumes: z.string().optional().default('')
	});

	let formData = $derived({
		containerName: '',
		image: '',
		command: '',
		workingDir: '',
		user: '',
		hostname: '',
		domainname: '',
		attachStdout: true,
		attachStderr: true,
		attachStdin: false,
		tty: false,
		openStdin: false,
		stdinOnce: false,
		networkDisabled: false,
		publishAllPorts: false,
		privileged: false,
		readonlyRootfs: false,
		autoRemove: false,
		restartPolicy: 'no',
		restartMaxRetries: 0,
		environmentVars: '',
		labels: '',
		exposedPorts: '',
		portBindings: '',
		volumes: ''
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	// Dynamic states for complex inputs
	let envVars = $state<{ key: string; value: string }[]>([{ key: '', value: '' }]);
	let portMappings = $state<{ container: string; host: string; protocol: string }[]>([
		{ container: '', host: '', protocol: 'tcp' }
	]);
	let volumeMounts = $state<{ source: string; destination: string; readonly: boolean }[]>([
		{ source: '', destination: '', readonly: false }
	]);

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

	function parsePortList(text: string): Record<string, {}> {
		if (!text?.trim()) return {};

		const result: Record<string, {}> = {};
		const ports = text
			.split(',')
			.map((p) => p.trim())
			.filter(Boolean);

		for (const port of ports) {
			if (port.includes('/')) {
				result[port] = {};
			} else {
				result[`${port}/tcp`] = {};
			}
		}

		return result;
	}

	function addEnvVar() {
		envVars = [...envVars, { key: '', value: '' }];
	}

	function removeEnvVar(index: number) {
		envVars = envVars.filter((_, i) => i !== index);
	}

	function addPortMapping() {
		portMappings = [...portMappings, { container: '', host: '', protocol: 'tcp' }];
	}

	function removePortMapping(index: number) {
		portMappings = portMappings.filter((_, i) => i !== index);
	}

	function addVolumeMount() {
		volumeMounts = [...volumeMounts, { source: '', destination: '', readonly: false }];
	}

	function removeVolumeMount(index: number) {
		volumeMounts = volumeMounts.filter((_, i) => i !== index);
	}

	function handleSubmit() {
		const data = form.validate();
		if (!data) return;

		// Parse environment variables
		const textEnvVars = parseKeyValuePairs(data.environmentVars || '');
		const dynamicEnvVars: string[] = [];

		envVars.forEach((env) => {
			if (env.key.trim()) {
				dynamicEnvVars.push(`${env.key.trim()}=${env.value.trim()}`);
			}
		});

		Object.entries(textEnvVars).forEach(([key, value]) => {
			dynamicEnvVars.push(`${key}=${value}`);
		});

		// Parse port bindings
		const dynamicPortBindings: Record<string, Array<{ HostPort: string }>> = {};
		portMappings.forEach((mapping) => {
			if (mapping.container.trim() && mapping.host.trim()) {
				const containerPort = `${mapping.container.trim()}/${mapping.protocol}`;
				dynamicPortBindings[containerPort] = [{ HostPort: mapping.host.trim() }];
			}
		});

		// Parse volume bindings
		const dynamicBinds: string[] = [];
		volumeMounts.forEach((mount) => {
			if (mount.source.trim() && mount.destination.trim()) {
				const bind = mount.readonly
					? `${mount.source.trim()}:${mount.destination.trim()}:ro`
					: `${mount.source.trim()}:${mount.destination.trim()}`;
				dynamicBinds.push(bind);
			}
		});

		// Parse volume text input
		const textVolumes =
			data.volumes
				?.split('\n')
				.map((v) => v.trim())
				.filter(Boolean) || [];
		const allBinds = [...dynamicBinds, ...textVolumes];

		const labels = parseKeyValuePairs(data.labels || '');
		const exposedPorts = parsePortList(data.exposedPorts || '');

		const options: ContainerCreateOptions = {
			name: data.containerName.trim(),
			Image: data.image.trim(),
			Cmd: data.command.trim() ? data.command.trim().split(' ') : undefined,
			WorkingDir: data.workingDir.trim() || undefined,
			User: data.user.trim() || undefined,
			Hostname: data.hostname.trim() || undefined,
			Domainname: data.domainname.trim() || undefined,
			AttachStdout: data.attachStdout,
			AttachStderr: data.attachStderr,
			AttachStdin: data.attachStdin,
			Tty: data.tty,
			OpenStdin: data.openStdin,
			StdinOnce: data.stdinOnce,
			Env: dynamicEnvVars.length > 0 ? dynamicEnvVars : undefined,
			Labels: Object.keys(labels).length > 0 ? labels : undefined,
			ExposedPorts: Object.keys(exposedPorts).length > 0 ? exposedPorts : undefined,
			HostConfig: {
				Binds: allBinds.length > 0 ? allBinds : undefined,
				PortBindings: Object.keys(dynamicPortBindings).length > 0 ? dynamicPortBindings : undefined,
				NetworkMode: data.networkDisabled ? 'none' : undefined,
				PublishAllPorts: data.publishAllPorts,
				Privileged: data.privileged,
				ReadonlyRootfs: data.readonlyRootfs,
				AutoRemove: data.autoRemove,
				RestartPolicy: {
					Name: data.restartPolicy,
					MaximumRetryCount: data.restartPolicy === 'on-failure' ? data.restartMaxRetries : undefined
				}
			}
		};

		onSubmit(options);
	}

	function handleOpenChange(newOpenState: boolean) {
		open = newOpenState;
		if (!newOpenState) {
			// Reset form data
			Object.keys($inputs).forEach((key) => {
				const input = $inputs[key as keyof typeof $inputs];
				if (typeof input.value === 'boolean') {
					input.value = formData[key as keyof typeof formData] as boolean;
				} else if (typeof input.value === 'number') {
					input.value = formData[key as keyof typeof formData] as number;
				} else {
					input.value = formData[key as keyof typeof formData] as string;
				}
			});
			envVars = [{ key: '', value: '' }];
			portMappings = [{ container: '', host: '', protocol: 'tcp' }];
			volumeMounts = [{ source: '', destination: '', readonly: false }];
		}
	}
</script>

<Sheet.Root bind:open onOpenChange={handleOpenChange}>
	<Sheet.Content side="top" class="max-h-[90vh] p-5">
		<div class="flex h-full flex-col">
			<!-- Header -->
			<div class="bg-background shrink-0 border-b px-6 py-4">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
						<ContainerIcon class="text-primary size-5" />
					</div>
					<div>
						<Sheet.Title class="text-xl font-semibold">{m.create_container_title()}</Sheet.Title>
						<Sheet.Description class="text-muted-foreground mt-1 text-sm">{m.create_container_description()}</Sheet.Description>
					</div>
				</div>
			</div>

			<!-- Content with Tabs -->
			<div class="flex-1">
				<Tabs.Root value="basic" class="flex h-full flex-col">
					<Tabs.List class="bg-muted/30 grid w-full shrink-0 grid-cols-6 border-b">
						<Tabs.Trigger value="basic" class="py-3">{m.common_basic()}</Tabs.Trigger>
						<Tabs.Trigger value="environment" class="py-3">{m.tabs_environment()}</Tabs.Trigger>
						<Tabs.Trigger value="ports" class="py-3">{m.common_ports()}</Tabs.Trigger>
						<Tabs.Trigger value="volumes" class="py-3">{m.tabs_volumes()}</Tabs.Trigger>
						<Tabs.Trigger value="network" class="py-3">{m.tabs_network_security()}</Tabs.Trigger>
						<Tabs.Trigger value="advanced" class="py-3">{m.tabs_advanced()}</Tabs.Trigger>
					</Tabs.List>

					<div class="flex-1 overflow-y-auto">
						<form onsubmit={preventDefault(handleSubmit)} class="flex h-full flex-col">
							<div class="flex-1">
								<!-- Basic Tab -->
								<Tabs.Content value="basic" class="mt-0 space-y-8 p-6">
									<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
										<div class="space-y-3">
											<Label for="container-name" class="text-sm font-medium">{m.container_name_label()}</Label>
											<Input
												id="container-name"
												type="text"
												placeholder={m.container_name_placeholder()}
												disabled={isLoading}
												bind:value={$inputs.containerName.value}
												class={$inputs.containerName.error ? 'border-destructive' : ''}
											/>
											{#if $inputs.containerName.error}
												<p class="text-destructive mt-1 text-xs">{$inputs.containerName.error}</p>
											{/if}
											<p class="text-muted-foreground text-xs">{m.container_name_description()}</p>
										</div>

										<div class="space-y-3">
											<Label for="image" class="text-sm font-medium">{m.container_image_label()}</Label>
											<Input
												id="image"
												type="text"
												placeholder={m.container_image_placeholder()}
												disabled={isLoading}
												bind:value={$inputs.image.value}
												class={$inputs.image.error ? 'border-destructive' : ''}
											/>
											{#if $inputs.image.error}
												<p class="text-destructive mt-1 text-xs">{$inputs.image.error}</p>
											{/if}
											<p class="text-muted-foreground text-xs">{m.container_image_description()}</p>
										</div>
									</div>

									<div class="space-y-3">
										<FormInput
											label={m.container_command_label()}
											type="text"
											placeholder={m.container_command_placeholder()}
											description={m.container_command_description()}
											disabled={isLoading}
											bind:input={$inputs.command}
										/>
									</div>

									<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
										<div class="space-y-3">
											<FormInput
												label={m.common_working_directory()}
												type="text"
												placeholder={m.container_working_directory_placeholder()}
												description={m.container_working_directory_description()}
												disabled={isLoading}
												bind:input={$inputs.workingDir}
											/>
										</div>

										<div class="space-y-3">
											<FormInput
												label={m.container_user_label()}
												type="text"
												placeholder={m.container_user_placeholder()}
												description={m.container_user_description()}
												disabled={isLoading}
												bind:input={$inputs.user}
											/>
										</div>

										<div class="space-y-3">
											<FormInput
												label={m.container_hostname_label()}
												type="text"
												placeholder={m.container_hostname_placeholder()}
												disabled={isLoading}
												bind:input={$inputs.hostname}
											/>
										</div>

										<div class="space-y-3">
											<FormInput
												label={m.container_domain_label()}
												type="text"
												placeholder={m.container_domain_placeholder()}
												disabled={isLoading}
												bind:input={$inputs.domainname}
											/>
										</div>
									</div>

									<div class="space-y-4 rounded-lg border p-6">
										<h4 class="text-sm font-semibold">{m.io_settings_title()}</h4>
										<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
											<div class="flex items-center space-x-2">
												<Checkbox id="attach-stdout" bind:checked={$inputs.attachStdout.value} disabled={isLoading} />
												<Label for="attach-stdout" class="text-sm font-normal">{m.io_attach_stdout()}</Label>
											</div>
											<div class="flex items-center space-x-2">
												<Checkbox id="attach-stderr" bind:checked={$inputs.attachStderr.value} disabled={isLoading} />
												<Label for="attach-stderr" class="text-sm font-normal">{m.io_attach_stderr()}</Label>
											</div>
											<div class="flex items-center space-x-2">
												<Checkbox id="attach-stdin" bind:checked={$inputs.attachStdin.value} disabled={isLoading} />
												<Label for="attach-stdin" class="text-sm font-normal">{m.io_attach_stdin()}</Label>
											</div>
											<div class="flex items-center space-x-2">
												<Checkbox id="tty" bind:checked={$inputs.tty.value} disabled={isLoading} />
												<Label for="tty" class="text-sm font-normal">{m.io_allocate_tty()}</Label>
											</div>
											<div class="flex items-center space-x-2">
												<Checkbox id="open-stdin" bind:checked={$inputs.openStdin.value} disabled={isLoading} />
												<Label for="open-stdin" class="text-sm font-normal">{m.io_open_stdin()}</Label>
											</div>
											<div class="flex items-center space-x-2">
												<Checkbox id="stdin-once" bind:checked={$inputs.stdinOnce.value} disabled={isLoading} />
												<Label for="stdin-once" class="text-sm font-normal">{m.io_stdin_once()}</Label>
											</div>
										</div>
									</div>
								</Tabs.Content>

								<!-- Environment Tab -->
								<Tabs.Content value="environment" class="mt-0 space-y-8 p-6">
									<div class="grid grid-cols-1 gap-8 xl:grid-cols-2">
										<div class="space-y-6">
											<div>
												<h3 class="mb-4 text-lg font-semibold">{m.env_dynamic_title()}</h3>
												<div class="space-y-3">
													{#each envVars as env, index (index)}
														<div class="flex items-center gap-3">
															<Input type="text" placeholder="KEY" bind:value={env.key} disabled={isLoading} class="flex-1" />
															<span class="text-muted-foreground font-mono">=</span>
															<Input type="text" placeholder="value" bind:value={env.value} disabled={isLoading} class="flex-1" />
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onclick={() => removeEnvVar(index)}
																disabled={isLoading || envVars.length <= 1}
																class="text-destructive hover:text-destructive shrink-0"
															>
																<XIcon class="size-4" />
															</Button>
														</div>
													{/each}
													<Button
														type="button"
														variant="outline"
														size="sm"
														onclick={addEnvVar}
														disabled={isLoading}
														class="w-full"
													>
														<PlusIcon class="mr-2 size-4" />
														{m.add_env_var_button()}
													</Button>
												</div>
											</div>
										</div>

										<div class="space-y-6">
											<div>
												<h3 class="mb-4 text-lg font-semibold">{m.env_text_format_title()}</h3>
												<div class="space-y-3">
													<Textarea
														placeholder={m.env_text_placeholder()}
														disabled={isLoading}
														rows={12}
														bind:value={$inputs.environmentVars.value}
														class={$inputs.environmentVars.error ? 'border-destructive' : ''}
													/>
													{#if $inputs.environmentVars.error}
														<p class="text-destructive text-xs">{$inputs.environmentVars.error}</p>
													{/if}
													<p class="text-muted-foreground text-xs">{m.env_text_description()}</p>
												</div>
											</div>
										</div>
									</div>
								</Tabs.Content>

								<!-- Ports Tab -->
								<Tabs.Content value="ports" class="mt-0 space-y-8 p-6">
									<div class="grid grid-cols-1 gap-8 xl:grid-cols-2">
										<div class="space-y-6">
											<div>
												<h3 class="mb-4 text-lg font-semibold">{m.common_port_mappings()}</h3>
												<div class="space-y-3">
													{#each portMappings as mapping, index (index)}
														<div class="flex items-center gap-3">
															<div class="flex flex-1 items-center gap-2">
																<div class="text-muted-foreground min-w-12 text-sm whitespace-nowrap">{m.port_label_host()}</div>
																<Input
																	type="text"
																	placeholder="8080"
																	bind:value={mapping.host}
																	disabled={isLoading}
																	class="flex-1"
																/>
															</div>
															<span class="text-muted-foreground">→</span>
															<div class="flex flex-1 items-center gap-2">
																<div class="text-muted-foreground min-w-20 text-sm whitespace-nowrap">
																	{m.port_label_container()}
																</div>
																<Input
																	type="text"
																	placeholder="80"
																	bind:value={mapping.container}
																	disabled={isLoading}
																	class="flex-1"
																/>
															</div>
															<select
																bind:value={mapping.protocol}
																disabled={isLoading}
																class="min-w-16 rounded-md border px-3 py-2 text-sm"
															>
																<option value="tcp">TCP</option>
																<option value="udp">UDP</option>
															</select>
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onclick={() => removePortMapping(index)}
																disabled={isLoading || portMappings.length <= 1}
																class="text-destructive hover:text-destructive shrink-0"
															>
																<XIcon class="size-4" />
															</Button>
														</div>
													{/each}
													<Button
														type="button"
														variant="outline"
														size="sm"
														onclick={addPortMapping}
														disabled={isLoading}
														class="w-full"
													>
														<PlusIcon class="mr-2 size-4" />
														{m.add_port_mapping_button()}
													</Button>
												</div>
											</div>
										</div>

										<div class="space-y-6">
											<div>
												<h3 class="mb-4 text-lg font-semibold">{m.port_configuration_title()}</h3>
												<div class="space-y-4">
													<FormInput
														label={m.common_exposed_ports()}
														type="text"
														placeholder={m.exposed_ports_placeholder()}
														description={m.exposed_ports_description()}
														disabled={isLoading}
														bind:input={$inputs.exposedPorts}
													/>

													<div class="flex items-center space-x-2 pt-2">
														<Checkbox id="publish-all" bind:checked={$inputs.publishAllPorts.value} disabled={isLoading} />
														<Label for="publish-all" class="text-sm font-normal">{m.publish_all_ports_label()}</Label>
													</div>
												</div>
											</div>
										</div>
									</div>
								</Tabs.Content>

								<!-- Volumes Tab -->
								<Tabs.Content value="volumes" class="mt-0 space-y-8 p-6">
									<div class="grid grid-cols-1 gap-8 xl:grid-cols-2">
										<div class="space-y-6">
											<div>
												<h3 class="mb-4 text-lg font-semibold">{m.volume_mounts_title()}</h3>
												<div class="space-y-3">
													{#each volumeMounts as mount, index (index)}
														<div class="space-y-2">
															<div class="flex items-center gap-3">
																<Input
																	type="text"
																	placeholder="Source path or volume name"
																	bind:value={mount.source}
																	disabled={isLoading}
																	class="flex-1"
																/>
																<span class="text-muted-foreground">:</span>
																<Input
																	type="text"
																	placeholder="Container path"
																	bind:value={mount.destination}
																	disabled={isLoading}
																	class="flex-1"
																/>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	onclick={() => removeVolumeMount(index)}
																	disabled={isLoading || volumeMounts.length <= 1}
																	class="text-destructive hover:text-destructive shrink-0"
																>
																	<XIcon class="size-4" />
																</Button>
															</div>
															<div class="flex items-center space-x-2 pl-3">
																<Checkbox bind:checked={mount.readonly} disabled={isLoading} />
																<Label class="text-sm font-normal">{m.read_only_label()}</Label>
															</div>
														</div>
													{/each}
													<Button
														type="button"
														variant="outline"
														size="sm"
														onclick={addVolumeMount}
														disabled={isLoading}
														class="w-full"
													>
														<PlusIcon class="mr-2 size-4" />
														{m.add_volume_mount_button()}
													</Button>
												</div>
											</div>
										</div>

										<div class="space-y-6">
											<div>
												<h3 class="mb-4 text-lg font-semibold">{m.volumes_text_title()}</h3>
												<div class="space-y-3">
													<Textarea
														placeholder={m.volumes_text_placeholder()}
														disabled={isLoading}
														rows={12}
														bind:value={$inputs.volumes.value}
														class={$inputs.volumes.error ? 'border-destructive' : ''}
													/>
													{#if $inputs.volumes.error}
														<p class="text-destructive text-xs">{$inputs.volumes.error}</p>
													{/if}
													<p class="text-muted-foreground text-xs">{m.volumes_text_description()}</p>
												</div>
											</div>
										</div>
									</div>
								</Tabs.Content>

								<!-- Network & Security Tab -->
								<Tabs.Content value="network" class="mt-0 space-y-8 p-6">
									<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
										<div class="space-y-6">
											<div class="rounded-lg border p-6">
												<h3 class="mb-4 text-lg font-semibold">{m.network_settings_title()}</h3>
												<div class="space-y-4">
													<div class="flex items-center space-x-3">
														<Checkbox id="network-disabled" bind:checked={$inputs.networkDisabled.value} disabled={isLoading} />
														<Label for="network-disabled" class="text-sm font-normal">{m.disable_network_label()}</Label>
													</div>
													<div class="flex items-center space-x-3">
														<Checkbox
															id="publish-all-ports-net"
															bind:checked={$inputs.publishAllPorts.value}
															disabled={isLoading}
														/>
														<Label for="publish-all-ports-net" class="text-sm font-normal">{m.publish_all_ports_label()}</Label>
													</div>
												</div>
											</div>
										</div>

										<div class="space-y-6">
											<div class="rounded-lg border p-6">
												<h3 class="mb-4 text-lg font-semibold">{m.security_settings_title()}</h3>
												<div class="space-y-4">
													<div class="flex items-center space-x-3">
														<Checkbox id="privileged" bind:checked={$inputs.privileged.value} disabled={isLoading} />
														<Label for="privileged" class="text-sm font-normal">{m.privileged_label()}</Label>
													</div>
													<div class="flex items-center space-x-3">
														<Checkbox id="readonly-rootfs" bind:checked={$inputs.readonlyRootfs.value} disabled={isLoading} />
														<Label for="readonly-rootfs" class="text-sm font-normal">{m.readonly_rootfs_label()}</Label>
													</div>
													<div class="flex items-center space-x-3">
														<Checkbox id="auto-remove" bind:checked={$inputs.autoRemove.value} disabled={isLoading} />
														<Label for="auto-remove" class="text-sm font-normal">{m.auto_remove_label()}</Label>
													</div>
												</div>
											</div>
										</div>
									</div>
								</Tabs.Content>

								<!-- Advanced Tab -->
								<Tabs.Content value="advanced" class="mt-0 space-y-8 p-6">
									<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
										<div class="space-y-6">
											<div class="rounded-lg border p-6">
												<h3 class="mb-4 text-lg font-semibold">{m.restart_policy_title()}</h3>
												<div class="space-y-4">
													<SelectWithLabel
														id="restart-policy"
														bind:value={$inputs.restartPolicy.value}
														label={m.restart_policy_label()}
														description={m.restart_policy_description()}
														options={restartPolicies}
														placeholder="Select restart policy"
													/>

													{#if $inputs.restartPolicy.value === 'on-failure'}
														<div class="space-y-3">
															<Label for="max-retries" class="text-sm font-medium">{m.max_retry_label()}</Label>
															<Input
																id="max-retries"
																type="number"
																min="0"
																placeholder={m.max_retry_placeholder()}
																disabled={isLoading}
																bind:value={$inputs.restartMaxRetries.value}
															/>
															<p class="text-muted-foreground text-xs">{m.max_retry_description()}</p>
														</div>
													{/if}
												</div>
											</div>
										</div>

										<div class="space-y-6">
											<div class="rounded-lg border p-6">
												<h3 class="mb-4 text-lg font-semibold">{m.common_labels()}</h3>
												<div class="space-y-3">
													<Textarea
														placeholder="com.example.description=My application&#10;com.example.version=1.0.0&#10;com.example.maintainer=admin@example.com"
														disabled={isLoading}
														rows={8}
														bind:value={$inputs.labels.value}
														class={$inputs.labels.error ? 'border-destructive' : ''}
													/>
													{#if $inputs.labels.error}
														<p class="text-destructive text-xs">{$inputs.labels.error}</p>
													{/if}
													<p class="text-muted-foreground text-xs">{m.containers_labels_description()}</p>
												</div>
											</div>
										</div>
									</div>
								</Tabs.Content>
							</div>

							<!-- Footer -->
							<div class="bg-background shrink-0 border-t p-6">
								<div class="flex flex-row justify-end gap-3">
									<Button type="button" variant="outline" onclick={() => (open = false)} disabled={isLoading}
										>{m.common_cancel()}</Button
									>
									<Button type="submit" disabled={isLoading}>
										{#if isLoading}
											<Spinner class="mr-2 size-4" />
											{m.common_action_creating()}
										{:else}
											<ContainerIcon class="mr-2 size-4" />
											{m.common_create_button({ resource: m.resource_container_cap() })}
										{/if}
									</Button>
								</div>
							</div>
						</form>
					</div>
				</Tabs.Root>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
