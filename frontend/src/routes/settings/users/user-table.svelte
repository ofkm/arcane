<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Trash2, Users, Ellipsis, Edit } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import * as Table from '$lib/components/ui/table';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { formatFriendlyDate } from '$lib/utils/date.utils';
	import { userAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { User } from '$lib/types/user.type';

	let {
		users,
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onRefresh,
		onUsersChanged,
		onEditUser
	}: {
		users: User[];
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
		onRefresh: (options: SearchPaginationSortRequest) => Promise<any>;
		onUsersChanged: () => Promise<void>;
		onEditUser: (user: User) => void;
	} = $props();

	let isLoading = $state({
		removing: false
	});

	type UserWithId = User & { id: string };

	const usersWithId = $derived(
		(users || []).map((user) => ({
			...user,
			id: user.ID
		}))
	);

	const paginatedUsers: Paginated<UserWithId> = $derived({
		data: usersWithId as UserWithId[],
		pagination: {
			totalPages: Math.ceil(usersWithId.length / (requestOptions.pagination?.limit || 20)),
			totalItems: usersWithId.length,
			currentPage: requestOptions.pagination?.page || 1,
			itemsPerPage: requestOptions.pagination?.limit || 20
		}
	});

	async function handleDeleteSelected() {
		if (selectedIds.length === 0) return;

		openConfirmDialog({
			title: `Delete ${selectedIds.length} User${selectedIds.length > 1 ? 's' : ''}`,
			message: `Are you sure you want to delete the selected user${selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					let successCount = 0;
					let failureCount = 0;

					for (const userId of selectedIds) {
						const result = await tryCatch(userAPI.delete(userId));
						handleApiResultWithCallbacks({
							result,
							message: `Failed to delete user ${userId}`,
							setLoadingState: () => {},
							onSuccess: () => {
								successCount++;
							}
						});

						if (result.error) {
							failureCount++;
						}
					}

					isLoading.removing = false;

					if (successCount > 0) {
						toast.success(
							`Successfully deleted ${successCount} user${successCount > 1 ? 's' : ''}`
						);
						await onUsersChanged();
					}

					if (failureCount > 0) {
						toast.error(`Failed to delete ${failureCount} user${failureCount > 1 ? 's' : ''}`);
					}

					selectedIds = [];
				}
			}
		});
	}

	async function handleDeleteUser(userId: string, username: string) {
		openConfirmDialog({
			title: `Delete User "${username}"`,
			message: `Are you sure you want to delete the user "${username}"? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					handleApiResultWithCallbacks({
						result: await tryCatch(userAPI.delete(userId)),
						message: `Failed to delete user "${username}"`,
						setLoadingState: (value) => (isLoading.removing = value),
						onSuccess: async () => {
							toast.success(`User "${username}" deleted successfully.`);
							await onUsersChanged();
						}
					});
				}
			}
		});
	}

	function getRoleBadgeVariant(roles: string[]) {
		if (roles?.includes('admin')) return 'red';
		if (roles?.includes('moderator')) return 'amber';
		return 'green';
	}

	function getRoleText(roles: string[]) {
		if (roles?.includes('admin')) return 'Admin';
		if (roles?.includes('moderator')) return 'Moderator';
		return 'User';
	}
</script>

{#if usersWithId.length > 0}
	<Card.Root class="border shadow-sm">
		<Card.Header class="px-6">
			<div class="flex items-center justify-between">
				<Card.Title>Users List</Card.Title>
				<div class="flex items-center gap-2">
					{#if selectedIds.length > 0}
						<ArcaneButton
							action="remove"
							onClick={handleDeleteSelected}
							loading={isLoading.removing}
							disabled={isLoading.removing}
						/>
					{/if}
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<ArcaneTable
				items={paginatedUsers}
				bind:requestOptions
				bind:selectedIds
				{onRefresh}
				columns={[
					{ label: 'Username', sortColumn: 'Username' },
					{ label: 'Display Name', sortColumn: 'DisplayName' },
					{ label: 'Email', sortColumn: 'Email' },
					{ label: 'Role', sortColumn: 'Roles' },
					{ label: 'Created', sortColumn: 'CreatedAt' },
					{ label: ' ' }
				]}
				filterPlaceholder="Search users..."
				noResultsMessage="No users found"
			>
				{#snippet rows({ item })}
					<Table.Cell>
						<span class="font-medium">{item.Username}</span>
					</Table.Cell>
					<Table.Cell>{item.DisplayName || '-'}</Table.Cell>
					<Table.Cell>{item.Email || '-'}</Table.Cell>
					<Table.Cell>
						<StatusBadge text={getRoleText(item.Roles)} variant={getRoleBadgeVariant(item.Roles)} />
					</Table.Cell>
					<Table.Cell>{formatFriendlyDate(item.CreatedAt)}</Table.Cell>
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
									<DropdownMenu.Item onclick={() => onEditUser(item)}>
										<Edit class="size-4" />
										Edit
									</DropdownMenu.Item>
									<DropdownMenu.Item
										class="focus:text-red-700! text-red-500"
										onclick={() => handleDeleteUser(item.ID, item.Username)}
									>
										<Trash2 class="size-4" />
										Delete
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
		<Users class="text-muted-foreground mb-4 size-12 opacity-40" />
		<p class="text-lg font-medium">No users found</p>
		<p class="text-muted-foreground mt-1 max-w-md text-sm">
			Create a new user using the "Create User" button above
		</p>
	</div>
{/if}
