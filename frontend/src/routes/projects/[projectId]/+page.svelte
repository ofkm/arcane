<script lang="ts">
	import type { Project } from '$lib/types/project.type';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import FileStackIcon from '@lucide/svelte/icons/file-stack';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import LogsIcon from '@lucide/svelte/icons/logs';
	import { type TabItem } from '$lib/components/tab-bar/index.js';
	import TabbedPageLayout from '$lib/layouts/tabbed-page-layout.svelte';
	import ActionButtons from '$lib/components/action-buttons.svelte';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { getStatusVariant } from '$lib/utils/status.utils';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { z } from 'zod/v4';
	import { createForm } from '$lib/utils/form.utils';
	import { m } from '$lib/paraglide/messages';
	import { PersistedState } from 'runed';
	import EditableName from '../components/EditableName.svelte';
	import ServicesGrid from '../components/ServicesGrid.svelte';
	import CodePanel from '../components/CodePanel.svelte';
	import ProjectsLogsPanel from '../components/ProjectLogsPanel.svelte';
	import { projectService } from '$lib/services/project-service';

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

	let selectedTab = $state<'services' | 'compose' | 'logs'>('compose');
	let composeOpen = $state(true);
	let envOpen = $state(true);

	const tabItems = $derived<TabItem[]>([
		{
			value: 'services',
			label: m.compose_nav_services(),
			icon: LayersIcon,
			badge: project?.serviceCount
		},
		{
			value: 'compose',
			label: m.common_configuration(),
			icon: SettingsIcon
		},
		{
			value: 'logs',
			label: m.compose_nav_logs(),
			icon: LogsIcon,
			disabled: project?.status !== 'running'
		}
	]);

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

	async function handleSaveChanges() {
		if (!project || !hasChanges) return;

		const validated = form.validate();
		if (!validated) return;

		const { name, composeContent, envContent } = validated;

		handleApiResultWithCallbacks({
			result: await tryCatch(projectService.updateProject(projectId, name, composeContent, envContent)),
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

{#if project}
	<TabbedPageLayout
		backUrl="/projects"
		backLabel={m.common_back()}
		{tabItems}
		{selectedTab}
		onTabChange={(value) => {
			selectedTab = value as 'services' | 'compose' | 'logs';
			persistPrefs();
		}}
	>
		{#snippet headerInfo()}
			<div class="flex items-center gap-2">
				<EditableName
					bind:value={$inputs.name.value}
					bind:ref={nameInputRef}
					variant="inline"
					error={$inputs.name.error ?? undefined}
					originalValue={originalName}
					canEdit={canEditName}
					onCommit={saveNameIfChanged}
					class="hidden sm:block"
				/>
				<EditableName
					bind:value={$inputs.name.value}
					bind:ref={nameInputRef}
					variant="block"
					error={$inputs.name.error ?? undefined}
					originalValue={originalName}
					canEdit={canEditName}
					onCommit={saveNameIfChanged}
					class="block sm:hidden"
				/>
				{#if project.status}
					<StatusBadge variant={getStatusVariant(project.status)} text={capitalizeFirstLetter(project.status)} />
				{/if}
			</div>
			{#if project.createdAt}
				<p class="text-muted-foreground mt-0.5 hidden text-xs sm:block">
					{m.common_created()}: {new Date(project.createdAt ?? '').toLocaleDateString()}
				</p>
			{/if}
		{/snippet}

		{#snippet headerActions()}
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
					name={project.name}
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
		{/snippet}

		{#snippet tabContent()}
			<Tabs.Content value="services" class="h-full">
				<ServicesGrid services={project.services} {projectId} />
			</Tabs.Content>

			<Tabs.Content value="compose" class="h-full">
				<div class="grid h-full grid-cols-1 gap-4 lg:grid-cols-5 lg:items-stretch" style="grid-template-rows: 1fr;">
					<div class="flex h-full flex-col lg:col-span-3">
						<CodePanel
							bind:open={composeOpen}
							title={m.compose_compose_file_title()}
							language="yaml"
							bind:value={$inputs.composeContent.value}
							placeholder={m.compose_compose_placeholder()}
							error={$inputs.composeContent.error ?? undefined}
						/>
					</div>

					<div class="flex h-full flex-col lg:col-span-2">
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

			<Tabs.Content value="logs" class="h-full">
				{#if project.status == 'running'}
					<ProjectsLogsPanel projectId={project.id} bind:autoScroll={autoScrollStackLogs} />
				{:else}
					<div class="text-muted-foreground py-12 text-center">{m.compose_logs_title()} Unavailable</div>
				{/if}
			</Tabs.Content>
		{/snippet}
	</TabbedPageLayout>
{:else if !data.error}
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center">
			<div class="bg-muted/50 mb-6 inline-flex rounded-full p-6">
				<FileStackIcon class="text-muted-foreground size-10" />
			</div>
			<h2 class="mb-3 text-2xl font-medium">{m.common_not_found_title({ resource: m.project() })}</h2>
			<p class="text-muted-foreground mb-8 max-w-md text-center">
				{m.common_not_found_description({ resource: m.project().toLowerCase() })}
			</p>
			<Button variant="outline" href="/projects">
				<ArrowLeftIcon class="mr-2 size-4" />
				{m.common_back_to({ resource: m.projects_title() })}
			</Button>
		</div>
	</div>
{/if}
