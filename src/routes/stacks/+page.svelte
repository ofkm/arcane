<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Plus, AlertCircle, Layers, RefreshCw, Upload, FileStack, Loader2, Play, RotateCcw, StopCircle, Trash2, Ellipsis, Pen, Import } from '@lucide/svelte';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import UniversalModal from '$lib/components/universal-modal.svelte';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { capitalizeFirstLetter } from '$lib/utils';
	import { statusVariantMap } from '$lib/types/statuses';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import StackAPIService from '$lib/services/api/stack-api-service';

	let { data }: { data: PageData } = $props();
	let { error } = data;
	let stacks = $state(data.stacks);
	let selectedIds = $state([]);
	let isRefreshing = $state(false);
	let isLoading = $state({
		start: false,
		stop: false,
		restart: false,
		remove: false,
		import: false,
		redeploy: false,
		destroy: false,
		pull: false
	});
	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));
	let id = $state('');

	const stackApi = new StackAPIService();
	type StackActions = 'start' | 'stop' | 'restart' | 'redeploy' | 'import' | 'destroy' | 'pull';

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

	async function performStackAction(action: StackActions, id: string) {
		isLoading[action] = true;
		let result;

		if (action === 'start') {
			result = await tryCatch(stackApi.start(id));
			if (result.error) {
				console.error(`Failed to start Stack ${id}:`, result.error);
				toast.error(`Failed to start Stack: ${result.error.message}`);
				isLoading['start'] = false;
				return;
			}
			toast.success('Stack started successfully.');
			await invalidateAll();
			isLoading['start'] = false;
		} else if (action === 'stop') {
			result = await tryCatch(stackApi.stop(id));
			if (result.error) {
				console.error(`Failed to stop Stack ${id}:`, result.error);
				toast.error(`Failed to stop Stack: ${result.error.message}`);
				isLoading['stop'] = false;
				return;
			}
			toast.success('Stack stopped successfully.');
			await invalidateAll();
			isLoading['stop'] = false;
		} else if (action === 'restart') {
			result = await tryCatch(stackApi.restart(id));
			if (result.error) {
				console.error(`Failed to restart Stack ${id}:`, result.error);
				toast.error(`Failed to restart Stack: ${result.error.message}`);
				isLoading['restart'] = false;
				return;
			}
			toast.success('Stack restarted successfully.');
			await invalidateAll();
			isLoading['restart'] = false;
		} else if (action === 'redeploy') {
			result = await tryCatch(stackApi.redeploy(id));
			if (result.error) {
				console.error(`Failed to redeploy Stack ${id}:`, result.error);
				toast.error(`Failed to redeploy Stack: ${result.error.message}`);
				isLoading['restart'] = false;
				return;
			}
			toast.success('Stack redeployed successfully.');
			await invalidateAll();
			isLoading['redeploy'] = false;
		} else if (action === 'pull') {
			result = await tryCatch(stackApi.pull(id));
			if (result.error) {
				console.error(`Failed to pull Stack ${id}:`, result.error);
				toast.error(`Failed to pull Stack: ${result.error.message}`);
				isLoading['pull'] = false;
				return;
			}
			toast.success('Stack Pulled successfully.');
			await invalidateAll();
			isLoading['pull'] = false;
		} else {
			console.error('An Unknown Error Occurred');
			toast.error('An Unknown Error Occurred');
		}
	}

	async function handleImportStack(id: string, name: string) {
		isLoading['import'] = true;
		const result = await tryCatch(stackApi.import(id, name));
		if (result.error) {
			console.error(`Failed to import Stack ${id}:`, result.error);
			toast.error(`Failed to import Stack: ${result.error.message}`);
			isLoading['import'] = false;
			return;
		}
		toast.success('Stack Imported successfully.');
		await invalidateAll();
		isLoading['import'] = false;
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
					<Button variant="secondary">
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
					columns={[
						{ accessorKey: 'name', header: 'Name' },
						{ accessorKey: 'serviceCount', header: 'Services' },
						{ accessorKey: 'status', header: 'Status' },
						{ accessorKey: 'source', header: 'Source' },
						{ accessorKey: 'createdAt', header: 'Created' },
						{ accessorKey: 'actions', header: ' ', enableSorting: false }
					]}
					features={{
						selection: false
					}}
					display={{
						filterPlaceholder: 'Search stacks...',
						noResultsMessage: 'No stacks found'
					}}
					bind:selectedIds
				>
					{#snippet rows({ item })}
						{@const stateVariant = statusVariantMap[item.status.toLowerCase()]}
						<Table.Cell><a class="font-medium hover:underline" href="/containers/{item.id}/">{item.name}</a></Table.Cell>
						<Table.Cell>{item.serviceCount}</Table.Cell>
						<Table.Cell><StatusBadge variant={item.isExternal ? 'amber' : 'green'} text={item.isExternal ? 'External' : 'Managed'} /></Table.Cell>
						<Table.Cell><StatusBadge variant={stateVariant} text={capitalizeFirstLetter(item.status)} /></Table.Cell>
						<Table.Cell>{item.createdAt}</Table.Cell>
						<Table.Cell>
							{#if item.isExternal}
								<Button onclick={() => handleImportStack(item.id, item.name)} variant="outline" title="Import Stack to Arcane" disabled={isLoading.import} class="flex items-center">
									{#if isLoading.import}
										<Loader2 class="h-4 w-4 mr-2 animate-spin" />
									{:else}
										<Import class="h-4 w-4 mr-2" />
									{/if}
									Import
								</Button>
							{:else}
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
												<span class="sr-only">Open menu</span>
												<Ellipsis />
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content>
										<DropdownMenu.Group>
											<DropdownMenu.Item onclick={() => goto(`/stacks/${item.id}`)} disabled={isAnyLoading}>
												<Pen class="w-4 h-4" />
												Edit
											</DropdownMenu.Item>

											{#if item.status !== 'running'}
												<DropdownMenu.Item onclick={() => performStackAction('stop', item.id)} disabled={isLoading.start || isAnyLoading}>
													{#if isLoading.start}
														<Loader2 class="w-4 h-4 animate-spin" />
													{:else}
														<Play class="w-4 h-4" />
													{/if}
													Start
												</DropdownMenu.Item>
											{:else}
												<DropdownMenu.Item onclick={() => performStackAction('restart', item.id)} disabled={isLoading.restart || isAnyLoading}>
													{#if isLoading.restart}
														<Loader2 class="w-4 h-4 animate-spin" />
													{:else}
														<RotateCcw class="w-4 h-4" />
													{/if}
													Restart
												</DropdownMenu.Item>

												<DropdownMenu.Item onclick={() => performStackAction('stop', item.id)} disabled={isLoading.stop || isAnyLoading}>
													{#if isLoading.stop}
														<Loader2 class="w-4 h-4 animate-spin" />
													{:else}
														<StopCircle class="w-4 h-4" />
													{/if}
													Stop
												</DropdownMenu.Item>
											{/if}

											<DropdownMenu.Separator />

											<DropdownMenu.Item class="text-red-500 focus:!text-red-700" onclick={() => performStackAction('destroy', item.id)} disabled={isLoading.remove || isAnyLoading}>
												{#if isLoading.remove}
													<Loader2 class="w-4 h-4 animate-spin" />
												{:else}
													<Trash2 class="w-4 h-4" />
												{/if}
												Destroy
											</DropdownMenu.Item>
										</DropdownMenu.Group>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							{/if}
						</Table.Cell>
					{/snippet}
				</UniversalTable>
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
