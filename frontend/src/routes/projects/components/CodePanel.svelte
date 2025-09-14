<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import CodeEditor from '$lib/components/code-editor/editor.svelte';
	import { m } from '$lib/paraglide/messages';

	type CodeLanguage = 'yaml' | 'env';

	let {
		title,
		open = $bindable(),
		language,
		value = $bindable(),
		placeholder,
		error
	}: {
		title: string;
		open: boolean;
		language: CodeLanguage;
		value: string;
		placeholder?: string;
		error?: string;
	} = $props();
</script>

<Collapsible.Root bind:open class="rounded-lg border">
	<div class="flex items-center justify-between px-4 py-2">
		<h3 class="text-sm font-semibold">{title}</h3>
		<Collapsible.Trigger>
			<Button variant="ghost" size="sm">{open ? m.common_hide() : 'Show'}</Button>
		</Collapsible.Trigger>
	</div>
	<Collapsible.Content>
		<div class="h-[560px] w-full overflow-hidden px-4 pb-4">
			<CodeEditor bind:value {language} {placeholder} />
			{#if error}
				<p class="text-destructive mt-2 text-xs">{error}</p>
			{/if}
		</div>
	</Collapsible.Content>
</Collapsible.Root>
