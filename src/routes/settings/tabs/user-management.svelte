<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import { UserPlus, UserCheck } from '@lucide/svelte';
	import type { PageData } from '../$types';
	import type { UniversalTableProps } from '$lib/types/table-types';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { userTableColumns } from '$lib/types/table-columns/user-table-columns';
	import type { User } from '$lib/types/user.type';
	import UserFormDialog from '$lib/components/dialogs/user-form-dialog.svelte';

	// Get data from server
	let { data } = $props<{ data: PageData }>();

	let users = $state<User[]>(data.users || []);

	$effect(() => {
		users = data.users || [];
	});

	// Dialog state
	let isUserDialogOpen = $state(false);
	let userToEdit = $state<User | null>(null);
	let userDialogRef: UserFormDialog | null = $state(null);

	// Available roles
	const roles = [
		{ id: 'admin', name: 'Administrator' },
		{ id: 'user', name: 'Standard User' },
		{ id: 'viewer', name: 'Viewer (read-only)' }
	];

	// Function to open dialog for creating
	function openCreateUserDialog() {
		userToEdit = null;
		isUserDialogOpen = true;
	}

	// Function to open dialog for editing
	function openEditUserDialog(user: User) {
		userToEdit = user;
		isUserDialogOpen = true;
	}

	// Handle submission from the dialog
	async function handleDialogSubmit(event: CustomEvent) {
		const { user: userData, isEditMode, userId } = event.detail;

		const url = isEditMode ? `/api/users/${userId}` : '/api/users';
		const method = isEditMode ? 'PUT' : 'POST';

		try {
			const response = await fetch(url, {
				method: method,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(userData)
			});

			const result = await response.json();

			if (response.ok) {
				if (isEditMode) {
					users = users.map((u) => (u.id === userId ? { ...u, ...result.user } : u));
					toast.success('User updated successfully');
				} else {
					users = [...users, result.user];
					toast.success('User created successfully');
				}
				isUserDialogOpen = false;
			} else {
				userDialogRef?.setSaveError(result.error || `Failed to ${isEditMode ? 'update' : 'create'} user`);
			}
		} catch (error) {
			console.error(`Error ${isEditMode ? 'updating' : 'creating'} user:`, error);
			userDialogRef?.setSaveError(`An unexpected error occurred.`);
		} finally {
			userDialogRef?.resetSavingState();
		}
	}

	// Handle user removal via API
	async function handleRemoveUser(userId: string, username: string) {
		if (!confirm(`Are you sure you want to remove user "${username}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/users/${userId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				users = users.filter((user) => user.id !== userId);
				toast.success(`User ${username} removed successfully`);
			} else {
				const result = await response.json();
				toast.error(result.error || 'Failed to remove user');
			}
		} catch (error) {
			console.error('Error removing user:', error);
			toast.error('An unexpected error occurred');
		}
	}

	// Configure the table columns, passing edit handler
	const columns = userTableColumns(handleRemoveUser, openEditUserDialog);

	// Create table props
	const tableProps: UniversalTableProps<User> = {
		columns,
		get data() {
			return users;
		},
		features: {
			sorting: true,
			filtering: true,
			selection: false
		},
		display: {
			filterPlaceholder: 'Filter users...',
			noResultsMessage: 'No users found'
		},
		pagination: {
			pageSize: 10,
			pageSizeOptions: [5, 10, 15, 20]
		},
		sort: {
			defaultSort: {
				id: 'user',
				desc: false
			}
		}
	};
</script>

<UserFormDialog bind:open={isUserDialogOpen} bind:userToEdit {roles} on:submit={handleDialogSubmit} bind:this={userDialogRef} />

<div class="grid grid-cols-1 gap-6 h-full">
	<!-- User List Card -->
	<Card.Root class="border shadow-sm flex flex-col">
		<Card.Header class="pb-3 flex flex-row items-center justify-between space-y-0">
			<div class="flex items-center gap-2">
				<div class="bg-blue-500/10 p-2 rounded-full">
					<UserCheck class="h-5 w-5 text-blue-500" />
				</div>
				<div>
					<Card.Title>User Accounts</Card.Title>
					<Card.Description>Manage local user accounts</Card.Description>
				</div>
			</div>
			<!-- Add Create User Button -->
			<Button size="sm" onclick={openCreateUserDialog}>
				<UserPlus class="mr-2 h-4 w-4" />
				Create User
			</Button>
		</Card.Header>
		<Card.Content class="flex-1 flex flex-col">
			{#if users.length > 0}
				<div class="flex-1 flex flex-col h-full">
					<UniversalTable {...tableProps} />
				</div>
			{:else}
				<div class="text-center py-8 text-muted-foreground italic">No local users found</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
