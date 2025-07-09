<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import { Loader2, UserPlus, Save } from '@lucide/svelte';
	import type { User } from '$lib/types/user.type';
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';

	type UserFormProps = {
		open: boolean;
		userToEdit: User | null;
		roles: { id: string; name: string }[];
		onSubmit: (data: {
			user: Partial<User> & { password?: string };
			isEditMode: boolean;
			userId?: string;
		}) => void;
		isLoading: boolean;
		allowUsernameEdit?: boolean;
	};

	let {
		open = $bindable(false),
		userToEdit = $bindable(),
		roles,
		onSubmit,
		isLoading,
		allowUsernameEdit = false
	}: UserFormProps = $props();

	let isEditMode = $derived(!!userToEdit);
	let canEditUsername = $derived(!isEditMode || allowUsernameEdit);
	let SubmitIcon = $derived(isEditMode ? Save : UserPlus);

	const formSchema = z.object({
		username: z.string().min(1, 'Username is required'),
		password: z.string().optional(),
		displayName: z.string().optional(),
		email: z.string().email('Invalid email format').optional().or(z.literal('')),
		isAdmin: z.boolean().default(false)
	});

	let formData = $derived({
		username: userToEdit?.Username || '',
		password: '',
		displayName: userToEdit?.DisplayName || '',
		email: userToEdit?.Email || '',
		isAdmin: Boolean(userToEdit?.Roles?.includes('admin'))
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	function handleSubmit() {
		const data = form.validate();
		if (!data) return;

		const userData: Partial<User> & { password?: string } = {
			Username: data.username,
			DisplayName: data.displayName,
			Email: data.email,
			Roles: [data.isAdmin ? 'admin' : 'user']
		};

		// Only include password if it's provided (for create) or if editing and password is not empty
		if (!isEditMode || (isEditMode && data.password)) {
			userData.password = data.password;
		}

		onSubmit({ user: userData, isEditMode, userId: userToEdit?.ID });
	}

	function handleOpenChange(newOpenState: boolean) {
		open = newOpenState;
		if (!newOpenState) {
			userToEdit = null;
		}
	}
</script>

<Sheet.Root bind:open onOpenChange={handleOpenChange}>
	<Sheet.Content class="p-6">
		<Sheet.Header class="space-y-3 pb-6 border-b">
			<div class="flex items-center gap-3">
				<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
					<SubmitIcon class="size-5 text-primary" />
				</div>
				<div>
					<Sheet.Title class="text-xl font-semibold">
						{isEditMode ? 'Edit User' : 'Create New User'}
					</Sheet.Title>
					<Sheet.Description class="text-sm text-muted-foreground mt-1">
						{isEditMode
							? `Update the details for ${userToEdit?.Username || 'this user'}`
							: 'Add a new user to your system with the required permissions'}
					</Sheet.Description>
				</div>
			</div>
		</Sheet.Header>

		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-6">
			<FormInput
				label="Username *"
				type="text"
				description="Unique username for the user"
				disabled={!canEditUsername}
				bind:input={$inputs.username}
			/>
			<FormInput
				label={isEditMode ? 'Password' : 'Password *'}
				type="password"
				placeholder={isEditMode ? 'Leave empty to keep current password' : 'Enter password'}
				description={isEditMode
					? 'Leave empty to keep current password'
					: 'Password for the user account'}
				bind:input={$inputs.password}
			/>
			<FormInput
				label="Display Name"
				type="text"
				placeholder="Full name or display name"
				description="Optional display name for the user"
				bind:input={$inputs.displayName}
			/>
			<FormInput
				label="Email"
				type="email"
				placeholder="user@example.com"
				description="Email address for the user"
				bind:input={$inputs.email}
			/>
			<SwitchWithLabel
				id="isAdminSwitch"
				label="Administrator"
				description="Grant administrator privileges to this user"
				bind:checked={$inputs.isAdmin.value}
			/>

			<Sheet.Footer class="flex flex-row gap-2">
				<Button
					type="button"
					class="arcane-button-cancel flex-1"
					variant="outline"
					onclick={() => (open = false)}
					disabled={isLoading}>Cancel</Button
				>
				<Button type="submit" class="arcane-button-create flex-1" disabled={isLoading}>
					{#if isLoading}
						<Loader2 class="mr-2 size-4 animate-spin" />
					{/if}
					<SubmitIcon class="mr-2 size-4" />
					{isEditMode ? 'Save Changes' : 'Create User'}
				</Button>
			</Sheet.Footer>
		</form>
	</Sheet.Content>
</Sheet.Root>
