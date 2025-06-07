<script lang="ts">
	import type { HTMLTdAttributes } from 'svelte/elements';
	import type { WithElementRef } from '$lib/utils.js';
	import { cn } from '$lib/utils.js';

	let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLTdAttributes> = $props();
</script>

<td bind:this={ref} class={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0 truncate overflow-hidden whitespace-nowrap text-ellipsis', className)} {...restProps}>
	{@render children?.()}
</td>
