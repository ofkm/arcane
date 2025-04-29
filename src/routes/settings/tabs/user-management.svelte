<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { UserPlus, UserCheck, Loader2 } from '@lucide/svelte';
	import type { PageData } from '../$types';
	import type { UniversalTableProps } from '$lib/types/table-types';
	import UniversalTable from '$lib/components/universal-table.svelte';
	import { userTableColumns } from '$lib/types/table-columns/user-table-columns';
	import type { User } from '$lib/types/user.type';

	// Get data from server
	let { data } = $props<{ data: PageData }>();

	let users = $state<User[]>(data.users || []);

	$effect(() => {
		users = data.users || [];
	});

	// New user form state
	let newUsername = $state('');
	let newPassword = $state('');
	let newDisplayName = $state('');
	let newEmail = $state('');
	let newRole = $state('user'); // Default role
	let isCreating = $state(false);

	// Available roles
	const roles = [
		{ id: 'admin', name: 'Administrator' },
		{ id: 'user', name: 'Standard User' },
		{ id: 'viewer', name: 'Viewer (read-only)' }
	];

	// Reset form fields
	function resetForm() {
		newUsername = '';
		newPassword = '';
		newDisplayName = '';
		newEmail = '';
		newRole = 'user';
	}

	// Handle user creation via API
	async function handleCreateUser(event: Event) {
		event.preventDefault(); // Keep preventDefault

		try {
			isCreating = true;

			const response = await fetch('/api/users', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: newUsername,
					password: newPassword,
					displayName: newDisplayName,
					email: newEmail,
					roles: [newRole]
				})
			});

			const result = await response.json();

			if (response.ok) {
				// Add new user to the list
				users = [...users, result.user]; // Update the state variable
				toast.success('User created successfully');
				resetForm();
			} else {
				toast.error(result.error || 'Failed to create user');
			}
		} catch (error) {
			console.error('Error creating user:', error);
			toast.error('An unexpected error occurred');
		} finally {
			isCreating = false;
		}
	}

	// Handle user removal via API
	async function handleRemoveUser(userId: string, username: string) {
		try {
			const response = await fetch(`/api/users/${userId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				// Remove user from list
				users = users.filter((user) => user.id !== userId); // Update the state variable
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

	// Configure the table columns and props
	const columns = userTableColumns(handleRemoveUser);

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

	// Set up global function for cell action buttons
	onMount(() => {
		// @ts-ignore
		window.onUserRemove = (userId: string, username: string) => {
			handleRemoveUser(userId, username);
		};

		// Clean up function when component is destroyed
		return () => {
			// @ts-ignore
			delete window.onUserRemove;
		};
	});
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
	<!-- User List with Universal Table - Make card fill available height -->
	<Card.Root class="border shadow-sm flex flex-col">
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<div class="bg-blue-500/10 p-2 rounded-full">
					<UserCheck class="h-5 w-5 text-blue-500" />
				</div>
				<div>
					<Card.Title>User Accounts</Card.Title>
					<Card.Description>Manage local user accounts</Card.Description>
				</div>
			</div>
		</Card.Header>
		<!-- Make the content area flex and grow to fill available space -->
		<Card.Content class="flex-1 flex flex-col">
			{#if users.length > 0}
				<!-- Make the table fill the available space -->
				<div class="flex-1 flex flex-col h-full">
					<UniversalTable {...tableProps} />
				</div>
			{:else}
				<div class="text-center py-8 text-muted-foreground italic">No local users found</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Create User Form -->
	<Card.Root class="border shadow-sm">
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<div class="bg-green-500/10 p-2 rounded-full">
					<UserPlus class="h-5 w-5 text-green-500" />
				</div>
				<div>
					<Card.Title>Create User</Card.Title>
					<Card.Description>Add a new local user account</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<form class="space-y-4" onsubmit={handleCreateUser}>
				<div class="space-y-2">
					<Label for="username">Username</Label>
					<Input id="username" name="username" bind:value={newUsername} required placeholder="Username" />
				</div>

				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input id="password" name="password" type="password" bind:value={newPassword} required placeholder="Password" />
				</div>

				<div class="space-y-2">
					<Label for="displayName">Display Name</Label>
					<Input id="displayName" name="displayName" bind:value={newDisplayName} placeholder="Display Name" />
				</div>

				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input id="email" name="email" type="email" bind:value={newEmail} placeholder="Email Address" />
				</div>

				<div class="space-y-2">
					<Label for="role">Role</Label>
					<select id="role" name="role" bind:value={newRole} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2">
						{#each roles as role}
							<option value={role.id}>{role.name}</option>
						{/each}
					</select>
				</div>

				<Button type="submit" class="w-full" disabled={isCreating}>
					{#if isCreating}
						<Loader2 class="h-4 w-4 mr-2 animate-spin" />
					{:else}
						<UserPlus class="h-4 w-4 mr-2" />
					{/if}
					Create User
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
