<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { useNavigationDrawer } from './context.svelte.js';
	import type { Snippet } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		style,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLElement>> & {
		children: Snippet;
	} = $props();

	const navigationDrawer = useNavigationDrawer();
	let currentHeight = $state(0);

	// Update the context whenever the height changes
	$effect(() => {
		navigationDrawer.setHeight(currentHeight);
	});
</script>

<nav
	bind:this={ref}
	bind:clientHeight={currentHeight}
	data-slot="navigation-drawer"
	class={cn(
		'fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/50 pb-safe',
		className
	)}
	style={style}
	{...restProps}
>
	{@render children()}
</nav>
