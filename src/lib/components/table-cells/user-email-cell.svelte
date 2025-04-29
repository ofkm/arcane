<script lang="ts">
	import { Mail } from '@lucide/svelte';
	interface Props {
		email?: string;
	}

	let { email = '' }: Props = $props();
</script>

<div class="flex items-center gap-1.5">
	<Mail class="h-3.5 w-3.5 text-muted-foreground" />
	<span>{email || 'No email'}</span>
</div>
