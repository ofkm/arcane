<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import CodeEditor from '$lib/components/code-editor/editor.svelte';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import { ArcaneCard, ArcaneCardHeader } from '$lib/components/arcane-card';

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

<ArcaneCard>
	<ArcaneCardHeader icon={FileTextIcon} class="items-center">
		<Card.Title>{title}</Card.Title>
	</ArcaneCardHeader>
	<Card.Content class="p-0">
		<div class="min-h-[500px] w-full overflow-hidden [&_.cm-content]:text-xs sm:[&_.cm-content]:text-sm">
			<CodeEditor bind:value {language} {placeholder} height="full" class="rounded-t-none rounded-b-xl" />
			{#if error}
				<p class="text-destructive mt-2 text-xs">{error}</p>
			{/if}
		</div>
	</Card.Content>
</ArcaneCard>
