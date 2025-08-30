<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import EditIcon from '@lucide/svelte/icons/edit';
	import * as Card from '$lib/components/ui/card/index.js';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { userAPI } from '$lib/services/api';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { User } from '$lib/types/user.type';
	import type { ColumnSpec } from '$lib/components/arcane-table';

	let {
		users = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable(),
		onUsersChanged,
		onEditUser
	}: {
		users: Paginated<User>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
		onUsersChanged: () => Promise<void>;
		onEditUser: (user: User) => void;
	} = $props();

	let isLoading = $state({
		removing: false
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
						toast.success(`Successfully deleted ${successCount} user${successCount > 1 ? 's' : ''}`);
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
		return 'green';
	}

	function getRoleText(roles: string[]) {
		if (roles?.includes('admin')) return 'Admin';
		return 'User';
	}

	const columns = [
		{ accessorKey: 'username', title: 'Username', sortable: true, cell: UsernameCell },
		{ accessorKey: 'displayName', title: 'Display Name', sortable: true, cell: DisplayNameCell },
		{ accessorKey: 'email', title: 'Email', sortable: true, cell: EmailCell },
		{ accessorKey: 'roles', title: 'Role', sortable: true, cell: RoleCell }
	] satisfies ColumnSpec<User>[];
</script>

{#snippet UsernameCell({ item }: { item: User })}
	<span class="font-medium">{item.username}</span>
{/snippet}

{#snippet DisplayNameCell({ value }: { value: unknown })}
	{String(value || '-')}
{/snippet}

{#snippet EmailCell({ value }: { value: unknown })}
	{String(value || '-')}
{/snippet}

{#snippet RoleCell({ item }: { item: User })}
	<StatusBadge text={getRoleText(item.roles)} variant={getRoleBadgeVariant(item.roles)} />
{/snippet}

{#snippet RowActions({ item }: { item: User })}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
					<span class="sr-only">Open menu</span>
					<EllipsisIcon />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Group>
				<DropdownMenu.Item onclick={() => onEditUser(item)}>
					<EditIcon class="size-4" />
					Edit
				</DropdownMenu.Item>
				<DropdownMenu.Item variant="destructive" onclick={() => handleDeleteUser(item.id, item.username)}>
					<Trash2Icon class="size-4" />
					Delete
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<Card.Root>
	<Card.Content class="py-5">
		<ArcaneTable
			items={users}
			bind:requestOptions
			bind:selectedIds
			onRemoveSelected={(ids) => handleDeleteSelected()}
			onRefresh={async (options) => {
				requestOptions = options;
				await onUsersChanged();
				return users;
			}}
			{columns}
			rowActions={RowActions}
		/>
	</Card.Content>
</Card.Root>
