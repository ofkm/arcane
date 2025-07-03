<script lang="ts">
	import type { Stack } from '$lib/models/stack.type';
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Trash2,
		Loader2,
		Ellipsis,
		Pen,
		Play,
		RotateCcw,
		StopCircle,
		FileStack
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { environmentAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import { statusVariantMap } from '$lib/types/statuses';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { formatFriendlyDate } from '$lib/utils/date.utils';

	interface StackWithId extends Stack {
		id: string;
	}

	let {
		stacks,
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onRefresh,
		onStacksChanged,
		onCheckForUpdates
	}: {
		stacks: Stack[];
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
		onRefresh: (options: SearchPaginationSortRequest) => Promise<any>;
		onStacksChanged: () => Promise<void>;
		onCheckForUpdates: () => Promise<void>;
	} = $props();

	let isLoading = $state({
		start: false,
		stop: false,
		restart: false,
		remove: false,
		destroy: false,
		pull: false,
		updating: false
	});

	const stacksWithId = $derived(
		stacks.map((stack) => ({
			...stack,
			id: stack.id || stack.name
		}))
	);

	const paginatedStacks: Paginated<StackWithId> = $derived({
		data: stacksWithId,
		pagination: {
			totalPages: Math.ceil(stacksWithId.length / (requestOptions.pagination?.limit || 20)),
			totalItems: stacksWithId.length,
			currentPage: requestOptions.pagination?.page || 1,
			itemsPerPage: requestOptions.pagination?.limit || 20
		}
	});

	async function performStackAction(action: string, id: string) {
		isLoading[action as keyof typeof isLoading] = true;

		try {
			if (action === 'start') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.startStack(id)),
					message: 'Failed to Start Stack',
					setLoadingState: (value) => (isLoading.start = value),
					onSuccess: async () => {
						toast.success('Stack Started Successfully.');
						await onStacksChanged();
					}
				});
			} else if (action === 'stop') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.downStack(id)),
					message: 'Failed to Stop Stack',
					setLoadingState: (value) => (isLoading.stop = value),
					onSuccess: async () => {
						toast.success('Stack Stopped Successfully.');
						await onStacksChanged();
					}
				});
			} else if (action === 'restart') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.restartStack(id)),
					message: 'Failed to Restart Stack',
					setLoadingState: (value) => (isLoading.restart = value),
					onSuccess: async () => {
						toast.success('Stack Restarted Successfully.');
						await onStacksChanged();
					}
				});
			} else if (action === 'pull') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.pullStackImages(id)),
					message: 'Failed to pull Stack',
					setLoadingState: (value) => (isLoading.pull = value),
					onSuccess: async () => {
						toast.success('Stack Pulled successfully.');
						await onStacksChanged();
					}
				});
			} else if (action === 'destroy') {
				openConfirmDialog({
					title: `Confirm Removal`,
					message: `Are you sure you want to remove this Stack? This action cannot be undone.`,
					confirm: {
						label: 'Remove',
						destructive: true,
						action: async () => {
							handleApiResultWithCallbacks({
								result: await tryCatch(environmentAPI.destroyStack(id)),
								message: 'Failed to Remove Stack',
								setLoadingState: (value) => (isLoading.destroy = value),
								onSuccess: async () => {
									toast.success('Stack Removed Successfully');
									await onStacksChanged();
								}
							});
						}
					}
				});
			}
		} catch (error) {
			console.error('Stack action failed:', error);
			toast.error('An error occurred while performing the action');
			isLoading[action as keyof typeof isLoading] = false;
		}
	}

	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));
</script>

{#if stacksWithId.length > 0}
	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Compose Projects List</Card.Title>
				</div>
				<div class="flex items-center gap-2">
					<ArcaneButton
						action="inspect"
						label="Update Compose Projects"
						onClick={onCheckForUpdates}
						loading={isLoading.updating}
						loadingLabel="Updating..."
						disabled={isLoading.updating}
					/>
					<ArcaneButton
						action="create"
						customLabel="Create Compose Project"
						onClick={() => goto(`/compose/new`)}
					/>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<ArcaneTable
				items={paginatedStacks}
				bind:requestOptions
				bind:selectedIds
				{onRefresh}
				columns={[
					{ label: 'Name', sortColumn: 'name' },
					{ label: 'Services', sortColumn: 'service_count' },
					{ label: 'Status', sortColumn: 'status' },
					{ label: 'Created', sortColumn: 'created_at' },
					{ label: ' ' }
				]}
				filterPlaceholder="Search projects..."
				noResultsMessage="No projects found"
			>
				{#snippet rows({ item })}
					{@const stateVariant = item.status ? statusVariantMap[item.status.toLowerCase()] : 'gray'}
					<Table.Cell>
						<a class="font-medium hover:underline" href="/compose/{item.id}/">
							{item.name}
						</a>
					</Table.Cell>
					<Table.Cell>{item.serviceCount || 0}</Table.Cell>
					<Table.Cell>
						<StatusBadge variant={stateVariant} text={capitalizeFirstLetter(item.status)} />
					</Table.Cell>
					<Table.Cell>{formatFriendlyDate(item.createdAt || '')}</Table.Cell>
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
										onclick={() => goto(`/compose/${item.id}`)}
										disabled={isAnyLoading}
									>
										<Pen class="size-4" />
										Edit
									</DropdownMenu.Item>

									{#if item.status !== 'running'}
										<DropdownMenu.Item
											onclick={() => performStackAction('start', item.id)}
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
											onclick={() => performStackAction('restart', item.id)}
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
											onclick={() => performStackAction('stop', item.id)}
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

									<DropdownMenu.Item
										onclick={() => performStackAction('pull', item.id)}
										disabled={isLoading.pull || isAnyLoading}
									>
										{#if isLoading.pull}
											<Loader2 class="size-4 animate-spin" />
										{:else}
											<RotateCcw class="size-4" />
										{/if}
										Pull & Redeploy
									</DropdownMenu.Item>

									<DropdownMenu.Separator />

									<DropdownMenu.Item
										class="focus:text-red-700! text-red-500"
										onclick={() => performStackAction('destroy', item.id)}
										disabled={isLoading.remove || isAnyLoading}
									>
										{#if isLoading.remove}
											<Loader2 class="size-4 animate-spin" />
										{:else}
											<Trash2 class="size-4" />
										{/if}
										Destroy
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
		<FileStack class="text-muted-foreground mb-4 size-12 opacity-40" />
		<p class="text-lg font-medium">No Projects found</p>
		<p class="text-muted-foreground mt-1 max-w-md text-sm">
			Create a new stack using the "Create Project" button above
		</p>
		<div class="mt-4 flex gap-3">
			<ArcaneButton
				action="create"
				customLabel="Create Project"
				onClick={() => goto(`/compose/new`)}
				size="sm"
			/>
		</div>
	</div>
{/if}
