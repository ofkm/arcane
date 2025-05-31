<script lang="ts">
	import type { PageData } from './$types';
	import type { Stack, StackService, StackPort } from '$lib/types/docker/stack.type';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, AlertCircle, FileStack, Layers, ArrowRight, ExternalLink, RefreshCw, Terminal, Settings, Activity, FileText, Play, Square, RotateCcw, Trash2, Send, Users, Loader2 } from '@lucide/svelte';
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

	let hasChanges = $derived(name !== originalName || composeContent !== originalComposeContent || envContent !== originalEnvContent);

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
					console.log(`Stack ID changed from ${currentStackId} to ${updatedStack.id}. Navigating...`);
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
			toast.success(`Stack "${data.stack?.name || 'Unknown'}" deployed to agent ${selectedAgent.hostname}!`);
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

	function getServicePortUrl(service: StackService, port: string | number | StackPort, protocol = 'http'): string {
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

<div class="min-h-screen bg-background">
	{#if stack}
		<!-- Fixed Header -->
		<div class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
			<div class="max-w-full px-4 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Button variant="ghost" size="sm" href="/compose">
							<ArrowLeft class="size-4 mr-2" />
							Back
						</Button>
						<div class="h-4 w-px bg-border"></div>
						<div class="flex items-center gap-2">
							<h1 class="text-lg font-semibold truncate max-w-[300px]" title={stack.name}>
								{stack.name}
							</h1>
							{#if stack.status}
								<StatusBadge variant={statusVariantMap[stack.status.toLowerCase()] || 'gray'} text={capitalizeFirstLetter(stack.status)} />
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
							<Button variant="outline" size="sm" onclick={() => (deployDialogOpen = true)} disabled={Object.values(isLoading).some(Boolean)}>
								<Send class="size-4 mr-2" />
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
			<div class="w-48 shrink-0 border-r bg-background/50">
				<div class="sticky top-16 p-3">
					<nav class="space-y-1">
						{#each navigationSections as section}
							{@const IconComponent = section.icon}
							<button
								onclick={() => scrollToSection(section.id)}
								class="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
									{activeSection === section.id ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
							>
								<IconComponent class="size-4 shrink-0" />
								<span class="truncate">{section.label}</span>
								{#if section.id === 'services' && stack.serviceCount}
									<span class="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
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
				<div class="p-6 max-w-none">
					<div class="space-y-8">
						<!-- Overview Section -->
						<section id="overview" class="scroll-mt-20">
							<h2 class="text-xl font-semibold mb-6 flex items-center gap-2">
								<FileStack class="size-5" />
								Overview
							</h2>

							<!-- Summary Cards -->
							<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
								<Card.Root class="border">
									<Card.Content class="p-6 flex items-center justify-between">
										<div>
											<p class="text-sm font-medium text-muted-foreground">Services</p>
											<p class="text-2xl font-bold">{stack.serviceCount}</p>
										</div>
										<div class="bg-primary/10 p-3 rounded-full">
											<Layers class="text-primary size-5" />
										</div>
									</Card.Content>
								</Card.Root>

								<Card.Root class="border">
									<Card.Content class="p-6 flex items-center justify-between">
										<div>
											<p class="text-sm font-medium text-muted-foreground">Running</p>
											<p class="text-2xl font-bold">{stack.runningCount}</p>
										</div>
										<div class="bg-green-500/10 p-3 rounded-full">
											<Activity class="text-green-500 size-5" />
										</div>
									</Card.Content>
								</Card.Root>

								<Card.Root class="border">
									<Card.Content class="p-6 flex items-center justify-between">
										<div>
											<p class="text-sm font-medium text-muted-foreground">Created</p>
											<p class="text-lg font-medium">
												{new Date(stack.createdAt ?? '').toLocaleDateString()}
											</p>
										</div>
										<div class="bg-blue-500/10 p-3 rounded-full">
											<FileStack class="text-blue-500 size-5" />
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
												<a href={getServicePortUrl(stack, port)} target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-3 py-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-500/20 transition-colors">
													Port {port}
													<ExternalLink class="size-4 ml-2" />
												</a>
											{/each}
										</div>
									</Card.Content>
								</Card.Root>
							{/if}
						</section>

						<!-- Services Section -->
						<section id="services" class="scroll-mt-20">
							<h2 class="text-xl font-semibold mb-6 flex items-center gap-2">
								<Layers class="size-5" />
								Services ({stack.serviceCount})
							</h2>

							<Card.Root class="border">
								<Card.Content class="p-6">
									{#if stack.services && stack.services.length > 0}
										<div class="space-y-4">
											{#each stack.services as service (service.id || service.name)}
												{@const status = service.state?.Status || 'unknown'}
												{@const variant = statusVariantMap[status.toLowerCase()] || 'gray'}

												{#if service.id}
													<!-- Service with ID (clickable) -->
													<a href={`/containers/${service.id}`} class="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
														<div class="flex items-center gap-3">
															<div class="bg-primary/10 p-2 rounded-full">
																<Layers class="text-primary size-4" />
															</div>
															<div>
																<p class="font-medium">{service.name}</p>
																<p class="text-sm text-muted-foreground">ID: {service.id.substring(0, 12)}</p>
															</div>
														</div>
														<div class="flex items-center gap-3">
															<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
															<ArrowRight class="size-4 text-primary" />
														</div>
													</a>
												{:else}
													<!-- Service without ID (not clickable) -->
													<div class="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
														<div class="flex items-center gap-3">
															<div class="bg-muted/50 p-2 rounded-full">
																<Layers class="text-muted-foreground size-4" />
															</div>
															<div>
																<p class="font-medium">{service.name}</p>
																<p class="text-sm text-muted-foreground">Not created</p>
															</div>
														</div>
														<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
													</div>
												{/if}
											{/each}
										</div>
									{:else}
										<div class="text-center py-12">
											<div class="mb-4 rounded-full bg-muted/50 flex items-center justify-center mx-auto size-16">
												<Layers class="size-6 text-muted-foreground" />
											</div>
											<div class="text-muted-foreground">No services defined in this stack</div>
										</div>
									{/if}
								</Card.Content>
							</Card.Root>
						</section>

						<!-- Configuration Section -->
						<section id="config" class="scroll-mt-20">
							<div class="flex items-center justify-between mb-6">
								<h2 class="text-xl font-semibold flex items-center gap-2">
									<Settings class="size-5" />
									Configuration
								</h2>
								<!-- Save Button in its original position -->
								{#if hasChanges}
									<ArcaneButton action="save" loading={isLoading.saving} onClick={handleSaveChanges} disabled={!hasChanges} label="Save Changes" loadingLabel="Saving..." class="bg-green-600 hover:bg-green-700 text-white" />
								{/if}
							</div>

							<!-- Stack Name Field -->
							<Card.Root class="border mb-6">
								<Card.Header class="pb-4">
									<Card.Title>Stack Settings</Card.Title>
								</Card.Header>
								<Card.Content>
									<div class="max-w-md">
										<Label for="name" class="mb-2 block">Stack Name</Label>
										<Input type="text" id="name" name="name" bind:value={name} required disabled={isLoading.saving || stack?.status === 'running' || stack?.status === 'partially running'} />
										{#if stack?.status === 'running' || stack?.status === 'partially running'}
											<p class="text-sm text-muted-foreground mt-2">Stack name cannot be changed while running. Please stop the stack first.</p>
										{/if}
									</div>
								</Card.Content>
							</Card.Root>

							<!-- Editors - Better width utilization -->
							<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
								<!-- Compose Editor -->
								<div class="xl:col-span-2">
									<Card.Root class="border">
										<Card.Header class="pb-4">
											<Card.Title>Docker Compose File</Card.Title>
										</Card.Header>
										<Card.Content>
											<div class="border rounded-lg overflow-hidden h-[600px]">
												<YamlEditor bind:value={composeContent} readOnly={isLoading.saving || isLoading.deploying || isLoading.stopping || isLoading.restarting || isLoading.removing} />
											</div>
											<p class="text-sm text-muted-foreground mt-2">
												Edit your <span class="font-medium">compose.yaml</span> file directly. Syntax errors will be highlighted.
											</p>
										</Card.Content>
									</Card.Root>
								</div>

								<!-- Environment Editor -->
								<div>
									<Card.Root class="border">
										<Card.Header class="pb-4">
											<Card.Title>Environment (.env)</Card.Title>
										</Card.Header>
										<Card.Content>
											<div class="border rounded-lg overflow-hidden h-[600px]">
												<EnvEditor bind:value={envContent} readOnly={isLoading.saving || isLoading.deploying || isLoading.stopping || isLoading.restarting || isLoading.removing} />
											</div>
											<p class="text-sm text-muted-foreground mt-2">Define environment variables in KEY=value format.</p>
										</Card.Content>
									</Card.Root>
								</div>
							</div>
						</section>

						<!-- Logs Section -->
						<section id="logs" class="scroll-mt-20">
							<div class="flex items-center justify-between mb-6">
								<h2 class="text-xl font-semibold flex items-center gap-2">
									<Terminal class="size-5" />
									Stack Logs
								</h2>
								<div class="flex items-center gap-3">
									<label class="flex items-center gap-2">
										<input type="checkbox" bind:checked={autoScrollStackLogs} class="size-4" />
										Auto-scroll
									</label>
									<Button variant="outline" size="sm" onclick={() => stackLogViewer?.clearLogs()}>Clear</Button>
									{#if isStackLogsStreaming}
										<div class="flex items-center gap-2">
											<div class="size-2 bg-green-500 rounded-full animate-pulse"></div>
											<span class="text-green-600 text-sm font-medium">Live</span>
										</div>
										<Button variant="outline" size="sm" onclick={() => stackLogViewer?.stopLogStream()}>Stop</Button>
									{:else}
										<Button variant="outline" size="sm" onclick={() => stackLogViewer?.startLogStream()} disabled={!stack?.id}>Start</Button>
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
									<LogViewer bind:this={stackLogViewer} bind:autoScroll={autoScrollStackLogs} stackId={stack?.id} type="stack" maxLines={500} showTimestamps={true} height="600px" onStart={handleStackLogStart} onStop={handleStackLogStop} onClear={handleStackLogClear} onToggleAutoScroll={handleToggleStackAutoScroll} />
								</Card.Content>
							</Card.Root>
						</section>
					</div>
				</div>
			</div>
		</div>
	{:else if !data.error}
		<!-- Not Found State -->
		<div class="min-h-screen flex items-center justify-center">
			<div class="text-center">
				<div class="rounded-full bg-muted/50 p-6 mb-6 inline-flex">
					<FileStack class="text-muted-foreground size-10" />
				</div>
				<h2 class="text-2xl font-medium mb-3">Stack Not Found</h2>
				<p class="text-center text-muted-foreground max-w-md mb-8">Could not load stack data. It may have been removed or the Docker engine is not accessible.</p>
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
									<span class="text-xs text-muted-foreground">({agent.platform})</span>
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<p class="text-xs text-muted-foreground">This will deploy the current stack configuration to the selected agent.</p>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deployDialogOpen = false)} disabled={deploying}>Cancel</Button>
			<Button onclick={handleDeployToAgent} disabled={!selectedAgentId || deploying}>
				{#if deploying}
					<Loader2 class="size-4 mr-2 animate-spin" />
				{:else}
					<Send class="size-4 mr-2" />
				{/if}
				Deploy
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
