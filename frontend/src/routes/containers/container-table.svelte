<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScanSearch, Play, RotateCcw, StopCircle, Trash2, Loader2, Ellipsis, Box } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { environmentAPI } from '$lib/services/api';
	import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
	import * as Table from '$lib/components/ui/table';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { formatFriendlyDate } from '$lib/utils/date.utils';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import type { ContainerSummaryDto } from '$lib/types/container.type';

	let {
		containers = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onCheckForUpdates
	}: {
		containers: Paginated<ContainerSummaryDto>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
		onCheckForUpdates: () => Promise<void>;
	} = $props();

	let isLoading = $state({
		start: false,
		stop: false,
		restart: false,
		remove: false,
		updating: false
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
						containers = await environmentAPI.getContainers(requestOptions);
					}
				});
			} else if (action === 'stop') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.stopContainer(id)),
					message: 'Failed to Stop Container',
					setLoadingState: (value) => (isLoading.stop = value),
					async onSuccess() {
						toast.success('Container Stopped Successfully.');
						containers = await environmentAPI.getContainers(requestOptions);
					}
				});
			} else if (action === 'restart') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.restartContainer(id)),
					message: 'Failed to Restart Container',
					setLoadingState: (value) => (isLoading.restart = value),
					async onSuccess() {
						toast.success('Container Restarted Successfully.');
						containers = await environmentAPI.getContainers(requestOptions);
					}
				});
			}
		} catch (error) {
			console.error('Container action failed:', error);
			toast.error('An error occurred while performing the action');
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
							containers = await environmentAPI.getContainers(requestOptions);
						}
					});
				}
			}
		});
	}

	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));
	const hasContainers = $derived(containers?.data?.length > 0);
</script>

{#if hasContainers}
	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Container List</Card.Title>
				</div>
				<div class="flex items-center gap-2">
					<ArcaneButton
						action="inspect"
						customLabel="Update Containers"
						onclick={onCheckForUpdates}
						loading={isLoading.updating}
						loadingLabel="Updating..."
						disabled={isLoading.updating}
					/>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<ArcaneTable
				items={containers}
				bind:requestOptions
				bind:selectedIds
				onRefresh={async (options) => (containers = await environmentAPI.getContainers(options))}
				columns={[
					{ label: 'Name', sortColumn: 'names' },
					{ label: 'ID' },
					{ label: 'Image', sortColumn: 'image' },
					{ label: 'State', sortColumn: 'state' },
					{ label: 'Status', sortColumn: 'status' },
					{ label: 'Created', sortColumn: 'created' },
					{ label: ' ' }
				]}
				filterPlaceholder="Search containers..."
				noResultsMessage="No containers found"
			>
				{#snippet rows({ item })}
					<Table.Cell>
						<a class="font-medium hover:underline" href="/containers/{item.id}/">
							{#if item.names && item.names.length > 0}
								{item.names[0].startsWith('/') ? item.names[0].substring(1) : item.names[0]}
							{:else}
								{item.id.substring(0, 12)}
							{/if}
						</a>
					</Table.Cell>
					<Table.Cell>
						<span class="font-mono text-sm">{item.id.substring(0, 12)}</span>
					</Table.Cell>
					<Table.Cell>
						<span class="text-sm">{item.image}</span>
					</Table.Cell>
					<Table.Cell>
						<StatusBadge
							variant={item.state === 'running' ? 'green' : item.state === 'exited' ? 'red' : 'amber'}
							text={capitalizeFirstLetter(item.state)}
						/>
					</Table.Cell>
					<Table.Cell>
						<span class="text-sm">{item.status}</span>
					</Table.Cell>
					<Table.Cell>
						<span class="text-sm">
							{item.created ? formatFriendlyDate(new Date(item.created * 1000).toISOString()) : ''}
						</span>
					</Table.Cell>
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
									<DropdownMenu.Item onclick={() => goto(`/containers/${item.id}`)} disabled={isAnyLoading}>
										<ScanSearch class="size-4" />
										Inspect
									</DropdownMenu.Item>

									{#if item.state !== 'running'}
										<DropdownMenu.Item
											onclick={() => performContainerAction('start', item.id)}
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
											onclick={() => performContainerAction('restart', item.id)}
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
											onclick={() => performContainerAction('stop', item.id)}
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
										variant="destructive"
										onclick={() => handleRemoveContainer(item.id)}
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
			</ArcaneTable>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="flex flex-col items-center justify-center px-6 py-12 text-center">
		<Box class="text-muted-foreground mb-4 size-12 opacity-40" />
		<p class="text-lg font-medium">No containers found</p>
		<p class="text-muted-foreground mt-1 text-sm">Create a new container using the "Create Container" button above</p>
	</div>
{/if}
