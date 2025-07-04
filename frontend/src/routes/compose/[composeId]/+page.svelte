<script lang="ts">
	import type { PageData } from './$types';
	import type { Stack, StackService, StackPort } from '$lib/models/stack.type';
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
		Activity
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
	import CodeEditor from '$lib/components/editor.svelte';
	import { tryCatch } from '$lib/utils/try-catch';
	import { environmentAPI } from '$lib/services/api';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import LogViewer from '$lib/components/LogViewer.svelte';
	import { browser } from '$app/environment';

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
	let showFloatingHeader = $state(false);
	let mainContainer = $state<HTMLElement>();

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
		if (!stack || !hasChanges) return;

		const currentStackId = stack.id;

		handleApiResultWithCallbacks({
			result: await tryCatch(
				environmentAPI.updateStack(currentStackId, composeContent, envContent)
			),
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
					await invalidateAll();
				} else {
					await invalidateAll();
				}
			}
		});
	}

	function getHostForService(service: StackService): string {
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

	function handleStackLogClear() {}

	function handleToggleStackAutoScroll() {}

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
		<div
			class="bg-background/95 sticky top-0 z-20 border-b backdrop-blur transition-all duration-300"
			style="opacity: {showFloatingHeader ? 0 : 1}; pointer-events: {showFloatingHeader
				? 'none'
				: 'auto'};"
		>
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
				</div>
			</div>
		</div>

		{#if showFloatingHeader}
			<div
				class="fixed top-4 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ease-in-out"
			>
				<div
					class="bg-background/90 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl px-4 py-3"
				>
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-2">
							<h2 class="text-sm font-medium truncate max-w-[150px]" title={stack.name}>
								{stack.name}
							</h2>
							{#if stack.status}
								<StatusBadge
									variant={statusVariantMap[stack.status.toLowerCase()] || 'gray'}
									text={capitalizeFirstLetter(stack.status)}
									class="text-xs"
								/>
							{/if}
						</div>
						<div class="bg-border h-4 w-px"></div>
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
			</div>
		{/if}

		{#if data.error}
			<div class="max-w-full px-4 py-4">
				<Alert.Root variant="destructive">
					<AlertCircle class="size-4" />
					<Alert.Title>Error Loading Stack</Alert.Title>
					<Alert.Description>{data.error}</Alert.Description>
				</Alert.Root>
			</div>
		{/if}

		<div class="flex">
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
								{#if section.id === 'services' && stack.serviceCount}
									<span
										class="bg-primary text-primary-foreground absolute -top-1 -right-1 rounded-full text-xs min-w-[18px] h-[18px] flex items-center justify-center px-1"
									>
										{stack.serviceCount}
									</span>
								{/if}
							</button>
						{/each}
					</nav>
				</div>
			</div>

			<div class="flex-1" bind:this={mainContainer}>
				<div class="max-w-none p-6">
					<div class="space-y-8">
						<section id="overview" class="scroll-mt-20">
							<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
								<FileStack class="size-5" />
								Overview
							</h2>

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
														typeof port === 'string' ||
														typeof port === 'number' ||
														(typeof port === 'object' && port !== null)
															? port
															: String(port)}
													{@const serviceWithPort = stack.services?.find((s) =>
														s.ports?.includes(String(port))
													) || { container_id: '', name: '', status: '' }}
													<a
														href={getServicePortUrl(serviceWithPort, portValue)}
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
													typeof port === 'string' ||
													typeof port === 'number' ||
													(typeof port === 'object' && port !== null)
														? port
														: String(port)}
												{@const serviceWithPort = stack.services?.find((s) =>
													s.ports?.includes(String(port))
												) || { container_id: '', name: '', status: '' }}
												<a
													href={getServicePortUrl(serviceWithPort, portValue)}
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

						<section id="services" class="scroll-mt-20">
							<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
								<Layers class="size-5" />
								Services ({stack.serviceCount})
							</h2>

							{#if stack.services && stack.services.length > 0}
								<div class="rounded-lg border bg-card">
									<div class="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
										{#each stack.services as service (service.container_id || service.name)}
											{@const status = service.status || 'unknown'}
											{@const variant = statusVariantMap[status.toLowerCase()] || 'gray'}

											{#if service.container_id}
												<a
													href={`/containers/${service.container_id}`}
													class="group flex items-center gap-3 rounded-lg border bg-background p-3 transition-all hover:bg-muted/50"
												>
													<div class="bg-primary/10 rounded-full p-2 shrink-0">
														<Layers class="text-primary size-3" />
													</div>
													<div class="min-w-0 flex-1">
														<div class="flex items-center justify-between">
															<p class="text-sm font-medium truncate" title={service.name}>
																{service.name}
															</p>
															<ArrowRight
																class="text-primary size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
															/>
														</div>
														<div class="flex items-center gap-2 mt-1">
															<StatusBadge
																{variant}
																text={capitalizeFirstLetter(status)}
																class="text-xs"
															/>
															{#if service.ports && service.ports.length > 0}
																<span
																	class="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-xs"
																>
																	{service.ports.length} port{service.ports.length > 1 ? 's' : ''}
																</span>
															{/if}
														</div>
													</div>
												</a>
											{:else}
												<div class="flex items-center gap-3 rounded-lg border bg-muted/10 p-3">
													<div class="bg-muted/50 rounded-full p-2 shrink-0">
														<Layers class="text-muted-foreground size-3" />
													</div>
													<div class="min-w-0 flex-1">
														<p class="text-sm font-medium truncate" title={service.name}>
															{service.name}
														</p>
														<div class="flex items-center gap-2 mt-1">
															<StatusBadge
																{variant}
																text={capitalizeFirstLetter(status)}
																class="text-xs"
															/>
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
									<div
										class="bg-muted/50 mx-auto mb-4 flex size-16 items-center justify-center rounded-full"
									>
										<Layers class="text-muted-foreground size-6" />
									</div>
									<div class="text-muted-foreground">No services found for this stack</div>
								</div>
							{/if}
						</section>

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

							<div class="mb-6 space-y-2">
								<Label for="name" class="text-sm font-medium">Stack Name</Label>
								<div class="max-w-md">
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
							</div>

							<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
								<div class="lg:col-span-2">
									<div class="space-y-4">
										<h3 class="text-lg font-semibold">Docker Compose File</h3>
										<div class="h-[590px] w-full overflow-hidden rounded-md">
											<CodeEditor
												bind:value={composeContent}
												language="yaml"
												placeholder="Enter YAML..."
											/>
										</div>
									</div>
								</div>

								<div class="lg:col-span-1">
									<div class="space-y-4">
										<h3 class="text-lg font-semibold">Environment (.env)</h3>
										<div class="h-[590px] w-full overflow-hidden rounded-md">
											<CodeEditor
												bind:value={envContent}
												language="env"
												placeholder="Enter environment variables..."
											/>
										</div>
									</div>
								</div>
							</div>
						</section>

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
