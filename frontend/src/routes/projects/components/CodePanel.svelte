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

<div class="flex items-center justify-between px-4 py-2">
	<h3 class="text-sm font-semibold">{title}</h3>
</div>
<div class="h-[560px] w-full overflow-hidden px-4 pb-4">
	<CodeEditor bind:value {language} {placeholder} />
	{#if error}
		<p class="text-destructive mt-2 text-xs">{error}</p>
	{/if}
</div>
