<script lang="ts">
	import FileStackIcon from '@lucide/svelte/icons/file-stack';
	import PlayCircleIcon from '@lucide/svelte/icons/play-circle';
	import StopCircleIcon from '@lucide/svelte/icons/stop-circle';
	import { toast } from 'svelte-sonner';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { autoUpdateAPI, environmentAPI } from '$lib/services/api';
	import StatCard from '$lib/components/stat-card.svelte';
	import ProjectsTable from './compose-table.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let projects = $state(data.projects);
	let projectRequestOptions = $state(data.projectRequestOptions);
	let selectedIds = $state<string[]>([]);

	let isLoading = $state({
		updating: false,
		refreshing: false
	});

	const totalCompose = $derived(projects.pagination.totalItems);
	const runningCompose = $derived(projects.data.filter((s) => s.status === 'running').length);
	const stoppedCompose = $derived(projects.data.filter((s) => s.status === 'stopped').length);

	async function handleCheckForUpdates() {
		isLoading.updating = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(autoUpdateAPI.checkStacks()),
			message: 'Failed to Check Compose Projects for Updates',
			setLoadingState: (value) => (isLoading.updating = value),
			async onSuccess() {
				toast.success('Compose Projects Updated Successfully.');
				projects = await environmentAPI.getProjects(projectRequestOptions);
			}
		});
	}

	async function refreshCompose() {
		isLoading.refreshing = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.getProjects(projectRequestOptions)),
			message: 'Failed to Refresh Projects',
			setLoadingState: (v) => (isLoading.refreshing = v),
			async onSuccess(newProjects) {
				projects = newProjects;
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Compose Projects</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and Manage Compose Projects</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton
				action="inspect"
				customLabel="Update Projects"
				onclick={handleCheckForUpdates}
				loading={isLoading.updating}
				disabled={isLoading.updating}
			/>
			<ArcaneButton action="create" customLabel="Create Project" onclick={() => goto(`/compose/new`)} />
			<ArcaneButton
				action="restart"
				customLabel="Refresh"
				onclick={refreshCompose}
				loading={isLoading.refreshing}
				disabled={isLoading.refreshing}
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<StatCard
			title="Total Projects"
			value={totalCompose}
			icon={FileStackIcon}
			iconColor="text-amber-500"
			class="border-l-4 border-l-amber-500"
		/>
		<StatCard
			title="Running"
			value={runningCompose}
			icon={PlayCircleIcon}
			iconColor="text-green-500"
			class="border-l-4 border-l-green-500"
		/>
		<StatCard
			title="Stopped"
			value={stoppedCompose}
			icon={StopCircleIcon}
			iconColor="text-red-500"
			class="border-l-4 border-l-red-500"
		/>
	</div>

	<ProjectsTable
		bind:projects
		bind:selectedIds
		requestOptions={projectRequestOptions}
		onCheckForUpdates={handleCheckForUpdates}
	/>
</div>
