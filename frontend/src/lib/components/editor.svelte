<script lang="ts">
	import CodeMirror from 'svelte-codemirror-editor';
	import { browser } from '$app/environment';
	import { yaml } from '@codemirror/lang-yaml';
	import { StreamLanguage } from '@codemirror/language';
	import { properties } from '@codemirror/legacy-modes/mode/properties';
	import { linter, lintGutter } from '@codemirror/lint';
	import jsyaml from 'js-yaml';
	import { githubDark } from '@uiw/codemirror-theme-github';
	import type { EditorView } from 'codemirror';
	import type { Extension } from '@codemirror/state';

	type CodeLanguage = 'yaml' | 'env';

	let {
		value = $bindable(''),
		language = 'yaml' as CodeLanguage,
		placeholder = 'Enter code...',
		readOnly = false,
		height = '550px',
		fontSize = '11px'
	} = $props();

	let editorView: EditorView;

	function getLanguageExtension(lang: CodeLanguage): Extension[] {
		const extensions: Extension[] = [];

		switch (lang) {
			case 'yaml':
				extensions.push(yaml());
				if (!readOnly) {
					extensions.push(lintGutter(), linter(yamlLinter));
				}
				break;
			case 'env':
				extensions.push(StreamLanguage.define(properties));
				break;
		}

		return extensions;
	}

	function yamlLinter(view: { state: { doc: { toString(): string } } }) {
		const diagnostics = [];
		try {
			jsyaml.load(view.state.doc.toString());
		} catch (e: unknown) {
			const err = e as { mark?: { position: number }; message: string };
			const start = err.mark?.position || 0;
			const end =
				err.mark?.position !== undefined ? Math.max(start + 1, err.mark.position + 1) : start + 1;
			diagnostics.push({
				from: start,
				to: end,
				severity: 'error' as const,
				message: err.message
			});
		}
		return diagnostics;
	}
</script>

{#if browser}
	<div class="overflow-hidden rounded-md border">
		<CodeMirror
			bind:value
			on:ready={(e) => (editorView = e.detail)}
			theme={githubDark}
			extensions={getLanguageExtension(language)}
			styles={{
				'&': {
					height,
					fontSize
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
