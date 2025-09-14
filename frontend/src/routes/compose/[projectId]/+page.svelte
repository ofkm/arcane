<script lang="ts">
	import type { Project } from '$lib/types/project.type';

	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CircleAlertIcon from '@lucide/svelte/icons/alert-circle';
	import FileStackIcon from '@lucide/svelte/icons/file-stack';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import InfoIcon from '@lucide/svelte/icons/info';
	import PencilIcon from '@lucide/svelte/icons/pencil';
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
	import LogViewer from '$lib/components/log-viewer.svelte';
	import { browser } from '$app/environment';
	import { z } from 'zod/v4';
	import { createForm } from '$lib/utils/form.utils';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { m } from '$lib/paraglide/messages';
	import { tick } from 'svelte';

	let { data } = $props();
	let { project, editorState } = $derived(data);

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
			.regex(/^[a-z0-9_-]+$/i, 'Only letters, numbers, hyphens, and underscores are allowed'),
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

	// Inline name edit state
	let isEditingName = $state(false);
	let nameInputEl = $state<HTMLInputElement | null>(null);
	let canEditName = $derived(!isLoading.saving && project?.status !== 'running' && project?.status !== 'partially running');

	let autoScrollStackLogs = $state(true);
	let isStackLogsStreaming = $state(false);
	let stackLogViewer = $state<LogViewer>();
	let showFloatingHeader = $state(false);

	// UI state persistence
	let selectedTab = $state<'services' | 'compose' | 'logs'>('compose');
	let composeOpen = $state(true);
	let envOpen = $state(true);

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
		if (!browser || !project?.id) return;
		const key = `arcane.compose.ui:${project.id}`;
		try {
			const stored = JSON.parse(localStorage.getItem(key) || '{}');
			if (stored.tab) selectedTab = stored.tab;
			if (typeof stored.composeOpen === 'boolean') composeOpen = stored.composeOpen;
			if (typeof stored.envOpen === 'boolean') envOpen = stored.envOpen;
			if (typeof stored.autoScroll === 'boolean') autoScrollStackLogs = stored.autoScroll;
		} catch {}
	});

	$effect(() => {
		if (!browser || !project?.id) return;
		const key = `arcane.compose.ui:${project.id}`;
		const payload = {
			tab: selectedTab,
			composeOpen,
			envOpen,
			autoScroll: autoScrollStackLogs
		};
		localStorage.setItem(key, JSON.stringify(payload));
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

	function handleStackLogStart() {
		isStackLogsStreaming = true;
	}

	function handleStackLogStop() {
		isStackLogsStreaming = false;
	}

	function handleStackLogClear() {}
	function handleToggleStackAutoScroll() {}

	// Save name automatically when it changes and is valid
	function saveNameIfChanged() {
		if ($inputs.name.value === originalName) return;
		const validated = form.validate();
		if (!validated) return;
		handleSaveChanges();
	}
</script>

<div class="bg-background min-h-screen">
	{#if project}
		<Tabs.Root value={selectedTab} class="w-full">
			<div class="bg-background/90 sticky top-0 z-30 border-b backdrop-blur">
				<div class="mx-auto max-w-full px-4 py-3">
					<div class="flex items-center justify-between gap-3">
						<div class="flex min-w-0 items-center gap-3">
							<Button variant="ghost" size="sm" href="/compose">
								<ArrowLeftIcon class="mr-2 size-4" />
								{m.common_back()}
							</Button>
							<Separator orientation="vertical" class="mx-1 h-5" />
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									{#if isEditingName}
										<Input
											bind:ref={nameInputEl}
											bind:value={$inputs.name.value}
											class="h-8 max-w-[360px] px-2 text-lg font-semibold {$inputs.name.error ? 'border-destructive' : ''}"
											autofocus
											onkeydown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													saveNameIfChanged();
													(e.currentTarget as HTMLInputElement).blur();
												}
												if (e.key === 'Escape') {
													$inputs.name.value = originalName;
													isEditingName = false;
												}
											}}
											onblur={() => {
												saveNameIfChanged();
												isEditingName = false;
											}}
											disabled={!canEditName}
										/>
									{:else}
										<div class="group flex items-center gap-1">
											<h1 class="max-w-[360px]">
												<button
													type="button"
													class="w-full truncate bg-transparent px-0 py-0 text-left text-lg font-semibold"
													title={$inputs.name.value}
													onclick={async () => {
														if (!canEditName) return;
														isEditingName = true;
														await tick();
														nameInputEl?.focus();
													}}
													disabled={!canEditName}
												>
													{$inputs.name.value}
												</button>
											</h1>
											{#if canEditName}
												<Button
													variant="ghost"
													size="icon"
													class="size-6 opacity-0 transition-opacity group-hover:opacity-100"
													aria-label="Edit name"
													title="Edit name"
													onclick={async () => {
														isEditingName = true;
														await tick();
														nameInputEl?.focus();
													}}
												>
													<PencilIcon class="size-3.5" />
												</Button>
											{:else}
												<Tooltip.Root>
													<Tooltip.Trigger>
														<span class="text-muted-foreground inline-flex cursor-help items-center">
															<InfoIcon class="size-4" />
														</span>
													</Tooltip.Trigger>
													<Tooltip.Content>
														{m.compose_name_change_not_allowed()}
													</Tooltip.Content>
												</Tooltip.Root>
											{/if}
										</div>
									{/if}
									{#if project.status}
										<StatusBadge variant={getStatusVariant(project.status)} text={capitalizeFirstLetter(project.status)} />
									{/if}
								</div>
								{#if isEditingName && $inputs.name.error}
									<p class="text-destructive mt-1 text-xs">{$inputs.name.error}</p>
								{/if}
								{#if project.createdAt}
									<p class="text-muted-foreground mt-0.5 text-xs">
										{m.common_created()}: {new Date(project.createdAt ?? '').toLocaleDateString()}
									</p>
								{/if}
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if hasChanges}
								<ArcaneButton
									action="save"
									size="sm"
									loading={isLoading.saving}
									onclick={handleSaveChanges}
									disabled={!hasChanges}
									customLabel={m.common_save()}
									loadingLabel={m.common_saving()}
								/>
							{/if}
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

					<div class="mt-3">
						<Tabs.List class="w-full justify-start gap-1">
							<Tabs.Trigger value="services" class="gap-2" onclick={() => (selectedTab = 'services')}>
								<LayersIcon class="size-4" />
								{m.compose_nav_services()}
								{#if project.serviceCount}
									<span
										class="bg-primary text-primary-foreground ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-medium"
									>
										{project.serviceCount}
									</span>
								{/if}
							</Tabs.Trigger>
							<Tabs.Trigger value="compose" class="gap-2" onclick={() => (selectedTab = 'compose')}>
								<SettingsIcon class="size-4" />
								{m.compose_nav_config()}
							</Tabs.Trigger>
							<Tabs.Trigger
								value="logs"
								class="gap-2"
								disabled={project.status !== 'running'}
								onclick={() => (selectedTab = 'logs')}
							>
								<TerminalIcon class="size-4" />
								{m.compose_nav_logs()}
							</Tabs.Trigger>
						</Tabs.List>
					</div>
				</div>
			</div>

			{#if data.error}
				<div class="max-w-full px-4 py-4">
					<Alert.Root variant="destructive">
						<CircleAlertIcon class="size-4" />
						<Alert.Title>{m.compose_error_loading_stack_title()}</Alert.Title>
						<Alert.Description>{data.error}</Alert.Description>
					</Alert.Root>
				</div>
			{/if}

			<div class="mx-auto max-w-none px-4 py-4">
				<Tabs.Content value="services" class="mt-2">
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
											<div class="bg-primary/10 rounded-full p-2">
												<LayersIcon class="text-primary size-3" />
											</div>
											<div class="min-w-0 flex-1">
												<div class="flex items-center justify-between">
													<p class="truncate text-sm font-medium" title={service.name}>{service.name}</p>
												</div>
												<div class="mt-1 flex items-center gap-2">
													<StatusBadge {variant} text={capitalizeFirstLetter(status)} class="text-xs" />
												</div>
											</div>
										</a>
									{:else}
										<div class="bg-muted/10 flex items-center gap-3 rounded-lg border p-3">
											<div class="bg-muted/50 rounded-full p-2">
												<LayersIcon class="text-muted-foreground size-3" />
											</div>
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm font-medium" title={service.name}>{service.name}</p>
												<div class="mt-1 flex items-center gap-2">
													<StatusBadge {variant} text={capitalizeFirstLetter(status)} class="text-xs" />
													<span class="text-muted-foreground text-xs">{m.compose_service_not_created()}</span>
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
							<div class="text-muted-foreground">{m.compose_no_services_found()}</div>
						</div>
					{/if}
				</Tabs.Content>

				<Tabs.Content value="compose" class="mt-2">
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<SettingsIcon class="size-5" />
							<h2 class="text-xl font-semibold">{m.compose_configuration_title()}</h2>
						</div>
						{#if hasChanges}
							<ArcaneButton
								action="save"
								loading={isLoading.saving}
								onclick={handleSaveChanges}
								disabled={!hasChanges}
								customLabel={m.common_save()}
								loadingLabel={m.common_saving()}
							/>
						{/if}
					</div>

					<!-- Name editing moved to the header -->

					<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
						<div class="lg:col-span-2">
							<Collapsible.Root bind:open={composeOpen} class="rounded-lg border">
								<div class="flex items-center justify-between px-4 py-2">
									<h3 class="text-sm font-semibold">{m.compose_compose_file_title()}</h3>
									<Collapsible.Trigger>
										<Button variant="ghost" size="sm">{composeOpen ? m.common_hide() : 'Show'}</Button>
									</Collapsible.Trigger>
								</div>
								<Collapsible.Content>
									<div class="h-[560px] w-full overflow-hidden px-4 pb-4">
										<CodeEditor
											bind:value={$inputs.composeContent.value}
											language="yaml"
											placeholder={m.compose_compose_placeholder()}
										/>
										{#if $inputs.composeContent.error}
											<p class="text-destructive mt-2 text-xs">{$inputs.composeContent.error}</p>
										{/if}
									</div>
								</Collapsible.Content>
							</Collapsible.Root>
						</div>

						<div class="lg:col-span-1">
							<Collapsible.Root bind:open={envOpen} class="rounded-lg border">
								<div class="flex items-center justify-between px-4 py-2">
									<h3 class="text-sm font-semibold">{m.compose_env_title()}</h3>
									<Collapsible.Trigger>
										<Button variant="ghost" size="sm">{envOpen ? m.common_hide() : 'Show'}</Button>
									</Collapsible.Trigger>
								</div>
								<Collapsible.Content>
									<div class="h-[560px] w-full overflow-hidden px-4 pb-4">
										<CodeEditor bind:value={$inputs.envContent.value} language="env" placeholder={m.compose_env_placeholder()} />
										{#if $inputs.envContent.error}
											<p class="text-destructive mt-2 text-xs">{$inputs.envContent.error}</p>
										{/if}
									</div>
								</Collapsible.Content>
							</Collapsible.Root>
						</div>
					</div>
				</Tabs.Content>

				<Tabs.Content value="logs" class="mt-2">
					{#if project.status == 'running'}
						<div class="mb-3 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<TerminalIcon class="size-5" />
								<h2 class="text-xl font-semibold">{m.compose_logs_title()}</h2>
							</div>
							<div class="flex items-center gap-3">
								<label class="flex items-center gap-2">
									<input type="checkbox" bind:checked={autoScrollStackLogs} class="size-4" />
									{m.common_autoscroll()}
								</label>
								<Button variant="outline" size="sm" onclick={() => stackLogViewer?.clearLogs()}>{m.common_clear()}</Button>
								{#if isStackLogsStreaming}
									<div class="flex items-center gap-2">
										<div class="size-2 animate-pulse rounded-full bg-green-500"></div>
										<span class="text-sm font-medium text-green-600">{m.common_live()}</span>
									</div>
									<Button variant="outline" size="sm" onclick={() => stackLogViewer?.stopLogStream()}>{m.common_stop()}</Button>
								{:else}
									<Button variant="outline" size="sm" onclick={() => stackLogViewer?.startLogStream()} disabled={!project?.id}>
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
									aria-label="Refresh logs"
									title="Refresh"
								>
									<RefreshCwIcon class="size-4" />
								</Button>
							</div>
						</div>

						<Card.Root class="overflow-hidden border">
							<Card.Content class="p-0">
								<div class="w-full overflow-hidden">
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
					{:else}
						<div class="text-muted-foreground py-12 text-center">{m.compose_logs_title()} Unavailable</div>
					{/if}
				</Tabs.Content>
			</div>
		</Tabs.Root>
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

	<Tooltip.Provider />
</div>
