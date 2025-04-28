<script lang="ts">
	import StatusBadge from './status-badge.svelte';
	import NameCell from './name-cell.svelte';

	interface Props {
		name: string;
		inUse: boolean | undefined;
		link?: string;
	}

	let { name, inUse, link }: Props = $props();
</script>

<div class="flex items-center gap-2">
	<NameCell {name} {link} />
	{#if !inUse}
		<StatusBadge text="Unused" variant="amber" />
	{/if}
</div>
