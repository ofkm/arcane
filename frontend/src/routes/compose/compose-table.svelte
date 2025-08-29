<script lang="ts">
	import type { Project } from '$lib/types/project.type';
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Trash2, Loader2, Ellipsis, Pen, Play, RotateCcw, StopCircle, FileStack } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { environmentAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import { statusVariantMap } from '$lib/types/statuses';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { formatFriendlyDate } from '$lib/utils/date.utils';

	let {
		projects = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onCheckForUpdates
	}: {
		projects: Paginated<Project>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
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

	async function performProjectAction(action: string, id: string) {
		isLoading[action as keyof typeof isLoading] = true;

		try {
			if (action === 'start') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.startProject(id)),
					message: 'Failed to Start Project',
					setLoadingState: (value) => (isLoading.start = value),
					onSuccess: async () => {
						toast.success('Project Started Successfully.');
						projects = await environmentAPI.getProjects(requestOptions);
					}
				});
			} else if (action === 'stop') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.downProject(id)),
					message: 'Failed to Stop Project',
					setLoadingState: (value) => (isLoading.stop = value),
					onSuccess: async () => {
						toast.success('Project Stopped Successfully.');
						projects = await environmentAPI.getProjects(requestOptions);
					}
				});
			} else if (action === 'restart') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.restartProject(id)),
					message: 'Failed to Restart Project',
					setLoadingState: (value) => (isLoading.restart = value),
					onSuccess: async () => {
						toast.success('Project Restarted Successfully.');
						projects = await environmentAPI.getProjects(requestOptions);
					}
				});
			} else if (action === 'pull') {
				handleApiResultWithCallbacks({
					result: await tryCatch(environmentAPI.pullProjectImages(id)),
					message: 'Failed to pull Project',
					setLoadingState: (value) => (isLoading.pull = value),
					onSuccess: async () => {
						toast.success('Project Pulled successfully.');
						projects = await environmentAPI.getProjects(requestOptions);
					}
				});
			} else if (action === 'destroy') {
				openConfirmDialog({
					title: `Confirm Removal`,
					message: `Are you sure you want to remove this Project? This action cannot be undone.`,
					confirm: {
						label: 'Remove',
						destructive: true,
						action: async () => {
							handleApiResultWithCallbacks({
								result: await tryCatch(environmentAPI.destroyProject(id)),
								message: 'Failed to Remove Project',
								setLoadingState: (value) => (isLoading.destroy = value),
								onSuccess: async () => {
									toast.success('Project Removed Successfully');
									projects = await environmentAPI.getProjects(requestOptions);
								}
							});
						}
					}
				});
			}
		} catch (error) {
			console.error('Project action failed:', error);
			toast.error('An error occurred while performing the action');
			isLoading[action as keyof typeof isLoading] = false;
		}
	}

	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));
</script>

{#if projects.data.length > 0}
	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Projects List</Card.Title>
				</div>
				<div class="flex items-center gap-2">
					<ArcaneButton
						action="inspect"
						customLabel="Update Projects"
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
				items={projects}
				bind:requestOptions
				bind:selectedIds
				columns={[
					{ label: 'Name', sortColumn: 'name' },
					{ label: 'Services', sortColumn: 'service_count' },
					{ label: 'Status', sortColumn: 'status' },
					{ label: 'Created', sortColumn: 'created_at' },
					{ label: ' ' }
				]}
				filterPlaceholder="Search projects..."
				noResultsMessage="No projects found"
				onRefresh={async (options) => (projects = await environmentAPI.getProjects(options))}
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
									<DropdownMenu.Item onclick={() => goto(`/compose/${item.id}`)} disabled={isAnyLoading}>
										<Pen class="size-4" />
										Edit
									</DropdownMenu.Item>

									{#if item.status !== 'running'}
										<DropdownMenu.Item
											onclick={() => performProjectAction('start', item.id)}
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
											onclick={() => performProjectAction('restart', item.id)}
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
											onclick={() => performProjectAction('stop', item.id)}
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
										onclick={() => performProjectAction('pull', item.id)}
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
										variant="destructive"
										onclick={() => performProjectAction('destroy', item.id)}
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
		<p class="text-muted-foreground mt-1 max-w-md text-sm">Create a new stack using the "Create Project" button above</p>
	</div>
{/if}
