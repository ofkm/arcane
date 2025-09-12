<script lang="ts">
	import type { PageData } from './$types';
	import type { Project, ProjectService, ProjectPort } from '$lib/types/project.type';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import FileStackIcon from '@lucide/svelte/icons/file-stack';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import InfoIcon from '@lucide/svelte/icons/info';
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
	import { m } from '$lib/paraglide/messages';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import ProjectServiceCard from '$lib/components/project-service-card.svelte';

	let { data }: { data: PageData } = $props();
	let { project, editorState, settings } = $derived(data);

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

	// Editor Tabs (Compose / Env / Logs)
	let activeEditorTab = $state<'compose' | 'env' | 'logs'>('compose');
	$effect(() => {
		if (browser && project?.id) {
			const stored = localStorage.getItem(`project:${project.id}:editorTab`);
			if (stored === 'compose' || stored === 'env' || stored === 'logs') {
				activeEditorTab = stored;
			}
		}
	});
	$effect(() => {
		if (browser && project?.id) {
			localStorage.setItem(`project:${project.id}:editorTab`, activeEditorTab);
		}
	});

	let autoScrollStackLogs = $state(true);
	let isStackLogsStreaming = $state(false);
	let stackLogViewer = $state<LogViewer>();
	let showFloatingHeader = $state(false);
	let editorHeight = $state('600px');

	function recalcEditorHeight() {
		if (!browser) return;
		const el = document.getElementById('editor-area');
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const bottomPadding = 40; // space below editor
		const available = window.innerHeight - rect.top - bottomPadding;
		editorHeight = Math.max(220, available) + 'px';
	}

	$effect(() => {
		if (browser) {
			const handleScroll = () => {
				showFloatingHeader = window.scrollY > 100;
				recalcEditorHeight();
			};
			window.addEventListener('scroll', handleScroll);
			window.addEventListener('resize', recalcEditorHeight);
			// initial calc after DOM paint
			queueMicrotask(recalcEditorHeight);
			return () => window.removeEventListener('scroll', handleScroll);
		}
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
				await new Promise((r) => setTimeout(r, 200));
				await invalidateAll();
			}
		});
	}

	function getHostForService(service: ProjectService): string {
		if (!service?.networkSettings?.Networks) return baseServerUrl;
		const networks = service.networkSettings.Networks;
		for (const networkName in networks) {
			const network = networks[networkName];
			if ((network.Driver === 'macvlan' || network.Driver === 'ipvlan') && network.IPAddress) {
				return network.IPAddress;
			}
		}
		return baseServerUrl;
	}

	function getServicePortUrl(service: ProjectService, port: string | number | ProjectPort, protocol = 'http'): string {
		const host = getHostForService(service);
		if (typeof port === 'string') {
			const parts = port.split('/');
			const portNumber = parseInt(parts[0], 10);
			if (parts.length > 1 && parts[1] === 'udp') protocol = 'udp';
			return `${protocol}://${host}:${portNumber}`;
		}
		if (typeof port === 'number') return `${protocol}://${host}:${port}`;
		if (port && typeof port === 'object') {
			const portNumber = port.PublicPort || port.PrivatePort || 80;
			if (port.Type) protocol = port.Type.toLowerCase() === 'tcp' ? 'http' : 'https';
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

	const createdDate = $derived(project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : '');
</script>

<div class="bg-background min-h-screen">
	{#if project}
		<!-- Main Header -->
		<div
			class="bg-background/95 sticky top-0 z-20 border-b backdrop-blur transition-all duration-300"
			style="opacity: {showFloatingHeader ? 0 : 1}; pointer-events: {showFloatingHeader ? 'none' : 'auto'};"
		>
			<div class="max-w-full px-4 py-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Button variant="ghost" size="sm" href="/compose">
							<ArrowLeftIcon class="mr-2 size-4" />
							{m.common_back()}
						</Button>
						<div class="bg-border h-4 w-px"></div>
						<div class="flex flex-col">
							<div class="flex items-center gap-2">
								<h1 class="max-w-[340px] truncate text-lg font-semibold" title={project.name}>
									{project.name}
								</h1>
								{#if project.status}
									<StatusBadge variant={getStatusVariant(project.status)} text={capitalizeFirstLetter(project.status)} />
								{/if}
							</div>
							<div class="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
								{#if createdDate}
									<span>{m.common_created()}: {createdDate}</span>
								{/if}
								<span class="bg-border h-3 w-px"></span>
								<span>{m.compose_services()} {project.runningCount}/{project.serviceCount}</span>
							</div>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<ActionButtons
							id={project.id}
							type="stack"
							itemState={project.status}
							bind:startLoading={isLoading.deploying}
							bind:stopLoading={isLoading.stopping}
							bind:restartLoading={isLoading.restarting}
							bind:removeLoading={isLoading.removing}
							bind:redeployLoading={isLoading.redeploying}
							onActionComplete={() => invalidateAll()}
						/>
					</div>
				</div>
			</div>
		</div>

		<!-- Floating Mini Header -->
		{#if showFloatingHeader}
			<div class="fixed left-1/2 top-4 z-30 -translate-x-1/2 transition-all duration-300 ease-in-out">
				<div class="bg-background/90 border-border/50 rounded-lg border px-4 py-3 shadow-xl backdrop-blur-xl">
					<div class="flex items-center gap-4">
						<div class="flex flex-col">
							<div class="flex items-center gap-2">
								<h2 class="max-w-[150px] truncate text-sm font-medium" title={project.name}>{project.name}</h2>
								{#if project.status}
									<StatusBadge
										variant={getStatusVariant(project.status)}
										text={capitalizeFirstLetter(project.status)}
										class="text-xs"
									/>
								{/if}
							</div>
							<div class="text-muted-foreground mt-0.5 flex items-center gap-2 text-[10px]">
								{#if createdDate}<span>{createdDate}</span>{/if}
								<span>{project.runningCount}/{project.serviceCount} {m.compose_services()}</span>
							</div>
						</div>
						<div class="bg-border h-8 w-px"></div>
						<ActionButtons
							id={project.id}
							type="stack"
							itemState={project.status}
							bind:startLoading={isLoading.deploying}
							bind:stopLoading={isLoading.stopping}
							bind:restartLoading={isLoading.restarting}
							bind:removeLoading={isLoading.removing}
							bind:redeployLoading={isLoading.redeploying}
							onActionComplete={() => invalidateAll()}
						/>
					</div>
				</div>
			</div>
		{/if}

		<div class="flex min-h-0 overflow-hidden">
			<!-- Main Content (sidebar removed) -->
			<div class="min-w-0 flex-1 overflow-hidden">
				<div class="max-w-none p-6">
					<div class="space-y-12">
						<!-- Services Section -->
						<section id="services" class="scroll-mt-20">
							<h2 class="mb-6 flex items-center gap-2 text-xl font-semibold">
								<LayersIcon class="size-5" />
								{m.compose_services_header({ count: project.serviceCount })}
							</h2>

							{#if project.services && project.services.length > 0}
								<div class="bg-card rounded-lg border">
									<div class="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
										{#each project.services as service (service.container_id || service.name)}
											<ProjectServiceCard {service} />
										{/each}
									</div>
								</div>
							{:else}
								<div class="py-12 text-center">
									<div class="bg-muted/50 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
										<LayersIcon class="text-muted-foreground size-6" />
									</div>
									<div class="text-muted-foreground">{m.compose_no_services_found()}</div>
								</div>
							{/if}
						</section>

						<!-- Config / Editors Section -->
						<section id="config" class="scroll-mt-20">
							<div class="mb-6 flex items-center justify-between">
								<h2 class="flex items-center gap-2 text-xl font-semibold">
									<SettingsIcon class="size-5" />
									{m.compose_configuration_title()}
								</h2>
								{#if hasChanges}
									<ArcaneButton
										action="save"
										loading={isLoading.saving}
										onclick={handleSaveChanges}
										disabled={!hasChanges}
										customLabel={m.common_save()}
										loadingLabel={m.common_saving()}
										class="bg-green-600 text-white hover:bg-green-700"
									/>
								{/if}
							</div>
							<!-- Name Input -->
							<div class="mb-6 max-w-md space-y-2">
								<Label for="name" class="text-sm font-medium">{m.compose_name_label()}</Label>
								<div class="flex items-center gap-2">
									<div class="mt-2 flex-1">
										<Input
											type="text"
											id="name"
											name="name"
											bind:value={$inputs.name.value}
											required
											disabled={project?.status === 'running' || project?.status === 'partially running'}
											class={$inputs.name.error ? 'border-destructive' : ''}
										/>
									</div>
									<Tooltip.Provider>
										<Tooltip.Root>
											<Tooltip.Trigger
												type="button"
												class={buttonVariants({ variant: 'ghost', size: 'icon' })}
												aria-label="Project name info"
											>
												<InfoIcon class="size-4" />
											</Tooltip.Trigger>
											<Tooltip.Content side="top" align="center">
												{#if project?.status === 'running' || project?.status === 'partially running'}
													{m.compose_name_change_not_allowed()}
												{/if}
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								</div>
								{#if $inputs.name.error}
									<p class="text-destructive mt-1 text-xs">{$inputs.name.error}</p>
								{/if}
							</div>
							<!-- Tabs -->
							<Tabs.Root
								value={activeEditorTab}
								onValueChange={(v) => (activeEditorTab = v as 'compose' | 'env' | 'logs')}
								class="w-auto"
								id="editor-area"
							>
								<Tabs.List>
									<Tabs.Trigger value="compose">{m.compose_compose_file_title()}</Tabs.Trigger>
									<Tabs.Trigger value="env">{m.compose_env_title()}</Tabs.Trigger>
									{#if project.status === 'running'}
										<Tabs.Trigger value="logs">{m.compose_logs_title()}</Tabs.Trigger>
									{/if}
								</Tabs.List>
								<Tabs.Content value="compose">
									<div class="mt-4 overflow-hidden rounded-md" style={`height:${editorHeight};`}>
										<CodeEditor
											bind:value={$inputs.composeContent.value}
											language="yaml"
											placeholder={m.compose_compose_placeholder()}
										/>
									</div>
									{#if $inputs.composeContent.error}
										<p class="text-destructive mt-1 text-xs">{$inputs.composeContent.error}</p>
									{/if}
								</Tabs.Content>
								<Tabs.Content value="env">
									<div class="mt-4 overflow-hidden rounded-md" style={`height:${editorHeight};`}>
										<CodeEditor bind:value={$inputs.envContent.value} language="env" placeholder={m.compose_env_placeholder()} />
									</div>
									{#if $inputs.envContent.error}
										<p class="text-destructive mt-1 text-xs">{$inputs.envContent.error}</p>
									{/if}
								</Tabs.Content>
								{#if project.status === 'running'}
									<Tabs.Content value="logs">
										<div class="mt-4 flex h-full flex-col gap-4">
											<div class="flex flex-wrap items-center gap-3">
												<label class="flex items-center gap-2 text-sm">
													<input type="checkbox" bind:checked={autoScrollStackLogs} class="size-4" />
													{m.common_autoscroll()}
												</label>
												<Button variant="outline" size="sm" onclick={() => stackLogViewer?.clearLogs()}>{m.common_clear()}</Button
												>
												{#if isStackLogsStreaming}
													<div class="flex items-center gap-2 pr-2">
														<div class="size-2 animate-pulse rounded-full bg-green-500"></div>
														<span class="text-sm font-medium text-green-600">{m.common_live()}</span>
													</div>
													<Button variant="outline" size="sm" onclick={() => stackLogViewer?.stopLogStream()}
														>{m.common_stop()}</Button
													>
												{:else}
													<Button
														variant="outline"
														size="sm"
														onclick={() => stackLogViewer?.startLogStream()}
														disabled={!project?.id}
													>
														{m.common_start()}
													</Button>
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

											<div class="min-w-0 flex-1 overflow-hidden rounded-md" style={`height:${editorHeight};`}>
												<LogViewer
													bind:this={stackLogViewer}
													bind:autoScroll={autoScrollStackLogs}
													stackId={project?.id}
													type="stack"
													maxLines={500}
													showTimestamps={true}
													height={editorHeight}
													onStart={handleStackLogStart}
													onStop={handleStackLogStop}
													onClear={handleStackLogClear}
													onToggleAutoScroll={handleToggleStackAutoScroll}
												/>
											</div>
										</div>
									</Tabs.Content>
								{/if}
							</Tabs.Root>
							<div class="pb-8"></div>
							<!-- bottom padding -->
						</section>
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
				<h2 class="mb-3 text-2xl font-medium">{m.compose_not_found_title()}</h2>
				<p class="text-muted-foreground mb-8 max-w-md text-center">
					{m.compose_not_found_description()}
				</p>
				<Button variant="outline" href="/compose">
					<ArrowLeftIcon class="mr-2 size-4" />
					{m.compose_back_to_projects()}
				</Button>
			</div>
		</div>
	{/if}
</div>
