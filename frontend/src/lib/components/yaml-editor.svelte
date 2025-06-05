<script lang="ts">
	import CodeMirror from 'svelte-codemirror-editor';
	import { yaml } from '@codemirror/lang-yaml';
	import { linter, lintGutter } from '@codemirror/lint';
	import { browser } from '$app/environment';
	import jsyaml from 'js-yaml';
	import { coolGlow } from 'thememirror';
	import type { EditorView } from 'codemirror';

	let { value = $bindable(''), placeholder = 'Enter YAML content', readOnly = false } = $props();

	let editorView: EditorView;

	function yamlLinter(view: { state: { doc: { toString(): string } } }) {
		const diagnostics = [];
		try {
			jsyaml.load(view.state.doc.toString());
		} catch (e: unknown) {
			const err = e as { mark?: { position: number }; message: string };
			const start = err.mark?.position || 0;
			const end = err.mark?.position !== undefined ? Math.max(start + 1, err.mark.position + 1) : start + 1;
			diagnostics.push({
				from: start,
				to: end,
				severity: 'error' as const,
				message: err.message
			});
		}
		return diagnostics;
	}

	const lintExtension = linter(yamlLinter);
</script>

{#if browser}
	<div class="border rounded-md overflow-hidden">
		<CodeMirror
			bind:value
			on:ready={(e) => (editorView = e.detail)}
			lang={yaml()}
			theme={coolGlow}
			extensions={[lintGutter(), lintExtension]}
			styles={{
				'&': {
					height: '550px',
					fontSize: '12px',
					fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace'
				},
				'&.cm-editor[contenteditable=false]': {
					cursor: 'not-allowed'
				},
				'.cm-content[contenteditable=false]': {
					cursor: 'not-allowed'
				}
			}}
			{placeholder}
			readonly={readOnly}
			nodebounce={true}
		/>
	</div>
{/if}
