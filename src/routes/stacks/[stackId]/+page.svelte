<script lang="ts">
	import type { PageData } from './$types';
	import type { Stack, StackService, StackPort } from '$lib/types/docker/stack.type';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, AlertCircle, FileStack, Layers, ArrowRight, ExternalLink, RefreshCw, Terminal } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
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

	let activeTab = $state('config');
	let stackLogsEventSource: EventSource | null = $state(null);
	let displayedStackLogs = $state('');
	let autoScrollStackLogs = $state(true);
	let stackLogsContainer = $state<HTMLDivElement | undefined>(undefined);

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
			message: 'Failed to Save Stack',
			setLoadingState: (value) => (isLoading.saving = value),
			onSuccess: async (updatedStack: Stack) => {
				// Changed from any to Stack
				console.log('Stack save successful', updatedStack);
				toast.success('Stack updated successfully!');

				originalName = updatedStack.name;
				originalComposeContent = composeContent;
				originalEnvContent = envContent;

				await new Promise((resolve) => setTimeout(resolve, 200));

				if (updatedStack && updatedStack.id !== currentStackId) {
					console.log(`Stack ID changed from ${currentStackId} to ${updatedStack.id}. Navigating...`);
					await goto(`/stacks/${name}`, { invalidateAll: true });
				} else {
					await invalidateAll();
				}
			}
		});
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

	// Define a more specific interface for the port type

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

	function scrollStackLogsToBottom() {
		if (stackLogsContainer) {
			stackLogsContainer.scrollTop = stackLogsContainer.scrollHeight;
		}
	}

	$effect(() => {
		if (stackLogsContainer && displayedStackLogs && activeTab === 'logs' && autoScrollStackLogs) {
			scrollStackLogsToBottom();
		}
	});

	$effect(() => {
		if (activeTab === 'logs' && stack?.id) {
			startStackLogsStream();
			setTimeout(scrollStackLogsToBottom, 100);
		} else if (stackLogsEventSource) {
			closeStackLogsStream();
		}
	});

	function startStackLogsStream() {
		if (stackLogsEventSource || !stack?.id) return;

		// Reset logs when starting a new stream (like container logs do)
		displayedStackLogs = '';

		try {
			const url = `/api/stacks/${stack.id}/logs`;
			const eventSource = new EventSource(url);
			stackLogsEventSource = eventSource;

			eventSource.onmessage = (event) => {
				if (event.data) {
					// Ensure proper newline formatting
					const logLine = event.data;
					const formattedLine = logLine.endsWith('\n') ? logLine : logLine + '\n';

					displayedStackLogs = (displayedStackLogs || '') + formattedLine;

					if (autoScrollStackLogs) {
						scrollStackLogsToBottom();
					}
				}
			};

			eventSource.onerror = (error) => {
				console.error('Stack logs EventSource error:', error);
				eventSource.close();
				stackLogsEventSource = null;
			};
		} catch (error) {
			console.error('Failed to connect to stack logs stream:', error);
		}
	}

	function closeStackLogsStream() {
		if (stackLogsEventSource) {
			stackLogsEventSource.close();
			stackLogsEventSource = null;
		}
	}

	function clearStackLogs() {
		displayedStackLogs = '';
	}

	$effect(() => {
		return () => {
			closeStackLogsStream();
		};
	});
</script>

