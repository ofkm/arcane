<script lang="ts">
	import StatusBadge from './status-badge.svelte';

	interface Props {
		name: string;
		inUse: boolean | undefined;
		link?: string;
	}

	let { name, inUse, link }: Props = $props();
</script>

<div class="flex items-center gap-2">
	{#if link}
		<span class="truncate">
			<a class="font-medium hover:underline" href={link}>
				{name}
			</a>
		</span>
	{:else}
		<span class="truncate">{name}</span>
	{/if}
	{#if !inUse}
		<StatusBadge text="Unused" variant="amber" />
	{/if}
</div>
