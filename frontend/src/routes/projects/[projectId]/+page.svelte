<script lang="ts">
	import type { Project } from '$lib/types/project.type';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import FileStackIcon from '@lucide/svelte/icons/file-stack';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import LogsIcon from '@lucide/svelte/icons/logs';
	import ActionButtons from '$lib/components/action-buttons.svelte';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { getStatusVariant } from '$lib/utils/status.utils';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import { environmentAPI } from '$lib/services/api';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { z } from 'zod/v4';
	import { createForm } from '$lib/utils/form.utils';
	import { m } from '$lib/paraglide/messages';
	import { PersistedState } from 'runed';
	import EditableName from '../components/EditableName.svelte';
	import ServicesGrid from '../components/ServicesGrid.svelte';
	import CodePanel from '../components/CodePanel.svelte';
	import StackLogsPanel from '../components/StackLogsPanel.svelte';

	let { data } = $props();
	let projectId = $derived(data.projectId);
	let project = $derived(data.project);
	let editorState = $derived(data.editorState);

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

	let originalName = $state(data.editorState.originalName);
	let originalComposeContent = $state(data.editorState.originalComposeContent);
	let originalEnvContent = $state(data.editorState.originalEnvContent || '');

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

	let canEditName = $derived(!isLoading.saving && project?.status !== 'running' && project?.status !== 'partially running');

	let autoScrollStackLogs = $state(true);
	let showFloatingHeader = $state(false);

	let selectedTab = $state<'services' | 'compose' | 'logs'>('compose');
	let composeOpen = $state(true);
	let envOpen = $state(true);

	let nameInputRef = $state<HTMLInputElement | null>(null);

	type ComposeUIPrefs = {
		tab: 'services' | 'compose' | 'logs';
		composeOpen: boolean;
		envOpen: boolean;
		autoScroll: boolean;
	};

	const defaultComposeUIPrefs: ComposeUIPrefs = {
		tab: 'compose',
		composeOpen: true,
		envOpen: true,
		autoScroll: true
	};

	let prefs: PersistedState<ComposeUIPrefs> | null = null;

	$effect(() => {
		if (!project?.id) return;
		prefs = new PersistedState<ComposeUIPrefs>(`arcane.compose.ui:${project.id}`, defaultComposeUIPrefs, {
			storage: 'session',
			syncTabs: false
		});
		const cur = prefs.current ?? {};
		selectedTab = cur.tab ?? defaultComposeUIPrefs.tab;
		composeOpen = cur.composeOpen ?? defaultComposeUIPrefs.composeOpen;
		envOpen = cur.envOpen ?? defaultComposeUIPrefs.envOpen;
		autoScrollStackLogs = cur.autoScroll ?? defaultComposeUIPrefs.autoScroll;
	});

	// Scroll listener with cleanup (reactive)
	$effect(() => {
		const handleScroll = () => {
			showFloatingHeader = window.scrollY > 100;
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});

	async function handleSaveChanges() {
		if (!project || !hasChanges) return;

		const validated = form.validate();
		if (!validated) return;

		const { name, composeContent, envContent } = validated;

		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.updateProject(projectId, composeContent, envContent)),
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

	function saveNameIfChanged() {
		if ($inputs.name.value === originalName) return;
		const validated = form.validate();
		if (!validated) return;
		handleSaveChanges();
	}

	function persistPrefs() {
		if (!prefs) return;
		prefs.current = {
			tab: selectedTab,
			composeOpen,
			envOpen,
			autoScroll: autoScrollStackLogs
		};
	}
</script>

<div class="bg-background flex h-full flex-col overflow-hidden overscroll-y-none">
	{#if project}
		<Tabs.Root value={selectedTab} class="flex min-h-0 w-full flex-1 flex-col">
			<div class="bg-background sticky top-0 flex-shrink-0 border-b backdrop-blur">
				<div class="mx-auto max-w-full px-4 py-3">
					<div class="flex items-center justify-between gap-3">
						<div class="flex min-w-0 items-center gap-3">
							<Button variant="ghost" size="sm" href="/projects">
								<ArrowLeftIcon class="mr-2 size-4" />
								{m.common_back()}
							</Button>
							<Separator orientation="vertical" class="mx-1 h-5" />
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									<EditableName
										bind:value={$inputs.name.value}
										bind:ref={nameInputRef}
										error={$inputs.name.error ?? undefined}
										originalValue={originalName}
										canEdit={canEditName}
										onCommit={saveNameIfChanged}
									/>
									{#if project.status}
										<StatusBadge variant={getStatusVariant(project.status)} text={capitalizeFirstLetter(project.status)} />
									{/if}
								</div>
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
									loading={isLoading.saving}
									onclick={handleSaveChanges}
									disabled={!hasChanges}
									customLabel={m.common_save()}
									loadingLabel={m.common_saving()}
								/>
							{/if}
							<ActionButtons
								id={project.id}
								type="project"
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

					<div class="mt-4">
						<Tabs.List class="w-full justify-start gap-4">
							<Tabs.Trigger
								value="services"
								class="gap-2"
								onclick={() => {
									selectedTab = 'services';
									persistPrefs();
								}}
							>
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
							<Tabs.Trigger
								value="compose"
								class="gap-2"
								onclick={() => {
									selectedTab = 'compose';
									persistPrefs();
								}}
							>
								<SettingsIcon class="size-4" />
								{m.compose_nav_config()}
							</Tabs.Trigger>
							<Tabs.Trigger
								value="logs"
								class="gap-2"
								disabled={project.status !== 'running'}
								onclick={() => {
									selectedTab = 'logs';
									persistPrefs();
								}}
							>
								<LogsIcon class="size-4" />
								{m.compose_nav_logs()}
							</Tabs.Trigger>
						</Tabs.List>
					</div>
				</div>
			</div>

			<div class="min-h-0 flex-1 overflow-hidden">
				<div class="h-full px-4 py-4">
					<Tabs.Content value="services" class="h-full min-h-0">
						<ServicesGrid services={project.services} />
					</Tabs.Content>

					<Tabs.Content value="compose" class="h-full min-h-0">
						<div class="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-3" style="grid-template-rows: 1fr;">
							<div class="h-full min-h-0 lg:col-span-2">
								<CodePanel
									bind:open={composeOpen}
									title={m.compose_compose_file_title()}
									language="yaml"
									bind:value={$inputs.composeContent.value}
									placeholder={m.compose_compose_placeholder()}
									error={$inputs.composeContent.error ?? undefined}
								/>
							</div>

							<div class="h-full min-h-0 lg:col-span-1">
								<CodePanel
									bind:open={envOpen}
									title={m.compose_env_title()}
									language="env"
									bind:value={$inputs.envContent.value}
									placeholder={m.compose_env_placeholder()}
									error={$inputs.envContent.error ?? undefined}
								/>
							</div>
						</div>
					</Tabs.Content>

					<Tabs.Content value="logs" class="h-full min-h-0">
						{#if project.status == 'running'}
							<div class="h-full min-h-0">
								<StackLogsPanel projectId={project.id} bind:autoScroll={autoScrollStackLogs} />
							</div>
						{:else}
							<div class="text-muted-foreground py-12 text-center">{m.compose_logs_title()} Unavailable</div>
						{/if}
					</Tabs.Content>
				</div>
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
				<Button variant="outline" href="/projects">
					<ArrowLeftIcon class="mr-2 size-4" />
					{m.compose_back_to_projects()}
				</Button>
			</div>
		</div>
	{/if}

	<Tooltip.Provider />
</div>

<style>
	:global(.tab-body) {
		height: calc(100dvh - 152px);
	}
</style>
