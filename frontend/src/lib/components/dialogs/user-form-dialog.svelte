<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Loader2, UserPlus, Save } from '@lucide/svelte';
	import type { User } from '$lib/types/user.type';
	import { preventDefault } from '$lib/utils/form.utils';

	let {
		open = $bindable(false),
		userToEdit = $bindable<User | null>(null),
		roles = [],
		isLoading = $bindable(false),
		onSubmit = $bindable(() => {}),
		allowUsernameEdit = false
	}: {
		open?: boolean;
		userToEdit?: User | null;
		roles: { id: string; name: string }[];
		isLoading?: boolean;
		onSubmit?: (data: { user: Partial<User> & { password?: string }; isEditMode: boolean; userId?: string }) => void;
		allowUsernameEdit?: boolean;
	} = $props();

	let username = $state('');
	let password = $state('');
	let displayName = $state('');
	let email = $state('');
	let selectedRole = $state('user');
	let error = $state<string | null>(null);

	let isEditMode = $derived(!!userToEdit);
	let dialogTitle = $derived(isEditMode ? 'Edit User' : 'Create User');
	let submitButtonText = $derived(isEditMode ? 'Save Changes' : 'Create User');
	let SubmitIcon = $derived(isEditMode ? Save : UserPlus);
	let canEditUsername = $derived(!isEditMode || allowUsernameEdit);

	$effect(() => {
		if (open) {
			error = null;
			if (userToEdit) {
				username = userToEdit.username;
				password = '';
				displayName = userToEdit.displayName || '';
				email = userToEdit.email || '';
				selectedRole = userToEdit.roles?.[0] || 'admin';
			} else {
				username = '';
				password = '';
				displayName = '';
				email = '';
				selectedRole = 'admin';
			}
		}
	});

	async function handleSubmit() {
		if (isLoading) return;
		error = null;

		const userData: Partial<User> & { password?: string } = {
			username,
			displayName,
			email,
			roles: [selectedRole]
		};

		if (!isEditMode || (isEditMode && password)) {
			userData.password = password;
		}

		try {
			onSubmit({ user: userData, isEditMode, userId: userToEdit?.id });
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
			error = errorMessage;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>{dialogTitle}</Dialog.Title>
			{#if !isEditMode}
				<Dialog.Description>Enter the details for the new user.</Dialog.Description>
			{/if}
		</Dialog.Header>

		<form class="grid gap-4 py-4" onsubmit={preventDefault(handleSubmit)} autocomplete="off">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="username" class="text-right">Username</Label>
				<Input autocomplete="off" id="username" bind:value={username} required class="col-span-3" disabled={!canEditUsername} />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="password" class="text-right">Password</Label>
				<Input autocomplete="off" id="password" type="password" bind:value={password} required={!isEditMode} placeholder={isEditMode ? 'Leave blank to keep current' : 'Required'} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="displayName" class="text-right">Display Name</Label>
				<Input autocomplete="off" id="displayName" bind:value={displayName} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="email" class="text-right">Email</Label>
				<Input autocomplete="off" id="email" type="email" bind:value={email} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="role" class="text-right">Role</Label>
				<Select.Root name="role" type="single" bind:value={selectedRole} disabled={true}>
					<Select.Trigger class="col-span-3">
						<span>{roles.find((r) => r.id === selectedRole)?.name || 'Select a role'}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							{#each roles as role (role.id)}
								<Select.Item value={role.id}>{role.name}</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</div>

			{#if error}
				<p class="text-sm text-destructive text-center col-span-4">{error}</p>
			{/if}

			<Dialog.Footer>
				<Button type="button" class="arcane-button-cancel" variant="outline" onclick={() => (open = false)} disabled={isLoading}>Cancel</Button>
				<Button type="submit" class="arcane-button-create" disabled={isLoading}>
					{#if isLoading}
						<Loader2 class="animate-spin size-4" />
						Creating...
					{:else}
						<SubmitIcon class="size-4" />
						{submitButtonText}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
