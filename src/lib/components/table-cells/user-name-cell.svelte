<script lang="ts">
	import { User } from '@lucide/svelte';
	interface Props {
		displayName?: string;
		username?: string;
	}

	let { displayName = '', username = '' }: Props = $props();
</script>

<div class="flex items-start gap-2">
	<div class="bg-primary/10 rounded-full p-2 flex-shrink-0">
		<User class="h-4 w-4 text-primary" />
	</div>
	<div>
		<div class="font-medium">{displayName || username}</div>
		<div class="text-xs text-muted-foreground">{username}</div>
	</div>
</div>
