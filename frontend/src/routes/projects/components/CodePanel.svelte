<script lang="ts">
	import CodeEditor from '$lib/components/code-editor/editor.svelte';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import {
		ArcaneCard,
		ArcaneCardHeader,
		ArcaneCardContent,
		ArcaneCardTitle
	} from '$lib/components/arcane-card';

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

<ArcaneCard class="gap-0 p-0">
	<ArcaneCardHeader icon={FileTextIcon}>
		<ArcaneCardTitle>{title}</ArcaneCardTitle>
	</ArcaneCardHeader>
	<ArcaneCardContent class="p-0">
		<div class="min-h-[500px] w-full overflow-hidden [&_.cm-content]:text-xs sm:[&_.cm-content]:text-sm">
			<CodeEditor bind:value {language} {placeholder} height="full" class="rounded-t-none rounded-b-xl" />
			{#if error}
				<p class="text-destructive mt-2 text-xs">{error}</p>
			{/if}
		</div>
	</ArcaneCardContent>
</ArcaneCard>
