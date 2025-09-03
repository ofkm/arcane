<script lang="ts">
	import CodeMirror from 'svelte-codemirror-editor';
	import { yaml } from '@codemirror/lang-yaml';
	import { StreamLanguage } from '@codemirror/language';
	import { properties } from '@codemirror/legacy-modes/mode/properties';
	import { linter, lintGutter } from '@codemirror/lint';
	import jsyaml from 'js-yaml';
	import { githubDark } from '@uiw/codemirror-theme-github';
	import { arcaneDark } from './theme';
	import type { EditorView } from '@codemirror/view';
	import type { Extension } from '@codemirror/state';
	import type { Diagnostic, LintSource } from '@codemirror/lint';
	import { mode } from 'mode-watcher';

	type CodeLanguage = 'yaml' | 'env';

	let {
		value = $bindable(''),
		language = 'yaml' as CodeLanguage,
		placeholder = 'Enter code...',
		readOnly = false,
		height = '550px',
		fontSize = '11px',
		class: className = ''
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

	const yamlLinter: LintSource = (view): Diagnostic[] => {
		const diagnostics: Diagnostic[] = [];
		try {
			jsyaml.load(view.state.doc.toString());
		} catch (e: unknown) {
			const err = e as { mark?: { position: number }; message: string };
			const start = err.mark?.position || 0;
			const end = err.mark?.position !== undefined ? Math.max(start + 1, err.mark.position + 1) : start + 1;
			diagnostics.push({
				from: start,
				to: end,
				severity: 'error',
				message: err.message
			});
		}
		return diagnostics;
	};

	const extensions = $derived([...getLanguageExtension(language), arcaneDark]);

	const styles = $derived({
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
	});

	function handleReady(view: EditorView) {
		editorView = view;
	}
</script>

<div class={`overflow-hidden rounded-md border ${className}`}>
	<CodeMirror
		bind:value
		on:ready={(view) => handleReady(view.detail)}
		{extensions}
		{styles}
		{placeholder}
		readonly={readOnly}
		nodebounce={true}
	/>
</div>

<style>
	:global(.cm-editor .cm-gutters) {
		background-color: #18181b;
		border-right: none;
	}
	:global(.cm-editor .cm-activeLineGutter) {
		background-color: #2c313a;
		color: #e5e7eb;
	}
</style>
