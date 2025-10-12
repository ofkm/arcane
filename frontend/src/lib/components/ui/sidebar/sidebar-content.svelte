<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="sidebar-content"
	data-sidebar="content"
	class={cn(
		'flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:group-data-[hovered=true]:overflow-x-hidden group-data-[collapsible=icon]:group-data-[hovered=true]:overflow-y-auto',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
