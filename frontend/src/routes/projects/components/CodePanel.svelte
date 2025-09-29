<script lang="ts">
	import CodeEditor from '$lib/components/code-editor/editor.svelte';

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

<div class="flex items-center justify-between py-2">
	<h3 class="text-xs font-semibold sm:text-sm">{title}</h3>
</div>
<div class="min-h-[560px] w-full overflow-hidden pb-4 [&_.cm-content]:text-xs sm:[&_.cm-content]:text-sm">
	<CodeEditor bind:value {language} {placeholder} height="full" />
	{#if error}
		<p class="text-destructive mt-2 text-xs">{error}</p>
	{/if}
</div>
