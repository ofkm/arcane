<script lang="ts">
	import UsersIcon from '@lucide/svelte/icons/users';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import { toast } from 'svelte-sonner';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import UserTable from './user-table.svelte';
	import UserFormSheet from '$lib/components/sheets/user-form-sheet.svelte';
	import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { User } from '$lib/types/user.type';
	import type { CreateUser } from '$lib/types/user.type';
	import { m } from '$lib/paraglide/messages';
	import { userService } from '$lib/services/user-service';
	import { SettingsPageLayout, type SettingsActionButton, type SettingsStatCard } from '$lib/layouts/index.js';

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
				const safeUsername = user.username?.trim() || m.common_unknown();
				const result = await tryCatch(userService.update(userId, user));
				handleApiResultWithCallbacks({
					result,
					message: m.users_update_failed({ username: safeUsername }),
					setLoadingState: (value) => (isLoading[loading] = value),
					onSuccess: async () => {
						toast.success(m.users_update_success({ username: safeUsername }));
						users = await userService.getUsers(requestOptions);
						isDialogOpen.edit = false;
						userToEdit = null;
					}
				});
			} else {
				if (!user.username) {
					toast.error(m.common_username_required());
					isLoading[loading] = false;
					return;
				}

				const safeUsername = user.username!.trim() || m.common_unknown();

				const createUser: CreateUser = {
					username: user.username!,
					displayName: user.displayName,
					email: user.email,
					password: user.password!,
					roles: user.roles ?? ['user']
				};

				const result = await tryCatch(userService.create(createUser));
				handleApiResultWithCallbacks({
					result,
					message: m.users_create_failed({ username: safeUsername }),
					setLoadingState: (value) => (isLoading[loading] = value),
					onSuccess: async () => {
						toast.success(m.users_create_success({ username: safeUsername }));
						users = await userService.getUsers(requestOptions);
						isDialogOpen.create = false;
					}
				});
			}
		} catch (error) {
			console.error('Failed to submit user:', error);
		}
	}

	const actionButtons: SettingsActionButton[] = $derived.by(() => [
		{
			id: 'create',
			action: 'create',
			label: m.users_create_button(),
			onclick: openCreateDialog,
			loading: isLoading.creating,
			disabled: isLoading.creating
		}
	]);

	const statCards: SettingsStatCard[] = $derived([
		{
			title: m.users_total(),
			value: totalUsers,
			icon: UsersIcon,
			iconColor: 'text-blue-500',
			class: 'border-l-4 border-l-blue-500'
		},
		{
			title: m.users_administrators(),
			value: adminUsers,
			icon: ShieldIcon,
			iconColor: 'text-red-500',
			class: 'border-l-4 border-l-red-500'
		},
		{
			title: m.users_regular(),
			value: regularUsers,
			icon: UserCheckIcon,
			iconColor: 'text-green-500',
			class: 'border-l-4 border-l-green-500'
		}
	]);
</script>

<SettingsPageLayout
	title={m.users_title()}
	description={m.users_subtitle()}
	icon={UsersIcon}
	pageType="management"
	{actionButtons}
	{statCards}
	statCardsColumns={3}
>
	{#snippet mainContent()}
		<UserTable
			bind:users
			bind:selectedIds
			bind:requestOptions
			onUsersChanged={async () => {
				users = await userService.getUsers(requestOptions);
			}}
			onEditUser={openEditDialog}
		/>
	{/snippet}

	{#snippet additionalContent()}
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
	{/snippet}
</SettingsPageLayout>
