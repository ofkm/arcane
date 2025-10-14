<script lang="ts">
	import CodeMirror from 'svelte-codemirror-editor';
	import { yaml } from '@codemirror/lang-yaml';
	import { StreamLanguage } from '@codemirror/language';
	import { properties } from '@codemirror/legacy-modes/mode/properties';
	import { linter, lintGutter } from '@codemirror/lint';
	import jsyaml from 'js-yaml';
	import { arcaneDarkInit } from './theme';
	import type { EditorView } from '@codemirror/view';
	import type { Extension } from '@codemirror/state';
	import type { Diagnostic, LintSource } from '@codemirror/lint';
	import { m } from '$lib/paraglide/messages';
	import configStore from '$lib/stores/config-store';

	type CodeLanguage = 'yaml' | 'env';

	let {
		value = $bindable(''),
		language = 'yaml' as CodeLanguage,
		placeholder = m.editor_placeholder(),
		readOnly = false,
		fontSize = '12px'
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

	const theme = $derived.by(() => {
		$configStore;
		return arcaneDarkInit();
	});

	const extensions = $derived([...getLanguageExtension(language), theme]);

	const styles = $derived({
		'&': {
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

<CodeMirror
	bind:value
	onready={(view) => handleReady(view)}
	{extensions}
	{styles}
	{placeholder}
	readonly={readOnly}
	nodebounce={true}
/>

<style>
	:global(.cm-editor) {
		height: 100%;
	}
	:global(.codemirror-wrapper) {
		height: 100%;
	}
	:global(.cm-editor .cm-scroller) {
		overflow: auto;
	}
	:global(.cm-editor .cm-gutters) {
		background-color: #18181b;
		border-right: none;
	}
	:global(.cm-editor .cm-activeLineGutter) {
		background-color: #2c313a;
		color: #e5e7eb;
	}
</style>
