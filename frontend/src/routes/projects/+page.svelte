<script lang="ts">
	import FileStackIcon from '@lucide/svelte/icons/file-stack';
	import PlayCircleIcon from '@lucide/svelte/icons/play-circle';
	import StopCircleIcon from '@lucide/svelte/icons/stop-circle';
	import { toast } from 'svelte-sonner';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import StatCard from '$lib/components/stat-card.svelte';
	import ProjectsTable from './projects-table.svelte';
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';
	import { projectService } from '$lib/services/project-service';
	import { imageService } from '$lib/services/image-service';

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
			result: await tryCatch(imageService.runAutoUpdate()),
			message: 'Failed to Check Compose Projects for Updates',
			setLoadingState: (value) => (isLoading.updating = value),
			async onSuccess() {
				toast.success('Compose Projects Updated Successfully.');
				projects = await projectService.getProjects(projectRequestOptions);
			}
		});
	}

	async function refreshCompose() {
		isLoading.refreshing = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(projectService.getProjects(projectRequestOptions)),
			message: 'Failed to Refresh Projects',
			setLoadingState: (v) => (isLoading.refreshing = v),
			async onSuccess(newProjects) {
				projects = newProjects;
			}
		});
	}
</script>

<div class="space-y-6">
	<div class="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{m.projects_title()}</h1>
			<p class="text-muted-foreground mt-1 text-sm">{m.compose_subtitle()}</p>
		</div>
		<div class="hidden items-center gap-2 sm:flex">
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

		<div class="absolute right-4 top-4 flex items-center sm:hidden">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class="bg-background/70 flex inline-flex size-9 items-center justify-center rounded-lg border">
					<span class="sr-only">{m.common_open_menu()}</span>
					<EllipsisIcon />
				</DropdownMenu.Trigger>

				<DropdownMenu.Content
					align="end"
					class="bg-card/80 supports-[backdrop-filter]:bg-card/60 z-50 min-w-[180px] rounded-md p-1 shadow-lg backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-sm"
				>
					<DropdownMenu.Group>
						<DropdownMenu.Item onclick={handleCheckForUpdates} disabled={isLoading.updating}>
							{m.compose_update_projects()}
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => goto(`/projects/new`)}>{m.compose_create_project()}</DropdownMenu.Item>
						<DropdownMenu.Item onclick={refreshCompose} disabled={isLoading.refreshing}>
							{m.common_refresh()}
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
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
