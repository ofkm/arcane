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
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { User } from '$lib/types/user.type';
	import type { ColumnSpec } from '$lib/components/arcane-table';
	import { m } from '$lib/paraglide/messages';
	import { userService } from '$lib/services/user-service';

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
			title: m.users_delete_selected_title({ count: selectedIds.length }),
			message: m.users_delete_selected_message({ count: selectedIds.length }),
			confirm: {
				label: m.common_delete(),
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					let successCount = 0;
					let failureCount = 0;

					for (const userId of selectedIds) {
						const result = await tryCatch(userService.delete(userId));
						handleApiResultWithCallbacks({
							result,
							message: m.users_delete_selected_item_failed({ id: userId }),
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
						const msg = successCount === 1 ? m.users_delete_success_one() : m.users_delete_success_many({ count: successCount });
						toast.success(msg);
						await onUsersChanged();
					}

					if (failureCount > 0) {
						const msg = failureCount === 1 ? m.users_delete_failed_one() : m.users_delete_failed_many({ count: failureCount });
						toast.error(msg);
					}

					selectedIds = [];
				}
			}
		});
	}

	async function handleDeleteUser(userId: string, username: string) {
		const safeName = username?.trim() || m.common_unknown();
		openConfirmDialog({
			title: m.users_delete_user_title({ username: safeName }),
			message: m.users_delete_user_message({ username: safeName }),
			confirm: {
				label: m.common_delete(),
				destructive: true,
				action: async () => {
					isLoading.removing = true;
					handleApiResultWithCallbacks({
						result: await tryCatch(userService.delete(userId)),
						message: m.users_delete_user_failed({ username: safeName }),
						setLoadingState: (value) => (isLoading.removing = value),
						onSuccess: async () => {
							toast.success(m.users_delete_user_success({ username: safeName }));
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
		if (roles?.includes('admin')) return m.common_admin();
		return m.common_user();
	}

	const columns = [
		{ accessorKey: 'username', title: m.common_username(), sortable: true, cell: UsernameCell },
		{ accessorKey: 'displayName', title: m.common_display_name(), sortable: true, cell: DisplayNameCell },
		{ accessorKey: 'email', title: m.common_email(), sortable: true, cell: EmailCell },
		{ accessorKey: 'roles', title: m.common_role(), sortable: true, cell: RoleCell }
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
					<span class="sr-only">{m.common_open_menu()}</span>
					<EllipsisIcon />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Group>
				{#if !item.oidcSubjectId}
					<DropdownMenu.Item onclick={() => onEditUser(item)}>
						<EditIcon class="size-4" />
						{m.common_edit()}
					</DropdownMenu.Item>
				{/if}
				<DropdownMenu.Item variant="destructive" onclick={() => handleDeleteUser(item.id, item.username)}>
					<Trash2Icon class="size-4" />
					{m.common_delete()}
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
