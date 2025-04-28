<script lang="ts">
	interface Props {
		name: string;
		link?: string;
	}

	let { name, link }: Props = $props();
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
</div>
