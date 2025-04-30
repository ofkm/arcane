<script lang="ts">
	import { Ellipsis, Pencil, UserX } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { User } from '$lib/types/user.type';

	interface Props {
		userId: string;
		username: string;
		user: User;
		onRemove: (userId: string, username: string) => void;
		onEdit: (user: User) => void;
	}

	let { userId, user, username, onRemove, onEdit }: Props = $props();

	function handleRemove() {
		onRemove(userId, username);
	}

	function handleEdit() {
		onEdit(user);
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<Button variant="ghost" size="icon" class="h-8 w-8">
			<Ellipsis class="h-4 w-4" />
			<span class="sr-only">Open menu</span>
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Group>
			<DropdownMenu.Item onclick={handleEdit}>
				<Pencil class="h-4 w-4" />
				Edit
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={handleRemove} class="text-red-500 focus:!text-red-700">
				<UserX class="h-4 w-4" />
				Remove User
			</DropdownMenu.Item>
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
