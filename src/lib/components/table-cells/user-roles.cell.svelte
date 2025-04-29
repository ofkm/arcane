<script lang="ts">
	import { Shield } from '@lucide/svelte';
	interface Props {
		roles?: string[];
	}

	let { roles = [] }: Props = $props();
</script>

<div class="flex flex-wrap">
	{#each roles as role}
		{@const isAdmin = role === 'admin'}
		<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {isAdmin ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'} mr-1 mb-1">
			{#if isAdmin}
				<Shield class="h-3 w-3 mr-1" />
			{/if}
			{role}
		</span>
	{/each}
</div>
