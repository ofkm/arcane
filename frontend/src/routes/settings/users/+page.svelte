<script lang="ts">
	import UsersIcon from '@lucide/svelte/icons/users';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import { toast } from 'svelte-sonner';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import StatCard from '$lib/components/stat-card.svelte';
	import UserTable from './user-table.svelte';
	import UserFormSheet from '$lib/components/sheets/user-form-sheet.svelte';
	import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { User } from '$lib/types/user.type';
	import type { CreateUser } from '$lib/types/user.type';
	import { m } from '$lib/paraglide/messages';
	import { userService } from '$lib/services/user-service';

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
</script>

<div class="px-2 py-4 sm:px-6 sm:py-6 lg:px-8">
	<div
		class="from-background/60 via-background/40 to-background/60 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 shadow-sm sm:p-6"
	>
		<div class="bg-primary/10 pointer-events-none absolute -right-10 -top-10 size-40 rounded-full blur-3xl"></div>
		<div class="bg-muted/40 pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full blur-3xl"></div>
		<div class="relative flex items-start gap-3 sm:gap-4">
			<div
				class="bg-primary/10 text-primary ring-primary/20 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:size-10"
			>
				<UsersIcon class="size-4 sm:size-5" />
			</div>
			<div class="min-w-0 flex-1">
				<div class="flex items-start justify-between gap-3">
					<h1 class="settings-title min-w-0 text-xl sm:text-3xl">{m.users_title()}</h1>
					<div class="flex shrink-0 items-center gap-2">
						<ArcaneButton
							action="create"
							customLabel={m.users_create_button()}
							onclick={openCreateDialog}
							loading={isLoading.creating}
							disabled={isLoading.creating}
						/>
					</div>
				</div>
				<p class="text-muted-foreground mt-1 text-sm sm:text-base">{m.users_subtitle()}</p>
			</div>
		</div>
	</div>

	<div class="mt-6 space-y-4 sm:mt-8 sm:space-y-6">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
			<StatCard
				title={m.users_total()}
				value={totalUsers}
				icon={UsersIcon}
				iconColor="text-blue-500"
				class="border-l-4 border-l-blue-500"
			/>
			<StatCard
				title={m.users_administrators()}
				value={adminUsers}
				icon={ShieldIcon}
				iconColor="text-red-500"
				class="border-l-4 border-l-red-500"
			/>
			<StatCard
				title={m.users_regular()}
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
				users = await userService.getUsers(requestOptions);
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
</div>
