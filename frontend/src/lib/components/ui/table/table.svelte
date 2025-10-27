<script lang="ts">
	import type { HTMLTableAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLTableAttributes> = $props();
</script>

<div data-slot="table-container" class="glass-table relative flex h-full w-full min-w-0 flex-col overflow-x-auto">
	<table bind:this={ref} data-slot="table" class={cn('w-full min-w-full caption-bottom text-sm', className)} {...restProps}>
		{@render children?.()}
	</table>
</div>
