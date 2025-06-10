<script lang="ts">
	import type { HTMLTableAttributes } from 'svelte/elements';
	import type { WithElementRef } from '$lib/utils.js';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLTableAttributes> = $props();
</script>

<div class="relative w-full overflow-auto">
	<table
		bind:this={ref}
		class={cn('w-full table-fixed caption-bottom text-sm', className)}
		{...restProps}
	>
		{@render children?.()}
	</table>
</div>
