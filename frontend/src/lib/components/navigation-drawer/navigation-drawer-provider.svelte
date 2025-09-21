<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { setNavigationDrawer } from './context.svelte.js';
	import type { Snippet } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		style,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		children: Snippet;
	} = $props();

	const navigationDrawer = setNavigationDrawer({});
</script>

<div
	bind:this={ref}
	data-slot="navigation-drawer-wrapper"
	class={cn('relative', className)}
	style={style}
	{...restProps}
>
	{@render children()}
</div>
