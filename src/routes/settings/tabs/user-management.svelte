<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import { UserPlus, UserCheck, Ellipsis, Pencil, UserX } from '@lucide/svelte';
	import type { PageData } from '../$types';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import type { User } from '$lib/types/user.type';
	import UserFormDialog from '$lib/components/dialogs/user-form-dialog.svelte';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import UserAPIService from '$lib/services/api/user-api-service';
	import { invalidateAll } from '$app/navigation';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';

	let { data } = $props<{ data: PageData }>();

	const userApi = new UserAPIService();

	let userPageStates = $state({
		users: <User[]>data.users,
		isUserDialogOpen: false,
		userToEdit: <User | null>null
	});

	let isLoading = $state({
		saving: false
	});

	let userDialogRef: UserFormDialog | null = $state(null);

	$effect(() => {
		userPageStates.users = data.users;
	});

	const roles = [
		{ id: 'admin', name: 'Administrator' },
		{ id: 'user', name: 'Standard User' },
		{ id: 'viewer', name: 'Viewer (read-only)' }
	];

	function openCreateUserDialog() {
		userPageStates.userToEdit = null;
		userPageStates.isUserDialogOpen = true;
	}

	function openEditUserDialog(user: User) {
		userPageStates.userToEdit = user;
		userPageStates.isUserDialogOpen = true;
	}

	async function handleDialogSubmit({ user: userData, isEditMode, userId }: { user: Partial<User> & { password?: string }; isEditMode: boolean; userId?: string }) {
		isLoading.saving = true;

		handleApiResultWithCallbacks({
			result: await tryCatch(isEditMode ? userApi.update(userId || '', userData as User) : userApi.create(userData as User)),
			message: isEditMode ? 'Error Updating User' : 'Error Creating User',
			setLoadingState: (value) => (isLoading.saving = value),
			onSuccess: async () => {
				userPageStates.isUserDialogOpen = false;
				toast.success(isEditMode ? 'User Updated Successfully' : 'User Created Successfully');
				await invalidateAll();
				isLoading.saving = false;
			}
		});
	}

	async function handleRemoveUser(userId: string) {
		openConfirmDialog({
			title: 'Delete Container',
			message: 'Are you sure you want to delete this container? This action cannot be undone.',
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					handleApiResultWithCallbacks({
						result: await tryCatch(userApi.delete(userId)),
						message: 'Failed to Delete User',
						setLoadingState: (value) => (isLoading.saving = value),
						onSuccess: async () => {
							toast.success('User Deleted Successfully.');
							await invalidateAll();
						}
					});
				}
			}
		});
	}
</script>

<UserFormDialog bind:open={userPageStates.isUserDialogOpen} bind:userToEdit={userPageStates.userToEdit} {roles} onSubmit={handleDialogSubmit} bind:this={userDialogRef} isLoading={isLoading.saving} />

<div class="grid grid-cols-1 gap-6 h-full">
	<!-- User List Card -->
	<Card.Root class="border shadow-sm flex flex-col">
		<Card.Header class="pb-3 flex flex-row items-center justify-between space-y-0">
			<div class="flex items-center gap-2">
				<div class="bg-blue-500/10 p-2 rounded-full">
					<UserCheck class="text-blue-500 size-5" />
				</div>
				<div>
					<Card.Title>User Accounts</Card.Title>
					<Card.Description>Manage local user accounts</Card.Description>
				</div>
			</div>
			<Button size="sm" onclick={openCreateUserDialog}>
				<UserPlus class="mr-2 size-4" />
				Create User
			</Button>
		</Card.Header>
		<Card.Content class="flex-1 flex flex-col">
			{#if userPageStates.users.length > 0}
				<div class="flex-1 flex flex-col h-full">
					<UniversalTable
						data={userPageStates.users}
						columns={[
							{ accessorKey: 'user', header: 'User' },
							{ accessorKey: 'email', header: 'Email' },
							{ accessorKey: 'roles', header: 'Roles' },
							{ accessorKey: 'source', header: 'Source', enableSorting: false },
							{ accessorKey: 'actions', header: ' ' }
						]}
						features={{
							sorting: true,
							filtering: true,
							selection: false
						}}
						pagination={{
							pageSize: 10,
							pageSizeOptions: [5, 10, 15, 20]
						}}
						display={{
							filterPlaceholder: 'Filter users...',
							noResultsMessage: 'No users found'
						}}
						sort={{
							defaultSort: {
								id: 'user',
								desc: false
							}
						}}
					>
						{#snippet rows({ item })}
							<Table.Cell>
								{item.displayName}
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-1.5">
									{item.email}
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex flex-wrap">
									{#each item.roles as role (role)}
										{@const isAdmin = role === 'admin'}
										<StatusBadge text={isAdmin ? 'Admin' : 'User'} variant={isAdmin ? 'amber' : 'blue'} />
									{/each}
								</div>
							</Table.Cell>
							<Table.Cell>
								<StatusBadge text={item.oidcSubjectId ? 'OIDC' : 'Local'} variant={item.oidcSubjectId ? 'blue' : 'purple'} />
							</Table.Cell>
							<Table.Cell>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										<Button variant="ghost" size="icon" class="size-8">
											<Ellipsis class="size-4" />
											<span class="sr-only">Open menu</span>
										</Button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Group>
											{#if !item.oidcSubjectId}
												<DropdownMenu.Item onclick={() => openEditUserDialog(item)}>
													<Pencil class="size-4" />
													Edit
												</DropdownMenu.Item>
											{/if}
											<DropdownMenu.Item class="text-red-500 focus:text-red-700!" onclick={() => handleRemoveUser(item.id)}>
												<UserX class="size-4" />
												Remove User
											</DropdownMenu.Item>
										</DropdownMenu.Group>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Table.Cell>
						{/snippet}
					</UniversalTable>
				</div>
			{:else}
				<div class="text-center py-8 text-muted-foreground italic">No local users found</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
