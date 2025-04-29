<script lang="ts">
	import { Ellipsis, Pencil, UserX } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	interface Props {
		userId: string;
		username: string;
		onRemove: (userId: string, username: string) => void;
	}

	let { userId, username, onRemove }: Props = $props();

	function handleRemove() {
		onRemove(userId, username);
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
			<DropdownMenu.Item>
				<Pencil class="w-4 h-4" />
				Edit
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={handleRemove} class="text-red-500 focus:!text-red-700">
				<UserX class="h-4 w-4" />
				Remove User
			</DropdownMenu.Item>
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
