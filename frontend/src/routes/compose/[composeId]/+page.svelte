<script lang="ts">
	import type { PageData } from './$types';
	import type { Stack, StackService, StackPort } from '$lib/types/docker/stack.type';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		ArrowLeft,
		AlertCircle,
		FileStack,
		Layers,
		ArrowRight,
		ExternalLink,
		RefreshCw,
		Terminal,
		Settings,
		Activity,
		FileText,
		Play,
		Square,
		RotateCcw,
		Trash2,
		Send,
		Users,
		Loader2,
		TicketCheck
	} from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ActionButtons from '$lib/components/action-buttons.svelte';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { statusVariantMap } from '$lib/types/statuses';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { invalidateAll, goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import YamlEditor from '$lib/components/yaml-editor.svelte';
	import EnvEditor from '$lib/components/env-editor.svelte';
	import { tryCatch } from '$lib/utils/try-catch';
	import StackAPIService from '$lib/services/api/stack-api-service';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import LogViewer from '$lib/components/LogViewer.svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';

	const stackApi = new StackAPIService();

	let { data }: { data: PageData } = $props();
	let { stack, editorState, servicePorts, settings } = $derived(data);

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

	let name = $derived(editorState.name);
	let composeContent = $derived(editorState.composeContent);
	let envContent = $derived(editorState.envContent || '');
	let originalName = $derived(editorState.originalName);
	let originalComposeContent = $derived(editorState.originalComposeContent);
	let originalEnvContent = $derived(editorState.originalEnvContent || '');

	let hasChanges = $derived(
		name !== originalName ||
			composeContent !== originalComposeContent ||
			envContent !== originalEnvContent
	);

	const baseServerUrl = $derived(settings?.baseServerUrl || 'localhost');

	let activeSection = $state<string>('overview');
	let autoScrollStackLogs = $state(true);
	let isStackLogsStreaming = $state(false);
	let stackLogViewer = $state<LogViewer>();

	let deployDialogOpen = $state(false);
	let deploying = $state(false);
	let selectedAgentId = $state('');

	// Get online agents for deployment
	const onlineAgents = $derived((data.agents || []).filter((agent) => agent.status === 'online'));

	$effect(() => {
		isLoading.deploying = false;
		isLoading.stopping = false;
		isLoading.restarting = false;
		isLoading.removing = false;
		isLoading.saving = false;
	});

	async function handleSaveChanges() {
		if (!stack || !hasChanges) return;

		const currentStackId = stack.id;

		handleApiResultWithCallbacks({
			result: await tryCatch(stackApi.save(currentStackId, name, composeContent, envContent)),
			message: 'Failed to Save Compose Project',
			setLoadingState: (value) => (isLoading.saving = value),
			onSuccess: async (updatedStack: Stack) => {
				console.log('Compose Project save successful', updatedStack);
				toast.success('Compose Project updated successfully!');

				originalName = updatedStack.name;
				originalComposeContent = composeContent;
				originalEnvContent = envContent;

				await new Promise((resolve) => setTimeout(resolve, 200));

				if (updatedStack && updatedStack.id !== currentStackId) {
					console.log(
						`Stack ID changed from ${currentStackId} to ${updatedStack.id}. Navigating...`
					);
					await goto(`/compose/${name}`, { invalidateAll: true });
				} else {
					await invalidateAll();
				}
			}
		});
	}

	async function handleDeployToAgent() {
		if (!selectedAgentId) {
			toast.error('Please select an agent for deployment');
			return;
		}

		const selectedAgent = onlineAgents.find((agent) => agent.id === selectedAgentId);
		if (!selectedAgent) {
			toast.error('Selected agent not found or offline');
			return;
		}

		if (!data.stack) {
			toast.error('Stack data not available');
			return;
		}

		deploying = true;
		try {
			const response = await fetch(`/api/agents/${selectedAgentId}/deploy/stack`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					stackName: data.stack.name,
					composeContent: data.stack.composeContent,
					envContent: data.stack.envContent,
					mode: 'compose'
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `Failed to deploy stack: ${response.statusText}`);
			}

			const result = await response.json();
			toast.success(
				`Stack "${data.stack?.name || 'Unknown'}" deployed to agent ${selectedAgent.hostname}!`
			);
			deployDialogOpen = false;
			selectedAgentId = '';
		} catch (error) {
			console.error('Deploy error:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to deploy stack');
		} finally {
			deploying = false;
		}
	}

	function getHostForService(service: StackService): string {
		if (!service || !service.networkSettings?.Networks) return baseServerUrl;

		const networks = service.networkSettings.Networks;
		for (const networkName in networks) {
			const network = networks[networkName];
			if (network.Driver === 'macvlan' || network.Driver === 'ipvlan') {
				if (network.IPAddress) return network.IPAddress;
			}
		}

		return baseServerUrl;
	}

	function getServicePortUrl(
		service: StackService,
		port: string | number | StackPort,
		protocol = 'http'
	): string {
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

	function handleStackLogClear() {
		// Custom logic when logs are cleared if needed
	}

	function handleToggleStackAutoScroll() {
		// Custom logic when auto-scroll is toggled if needed
	}

	// Navigation sections for single-page layout
	const navigationSections = [
		{ id: 'overview', label: 'Overview', icon: FileStack },
		{ id: 'services', label: 'Services', icon: Layers },
		{ id: 'config', label: 'Configuration', icon: Settings },
		{ id: 'logs', label: 'Logs', icon: Terminal }
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
	{#if stack}
		<!-- Fixed Header -->
		<div class="bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
			<div class="max-w-full px-4 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Button variant="ghost" size="sm" href="/compose">
							<ArrowLeft class="mr-2 size-4" />
							Back
						</Button>
						<div class="bg-border h-4 w-px"></div>
						<div class="flex items-center gap-2">
							<h1 class="max-w-[300px] truncate text-lg font-semibold" title={stack.name}>
								{stack.name}
							</h1>
							{#if stack.status}
								<StatusBadge
									variant={statusVariantMap[stack.status.toLowerCase()] || 'gray'}
									text={capitalizeFirstLetter(stack.status)}
								/>
							{/if}
						</div>
					</div>

					<div class="flex items-center gap-2">
						<ActionButtons
							id={stack.id}
							type="stack"
							itemState={stack.status}
							loading={{
								start: isLoading.deploying,
								stop: isLoading.stopping,
								restart: isLoading.restarting,
								remove: isLoading.removing
							}}
							onActionComplete={() => invalidateAll()}
						/>
						{#if onlineAgents.length > 0}
							<Button
								variant="outline"
								size="sm"
								onclick={() => (deployDialogOpen = true)}
								disabled={Object.values(isLoading).some(Boolean)}
							>
								<Send class="mr-2 size-4" />
								Deploy to Agent
							</Button>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Error Alert -->
		{#if data.error}
			<div class="max-w-full px-4 py-4">
				<Alert.Root variant="destructive">
					<AlertCircle class="size-4" />
					<Alert.Title>Error Loading Stack</Alert.Title>
					<Alert.Description>{data.error}</Alert.Description>
				</Alert.Root>
			</div>
		{/if}

		<div class="flex h-[calc(100vh-64px)]">
			<!-- Fixed Sidebar Navigation - Narrower -->
			<div class="bg-background/50 w-48 shrink-0 border-r">
				<div class="sticky top-16 p-3">
					<nav class="space-y-1">
						{#each navigationSections as section}
							{@const IconComponent = section.icon}
							<button
								onclick={() => scrollToSection(section.id)}
								class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors
									{activeSection === section.id
									? 'bg-primary/10 text-primary border-primary/20 border'
									: 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
							>
								<IconComponent class="size-4 shrink-0" />
								<span class="truncate">{section.label}</span>
								{#if section.id === 'services' && stack.serviceCount}
									<span class="bg-muted ml-auto shrink-0 rounded px-1.5 py-0.5 text-xs">
										{stack.serviceCount}
									</span>
								{/if}
							</button>
						{/each}
					</nav>
				</div>
			</div>

			<!-- Main Content - Full width usage -->
			<div class="flex-1 overflow-y-auto">
				<div class="max-w-none p-6">
					<div class="space-y-8">
						<!-- Overview Section -->
						<section id="overview" class="scroll-mt-20">
							<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
								<FileStack class="size-5" />
								Overview
							</h2>

							<!-- Summary Cards -->
							<div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
								<Card.Root class="border">
									<Card.Content class="flex items-center justify-between p-6">
										<div>
											<p class="text-muted-foreground text-sm font-medium">Services</p>
											<p class="text-2xl font-bold">{stack.serviceCount}</p>
										</div>
										<div class="bg-primary/10 rounded-full p-3">
											<Layers class="text-primary size-5" />
										</div>
									</Card.Content>
								</Card.Root>

								<Card.Root class="border">
									<Card.Content class="flex items-center justify-between p-6">
										<div>
											<p class="text-muted-foreground text-sm font-medium">Running</p>
											<p class="text-2xl font-bold">{stack.runningCount}</p>
										</div>
										<div class="rounded-full bg-green-500/10 p-3">
											<Activity class="size-5 text-green-500" />
										</div>
									</Card.Content>
								</Card.Root>

								<Card.Root class="border">
									<Card.Content class="flex items-center justify-between p-6">
										<div>
											<p class="text-muted-foreground text-sm font-medium">Created</p>
											<p class="text-lg font-medium">
												{new Date(stack.createdAt ?? '').toLocaleDateString()}
											</p>
										</div>
										<div class="rounded-full bg-blue-500/10 p-3">
											<FileStack class="size-5 text-blue-500" />
										</div>
									</Card.Content>
								</Card.Root>
							</div>

							<!-- Port Information -->
							{#if servicePorts && Object.keys(servicePorts).length > 0}
								{@const allUniquePorts = [...new Set(Object.values(servicePorts).flat())]}
								<Card.Root class="border">
									<Card.Header class="pb-4">
										<Card.Title>Exposed Ports</Card.Title>
									</Card.Header>
									<Card.Content>
										<div class="flex flex-wrap gap-2">
											{#each allUniquePorts as port (port)}
												<a
													href={getServicePortUrl(stack, port)}
													target="_blank"
													rel="noopener noreferrer"
													class="inline-flex items-center rounded-md bg-blue-500/10 px-3 py-2 font-medium text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
												>
													Port {port}
													<ExternalLink class="ml-2 size-4" />
												</a>
											{/each}
										</div>
									</Card.Content>
								</Card.Root>
							{/if}
						</section>

						<!-- Services Section -->
						<section id="services" class="scroll-mt-20">
							<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
								<Layers class="size-5" />
								Services ({stack.serviceCount})
							</h2>

							<Card.Root class="border">
								<Card.Content class="p-6">
									{#if stack.services && stack.services.length > 0}
										<div class="space-y-4">
											{#each stack.services as service (service.container_id || service.name)}
												{@const status = service.status || 'unknown'}
												{@const variant = statusVariantMap[status.toLowerCase()] || 'gray'}

												{#if service.container_id}
													<!-- Service with Container ID (clickable) -->
													<a
														href={`/containers/${service.container_id}`}
														class="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
													>
														<div class="flex items-center gap-3">
															<div class="bg-primary/10 rounded-full p-2">
																<Layers class="text-primary size-4" />
															</div>
															<div>
																<p class="font-medium">{service.name}</p>
																<p class="text-muted-foreground text-sm">
																	ID: {service.container_id.substring(0, 12)}
																</p>
																{#if service.image}
																	<p class="text-muted-foreground text-xs">
																		Image: {service.image}
																	</p>
																{/if}
															</div>
														</div>
														<div class="flex items-center gap-3">
															<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
															<ArrowRight class="text-primary size-4" />
														</div>
													</a>
												{:else}
													<!-- Service without Container ID (not clickable) -->
													<div
														class="bg-muted/20 flex items-center justify-between rounded-lg border p-4"
													>
														<div class="flex items-center gap-3">
															<div class="bg-muted/50 rounded-full p-2">
																<Layers class="text-muted-foreground size-4" />
															</div>
															<div>
																<p class="font-medium">{service.name}</p>
																<p class="text-muted-foreground text-sm">Not created</p>
																{#if service.image}
																	<p class="text-muted-foreground text-xs">
																		Image: {service.image}
																	</p>
																{/if}
															</div>
														</div>
														<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
													</div>
												{/if}
											{/each}
										</div>
									{:else}
										<div class="py-12 text-center">
											<div
												class="bg-muted/50 mx-auto mb-4 flex size-16 items-center justify-center rounded-full"
											>
												<Layers class="text-muted-foreground size-6" />
											</div>
											<div class="text-muted-foreground">No services found for this stack</div>
										</div>
									{/if}
								</Card.Content>
							</Card.Root>
						</section>

						<!-- Configuration Section -->
						<section id="config" class="scroll-mt-20">
							<div class="mb-6 flex items-center justify-between">
								<h2 class="flex items-center gap-2 text-xl font-semibold">
									<Settings class="size-5" />
									Configuration
								</h2>
								{#if hasChanges}
									<ArcaneButton
										action="save"
										loading={isLoading.saving}
										onClick={handleSaveChanges}
										disabled={!hasChanges}
										label="Save Changes"
										loadingLabel="Saving..."
										class="bg-green-600 text-white hover:bg-green-700"
									/>
								{/if}
							</div>

							<!-- Stack Name Field -->
							<Card.Root class="mb-6 border">
								<Card.Header class="pb-4">
									<Card.Title>Stack Settings</Card.Title>
								</Card.Header>
								<Card.Content>
									<div class="max-w-md">
										<Label for="name" class="mb-2 block">Stack Name</Label>
										<Input
											type="text"
											id="name"
											name="name"
											bind:value={name}
											required
											disabled={isLoading.saving ||
												stack?.status === 'running' ||
												stack?.status === 'partially running'}
										/>
										{#if stack?.status === 'running' || stack?.status === 'partially running'}
											<p class="text-muted-foreground mt-2 text-sm">
												Stack name cannot be changed while running. Please stop the stack first.
											</p>
										{/if}
									</div>
								</Card.Content>
							</Card.Root>

							<!-- Editors - Fixed Layout -->
							<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
								<!-- Compose Editor - Spans 2 columns -->
								<div class="lg:col-span-2">
									<Card.Root class="h-full border">
										<Card.Header class="flex-shrink-0 pb-4">
											<Card.Title>Docker Compose File</Card.Title>
										</Card.Header>
										<Card.Content class="flex h-full flex-col p-4">
											<div class="h-[590px] w-full flex-shrink-0 overflow-hidden rounded-md">
												<YamlEditor
													bind:value={composeContent}
													readOnly={isLoading.saving ||
														isLoading.deploying ||
														isLoading.stopping ||
														isLoading.restarting ||
														isLoading.removing}
												/>
											</div>
											<p class="text-muted-foreground flex-shrink-0 text-sm">
												Edit your <span class="font-medium">compose.yaml</span> file directly. Syntax
												errors will be highlighted.
											</p>
										</Card.Content>
									</Card.Root>
								</div>

								<!-- Environment Editor - Spans 1 column -->
								<div class="lg:col-span-1">
									<Card.Root class="h-full border">
										<Card.Header class="flex-shrink-0 pb-4">
											<Card.Title>Environment (.env)</Card.Title>
										</Card.Header>
										<Card.Content class="flex h-full flex-col p-4">
											<div class="h-[590px] w-full flex-shrink-0 overflow-hidden rounded-md">
												<EnvEditor
													bind:value={envContent}
													readOnly={isLoading.saving ||
														isLoading.deploying ||
														isLoading.stopping ||
														isLoading.restarting ||
														isLoading.removing}
												/>
											</div>
											<p class="text-muted-foreground flex-shrink-0 text-sm">
												Define environment variables in KEY=value format.
											</p>
										</Card.Content>
									</Card.Root>
								</div>
							</div>
						</section>

						<!-- Logs Section -->
						<section id="logs" class="scroll-mt-20">
							<div class="mb-6 flex items-center justify-between">
								<h2 class="flex items-center gap-2 text-xl font-semibold">
									<Terminal class="size-5" />
									Stack Logs
								</h2>
								<div class="flex items-center gap-3">
									<label class="flex items-center gap-2">
										<input type="checkbox" bind:checked={autoScrollStackLogs} class="size-4" />
										Auto-scroll
									</label>
									<Button variant="outline" size="sm" onclick={() => stackLogViewer?.clearLogs()}
										>Clear</Button
									>
									{#if isStackLogsStreaming}
										<div class="flex items-center gap-2">
											<div class="size-2 animate-pulse rounded-full bg-green-500"></div>
											<span class="text-sm font-medium text-green-600">Live</span>
										</div>
										<Button
											variant="outline"
											size="sm"
											onclick={() => stackLogViewer?.stopLogStream()}>Stop</Button
										>
									{:else}
										<Button
											variant="outline"
											size="sm"
											onclick={() => stackLogViewer?.startLogStream()}
											disabled={!stack?.id}>Start</Button
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
										<RefreshCw class="size-4" />
									</Button>
								</div>
							</div>

							<Card.Root class="border">
								<Card.Content class="p-0">
									<LogViewer
										bind:this={stackLogViewer}
										bind:autoScroll={autoScrollStackLogs}
										stackId={stack?.id}
										type="stack"
										maxLines={500}
										showTimestamps={true}
										height="600px"
										onStart={handleStackLogStart}
										onStop={handleStackLogStop}
										onClear={handleStackLogClear}
										onToggleAutoScroll={handleToggleStackAutoScroll}
									/>
								</Card.Content>
							</Card.Root>
						</section>
					</div>
				</div>
			</div>
		</div>
	{:else if !data.error}
		<!-- Not Found State -->
		<div class="flex min-h-screen items-center justify-center">
			<div class="text-center">
				<div class="bg-muted/50 mb-6 inline-flex rounded-full p-6">
					<FileStack class="text-muted-foreground size-10" />
				</div>
				<h2 class="mb-3 text-2xl font-medium">Stack Not Found</h2>
				<p class="text-muted-foreground mb-8 max-w-md text-center">
					Could not load stack data. It may have been removed or the Docker engine is not
					accessible.
				</p>
				<Button variant="outline" href="/compose">
					<ArrowLeft class="mr-2 size-4" />
					Back to Stacks
				</Button>
			</div>
		</div>
	{/if}
</div>

<Dialog.Root bind:open={deployDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Deploy Stack to Agent</Dialog.Title>
			<Dialog.Description>
				Deploy "{data.stack?.name || 'Unknown Stack'}" to a remote agent
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="agent-select">Select Agent</Label>
				<Select.Root type="single" bind:value={selectedAgentId} disabled={deploying}>
					<Select.Trigger>
						{selectedAgentId}
					</Select.Trigger>
					<Select.Content>
						{#each onlineAgents as agent}
							<Select.Item value={agent.id}>
								<div class="flex items-center gap-2">
									<div class="size-2 rounded-full bg-green-500"></div>
									<span>{agent.hostname}</span>
									<span class="text-muted-foreground text-xs">({agent.platform})</span>
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<p class="text-muted-foreground text-xs">
					This will deploy the current stack configuration to the selected agent.
				</p>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deployDialogOpen = false)} disabled={deploying}
				>Cancel</Button
			>
			<Button onclick={handleDeployToAgent} disabled={!selectedAgentId || deploying}>
				{#if deploying}
					<Loader2 class="mr-2 size-4 animate-spin" />
				{:else}
					<Send class="mr-2 size-4" />
				{/if}
				Deploy
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
