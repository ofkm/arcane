<script lang="ts">
	import { Users, Shield, UserCheck } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { toast } from 'svelte-sonner';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ArcaneButton from '$lib/components/arcane-button.svelte';
	import { userAPI } from '$lib/services/api';
	import StatCard from '$lib/components/stat-card.svelte';
	import UserTable from './user-table.svelte';
	import UserFormSheet from '$lib/components/sheets/user-form-sheet.svelte';
	import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { User } from '$lib/types/user.type';

	let { data } = $props();

	let users = $state<User[]>(Array.isArray(data.users) ? data.users : data.users?.data || []);
	let error = $state<string | null>(null);
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

	const totalUsers = $derived(users.length);
	const adminUsers = $derived(users.filter((u) => u.Roles?.includes('admin')).length);
	const regularUsers = $derived(users.filter((u) => !u.Roles?.includes('admin')).length);

	async function loadUsers() {
		try {
			isLoading.refresh = true;
			const response = await userAPI.getUsers(
				requestOptions.pagination,
				requestOptions.sort,
				requestOptions.search,
				requestOptions.filters
			);
			users = Array.isArray(response) ? response : response.data || [];
			error = null;
		} catch (err) {
			console.error('Failed to load users:', err);
			error = err instanceof Error ? err.message : 'Failed to load users';
			users = [];
		} finally {
			isLoading.refresh = false;
		}
	}

	async function onRefresh(options: SearchPaginationSortRequest) {
		requestOptions = options;
		await loadUsers();
		return {
			data: users,
			pagination: {
				totalPages: Math.ceil(users.length / (requestOptions.pagination?.limit || 20)),
				totalItems: users.length,
				currentPage: requestOptions.pagination?.page || 1,
				itemsPerPage: requestOptions.pagination?.limit || 20
			}
		};
	}

	async function refreshUsers() {
		isLoading.refresh = true;
		try {
			await loadUsers();
		} catch (error) {
			console.error('Failed to refresh users:', error);
			toast.error('Failed to refresh users');
		} finally {
			isLoading.refresh = false;
		}
	}

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
					message: `Failed to update user "${user.Username}"`,
					setLoadingState: (value) => (isLoading[loading] = value),
					onSuccess: async () => {
						toast.success(`User "${user.Username}" updated successfully.`);
						await loadUsers();
						isDialogOpen.edit = false;
						userToEdit = null;
					}
				});
			} else {
				if (!user.Username) {
					toast.error('Username is required');
					isLoading[loading] = false;
					return;
				}

				const createUser: Omit<User, 'ID' | 'CreatedAt' | 'UpdatedAt'> = {
					Username: user.Username,
					DisplayName: user.DisplayName,
					Email: user.Email,
					Roles: user.Roles || ['user'],
					PasswordHash: user.password,
					RequirePasswordChange: false
				};

				const result = await tryCatch(userAPI.create(createUser));
				handleApiResultWithCallbacks({
					result,
					message: `Failed to create user "${user.Username}"`,
					setLoadingState: (value) => (isLoading[loading] = value),
					onSuccess: async () => {
						toast.success(`User "${user.Username}" created successfully.`);
						await loadUsers();
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
				label="Create User"
				onClick={openCreateDialog}
				loading={isLoading.creating}
				disabled={isLoading.creating}
			/>
			<ArcaneButton
				action="restart"
				onClick={refreshUsers}
				label="Refresh"
				loading={isLoading.refresh}
				disabled={isLoading.refresh}
			/>
		</div>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<Alert.Title>Error Loading Users</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<StatCard
			title="Total Users"
			value={totalUsers}
			icon={Users}
			iconColor="text-blue-500"
			class="border-l-4 border-l-blue-500"
		/>
		<StatCard
			title="Administrators"
			value={adminUsers}
			icon={Shield}
			iconColor="text-red-500"
			class="border-l-4 border-l-red-500"
		/>
		<StatCard
			title="Regular Users"
			value={regularUsers}
			icon={UserCheck}
			iconColor="text-green-500"
			class="border-l-4 border-l-green-500"
		/>
	</div>

	<UserTable
		{users}
		bind:selectedIds
		bind:requestOptions
		{onRefresh}
		onUsersChanged={loadUsers}
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
