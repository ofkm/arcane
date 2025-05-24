<script lang="ts">
	// ==================== IMPORTS ====================
	import type { PageData } from './$types';
	import type { Stack, StackService, StackPort } from '$lib/types/docker/stack.type';

	// UI Components
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	// Custom Components
	import ActionButtons from '$lib/components/action-buttons.svelte';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import YamlEditor from '$lib/components/yaml-editor.svelte';
	import EnvEditor from '$lib/components/env-editor.svelte';
	import ArcaneButton from '$lib/components/arcane-button.svelte';

	// Icons
	import { ArrowLeft, AlertCircle, FileStack, Layers, ArrowRight, Terminal, Play, Save, Activity, Server, Clock, Loader2 } from '@lucide/svelte';

	// Utils & Services
	import { statusVariantMap } from '$lib/types/statuses';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { invalidateAll, goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import StackAPIService from '$lib/services/api/stack-api-service';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { onDestroy } from 'svelte';

	// ==================== INITIALIZATION ====================
	const stackApi = new StackAPIService();

	let { data }: { data: PageData } = $props();
	let { stack, editorState, servicePorts, settings } = $derived(data);

	// ==================== STATE MANAGEMENT ====================

	// Loading states
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

	// Real-time logs state
	let showLogsDialog = $state(false);
	let deploymentLogs = $state('');
	let logsEventSource: EventSource | null = $state(null);
	let logsContainer = $state<HTMLDivElement | undefined>(undefined);
	let autoScrollLogs = $state(true);
	let deploymentComplete = $state(false);

	// UI state
	let activeTab = $state('config');
	let scrollY = $state(0);

	// ==================== DERIVED STATE ====================

	// Editor content
	let name = $derived(editorState.name);
	let composeContent = $derived(editorState.composeContent);
	let envContent = $derived(editorState.envContent || '');
	let originalName = $derived(editorState.originalName);
	let originalComposeContent = $derived(editorState.originalComposeContent);
	let originalEnvContent = $derived(editorState.originalEnvContent || '');

	// Change detection
	let hasChanges = $derived(name !== originalName || composeContent !== originalComposeContent || envContent !== originalEnvContent);

	// UI derived state
	let isScrolled = $derived(scrollY > 50);
	let baseServerUrl = $derived(settings?.baseServerUrl || 'localhost');

	// ==================== EFFECTS ====================

	// Reset loading states on data changes
	$effect(() => {
		isLoading.deploying = false;
		isLoading.stopping = false;
		isLoading.restarting = false;
		isLoading.removing = false;
		isLoading.saving = false;
	});

	// Auto-scroll logs
	$effect(() => {
		if (logsContainer && deploymentLogs && autoScrollLogs) {
			scrollLogsToBottom();
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		closeLogsStream();
	});

	// ==================== UTILITY FUNCTIONS ====================

	function scrollLogsToBottom() {
		if (logsContainer) {
			logsContainer.scrollTop = logsContainer.scrollHeight;
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

	// ==================== LOGS MANAGEMENT ====================

	function startDeploymentLogsStream(stackId: string) {
		if (logsEventSource) return;

		try {
			const url = `/api/stacks/${stackId}/logs`;
			const eventSource = new EventSource(url);
			logsEventSource = eventSource;

			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					if (data.type === 'log') {
						deploymentLogs += data.message + '\n';
					} else if (data.type === 'complete') {
						deploymentLogs += '\n[SUCCESS] Deployment completed successfully!\n';
						deploymentComplete = true;
						isLoading.deploying = false;
						closeLogsStream();
						toast.success('Stack deployed successfully!');
						invalidateAll();
					} else if (data.type === 'error') {
						deploymentLogs += `\n[ERROR] ${data.message}\n`;
						deploymentComplete = true;
						isLoading.deploying = false;
						closeLogsStream();
						toast.error('Deployment failed');
					}
				} catch (error) {
					console.error('Error parsing log data:', error);
					deploymentLogs += '[ERROR] Failed to parse log data\n';
				}
			};

			eventSource.onerror = (error) => {
				console.error('Logs stream error:', error);
				deploymentLogs += '[ERROR] Connection to logs stream lost.\n';
				deploymentComplete = true;
				isLoading.deploying = false;
				closeLogsStream();
			};
		} catch (error) {
			console.error('Failed to connect to deployment logs stream:', error);
			deploymentLogs += '[ERROR] Failed to connect to logs stream.\n';
			deploymentComplete = true;
			isLoading.deploying = false;
		}
	}

	function closeLogsStream() {
		if (logsEventSource) {
			logsEventSource.close();
			logsEventSource = null;
		}
	}

	function closeLogsDialog() {
		showLogsDialog = false;
		closeLogsStream();
		deploymentLogs = '';
		deploymentComplete = false;
	}

	// ==================== ACTION HANDLERS ====================

	async function handleDeployWithLogs() {
		if (!stack) return;

		// Reset logs state
		deploymentLogs = '';
		deploymentComplete = false;
		showLogsDialog = true;
		isLoading.deploying = true;

		// Add initial message
		deploymentLogs = '[INFO] Starting deployment...\n';

		// Start logs stream
		startDeploymentLogsStream(stack.id);
	}

	async function handleSaveChanges() {
		if (!stack || !hasChanges) return;

		const currentStackId = stack.id;

		handleApiResultWithCallbacks({
			result: await tryCatch(stackApi.save(currentStackId, name, composeContent, envContent)),
			message: 'Failed to Save Stack',
			setLoadingState: (value) => (isLoading.saving = value),
			onSuccess: async (updatedStack: Stack) => {
				console.log('Stack save successful', updatedStack);
				toast.success('Stack updated successfully!');

				// Update original values to reset change detection
				originalName = updatedStack.name;
				originalComposeContent = composeContent;
				originalEnvContent = envContent;

				// Small delay for UI feedback
				await new Promise((resolve) => setTimeout(resolve, 200));

				// Navigate if stack ID changed
				if (updatedStack && updatedStack.id !== currentStackId) {
					console.log(`Stack ID changed from ${currentStackId} to ${updatedStack.id}. Navigating...`);
					await goto(`/stacks/${name}`, { invalidateAll: true });
				} else {
					await invalidateAll();
				}
			}
		});
	}
</script>

<svelte:window bind:scrollY />

<div class="min-h-screen">
	<!-- Dynamic Floating Header Section -->
	<div class="sticky top-4 z-10 mx-4 transition-all duration-300">
		<div class="rounded-xl shadow-lg backdrop-blur-md border transition-all duration-300 {isScrolled ? 'bg-slate-100/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 shadow-xl' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/50 dark:border-slate-800/50'}">
			<div class="max-w-screen mx-5 {isScrolled ? 'py-3' : 'py-6'}">
				<!-- Breadcrumb - only show when scrolled -->
				{#if isScrolled}
					<Breadcrumb.Root class="mb-3">
						<Breadcrumb.List>
							<Breadcrumb.Item>
								<Breadcrumb.Link href="/" class="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Breadcrumb.Link>
							</Breadcrumb.Item>
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								<Breadcrumb.Link href="/stacks" class="text-muted-foreground hover:text-foreground transition-colors">Stacks</Breadcrumb.Link>
							</Breadcrumb.Item>
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								<Breadcrumb.Page class="font-medium">{stack?.name || 'Loading...'}</Breadcrumb.Page>
							</Breadcrumb.Item>
						</Breadcrumb.List>
					</Breadcrumb.Root>
				{/if}

				<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
					<!-- Left: Stack Info - Compact when scrolled -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-3">
							<!-- Stack Icon - smaller when scrolled -->
							<div class="flex-shrink-0 {isScrolled ? 'p-2' : 'p-3'} bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg transition-all duration-300">
								<FileStack class="{isScrolled ? 'size-5' : 'size-8'} text-white transition-all duration-300" />
							</div>

							<!-- Stack Details - compact when scrolled -->
							<div class="flex-1 min-w-0">
								<h1 class="{isScrolled ? 'text-lg' : 'text-3xl'} font-bold tracking-tight text-foreground transition-all duration-300 mb-1">
									{stack?.name || 'Stack Details'}
								</h1>

								<!-- Status & Metadata - hide some info when scrolled -->
								{#if stack}
									<div class="flex flex-wrap items-center gap-2">
										<div class="flex items-center gap-1.5">
											<Activity class="{isScrolled ? 'size-3' : 'size-4'} text-muted-foreground transition-all duration-300" />
											<StatusBadge variant={statusVariantMap[stack.status.toLowerCase()] || 'gray'} text={capitalizeFirstLetter(stack.status)} class="shadow-sm {isScrolled ? 'text-xs' : ''}" />
										</div>
										<div class="flex items-center gap-1.5 {isScrolled ? 'text-xs' : 'text-sm'} text-muted-foreground transition-all duration-300">
											<Server class="{isScrolled ? 'size-3' : 'size-4'} transition-all duration-300" />
											<span>{stack.serviceCount} services</span>
										</div>
										{#if !isScrolled}
											<div class="flex items-center gap-2 text-sm text-muted-foreground">
												<Clock class="size-4" />
												<span>Created {new Date(stack.createdAt ?? '').toLocaleDateString()}</span>
											</div>
										{/if}
										<!-- Service Ports -->
										{#if servicePorts && Array.isArray(servicePorts) && servicePorts.length > 0}
											<div class="flex items-center gap-2 {isScrolled ? 'text-xs' : 'text-sm'} text-muted-foreground transition-all duration-300">
												<Terminal class="{isScrolled ? 'size-3' : 'size-4'} transition-all duration-300" />
												<span class="flex gap-1">
													{#each servicePorts.slice(0, isScrolled ? 2 : 3) as port}
														{#if typeof port === 'string'}
															<span>:{port}</span>
														{:else if typeof port === 'object' && port && 'port' in port}
															<a href={getServicePortUrl(port.service, port.port)} target="_blank" class="hover:text-primary underline-offset-4 hover:underline">
																:{port.port}
															</a>
														{:else}
															<span>:{String(port)}</span>
														{/if}
													{/each}
													{#if servicePorts.length > (isScrolled ? 2 : 3)}
														<span>+{servicePorts.length - (isScrolled ? 2 : 3)} more</span>
													{/if}
												</span>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Right: Action Buttons -->
					{#if stack}
						<div class="flex-shrink-0">
							<div class="flex flex-wrap gap-2">
								{#if stack.status !== 'running' && stack.status !== 'partially running'}
									<Button onclick={handleDeployWithLogs} disabled={isLoading.deploying || isLoading.stopping || isLoading.restarting || isLoading.removing} class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0" size={isScrolled ? 'sm' : 'lg'}>
										{#if isLoading.deploying}
											<Loader2 class="{isScrolled ? 'size-3 mr-1.5' : 'size-4 mr-2'} animate-spin transition-all duration-300" />
										{:else}
											<Play class="{isScrolled ? 'size-3 mr-1.5' : 'size-4 mr-2'} transition-all duration-300" />
										{/if}
										{isScrolled ? 'Deploy' : 'Deploy with Logs'}
									</Button>
								{/if}
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
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="max-w-screen items-center py-8 space-y-8">
		<!-- Error Alert -->
		{#if data.error}
			<Alert.Root variant="destructive" class="shadow-lg border-red-200 dark:border-red-800">
				<AlertCircle class="size-4" />
				<Alert.Title>Error Loading Stack</Alert.Title>
				<Alert.Description>{data.error}</Alert.Description>
			</Alert.Root>
		{/if}

		{#if stack}
			<!-- Stats Grid -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<!-- Total Services -->
				<div class="rounded-lg shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/50 p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Services</p>
							<p class="text-3xl font-bold text-blue-900 dark:text-blue-100">{stack.serviceCount}</p>
						</div>
						<div class="p-3 bg-blue-500/10 rounded-lg">
							<Layers class="size-6 text-blue-600 dark:text-blue-400" />
						</div>
					</div>
				</div>

				<!-- Running Services -->
				<div class="rounded-lg shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-100 dark:border-green-900/50 p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Running Services</p>
							<p class="text-3xl font-bold text-green-900 dark:text-green-100">{stack.runningCount}</p>
							<p class="text-xs text-green-600 dark:text-green-400 mt-1">
								{Math.round(((stack.runningCount ?? 0) / (stack.serviceCount ?? 1)) * 100)}% active
							</p>
						</div>
						<div class="p-3 bg-green-500/10 rounded-lg">
							<Activity class="size-6 text-green-600 dark:text-green-400" />
						</div>
					</div>
				</div>

				<!-- Stack Age -->
				<div class="rounded-lg shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-100 dark:border-purple-900/50 p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Created</p>
							<p class="text-lg font-semibold text-purple-900 dark:text-purple-100">
								{new Date(stack.createdAt ?? '').toLocaleDateString()}
							</p>
							<p class="text-xs text-purple-600 dark:text-purple-400 mt-1">
								{new Date(stack.createdAt ?? '').toLocaleTimeString()}
							</p>
						</div>
						<div class="p-3 bg-purple-500/10 rounded-lg">
							<Clock class="size-6 text-purple-600 dark:text-purple-400" />
						</div>
					</div>
				</div>
			</div>

			<!-- Main Tabs -->
			<Tabs.Root value={activeTab} onValueChange={(value) => (activeTab = value || 'config')}>
				<Tabs.List class="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-lg shadow-sm">
					<Tabs.Trigger value="config" class="data-[state=active]:bg-background data-[state=active]:shadow-sm">
						<FileStack class="size-4 mr-2" />
						Configuration
					</Tabs.Trigger>
					<Tabs.Trigger value="services" class="data-[state=active]:bg-background data-[state=active]:shadow-sm">
						<Layers class="size-4 mr-2" />
						Services ({stack.serviceCount})
					</Tabs.Trigger>
				</Tabs.List>

				<!-- Configuration Tab -->
				<Tabs.Content value="config" class="mt-6">
					<div class="space-y-8">
						<!-- Header Section -->
						<div class="flex items-center justify-between">
							<div>
								<h2 class="text-2xl font-bold tracking-tight flex items-center gap-2">
									<FileStack class="size-6" />
									Stack Configuration
								</h2>
								<p class="text-muted-foreground mt-1">Manage your Docker Compose configuration and environment variables</p>
							</div>
							{#if hasChanges}
								<Badge variant="secondary" class="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">Unsaved Changes</Badge>
							{/if}
						</div>

						<!-- Stack Name Section -->
						<div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 p-6 bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
							<div class="flex-1 max-w-md">
								<Label for="name" class="text-sm font-medium mb-3 block">Stack Name</Label>
								<Input type="text" id="name" name="name" bind:value={name} required disabled={isLoading.saving || stack?.status === 'running' || stack?.status === 'partially running'} class="text-lg font-medium" />
								{#if stack?.status === 'running' || stack?.status === 'partially running'}
									<p class="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
										<AlertCircle class="size-3" />
										Stack name cannot be changed while running
									</p>
								{/if}
							</div>

							<div class="flex-shrink-0">
								<Button onclick={handleSaveChanges} disabled={!hasChanges || isLoading.saving} class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" size="lg">
									{#if isLoading.saving}
										<Loader2 class="size-4 mr-2 animate-spin" />
									{:else}
										<Save class="size-4 mr-2" />
									{/if}
									Save Changes
								</Button>
							</div>
						</div>

						<!-- Editors Grid -->
						<div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
							<!-- Compose Editor -->
							<div class="xl:col-span-2 space-y-4">
								<div class="flex items-center gap-2">
									<Label class="text-base font-semibold">Docker Compose File</Label>
									<Badge variant="outline" class="text-xs">compose.yaml</Badge>
								</div>
								<div class="border border-slate-200 dark:border-slate-800 rounded-lg shadow-md overflow-hidden">
									<YamlEditor bind:value={composeContent} readOnly={isLoading.saving || isLoading.deploying || isLoading.stopping || isLoading.restarting || isLoading.removing} />
								</div>
								<p class="text-sm text-muted-foreground">Define your Docker services, networks, and volumes. Syntax highlighting and validation included.</p>
							</div>

							<!-- Environment Editor -->
							<div class="space-y-4">
								<div class="flex items-center gap-2">
									<Label class="text-base font-semibold">Environment Variables</Label>
									<Badge variant="outline" class="text-xs">.env</Badge>
								</div>
								<div class="border border-slate-200 dark:border-slate-800 rounded-lg shadow-md overflow-hidden">
									<EnvEditor bind:value={envContent} readOnly={isLoading.saving || isLoading.deploying || isLoading.stopping || isLoading.restarting || isLoading.removing} />
								</div>
								<p class="text-sm text-muted-foreground">Environment variables in KEY=value format. These will be available to all services in your stack.</p>
							</div>
						</div>

						<!-- Back Button -->
						<div class="pt-6 border-t border-slate-200 dark:border-slate-800">
							<Button variant="outline" onclick={() => window.history.back()} disabled={isLoading.saving} class="shadow-sm">
								<ArrowLeft class="mr-2 size-4" />
								Back to Stacks
							</Button>
						</div>
					</div>
				</Tabs.Content>

				<!-- Services Tab -->
				<Tabs.Content value="services" class="mt-6">
					<Card.Root class="shadow-lg">
						<Card.Header class="border-b bg-muted/30">
							<Card.Title class="flex items-center gap-2 text-lg">
								<Layers class="size-5" />
								Services Overview
							</Card.Title>
							<Card.Description class="mb-5">Monitor and manage individual services in your stack</Card.Description>
						</Card.Header>

						<Card.Content class="p-6">
							{#if stack.services && stack.services.length > 0}
								<div class="grid gap-4">
									{#each stack.services as service (service.id || service.name)}
										{@const status = service.state?.Status || 'unknown'}
										{@const variant = statusVariantMap[status.toLowerCase()] || 'gray'}
										{@const isHealthy = status === 'running'}

										{#if service.id}
											<!-- Clickable Service Card -->
											<a href={`/containers/${service.id}`} class="group block p-6 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/50 hover:shadow-lg transition-all duration-200">
												<div class="flex items-center justify-between">
													<div class="flex items-center gap-4">
														<div class="p-3 rounded-lg bg-gradient-to-br {isHealthy ? 'from-green-100 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50' : 'from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800'}">
															<Server class="size-5 {isHealthy ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}" />
														</div>
														<div>
															<h3 class="font-semibold text-lg group-hover:text-primary transition-colors">{service.name}</h3>
															<p class="text-sm text-muted-foreground font-mono">ID: {service.id.substring(0, 12)}...</p>
														</div>
													</div>
													<div class="flex items-center gap-4">
														<StatusBadge {variant} text={capitalizeFirstLetter(status)} class="shadow-sm" />
														<div class="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
															<span class="text-sm font-medium mr-2">View Details</span>
															<ArrowRight class="size-4" />
														</div>
													</div>
												</div>
											</a>
										{:else}
											<!-- Non-clickable Service Card -->
											<div class="p-6 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/20">
												<div class="flex items-center justify-between">
													<div class="flex items-center gap-4">
														<div class="p-3 rounded-lg bg-slate-200 dark:bg-slate-800">
															<Server class="size-5 text-slate-500 dark:text-slate-400" />
														</div>
														<div>
															<h3 class="font-semibold text-lg text-slate-700 dark:text-slate-300">{service.name}</h3>
															<p class="text-sm text-muted-foreground">Service not yet created</p>
														</div>
													</div>
													<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
												</div>
											</div>
										{/if}
									{/each}
								</div>
							{:else}
								<!-- Empty State -->
								<div class="flex flex-col items-center justify-center py-16 px-4">
									<div class="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 mb-4">
										<Layers class="size-8 text-slate-400" />
									</div>
									<h3 class="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Services Found</h3>
									<p class="text-muted-foreground text-center max-w-md">This stack doesn't have any services defined. Add services to your Docker Compose file to see them here.</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				</Tabs.Content>
			</Tabs.Root>
		{:else if !data.error}
			<!-- Not Found State -->
			<Card.Root class="shadow-lg">
				<Card.Content class="p-16">
					<div class="flex flex-col items-center justify-center text-center">
						<div class="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 mb-6">
							<FileStack class="size-12 text-slate-400" />
						</div>
						<h2 class="text-2xl font-semibold mb-3">Stack Not Found</h2>
						<p class="text-muted-foreground max-w-md mb-8">The requested stack could not be found. It may have been removed or the Docker engine might not be accessible.</p>
						<Button variant="outline" href="/stacks" size="lg" class="shadow-sm">
							<ArrowLeft class="mr-2 size-4" />
							Return to Stacks
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- Real-time Deployment Logs Dialog -->
	<Dialog.Root bind:open={showLogsDialog}>
		<Dialog.Content class="max-w-6xl max-h-[90vh] flex flex-col">
			<Dialog.Header class="flex-shrink-0 border-b pb-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="p-2 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50">
							<Terminal class="size-5 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<Dialog.Title class="text-xl font-semibold">Deployment Logs</Dialog.Title>
							<Dialog.Description class="text-muted-foreground">
								Real-time deployment progress for <strong>{stack?.name}</strong>
							</Dialog.Description>
						</div>
					</div>
					<div class="flex items-center gap-4">
						{#if !deploymentComplete}
							<div class="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-950/30 rounded-md">
								<div class="animate-pulse bg-green-500 size-2 rounded-full"></div>
								<span class="text-sm font-medium text-green-700 dark:text-green-300">Deploying...</span>
							</div>
						{:else}
							<div class="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-950/30 rounded-md">
								<div class="bg-blue-500 size-2 rounded-full"></div>
								<span class="text-sm font-medium text-blue-700 dark:text-blue-300">Complete</span>
							</div>
						{/if}
						<label class="flex items-center gap-2 text-sm cursor-pointer">
							<input type="checkbox" class="rounded border-border w-4 h-4" checked={autoScrollLogs} onchange={(e) => (autoScrollLogs = e.currentTarget.checked)} />
							<span>Auto-scroll</span>
						</label>
					</div>
				</div>
			</Dialog.Header>

			<div class="flex-1 overflow-hidden p-4">
				<div
					class="bg-slate-950 text-green-400 p-6 rounded-lg font-mono text-sm overflow-auto border border-slate-800 h-[550px] shadow-inner"
					bind:this={logsContainer}
					onscroll={() => {
						if (logsContainer) {
							const atBottom = logsContainer.scrollHeight - logsContainer.scrollTop <= logsContainer.clientHeight + 50;
							if (!atBottom && autoScrollLogs) {
								autoScrollLogs = false;
							}
						}
					}}
				>
					{#if deploymentLogs}
						<pre class="m-0 whitespace-pre-wrap break-words leading-relaxed">{deploymentLogs}</pre>
					{:else}
						<div class="flex flex-col items-center justify-center h-full text-center text-slate-500">
							<Terminal class="size-16 mb-6 opacity-30" />
							<p class="text-lg font-medium mb-2">Waiting for deployment to start...</p>
							<p class="text-sm opacity-70">Logs will appear here in real-time</p>
						</div>
					{/if}
				</div>
			</div>

			<Dialog.Footer class="flex-shrink-0 border-t pt-4">
				<div class="flex justify-between items-center w-full">
					<div class="text-sm text-muted-foreground">
						{#if deploymentComplete}
							<span class="text-green-600 dark:text-green-400 font-medium">✓ Deployment completed</span>
						{:else}
							<span class="flex items-center gap-2">
								<div class="animate-spin size-3 border border-current border-t-transparent rounded-full"></div>
								Streaming live deployment logs...
							</span>
						{/if}
					</div>
					<div class="flex gap-3">
						{#if deploymentComplete}
							<Button onclick={closeLogsDialog} class="shadow-sm">Close</Button>
						{:else}
							<Button variant="outline" onclick={closeLogsDialog} class="shadow-sm">Run in Background</Button>
						{/if}
					</div>
				</div>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
