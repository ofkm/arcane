<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import CodeEditor from '$lib/components/code-editor/editor.svelte';
	import FileTextIcon from '@lucide/svelte/icons/file-text';

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

<Card.Root class="gap-0 p-0">
	<Card.Header class="bg-muted rounded-t-xl p-4">
		<Card.Title class="flex items-center gap-2 text-lg">
			<FileTextIcon class="text-primary size-5" />
			{title}
		</Card.Title>
	</Card.Header>
	<Card.Content class="p-0">
		<div class="min-h-[500px] w-full overflow-hidden [&_.cm-content]:text-xs sm:[&_.cm-content]:text-sm">
			<CodeEditor bind:value {language} {placeholder} height="full" class="rounded-t-none rounded-b-xl" />
			{#if error}
				<p class="text-destructive mt-2 text-xs">{error}</p>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
