<!--
	Installed from @ieedan/shadcn-svelte-extras
-->

<script lang="ts">
	import { cn } from '$lib/utils/utils';
	import { codeVariants } from '.';
	import type { CodeRootProps } from './types';
	import { useCode } from './code.svelte.js';
	import { box } from 'svelte-toolbelt';

	let {
		ref = $bindable(null),
		variant = 'default',
		lang = 'typescript',
		code,
		class: className,
		hideLines = false,
		highlight = [],
		children,
		...rest
	}: CodeRootProps = $props();

	const codeState = useCode({
		code: box.with(() => code),
		hideLines: box.with(() => hideLines),
		highlight: box.with(() => highlight),
		lang: box.with(() => lang)
	});
</script>

<div {...rest} bind:this={ref} class={cn(codeVariants({ variant }), className)}>
	{@html codeState.highlighted}
	{@render children?.()}
</div>

<style>
	@reference '../../../../app.css';

	:global(.dark) {
		:global(.shiki, .shiki span) {
			color: var(--shiki-dark) !important;
			font-style: var(--shiki-dark-font-style) !important;
			font-weight: var(--shiki-dark-font-weight) !important;
			text-decoration: var(--shiki-dark-text-decoration) !important;
		}
	}

	/* Shiki see: https://shiki.matsu.io/guide/dual-themes#class-based-dark-mode */
	:global(html.dark .shiki, html.dark .shiki span) {
		color: var(--shiki-dark) !important;
		font-style: var(--shiki-dark-font-style) !important;
		font-weight: var(--shiki-dark-font-weight) !important;
		text-decoration: var(--shiki-dark-text-decoration) !important;
	}

	:global(pre.shiki) {
		@apply overflow-x-auto rounded-lg bg-inherit py-4 text-sm;
	}

	:global(pre.shiki:not([data-code-overflow] *):not([data-code-overflow])) {
		@apply overflow-y-auto;
		max-height: min(100%, 650px);
	}

	:global(pre.shiki code) {
		@apply grid min-w-full rounded-none border-0 bg-transparent p-0 break-words;
		counter-reset: line;
		box-decoration-break: clone;
	}

	:global(pre.line-numbers) {
		counter-reset: step;
		counter-increment: step 0;
	}

	:global(pre.line-numbers .line::before) {
		content: counter(step);
		counter-increment: step;
		display: inline-block;
		width: 1.8rem;
		margin-right: 1.4rem;
		text-align: right;
	}

	:global(pre.line-numbers .line::before) {
		@apply text-muted-foreground;
	}

	:global(pre .line.line--highlighted) {
		@apply bg-secondary;
	}

	:global(pre .line.line--highlighted span) {
		@apply relative;
	}

	:global(pre .line) {
		@apply inline-block min-h-4 w-full px-4 py-0.5;
	}

	:global(pre.line-numbers .line) {
		@apply px-2;
	}
</style>
