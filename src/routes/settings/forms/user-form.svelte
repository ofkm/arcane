<script lang="ts">
	import { z } from 'zod';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { createForm } from '$lib/utils/zodForm.util';
	import type { User, NewUser } from '$lib/types/user.type';
	import { getPasswordSchema } from '$lib/utils/form.utils';
	import type { AuthSettings } from '$lib/types/settings.type';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Loader2, Save, UserPlus } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	let {
		open = $bindable(false),
		callback,
		userToEdit = $bindable(),
		passwordPolicy,
		roles
	}: {
		open?: boolean;
		userToEdit?: User;
		callback: (user: NewUser) => Promise<boolean>;
		passwordPolicy?: AuthSettings['passwordPolicy'];
		roles: { id: string; name: string }[];
	} = $props();
	let isLoading = $state(false);
	let isEditMode = $derived(!!userToEdit);
	let selectedRole = $state('admin');
	let SubmitIcon = $derived(isEditMode ? Save : UserPlus);
	let submitButtonText = $derived(isEditMode ? 'Save Changes' : 'Create User');
	let dialogTitle = $derived(isEditMode ? 'Edit User' : 'Create User');

	const user = {
		displayName: userToEdit?.displayName || '',
		password: '',
		email: userToEdit?.email || '',
		username: userToEdit?.username || '',
		roles: userToEdit?.roles || ['admin']
	};

	const formSchema = z.object({
		username: z.string().min(2).max(50),
		password: getPasswordSchema(passwordPolicy ?? 'strong', isEditMode, user.password),
		displayName: z.string().min(1),
		email: z.string().min(1),
		roles: z.array(z.enum([...roles.map((role) => role.id)] as [string, ...string[]]))
	});
	type FormSchema = typeof formSchema;

	const { inputs, ...form } = createForm<FormSchema>(formSchema, user);
	async function onSubmit() {
		const data = form.validate();
		if (!data) return;
		isLoading = true;
		const success = await callback(data);
		if (success && !userToEdit) form.reset();
		isLoading = false;
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

		<form method="POST" onsubmit={onSubmit}>
			<fieldset>
				<div class="grid gap-5">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<FormInput label="Username" bind:input={$inputs.username} />
						</div>
						<div>
							<FormInput label="Password" type="password" bind:input={$inputs.password} />
						</div>
					</div>

					<FormInput label="Display Name" bind:input={$inputs.displayName} />

					<div class="grid grid-cols-2 gap-4">
						<div>
							<FormInput label="Email" bind:input={$inputs.email} />
						</div>
						<div>
							<Label class="mb-0" for="role">Role</Label>
							<Select.Root name="role" type="single" bind:value={selectedRole} disabled={true}>
								<Select.Trigger class="w-full mt-2">
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
					</div>

					<div class="mt-5 flex justify-end">
						<Button type="submit">
							{#if isLoading}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Creating...
							{:else}
								<SubmitIcon class="mr-2 h-4 w-4" />
								{submitButtonText}
							{/if}
						</Button>
					</div>
				</div>
			</fieldset>
		</form>
	</Dialog.Content>
</Dialog.Root>
