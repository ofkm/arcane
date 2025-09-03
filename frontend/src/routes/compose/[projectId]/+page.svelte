<script lang="ts">
	import type { PageData } from './$types';
	import type { Project, ProjectService, ProjectPort } from '$lib/types/project.type';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CircleAlertIcon from '@lucide/svelte/icons/alert-circle';
	import FileStackIcon from '@lucide/svelte/icons/file-stack';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ActionButtons from '$lib/components/action-buttons.svelte';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { getStatusVariant } from '$lib/utils/status.utils';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import CodeEditor from '$lib/components/code-editor/editor.svelte';
	import { tryCatch } from '$lib/utils/try-catch';
	import { environmentAPI } from '$lib/services/api';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import LogViewer from '$lib/components/log-viewer.svelte';
	import { browser } from '$app/environment';
	import { z } from 'zod/v4';
	import { createForm } from '$lib/utils/form.utils';

	let { data }: { data: PageData } = $props();
	let { project, editorState, servicePorts, settings } = $derived(data);

	let isLoading = $state({
		deploying: false,
		stopping: false,
		restarting: false,
		removing: false,
		importing: false,
		redeploying: false,
		destroying: false,
		pulling: false,
		saving: false
	});

	let originalName = $derived(editorState.originalName);
	let originalComposeContent = $derived(editorState.originalComposeContent);
	let originalEnvContent = $derived(editorState.originalEnvContent || '');

	const formSchema = z.object({
		name: z
			.string()
			.min(1, 'Project name is required')
			.regex(/^[a-z0-9-]+$/i, 'Only letters, numbers, and hyphens are allowed'),
		composeContent: z.string().min(1, 'Compose content is required'),
		envContent: z.string().optional().default('')
	});

	let formData = $derived({
		name: editorState.name,
		composeContent: editorState.composeContent,
		envContent: editorState.envContent || ''
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	let hasChanges = $derived(
		$inputs.name.value !== originalName ||
			$inputs.composeContent.value !== originalComposeContent ||
			$inputs.envContent.value !== originalEnvContent
	);

	const baseServerUrl = $derived(settings?.baseServerUrl || 'localhost');

	let activeSection = $state<string>('overview');
	let autoScrollStackLogs = $state(true);
	let isStackLogsStreaming = $state(false);
	let stackLogViewer = $state<LogViewer>();
	let showFloatingHeader = $state(false);

	$effect(() => {
		if (browser) {
			const handleScroll = () => {
				showFloatingHeader = window.scrollY > 100;
			};

			window.addEventListener('scroll', handleScroll);
			return () => window.removeEventListener('scroll', handleScroll);
		}
	});

	$effect(() => {
		isLoading.deploying = false;
		isLoading.stopping = false;
		isLoading.restarting = false;
		isLoading.removing = false;
		isLoading.saving = false;
	});

	async function handleSaveChanges() {
		if (!project || !hasChanges) return;

		const validated = form.validate();
		if (!validated) return;

		const { composeContent, envContent } = validated;

		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.updateProject(project.id, composeContent, envContent)),
			message: 'Failed to Save Project',
			setLoadingState: (value) => (isLoading.saving = value),
			onSuccess: async (updatedStack: Project) => {
				toast.success('Project updated successfully!');

				originalName = updatedStack.name;
				originalComposeContent = $inputs.composeContent.value;
				originalEnvContent = $inputs.envContent.value;

				await new Promise((resolve) => setTimeout(resolve, 200));
				await invalidateAll();
			}
		});
	}

	function getHostForService(service: ProjectService): string {
		if (!service?.networkSettings?.Networks) return baseServerUrl;

		const networks = service.networkSettings.Networks;
		for (const networkName in networks) {
			const network = networks[networkName];
			if (network.Driver === 'macvlan' || network.Driver === 'ipvlan') {
				if (network.IPAddress) return network.IPAddress;
			}
		}

		return baseServerUrl;
	}

	function getServicePortUrl(service: ProjectService, port: string | number | ProjectPort, protocol = 'http'): string {
		const host = getHostForService(service);

		if (typeof port === 'string') {
			const parts = port.split('/');
			const portNumber = parseInt(parts[0], 10);

			if (parts.length > 1 && parts[1] === 'udp') {
				protocol = 'udp';
			}

			return `${protocol}://${host}:${portNumber}`;
		}

		if (typeof port === 'number') {
			return `${protocol}://${host}:${port}`;
		}

		if (port && typeof port === 'object') {
			const portNumber = port.PublicPort || port.PrivatePort || 80;
			if (port.Type) {
				protocol = port.Type.toLowerCase() === 'tcp' ? 'http' : 'https';
			}
			return `${protocol}://${host}:${portNumber}`;
		}

		return `${protocol}://${host}:80`;
	}

	function handleStackLogStart() {
		isStackLogsStreaming = true;
	}

	function handleStackLogStop() {
		isStackLogsStreaming = false;
	}

	function handleStackLogClear() {}

	function handleToggleStackAutoScroll() {}

	const navigationSections = [
		{ id: 'overview', label: 'Overview', icon: FileStackIcon },
		{ id: 'services', label: 'Services', icon: LayersIcon },
		{ id: 'config', label: 'Configuration', icon: SettingsIcon },
		{ id: 'logs', label: 'Logs', icon: TerminalIcon }
	] as const;

	type SectionId = (typeof navigationSections)[number]['id'];

	function scrollToSection(sectionId: SectionId) {
		activeSection = sectionId;
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
</script>

<div class="bg-background min-h-screen">
	{#if project}
		<div
			class="bg-background/95 sticky top-0 z-20 border-b backdrop-blur transition-all duration-300"
			style="opacity: {showFloatingHeader ? 0 : 1}; pointer-events: {showFloatingHeader ? 'none' : 'auto'};"
		>
			<div class="max-w-full px-4 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Button variant="ghost" size="sm" href="/compose">
							<ArrowLeftIcon class="mr-2 size-4" />
							Back
						</Button>
						<div class="bg-border h-4 w-px"></div>
						<div class="flex items-center gap-2">
							<h1 class="max-w-[300px] truncate text-lg font-semibold" title={project.name}>
								{project.name}
							</h1>
							{#if project.status}
								<StatusBadge variant={getStatusVariant(project.status)} text={capitalizeFirstLetter(project.status)} />
							{/if}
						</div>
					</div>
					<div class="flex items-center gap-2">
						<ActionButtons
							id={project.id}
							type="stack"
							itemState={project.status}
							loading={{
								start: isLoading.deploying,
								stop: isLoading.stopping,
								restart: isLoading.restarting,
								remove: isLoading.removing
							}}
							onActionComplete={() => invalidateAll()}
						/>
					</div>
				</div>
			</div>
		</div>

		{#if showFloatingHeader}
			<div class="fixed left-1/2 top-4 z-30 -translate-x-1/2 transition-all duration-300 ease-in-out">
				<div class="bg-background/90 border-border/50 rounded-lg border px-4 py-3 shadow-xl backdrop-blur-xl">
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-2">
							<h2 class="max-w-[150px] truncate text-sm font-medium" title={project.name}>
								{project.name}
							</h2>
							{#if project.status}
								<StatusBadge
									variant={getStatusVariant(project.status)}
									text={capitalizeFirstLetter(project.status)}
									class="text-xs"
								/>
							{/if}
						</div>
						<div class="bg-border h-4 w-px"></div>
						<ActionButtons
							id={project.id}
							type="stack"
							itemState={project.status}
							loading={{
								start: isLoading.deploying,
								stop: isLoading.stopping,
								restart: isLoading.restarting,
								remove: isLoading.removing
							}}
							onActionComplete={() => invalidateAll()}
						/>
					</div>
				</div>
			</div>
		{/if}

		{#if data.error}
			<div class="max-w-full px-4 py-4">
				<Alert.Root variant="destructive">
					<CircleAlertIcon class="size-4" />
					<Alert.Title>Error Loading Stack</Alert.Title>
					<Alert.Description>{data.error}</Alert.Description>
				</Alert.Root>
			</div>
		{/if}

		<div class="flex min-h-0 overflow-hidden">
			<div class="bg-background/50 w-16 shrink-0 border-r">
				<div class="sticky top-16 p-2">
					<nav class="space-y-1">
						{#each navigationSections as section}
							{@const IconComponent = section.icon}
							<button
								onclick={() => scrollToSection(section.id)}
								class="relative flex w-full items-center justify-center rounded-md p-3 text-sm font-medium transition-colors
                                    {activeSection === section.id
									? 'bg-primary/10 text-primary border-primary/20 border'
									: 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
								title={section.label}
							>
								<IconComponent class="size-4" />
								{#if section.id === 'services' && project.serviceCount}
									<span
										class="bg-primary text-primary-foreground absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-xs"
									>
										{project.serviceCount}
									</span>
								{/if}
							</button>
						{/each}
					</nav>
				</div>
			</div>

			<div class="min-w-0 flex-1 overflow-hidden">
				<div class="max-w-none p-6">
					<div class="space-y-8">
						<section id="overview" class="scroll-mt-20">
							<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
								<FileStackIcon class="size-5" />
								Overview
							</h2>

							<div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
								<Card.Root class="border">
									<Card.Content class="flex items-center justify-between p-6">
										<div>
											<p class="text-muted-foreground text-sm font-medium">Services</p>
											<p class="text-2xl font-bold">{project.serviceCount}</p>
										</div>
										<div class="bg-primary/10 rounded-full p-3">
											<LayersIcon class="text-primary size-5" />
										</div>
									</Card.Content>
								</Card.Root>

								<Card.Root class="border">
									<Card.Content class="flex items-center justify-between p-6">
										<div>
											<p class="text-muted-foreground text-sm font-medium">Running</p>
											<p class="text-2xl font-bold">{project.runningCount}</p>
										</div>
										<div class="rounded-full bg-green-500/10 p-3">
											<ActivityIcon class="size-5 text-green-500" />
										</div>
									</Card.Content>
								</Card.Root>

								<Card.Root class="border">
									<Card.Content class="flex items-center justify-between p-6">
										<div>
											<p class="text-muted-foreground text-sm font-medium">Created</p>
											<p class="text-lg font-medium">
												{new Date(project.createdAt ?? '').toLocaleDateString()}
											</p>
										</div>
										<div class="rounded-full bg-blue-500/10 p-3">
											<FileStackIcon class="size-5 text-blue-500" />
										</div>
									</Card.Content>
								</Card.Root>

								{#if servicePorts && Object.keys(servicePorts).length > 0}
									{@const allUniquePorts = [...new Set(Object.values(servicePorts).flat())]}
									<Card.Root class="border">
										<Card.Header class="pb-4">
											<Card.Title>Exposed Ports</Card.Title>
										</Card.Header>
										<Card.Content>
											<div class="flex flex-wrap gap-2">
												{#each allUniquePorts as port (port)}
													{@const portValue =
														typeof port === 'string' || typeof port === 'number' || (typeof port === 'object' && port !== null)
															? port
															: String(port)}
													{@const serviceWithPort = project.services?.find((s) => s.ports?.includes(String(port))) || {
														container_id: '',
														name: '',
														status: ''
													}}
													<a
														href={getServicePortUrl(serviceWithPort, portValue)}
														target="_blank"
														rel="noopener noreferrer"
														class="inline-flex items-center rounded-md bg-blue-500/10 px-3 py-2 font-medium text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
													>
														Port {port}
														<ExternalLinkIcon class="ml-2 size-4" />
													</a>
												{/each}
											</div>
										</Card.Content>
									</Card.Root>
								{/if}
							</div>

							{#if servicePorts && Object.keys(servicePorts).length > 0}
								{@const allUniquePorts = [...new Set(Object.values(servicePorts).flat())]}
								<Card.Root class="border">
									<Card.Header class="pb-4">
										<Card.Title>Exposed Ports</Card.Title>
									</Card.Header>
									<Card.Content>
										<div class="flex flex-wrap gap-2">
											{#each allUniquePorts as port (port)}
												{@const portValue =
													typeof port === 'string' || typeof port === 'number' || (typeof port === 'object' && port !== null)
														? port
														: String(port)}
												{@const serviceWithPort = project.services?.find((s) => s.ports?.includes(String(port))) || {
													container_id: '',
													name: '',
													status: ''
												}}
												<a
													href={getServicePortUrl(serviceWithPort, portValue)}
													target="_blank"
													rel="noopener noreferrer"
													class="inline-flex items-center rounded-md bg-blue-500/10 px-3 py-2 font-medium text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
												>
													Port {port}
													<ExternalLinkIcon class="ml-2 size-4" />
												</a>
											{/each}
										</div>
									</Card.Content>
								</Card.Root>
							{/if}
						</section>

						<section id="services" class="scroll-mt-20">
							<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
								<LayersIcon class="size-5" />
								Services ({project.serviceCount})
							</h2>

							{#if project.services && project.services.length > 0}
								<div class="bg-card rounded-lg border">
									<div class="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
										{#each project.services as service (service.container_id || service.name)}
											{@const status = service.status || 'unknown'}
											{@const variant = getStatusVariant(status)}

											{#if service.container_id}
												<a
													href={`/containers/${service.container_id}`}
													class="bg-background hover:bg-muted/50 group flex items-center gap-3 rounded-lg border p-3 transition-all"
												>
													<div class="bg-primary/10 shrink-0 rounded-full p-2">
														<LayersIcon class="text-primary size-3" />
													</div>
													<div class="min-w-0 flex-1">
														<div class="flex items-center justify-between">
															<p class="truncate text-sm font-medium" title={service.name}>
																{service.name}
															</p>
															<ArrowRightIcon
																class="text-primary size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
															/>
														</div>
														<div class="mt-1 flex items-center gap-2">
															<StatusBadge {variant} text={capitalizeFirstLetter(status)} class="text-xs" />
															{#if service.ports && service.ports.length > 0}
																<span class="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
																	{service.ports.length} port{service.ports.length > 1 ? 's' : ''}
																</span>
															{/if}
														</div>
													</div>
												</a>
											{:else}
												<div class="bg-muted/10 flex items-center gap-3 rounded-lg border p-3">
													<div class="bg-muted/50 shrink-0 rounded-full p-2">
														<LayersIcon class="text-muted-foreground size-3" />
													</div>
													<div class="min-w-0 flex-1">
														<p class="truncate text-sm font-medium" title={service.name}>
															{service.name}
														</p>
														<div class="mt-1 flex items-center gap-2">
															<StatusBadge {variant} text={capitalizeFirstLetter(status)} class="text-xs" />
															<span class="text-muted-foreground text-xs">Not created</span>
														</div>
													</div>
												</div>
											{/if}
										{/each}
									</div>
								</div>
							{:else}
								<div class="py-12 text-center">
									<div class="bg-muted/50 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
										<LayersIcon class="text-muted-foreground size-6" />
									</div>
									<div class="text-muted-foreground">No services found for this project</div>
								</div>
							{/if}
						</section>

						<section id="config" class="scroll-mt-20">
							<div class="mb-6 flex items-center justify-between">
								<h2 class="flex items-center gap-2 text-xl font-semibold">
									<SettingsIcon class="size-5" />
									Configuration
								</h2>
								{#if hasChanges}
									<ArcaneButton
										action="save"
										loading={isLoading.saving}
										onclick={handleSaveChanges}
										disabled={!hasChanges}
										customLabel="Save Changes"
										loadingLabel="Saving..."
										class="bg-green-600 text-white hover:bg-green-700"
									/>
								{/if}
							</div>

							<div class="mb-6 space-y-2">
								<Label for="name" class="mb-10 text-sm font-medium">Project Name</Label>
								<div class="max-w-md">
									<Input
										type="text"
										id="name"
										name="name"
										bind:value={$inputs.name.value}
										required
										class="my-2 {$inputs.name.error ? 'border-destructive' : ''}"
										disabled={isLoading.saving || project?.status === 'running' || project?.status === 'partially running'}
									/>
									{#if $inputs.name.error}
										<p class="text-destructive mt-1 text-xs">{$inputs.name.error}</p>
									{/if}
									{#if project?.status === 'running' || project?.status === 'partially running'}
										<p class="text-muted-foreground mt-2 text-sm">
											Project name cannot be changed while running. Please stop the project first.
										</p>
									{/if}
								</div>
							</div>

							<div class="grid min-w-0 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-3">
								<div class="min-w-0 overflow-hidden lg:col-span-2">
									<div class="space-y-4">
										<h3 class="text-lg">Compose File</h3>
										<div class="h-[590px] w-full min-w-0 overflow-hidden rounded-md">
											<CodeEditor bind:value={$inputs.composeContent.value} language="yaml" placeholder="Enter YAML..." />
										</div>
										{#if $inputs.composeContent.error}
											<p class="text-destructive mt-1 text-xs">{$inputs.composeContent.error}</p>
										{/if}
									</div>
								</div>

								<div class="min-w-0 overflow-hidden lg:col-span-1">
									<div class="space-y-4">
										<h3 class="text-lg font-semibold">Environment (.env)</h3>
										<div class="h-[590px] w-full min-w-0 overflow-hidden rounded-md">
											<CodeEditor
												bind:value={$inputs.envContent.value}
												language="env"
												placeholder="Enter environment variables..."
											/>
										</div>
										{#if $inputs.envContent.error}
											<p class="text-destructive mt-1 text-xs">{$inputs.envContent.error}</p>
										{/if}
									</div>
								</div>
							</div>
						</section>

						{#if project.status == 'running'}
							<section id="logs" class="scroll-mt-20">
								<div class="mb-6 flex items-center justify-between">
									<h2 class="flex items-center gap-2 text-xl font-semibold">
										<TerminalIcon class="size-5" />
										Project Logs
									</h2>
									<div class="flex items-center gap-3">
										<label class="flex items-center gap-2">
											<input type="checkbox" bind:checked={autoScrollStackLogs} class="size-4" />
											Auto-scroll
										</label>
										<Button variant="outline" size="sm" onclick={() => stackLogViewer?.clearLogs()}>Clear</Button>
										{#if isStackLogsStreaming}
											<div class="flex items-center gap-2">
												<div class="size-2 animate-pulse rounded-full bg-green-500"></div>
												<span class="text-sm font-medium text-green-600">Live</span>
											</div>
											<Button variant="outline" size="sm" onclick={() => stackLogViewer?.stopLogStream()}>Stop</Button>
										{:else}
											<Button variant="outline" size="sm" onclick={() => stackLogViewer?.startLogStream()} disabled={!project?.id}
												>Start</Button
											>
										{/if}
										<Button
											variant="outline"
											size="sm"
											onclick={() => {
												stackLogViewer?.stopLogStream();
												stackLogViewer?.startLogStream();
											}}
										>
											<RefreshCwIcon class="size-4" />
										</Button>
									</div>
								</div>

								<Card.Root class="min-w-0 overflow-hidden border">
									<Card.Content class="min-w-0 overflow-hidden p-0">
										<div class="w-full min-w-0 overflow-hidden">
											<LogViewer
												bind:this={stackLogViewer}
												bind:autoScroll={autoScrollStackLogs}
												stackId={project?.id}
												type="stack"
												maxLines={500}
												showTimestamps={true}
												height="600px"
												onStart={handleStackLogStart}
												onStop={handleStackLogStop}
												onClear={handleStackLogClear}
												onToggleAutoScroll={handleToggleStackAutoScroll}
											/>
										</div>
									</Card.Content>
								</Card.Root>
							</section>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{:else if !data.error}
		<div class="flex min-h-screen items-center justify-center">
			<div class="text-center">
				<div class="bg-muted/50 mb-6 inline-flex rounded-full p-6">
					<FileStackIcon class="text-muted-foreground size-10" />
				</div>
				<h2 class="mb-3 text-2xl font-medium">Project Not Found</h2>
				<p class="text-muted-foreground mb-8 max-w-md text-center">
					Could not load Project data. It may have been removed or the Docker engine is not accessible.
				</p>
				<Button variant="outline" href="/compose">
					<ArrowLeftIcon class="mr-2 size-4" />
					Back to Projects
				</Button>
			</div>
		</div>
	{/if}
</div>
