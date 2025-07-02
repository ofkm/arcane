<script lang="ts">
	import {
		ScanSearch,
		Play,
		RotateCcw,
		StopCircle,
		Trash2,
		Loader2,
		Box,
		RefreshCw,
		Ellipsis
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import CreateContainerSheet from '$lib/components/sheets/create-container-sheet.svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { tryCatch } from '$lib/utils/try-catch';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { statusVariantMap } from '$lib/types/statuses';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { shortId } from '$lib/utils/string.utils';
	import type { PageData } from './$types';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { tablePersistence } from '$lib/stores/table-store';
	import StatCard from '$lib/components/stat-card.svelte';
	import { parseStatusTime } from '$lib/utils/string.utils';
	import type { ContainerInfo } from 'dockerode';
	import { autoUpdateAPI, environmentAPI } from '$lib/services/api';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	let containers = $state<ContainerInfo[]>([]);
	let isLoadingContainers = $state(true);
	let selectedIds = $state([]);
	let isCreateDialogOpen = $state(false);

	let isLoading = $state({
		start: false,
		stop: false,
		restart: false,
		remove: false,
		checking: false,
		create: false
	});

	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));
	const runningContainers = $derived(
		containers?.filter((c: ContainerInfo) => c.State === 'running').length || 0
	);
	const stoppedContainers = $derived(
		containers?.filter((c: ContainerInfo) => c.State === 'exited').length || 0
	);
	const totalContainers = $derived(containers?.length || 0);

	function getContainerDisplayName(container: ContainerInfo): string {
		if (container.Names && container.Names.length > 0) {
			return container.Names[0].startsWith('/')
				? container.Names[0].substring(1)
				: container.Names[0];
		}
		return shortId(container.Id);
	}

	async function loadContainers() {
		try {
			isLoadingContainers = true;
			const response = await environmentAPI.getContainers();
			containers = response || [];
		} catch (error) {
			console.error('Failed to load containers:', error);
			containers = [];
		} finally {
			isLoadingContainers = false;
		}
	}

	onMount(() => {
		loadContainers();
	});

	async function performContainerAction(action: string, id: string) {
		isLoading[action as keyof typeof isLoading] = true;

		try {
			if (action === 'start') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.startContainer(id)),
					message: 'Failed to Start Container',
					setLoadingState: (value) => (isLoading.start = value),
					async onSuccess() {
						toast.success('Container Started Successfully.');
						await loadContainers();
					}
				});
			} else if (action === 'stop') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.stopContainer(id)),
					message: 'Failed to Stop Container',
					setLoadingState: (value) => (isLoading.stop = value),
					async onSuccess() {
						toast.success('Container Stopped Successfully.');
						await loadContainers();
					}
				});
			} else if (action === 'restart') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.restartContainer(id)),
					message: 'Failed to Restart Container',
					setLoadingState: (value) => (isLoading.restart = value),
					async onSuccess() {
						toast.success('Container Restarted Successfully.');
						await loadContainers();
					}
				});
			}
		} catch (error) {
			console.error('Container action failed:', error);
			isLoading[action as keyof typeof isLoading] = false;
		}
	}

	async function handleRemoveContainer(id: string) {
		openConfirmDialog({
			title: 'Confirm Container Removal',
			message: 'Are you sure you want to remove this container? This action cannot be undone.',
			confirm: {
				label: 'Remove',
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(environmentAPI.deleteContainer(id)),
						message: 'Failed to Remove Container',
						setLoadingState: (value) => (isLoading.remove = value),
						async onSuccess() {
							toast.success('Container Removed Successfully.');
							await loadContainers();
						}
					});
				}
			}
		});
	}

	async function handleCheckForUpdates() {
		isLoading.checking = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(autoUpdateAPI.checkContainers()),
			message: 'Failed to Check Containers for Updates',
			setLoadingState: (value) => (isLoading.checking = value),
			async onSuccess() {
				toast.success('Containers Updated Successfully.');
				await loadContainers();
			}
		});
	}

	function openCreateDialog() {
		isCreateDialogOpen = true;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Containers</h1>
			<p class="text-muted-foreground mt-1 text-sm">View and Manage your Containers</p>
		</div>
	</div>

	{#if isLoadingContainers}
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
						<Card.Title>Container List</Card.Title>
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
					<p class="text-lg font-medium">Loading Containers...</p>
					<p class="text-muted-foreground mt-1 text-sm">
						Please wait while we fetch your containers
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<StatCard
				title="Total"
				value={totalContainers}
				icon={Box}
				class="border-l-primary border-l-4 transition-shadow hover:shadow-lg"
			/>
			<StatCard
				title="Running"
				value={runningContainers}
				icon={Box}
				iconColor="text-green-500"
				bgColor="bg-green-500/10"
				class="border-l-4 border-l-green-500"
			/>
			<StatCard
				title="Stopped"
				value={stoppedContainers}
				icon={Box}
				iconColor="text-amber-500"
				class="border-l-4 border-l-amber-500"
			/>
		</div>

		{#if containers?.length === 0}
			<div
				class="bg-card flex flex-col items-center justify-center rounded-lg border px-6 py-12 text-center"
			>
				<Box class="text-muted-foreground mb-4 size-12 opacity-40" />
				<p class="text-lg font-medium">No containers found</p>
				<p class="text-muted-foreground mt-1 max-w-md text-sm">
					Create a new container using the "Create Container" button above or use the Docker CLI
				</p>
				<div class="mt-4 flex gap-3">
					<Button variant="secondary" onclick={loadContainers}>
						<RefreshCw class="size-4" />
						Refresh
					</Button>
					<ArcaneButton action="create" label="Create Container" onClick={openCreateDialog} />
				</div>
			</div>
		{:else}
			<Card.Root class="border shadow-sm">
				<Card.Header class="px-6">
					<div class="flex items-center justify-between">
						<div>
							<Card.Title>Container List</Card.Title>
						</div>
						<div class="flex items-center gap-2">
							<ArcaneButton
								action="inspect"
								label="Update Containers"
								onClick={() => handleCheckForUpdates()}
								loading={isLoading.checking}
								loadingLabel="Updating..."
								disabled={isLoading.checking}
							/>
							<ArcaneButton action="create" label="Create Container" onClick={openCreateDialog} />
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<UniversalTable
						data={containers.map((c: any) => ({
							...c,
							displayName: getContainerDisplayName(c),
							statusSortValue: parseStatusTime(c.Status)
						}))}
						columns={[
							{ accessorKey: 'displayName', header: 'Name' },
							{ accessorKey: 'Id', header: 'ID' },
							{ accessorKey: 'Image', header: 'Image' },
							{ accessorKey: 'State', header: 'State' },
							{ accessorKey: 'statusSortValue', header: 'Status' },
							{ accessorKey: 'actions', header: ' ', enableSorting: false }
						]}
						features={{
							selection: false
						}}
						pagination={{
							pageSize: tablePersistence.getPageSize('containers')
						}}
						onPageSizeChange={(newSize) => {
							tablePersistence.setPageSize('containers', newSize);
						}}
						sort={{
							defaultSort: { id: 'displayName', desc: false }
						}}
						display={{
							filterPlaceholder: 'Search containers...',
							noResultsMessage: 'No containers found'
						}}
						bind:selectedIds
					>
						{#snippet rows({
							item
						}: {
							item: ContainerInfo & { displayName: string; statusSortValue: number };
						})}
							{@const stateVariant = statusVariantMap[item.State.toLowerCase()]}
							<Table.Cell
								><a class="font-medium hover:underline" href="/containers/{item.Id}/"
									>{item.displayName}</a
								></Table.Cell
							>
							<Table.Cell>{shortId(item.Id)}</Table.Cell>
							<Table.Cell>{item.Image}</Table.Cell>
							<Table.Cell>
								<StatusBadge variant={stateVariant} text={capitalizeFirstLetter(item.State)} />
							</Table.Cell>
							<Table.Cell>{item.Status}</Table.Cell>
							<Table.Cell>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
												<span class="sr-only">Open menu</span>
												<Ellipsis />
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Group>
											<DropdownMenu.Item
												onclick={() => goto(`/containers/${item.Id}`)}
												disabled={isAnyLoading}
											>
												<ScanSearch class="size-4" />
												Inspect
											</DropdownMenu.Item>

											{#if item.State !== 'running'}
												<DropdownMenu.Item
													onclick={() => performContainerAction('start', item.Id)}
													disabled={isLoading.start || isAnyLoading}
												>
													{#if isLoading.start}
														<Loader2 class="size-4 animate-spin" />
													{:else}
														<Play class="size-4" />
													{/if}
													Start
												</DropdownMenu.Item>
											{:else}
												<DropdownMenu.Item
													onclick={() => performContainerAction('restart', item.Id)}
													disabled={isLoading.restart || isAnyLoading}
												>
													{#if isLoading.restart}
														<Loader2 class="size-4 animate-spin" />
													{:else}
														<RotateCcw class="size-4" />
													{/if}
													Restart
												</DropdownMenu.Item>

												<DropdownMenu.Item
													onclick={() => performContainerAction('stop', item.Id)}
													disabled={isLoading.stop || isAnyLoading}
												>
													{#if isLoading.stop}
														<Loader2 class="size-4 animate-spin" />
													{:else}
														<StopCircle class="size-4" />
													{/if}
													Stop
												</DropdownMenu.Item>
											{/if}

											<DropdownMenu.Separator />

											<DropdownMenu.Item
												class="focus:text-red-700! text-red-500"
												onclick={() => handleRemoveContainer(item.Id)}
												disabled={isLoading.remove || isAnyLoading}
											>
												{#if isLoading.remove}
													<Loader2 class="size-4 animate-spin" />
												{:else}
													<Trash2 class="size-4" />
												{/if}
												Remove
											</DropdownMenu.Item>
										</DropdownMenu.Group>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Table.Cell>
						{/snippet}
					</UniversalTable>
				</Card.Content>
			</Card.Root>
		{/if}

		<CreateContainerSheet
			bind:open={isCreateDialogOpen}
			availableVolumes={[]}
			availableNetworks={[]}
			availableImages={[]}
			isLoading={isLoading.create}
			onSubmit={async (options) => {
				isLoading.create = true;
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.createContainer(options)),
					message: 'Failed to Create Container',
					setLoadingState: (value) => (isLoading.create = value),
					onSuccess: async () => {
						toast.success('Container Created Successfully.');
						await loadContainers();
						isCreateDialogOpen = false;
					}
				});
			}}
		/>
	{/if}
</div>
