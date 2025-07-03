<script lang="ts">
	import type { PageData } from './$types';
	import type { Stack } from '$lib/models/stack.type';
	import { Button } from '$lib/components/ui/button/index.js';
	import { AlertCircle, FileStack, Loader2, PlayCircle, StopCircle } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { toast } from 'svelte-sonner';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { autoUpdateAPI, environmentAPI } from '$lib/services/api';
	import { onMount } from 'svelte';
	import StatCard from '$lib/components/stat-card.svelte';
	import StackTable from './compose-table.svelte';
	import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let stacks = $state<Stack[]>(Array.isArray(data.stacks) ? data.stacks : data.stacks.data || []);
	let error = $state<string | null>(null);
	let selectedIds = $state<string[]>([]);
	let isLoadingStacks = $state(false);
	let requestOptions = $state<SearchPaginationSortRequest>(data.stackRequestOptions);

	let isLoading = $state({
		updating: false,
		refreshing: false
	});

	const totalStacks = $derived(stacks.length);
	const runningStacks = $derived(stacks.filter((s) => s.status === 'running').length);
	const stoppedStacks = $derived(stacks.filter((s) => s.status === 'stopped').length);

	async function loadStacks() {
		try {
			isLoadingStacks = true;
			const response = await environmentAPI.getStacks(
				requestOptions.pagination,
				requestOptions.sort,
				requestOptions.search,
				requestOptions.filters
			);
			stacks = Array.isArray(response) ? response : response.data || [];
			error = null;
		} catch (err) {
			console.error('Failed to load compose page:', err);
			error = err instanceof Error ? err.message : 'Failed to load Docker Compose stacks';
			stacks = [];
		} finally {
			isLoadingStacks = false;
		}
	}

	onMount(() => {
		if (stacks.length === 0) {
			loadStacks();
		}
	});

	async function refreshStacks() {
		isLoading.refreshing = true;
		try {
			await loadStacks();
		} catch (error) {
			console.error('Failed to refresh stacks:', error);
			toast.error('Failed to refresh stacks');
		} finally {
			isLoading.refreshing = false;
		}
	}

	async function handleCheckForUpdates() {
		isLoading.updating = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(autoUpdateAPI.checkStacks()),
			message: 'Failed to Check Compose Projects for Updates',
			setLoadingState: (value) => (isLoading.updating = value),
			async onSuccess() {
				toast.success('Compose Projects Updated Successfully.');
				await loadStacks();
			}
		});
	}

	async function onRefresh(options: SearchPaginationSortRequest) {
		requestOptions = options;
		await loadStacks();
		return {
			data: stacks,
			pagination: {
				totalPages: Math.ceil(stacks.length / (requestOptions.pagination?.limit || 20)),
				totalItems: stacks.length,
				currentPage: requestOptions.pagination?.page || 1,
				itemsPerPage: requestOptions.pagination?.limit || 20
			}
		};
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
				action="restart"
				onClick={refreshStacks}
				label="Refresh"
				loading={isLoading.refreshing}
				disabled={isLoading.refreshing}
			/>
			<ArcaneButton
				action="create"
				customLabel="Create Project"
				onClick={() => goto(`/compose/new`)}
			/>
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>Error Loading Compose Projects</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if isLoadingStacks}
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
						<Card.Title>Compose Projects List</Card.Title>
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
					<p class="text-lg font-medium">Loading Compose Projects...</p>
					<p class="text-muted-foreground mt-1 text-sm">Please wait while we fetch your projects</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<StatCard
				title="Total Compose Projects"
				value={totalStacks}
				icon={FileStack}
				iconColor="text-amber-500"
				class="border-l-4 border-l-amber-500"
			/>
			<StatCard
				title="Running"
				value={runningStacks}
				icon={PlayCircle}
				iconColor="text-green-500"
				class="border-l-4 border-l-green-500"
			/>
			<StatCard
				title="Stopped"
				value={stoppedStacks}
				icon={StopCircle}
				iconColor="text-red-500"
				class="border-l-4 border-l-red-500"
			/>
		</div>

		<StackTable
			{stacks}
			bind:selectedIds
			{requestOptions}
			{onRefresh}
			onStacksChanged={loadStacks}
			onCheckForUpdates={handleCheckForUpdates}
		/>
	{/if}
</div>
