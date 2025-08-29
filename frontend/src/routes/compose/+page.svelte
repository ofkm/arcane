<script lang="ts">
	import { AlertCircle, FileStack, Loader2, PlayCircle, StopCircle } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
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
	let error = $state<string | null>(null);
	let selectedIds = $state<string[]>([]);
	let isLoadingCompose = $state(false);

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
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Compose Projects</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and Manage Compose Projects</p>
		</div>
		<div class="flex items-center gap-2">
			<!-- Updated example if you re-enable Refresh:
			<ArcaneButton
				action="restart"
				customLabel="Refresh"
				onclick={refreshCompose}
				loading={isLoading.refreshing}
				disabled={isLoading.refreshing}
			/>
			-->
			<ArcaneButton action="create" customLabel="Create Project" onclick={() => goto(`/compose/new`)} />
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>Error Loading Compose Projects</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if isLoadingCompose}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			{#each Array(3) as _}
				<Card.Root>
					<Card.Content class="flex items-center justify-between p-4">
						<div class="space-y-2">
							<div class="bg-muted h-4 w-24 animate-pulse rounded"></div>
							<div class="bg-muted h-8 w-12 animate-pulse rounded"></div>
						</div>
						<div class="bg-muted size-10 animate-pulse rounded-full"></div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<Card.Root class="border shadow-sm">
			<Card.Header class="px-6">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>Projects List</Card.Title>
					</div>
					<div class="flex items-center gap-2">
						<div class="bg-muted h-9 w-32 animate-pulse rounded"></div>
						<div class="bg-muted h-9 w-28 animate-pulse rounded"></div>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
					<Loader2 class="text-muted-foreground mb-4 size-8 animate-spin" />
					<p class="text-lg font-medium">Loading Projects...</p>
					<p class="text-muted-foreground mt-1 text-sm">Please wait while we fetch your projects</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<StatCard
				title="Total Projects"
				value={totalCompose}
				icon={FileStack}
				iconColor="text-amber-500"
				class="border-l-4 border-l-amber-500"
			/>
			<StatCard
				title="Running"
				value={runningCompose}
				icon={PlayCircle}
				iconColor="text-green-500"
				class="border-l-4 border-l-green-500"
			/>
			<StatCard
				title="Stopped"
				value={stoppedCompose}
				icon={StopCircle}
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
	{/if}
</div>
