<script lang="ts">
	import UsersIcon from '@lucide/svelte/icons/users';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import { toast } from 'svelte-sonner';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import { userAPI } from '$lib/services/api';
	import StatCard from '$lib/components/stat-card.svelte';
	import UserTable from './user-table.svelte';
	import UserFormSheet from '$lib/components/sheets/user-form-sheet.svelte';
	import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { User } from '$lib/types/user.type';
	import type { CreateUser } from '$lib/types/user.type';

	let { data } = $props();

	let users = $state(data.users);
	let selectedIds = $state<string[]>([]);
	let requestOptions = $state<SearchPaginationSortRequest>(data.userRequestOptions);

	let isDialogOpen = $state({
		create: false,
		edit: false
	});

	let userToEdit = $state<User | null>(null);

	let isLoading = $state({
		creating: false,
		editing: false,
		refresh: false
	});

	const totalUsers = $derived(users.data.length);
	const adminUsers = $derived(users.data.filter((u) => u.roles?.includes('admin')).length);
	const regularUsers = $derived(users.data.filter((u) => !u.roles?.includes('admin')).length);

	function openCreateDialog() {
		userToEdit = null;
		isDialogOpen.create = true;
	}

	function openEditDialog(user: User) {
		userToEdit = user;
		isDialogOpen.edit = true;
	}

	async function handleUserSubmit({
		user,
		isEditMode,
		userId
	}: {
		user: Partial<User> & { password?: string };
		isEditMode: boolean;
		userId?: string;
	}) {
		const loading = isEditMode ? 'editing' : 'creating';
		isLoading[loading] = true;

		try {
			if (isEditMode && userId) {
				const result = await tryCatch(userAPI.update(userId, user));
				handleApiResultWithCallbacks({
					result,
					message: `Failed to update user "${user.username}"`,
					setLoadingState: (value) => (isLoading[loading] = value),
					onSuccess: async () => {
						toast.success(`User "${user.username}" updated successfully.`);
						users = await userAPI.getUsers(requestOptions);
						isDialogOpen.edit = false;
						userToEdit = null;
					}
				});
			} else {
				if (!user.username) {
					toast.error('Username is required');
					isLoading[loading] = false;
					return;
				}

				const createUser: CreateUser = {
					username: user.username!,
					displayName: user.displayName,
					email: user.email,
					password: user.password!,
					roles: user.roles ?? ['user']
				};

				const result = await tryCatch(userAPI.create(createUser));
				handleApiResultWithCallbacks({
					result,
					message: `Failed to create user "${user.username}"`,
					setLoadingState: (value) => (isLoading[loading] = value),
					onSuccess: async () => {
						toast.success(`User "${user.username}" created successfully.`);
						users = await userAPI.getUsers(requestOptions);
						isDialogOpen.create = false;
					}
				});
			}
		} catch (error) {
			console.error('Failed to submit user:', error);
		}
	}
</script>

<div class="space-y-6 pb-8">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Users</h1>
			<p class="text-muted-foreground mt-1 text-sm">Manage system users and permissions</p>
		</div>
		<div class="flex items-center gap-2">
			<ArcaneButton
				action="create"
				customLabel="Create User"
				onclick={openCreateDialog}
				loading={isLoading.creating}
				disabled={isLoading.creating}
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<StatCard
			title="Total Users"
			value={totalUsers}
			icon={UsersIcon}
			iconColor="text-blue-500"
			class="border-l-4 border-l-blue-500"
		/>
		<StatCard
			title="Administrators"
			value={adminUsers}
			icon={ShieldIcon}
			iconColor="text-red-500"
			class="border-l-4 border-l-red-500"
		/>
		<StatCard
			title="Regular Users"
			value={regularUsers}
			icon={UserCheckIcon}
			iconColor="text-green-500"
			class="border-l-4 border-l-green-500"
		/>
	</div>

	<UserTable
		bind:users
		bind:selectedIds
		bind:requestOptions
		onUsersChanged={async () => {
			users = await userAPI.getUsers(requestOptions);
		}}
		onEditUser={openEditDialog}
	/>

	<UserFormSheet
		bind:open={isDialogOpen.create}
		userToEdit={null}
		roles={[]}
		onSubmit={handleUserSubmit}
		isLoading={isLoading.creating}
	/>

	<UserFormSheet
		bind:open={isDialogOpen.edit}
		{userToEdit}
		roles={[]}
		onSubmit={handleUserSubmit}
		isLoading={isLoading.editing}
	/>
</div>