<div class="space-y-6 pb-8">
	<!-- Enhanced Header Section -->
	<div class="flex flex-col space-y-4">
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/stacks">Stacks</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>{stack?.name || 'Loading...'}</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>

		<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
			<div class="flex flex-col">
				<h1 class="text-2xl font-bold tracking-tight">
					{stack?.name || 'Stack Details'}
				</h1>

				<!-- Ports as badges under the title for better visibility -->
				{#if stack && servicePorts && Object.keys(servicePorts).length > 0}
					{@const allUniquePorts = [...new Set(Object.values(servicePorts).flat())]}
					<div class="flex flex-wrap gap-2 mt-2">
						{#each allUniquePorts as port (port)}
							<a href={getServicePortUrl(stack, port)} target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors">
								Port {port}
								<ExternalLink class="size-3 ml-1" />
							</a>
						{/each}
					</div>
				{/if}

				<!-- Stack status badges -->
				{#if stack?.status}
					<div class="mt-2">
						<StatusBadge variant={statusVariantMap[stack.status.toLowerCase()] || 'gray'} text={capitalizeFirstLetter(stack.status)} />
					</div>
				{/if}
			</div>

			<!-- Better positioned action buttons -->
			{#if stack}
				<div class="self-start">
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
			{/if}
		</div>
	</div>

	<!-- Error Alert -->
	{#if data.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>Error Loading Stack</Alert.Title>
			<Alert.Description>{data.error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if stack}
		<!-- Summary cards remain the same -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<!-- Services Card -->
			<Card.Root class="border shadow-sm">
				<Card.Content class="p-4 flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Services</p>
						<p class="text-2xl font-bold">{stack.serviceCount}</p>
					</div>
					<div class="bg-primary/10 p-3 rounded-full">
						<Layers class="text-primary size-5" />
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Running Services Card -->
			<Card.Root class="border shadow-sm">
				<Card.Content class="p-4 flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Running Services</p>
						<p class="text-2xl font-bold">{stack.runningCount}</p>
					</div>
					<div class="bg-green-500/10 p-3 rounded-full">
						<Layers class="text-green-500 size-5" />
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Created Card -->
			<Card.Root class="border shadow-sm">
				<Card.Content class="p-4 flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Created</p>
						<p class="text-lg font-medium">
							{new Date(stack.createdAt ?? '').toLocaleString()}
						</p>
					</div>
					<div class="bg-blue-500/10 p-3 rounded-full">
						<FileStack class="text-blue-500 size-5" />
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Adjust the tab implementation -->
		<Card.Root class="border shadow-sm">
			<div class="border-b flex">
				<button class="px-4 py-3 font-medium text-sm border-b-2 {activeTab === 'config' ? 'border-primary text-primary' : 'border-transparent hover:text-muted-foreground/80 hover:border-muted-foreground/20'}" onclick={() => (activeTab = 'config')}>
					<div class="flex items-center gap-1.5">
						<FileStack class="size-4" />
						<span>Configuration</span>
					</div>
				</button>
				<button class="px-4 py-3 font-medium text-sm border-b-2 {activeTab === 'services' ? 'border-primary text-primary' : 'border-transparent hover:text-muted-foreground/80 hover:border-muted-foreground/20'}" onclick={() => (activeTab = 'services')}>
					<div class="flex items-center gap-1.5">
						<Layers class="size-4" />
						<span>Services ({stack.serviceCount})</span>
					</div>
				</button>
				<button class="px-4 py-3 font-medium text-sm border-b-2 {activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent hover:text-muted-foreground/80 hover:border-muted-foreground/20'}" onclick={() => (activeTab = 'logs')}>
					<div class="flex items-center gap-1.5">
						<Terminal class="size-4" />
						<span>Logs</span>
					</div>
				</button>
			</div>

			{#if activeTab === 'config'}
				<!-- Stack Configuration Content -->
				<Card.Content class="pt-6">
					<div class="space-y-6">
						<!-- Stack Name Field with Save Button to the right -->
						<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
							<div class="w-full max-w-sm">
								<Label for="name" class="mb-2 block">Stack Name</Label>
								<Input type="text" id="name" name="name" bind:value={name} required disabled={isLoading.saving || stack?.status === 'running' || stack?.status === 'partially running'} class="w-full" />
								{#if stack?.status === 'running' || stack?.status === 'partially running'}
									<p class="text-xs text-muted-foreground mt-1">Stack name cannot be changed while the stack is running. Please stop the stack first.</p>
								{/if}
							</div>

							<!-- Save button positioned right -->
							<div class="self-start">
								<ArcaneButton action="save" disabled={!hasChanges} onClick={handleSaveChanges} loading={isLoading.saving} />
							</div>
						</div>

						<!-- Editors Section -->
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<!-- Compose Editor - 2/3 width -->
							<div class="md:col-span-2 space-y-2">
								<Label for="compose-editor" class="block">Docker Compose File</Label>
								<div class="border rounded-lg overflow-hidden mt-2 h-[550px]">
									<YamlEditor bind:value={composeContent} readOnly={isLoading.saving || isLoading.deploying || isLoading.stopping || isLoading.restarting || isLoading.removing} />
								</div>
								<p class="text-xs text-muted-foreground mt-2">
									Edit your <span class="font-medium">compose.yaml</span> file directly. Syntax errors will be highlighted.
								</p>
							</div>

							<!-- Environment Editor - 1/3 width -->
							<div class="space-y-2">
								<Label for="env-editor" class="block">Environment Configuration (.env)</Label>
								<div class="border rounded-lg overflow-hidden mt-2 h-[550px]">
									<EnvEditor bind:value={envContent} readOnly={isLoading.saving || isLoading.deploying || isLoading.stopping || isLoading.restarting || isLoading.removing} />
								</div>
								<p class="text-xs text-muted-foreground mt-2">Define environment variables in KEY=value format. These will be saved as a .env file in the stack directory.</p>
							</div>
						</div>
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-start border-t p-6">
					<Button variant="outline" type="button" onclick={() => window.history.back()} disabled={isLoading.saving}>
						<ArrowLeft class="mr-2 size-4" />
						Back
					</Button>
				</Card.Footer>
			{:else if activeTab === 'logs'}
				<!-- Stack Logs Content -->
				<Card.Content class="pt-6 pb-6">
					<div class="space-y-4">
						<!-- Logs Header -->
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div>
								<h3 class="text-lg font-semibold">Stack Logs</h3>
								<p class="text-sm text-muted-foreground">Aggregated logs from all containers in this stack</p>
							</div>
							<div class="flex items-center gap-2">
								<div class="flex items-center">
									<input type="checkbox" id="auto-scroll-stack" class="mr-2" checked={autoScrollStackLogs} onchange={(e) => (autoScrollStackLogs = e.currentTarget.checked)} />
									<label for="auto-scroll-stack" class="text-xs">Auto-scroll</label>
								</div>
								<Button variant="outline" size="sm" onclick={clearStackLogs}>Clear Logs</Button>
								<Button
									variant="outline"
									size="sm"
									onclick={() => {
										closeStackLogsStream();
										startStackLogsStream();
									}}
								>
									<RefreshCw class="size-4" />
									Refresh
								</Button>
							</div>
						</div>

						<!-- Logs Container -->
						<div
							class="bg-muted/50 text-foreground p-4 rounded-md font-mono text-xs overflow-auto border h-[600px]"
							bind:this={stackLogsContainer}
							style="overflow-x: auto;"
							onscroll={() => {
								if (stackLogsContainer) {
									const atBottom = stackLogsContainer.scrollHeight - stackLogsContainer.scrollTop <= stackLogsContainer.clientHeight + 50;
									if (!atBottom && autoScrollStackLogs) {
										autoScrollStackLogs = false;
									}
								}
							}}
						>
							{#if displayedStackLogs}
								<pre class="m-0 whitespace-pre-wrap break-words">{displayedStackLogs}</pre>
							{:else}
								<div class="flex flex-col items-center justify-center h-full text-center">
									<Terminal class="text-muted-foreground mb-3 opacity-40 size-8" />
									<p class="text-muted-foreground italic">No logs available. Containers may not have started yet or produce no output.</p>
								</div>
							{/if}
						</div>
					</div>
				</Card.Content>
			{:else}
				<!-- Services List Content -->
				<Card.Content class="pt-6 pb-6">
					<div class="space-y-3">
						{#if stack.services && stack.services.length > 0}
							{#each stack.services as service (service.id || service.name)}
								{@const status = service.state?.Status || 'unknown'}
								{@const variant = statusVariantMap[status.toLowerCase()] || 'gray'}

								{#if service.id}
									<!-- Service with ID (clickable) -->
									<a href={`/containers/${service.id}`} class="flex flex-col p-4 border rounded-lg hover:bg-muted/50 transition-colors">
										<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-y-2">
											<div class="flex items-center gap-3">
												<div class="bg-primary/10 p-2 rounded-full flex items-center justify-center">
													<Layers class="text-primary size-4" />
												</div>
												<div>
													<p class="font-medium">{service.name}</p>
													<p class="text-xs text-muted-foreground">ID: {service.id.substring(0, 12)}</p>
												</div>
											</div>
											<div class="flex items-center gap-3 ml-0 sm:ml-auto">
												<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
												<div class="flex items-center text-primary text-xs font-medium">
													<span class="hidden sm:inline">View details</span>
													<ArrowRight class="size-3 ml-1" />
												</div>
											</div>
										</div>
									</a>
								{:else}
									<!-- Service without ID (not clickable) -->
									<div class="flex flex-col p-4 border rounded-lg bg-card">
										<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-y-2">
											<div class="flex items-center gap-3">
												<div class="bg-muted/50 p-2 rounded-full flex items-center justify-center">
													<Layers class="text-muted-foreground size-4" />
												</div>
												<div>
													<p class="font-medium">{service.name}</p>
													<p class="text-xs text-muted-foreground">Not created</p>
												</div>
											</div>
											<div class="flex items-center ml-0 sm:ml-auto">
												<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
											</div>
										</div>
									</div>
								{/if}
							{/each}
						{:else}
							<!-- Empty state -->
							<div class="flex flex-col items-center justify-center py-10 px-4 border rounded-lg bg-muted/10">
								<div class="bg-muted/30 p-3 rounded-full mb-3">
									<Layers class="text-muted-foreground size-5 opacity-70" />
								</div>
								<p class="text-muted-foreground text-center">No services defined in this stack</p>
							</div>
						{/if}
					</div>
				</Card.Content>
			{/if}
		</Card.Root>
	{:else if !data.error}
		<!-- Not Found State - Enhanced -->
		<div class="flex flex-col items-center justify-center py-14 px-6 border rounded-lg bg-card">
			<div class="bg-muted/40 rounded-full p-5 mb-5">
				<FileStack class="text-muted-foreground size-10 opacity-60" />
			</div>
			<h2 class="text-xl font-medium mb-2">Stack Not Found</h2>
			<p class="text-center text-muted-foreground max-w-md mb-6">Could not load stack data. It may have been removed or the Docker engine is not accessible.</p>
			<Button variant="outline" href="/stacks">
				<ArrowLeft class="mr-2 size-4" />
				Back to Stacks
			</Button>
		</div>
	{/if}
</div>
