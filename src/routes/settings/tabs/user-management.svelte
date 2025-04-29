<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { UserPlus, UserX, UserCheck, Shield } from '@lucide/svelte';
	import type { PageData } from '../$types';
	import type { User } from '$lib/services/user-service';

	// Get data from server
	let { data } = $props<{ data: PageData }>();

	let users = $state<User[]>(data.users);

	// New user form state
	let newUsername = $state('');
	let newPassword = $state('');
	let newDisplayName = $state('');
	let newEmail = $state('');
	let newRole = $state('user'); // Default role
	let isCreating = $state(false);
	let loading = $state(true);

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
		event.preventDefault();

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
				users = [...users, result.user];
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
				users = users.filter((user: User) => user.id !== userId);
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
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
	<!-- User List -->
	<Card.Root class="border shadow-sm">
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
		<Card.Content>
			{#if loading}
				<div class="flex justify-center items-center py-8">
					<div class="loading loading-spinner loading-md"></div>
				</div>
			{:else if users.length > 0}
				<div class="space-y-4">
					{#each users as user}
						<div class="border rounded-md p-3 flex justify-between items-center">
							<div>
								<div class="font-medium">{user.displayName || user.username}</div>
								<div class="text-xs text-muted-foreground">{user.email || 'No email'}</div>
							</div>
							<div class="flex items-center gap-2">
								{#if user.roles?.includes('admin')}
									<div class="bg-amber-500/10 text-amber-600 text-xs px-2 py-0.5 rounded-full flex items-center">
										<Shield class="h-3 w-3 mr-1" />
										Admin
									</div>
								{/if}
								<Button variant="ghost" size="sm" onclick={() => handleRemoveUser(user.id, user.username)}>
									<UserX class="h-4 w-4 mr-1" />
									Remove
								</Button>
							</div>
						</div>
					{/each}
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
						<span class="loading loading-spinner loading-xs mr-2"></span>
					{/if}
					Create User
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
