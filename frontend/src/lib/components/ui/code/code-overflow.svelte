<!--
	Installed from @ieedan/shadcn-svelte-extras
-->

<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { useCodeOverflow } from './code.svelte.js';
	import { box } from 'svelte-toolbelt';
	import type { CodeOverflowProps } from './types';
	import { cn } from '$lib/utils/utils';

	let {
		collapsed = $bindable(true),
		class: className,
		children,
		...props
	}: CodeOverflowProps = $props();

	const state = useCodeOverflow({
		collapsed: box.with(
			() => collapsed,
			(v) => (collapsed = v)
		)
	});
</script>

<div
	{...props}
	data-code-overflow
	data-collapsed={collapsed}
	class={cn('relative overflow-y-hidden data-[collapsed=true]:max-h-[300px]', className)}
>
	{@render children?.()}
	{#if collapsed}
		<div
			class="from-background absolute bottom-0 left-0 z-10 h-full w-full bg-gradient-to-t to-transparent"
		></div>
	{/if}
	{#if collapsed}
		<Button
			variant="secondary"
			size="sm"
			class="absolute bottom-2 left-1/2 z-20 w-fit -translate-x-1/2"
			onclick={state.toggleCollapsed}
		>
			Expand
		</Button>
	{/if}
</div>
