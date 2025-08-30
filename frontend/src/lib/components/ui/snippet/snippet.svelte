<!--
	Installed from @ieedan/shadcn-svelte-extras
-->

<script lang="ts" module>
	import { cn } from '$lib/utils';
	import { tv, type VariantProps } from 'tailwind-variants';
	import { CopyButton } from '$lib/components/ui/copy-button';
	import type { UseClipboard } from '$lib/hooks/use-clipboard.svelte';

	const style = tv({
		base: 'bg-background relative w-full max-w-full rounded-md border py-2.5 pr-12 pl-3',
		variants: {
			variant: {
				default: 'border-border bg-card',
				secondary: 'border-border bg-accent',
				destructive: 'border-destructive bg-destructive',
				primary: 'border-primary bg-primary text-primary-foreground'
			}
		}
	});

	type Variant = VariantProps<typeof style>['variant'];

	export type SnippetProps = {
		variant?: Variant;
		text: string | string[];
		class?: string;
		onCopy?: (status: UseClipboard['status']) => void;
	};
</script>

<script lang="ts">
	let { text, variant = 'default', onCopy, class: className }: SnippetProps = $props();
</script>

<div class={cn(style({ variant, className: className }))}>
	{#if typeof text == 'string'}
		<pre class={cn('overflow-y-auto whitespace-nowrap text-left font-mono text-sm font-light')}>
			{text}
		</pre>
	{:else}
		{#each text as line, i (i)}
			<pre class={cn('overflow-y-auto whitespace-nowrap text-left font-mono text-sm font-light')}>
			{line}
		</pre>
		{/each}
	{/if}

	<CopyButton
		class="absolute right-2 top-1/2 size-7 -translate-y-1/2 transition-opacity ease-in-out hover:bg-transparent hover:text-opacity-80 dark:hover:bg-transparent"
		text={typeof text === 'string' ? text : text.join('\n')}
		{onCopy}
	/>
</div>
