<script lang="ts">
	import { Shield } from '@lucide/svelte';
	import StatusBadge from '../badges/status-badge.svelte';
	interface Props {
		roles?: string[];
	}

	let { roles = [] }: Props = $props();
</script>

<div class="flex flex-wrap">
	{#each roles as role}
		{@const isAdmin = role === 'admin'}
		<StatusBadge text={isAdmin ? 'Admin' : 'User'} variant={isAdmin ? 'amber' : 'blue'} />
	{/each}
</div>
