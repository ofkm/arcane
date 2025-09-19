<script lang="ts">
	import FileStackIcon from '@lucide/svelte/icons/file-stack';
	import PlayCircleIcon from '@lucide/svelte/icons/play-circle';
	import StopCircleIcon from '@lucide/svelte/icons/stop-circle';
	import { toast } from 'svelte-sonner';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { environmentAPI } from '$lib/services/api';
	import StatCard from '$lib/components/stat-card.svelte';
	import ProjectsTable from './projects-table.svelte';
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';

	let { data } = $props();

	let { projects, projectStatusCounts, projectRequestOptions } = $state(data);
	let selectedIds = $state<string[]>([]);

	let isLoading = $state({
		updating: false,
		refreshing: false
	});

	const totalCompose = $derived(projectStatusCounts.totalProjects);
	const runningCompose = $derived(projectStatusCounts.runningProjects);
	const stoppedCompose = $derived(projectStatusCounts.stoppedProjects);

	async function handleCheckForUpdates() {
		isLoading.updating = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.runAutoUpdate()),
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
			<h1 class="text-3xl font-bold tracking-tight">{m.compose_title()}</h1>
			<p class="text-muted-foreground mt-1 text-sm">{m.compose_subtitle()}</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton
				action="inspect"
				customLabel={m.compose_update_projects()}
				onclick={handleCheckForUpdates}
				loading={isLoading.updating}
				disabled={isLoading.updating}
			/>
			<ArcaneButton action="create" customLabel={m.compose_create_project()} onclick={() => goto(`/projects/new`)} />
			<ArcaneButton
				action="restart"
				customLabel={m.common_refresh()}
				onclick={refreshCompose}
				loading={isLoading.refreshing}
				disabled={isLoading.refreshing}
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<StatCard
			title={m.compose_total()}
			value={totalCompose}
			icon={FileStackIcon}
			iconColor="text-amber-500"
			class="border-l-4 border-l-amber-500"
		/>
		<StatCard
			title={m.compose_running()}
			value={runningCompose}
			icon={PlayCircleIcon}
			iconColor="text-green-500"
			class="border-l-4 border-l-green-500"
		/>
		<StatCard
			title={m.compose_stopped()}
			value={stoppedCompose}
			icon={StopCircleIcon}
			iconColor="text-red-500"
			class="border-l-4 border-l-red-500"
		/>
	</div>

	<ProjectsTable bind:projects bind:selectedIds bind:requestOptions={projectRequestOptions} />
</div>
