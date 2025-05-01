<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Plus, AlertCircle, Layers, RefreshCw, Upload, FileStack } from '@lucide/svelte';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { columns } from './columns';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import UniversalModal from '$lib/components/universal-modal.svelte';

	let { data }: { data: PageData } = $props();
	let { error } = data;
	let stacks = $state(data.stacks);
	let selectedIds = $state([]);

	let isRefreshing = $state(false);
	let id = $state('');

	let dialogOpen = $state(false);
	let dialogProps = $state({
		type: 'info' as const,
		title: '',
		message: '',
		okText: 'OK',
		cancelText: 'Cancel',
		showCancel: false
	});

	let modalOpen = $state(false);
	let modalProps = $state({
		type: 'info' as 'info' | 'success' | 'error',
		title: '',
		message: ''
	});

	const totalStacks = $derived(stacks?.length || 0);
	const runningStacks = $derived(stacks?.filter((s) => s.status === 'running').length || 0);
	const partialStacks = $derived(stacks?.filter((s) => s.status === 'partially running').length || 0);

	function createStack() {
		window.location.href = '/stacks/new';
	}

	async function importStack() {
		dialogOpen = true;
		dialogProps = {
			type: 'info',
			title: 'Import Stack',
			message: 'This feature is not yet implemented. Check back soon!',
			okText: 'Close',
			cancelText: 'Cancel',
			showCancel: false
		};
	}

	async function refreshData() {
		isRefreshing = true;
		await invalidateAll();
		setTimeout(() => {
			isRefreshing = false;
		}, 500);
	}

	$effect(() => {
		stacks = data.stacks;
	});
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Stacks</h1>
			<p class="text-sm text-muted-foreground mt-1">Manage Docker Compose stacks</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" size="icon" onclick={refreshData} disabled={isRefreshing}>
				<RefreshCw class={isRefreshing ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
			</Button>
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<Alert.Title>Error Loading Stacks</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Stacks</p>
					<p class="text-2xl font-bold">{totalStacks}</p>
				</div>
				<div class="bg-primary/10 p-2 rounded-full">
					<FileStack class="h-5 w-5 text-primary" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Running</p>
					<p class="text-2xl font-bold">{runningStacks}</p>
				</div>
				<div class="bg-green-500/10 p-2 rounded-full">
					<Layers class="h-5 w-5 text-green-500" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Partially Running</p>
					<p class="text-2xl font-bold">{partialStacks}</p>
				</div>
				<div class="bg-amber-500/10 p-2 rounded-full">
					<Layers class="h-5 w-5 text-amber-500" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Stack List</Card.Title>
					<Card.Description>Manage Docker Compose stacks</Card.Description>
				</div>
				<div class="flex items-center gap-2">
					<Button variant="secondary" onclick={importStack}>
						<Upload class="w-4 h-4" />
						Import
					</Button>
					<Button variant="secondary" onclick={createStack}>
						<Plus class="w-4 h-4" />
						Create Stack
					</Button>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			{#if stacks && stacks.length > 0}
				<UniversalTable
					data={stacks}
					{columns}
					features={{
						selection: false
					}}
					display={{
						filterPlaceholder: 'Search stacks...',
						noResultsMessage: 'No stacks found'
					}}
					bind:selectedIds
				/>
			{:else if !error}
				<div class="flex flex-col items-center justify-center py-12 px-6 text-center">
					<FileStack class="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
					<p class="text-lg font-medium">No stacks found</p>
					<p class="text-sm text-muted-foreground mt-1 max-w-md">Create a new stack using the "Create Stack" button above or import an existing compose file</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<form
		method="POST"
		action={`/stacks/${id}?/remove`}
		use:enhance={() => {
			let isRemoving = true;
			let deleteDialogOpen = false;

			return async ({ result }) => {
				if (result.type === 'success' && result.data) {
					const data = result.data as {
						success: boolean;
						stack?: { name: string };
						error?: string;
					};
					if (data.success) {
						modalProps = {
							type: 'success',
							title: 'Stack Imported',
							message: `Stack '${data.stack?.name}' has been successfully imported.`
						};
					} else {
						modalProps = {
							type: 'error',
							title: 'Import Failed',
							message: data.error || 'Failed to import stack'
						};
					}
					modalOpen = true;
				}

				await invalidateAll();
				isRemoving = false;

				if (result.type === 'success') {
					window.location.href = '/stacks';
				} else {
					console.error('Error removing stack:', result);
					await invalidateAll();
				}
			};
		}}
	></form>

	<UniversalModal bind:open={dialogOpen} type={dialogProps.type} title={dialogProps.title} message={dialogProps.message} okText={dialogProps.okText} cancelText={dialogProps.cancelText} showCancel={dialogProps.showCancel} />

	<UniversalModal bind:open={modalOpen} type={modalProps.type} title={modalProps.title} message={modalProps.message} okText="OK" />
</div>
