<script lang="ts">
	import CodeMirror from 'svelte-codemirror-editor';
	import { EditorView } from '@codemirror/view';
	import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
	import { tags } from '@lezer/highlight';
	import { browser } from '$app/environment';
	import { coolGlow } from 'thememirror';
	import type { EditorView as EditorViewType } from 'codemirror';

	// Make value bindable
	let { value = $bindable(''), placeholder = '# Add environment variables here', readOnly = false } = $props();

	let editorView: EditorViewType;

	// Custom syntax highlighting for environment variables
	const envHighlighting = HighlightStyle.define([
		{
			tag: tags.comment,
			color: '#676b79'
		},
		{
			tag: tags.variableName,
			color: '#4d9375',
			fontWeight: 'bold'
		},
		{
			tag: tags.string,
			color: '#c98a7d'
		}
	]);

	// Simple highlighting for KEY=value pattern
	const envSyntaxHighlighter = EditorView.updateListener.of((update) => {
		if (!update.docChanged) return;

		const doc = update.state.doc;
		const decorations = [];

		for (let i = 1; i <= doc.lines; i++) {
			const line = doc.line(i);
			const text = line.text;

			// Skip empty lines or comments
			if (!text.trim() || text.trim().startsWith('#')) continue;

			// Try to match KEY=value pattern
			const eqIndex = text.indexOf('=');
			if (eqIndex > 0) {
				const keyLength = eqIndex;

				// Add a class to the key part
				decorations.push({
					from: line.from,
					to: line.from + keyLength,
					className: 'env-key'
				});

				// Add a class to the value part if it exists
				if (eqIndex < text.length - 1) {
					decorations.push({
						from: line.from + eqIndex + 1,
						to: line.to,
						className: 'env-value'
					});
				}
			}
		}
	});
</script>

{#if browser}
	<div class="border rounded-md overflow-hidden">
		<CodeMirror
			bind:value
			on:ready={(e) => (editorView = e.detail)}
			theme={coolGlow}
			extensions={[syntaxHighlighting(envHighlighting), envSyntaxHighlighter]}
			styles={{
				'&': {
					height: '550px',
					fontSize: '14px',
					fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace'
				},
				'&.cm-editor[contenteditable=false]': {
					cursor: 'not-allowed'
				},
				'.cm-content[contenteditable=false]': {
					cursor: 'not-allowed'
				},
				'.cm-line': {
					padding: '2px 4px'
				}
			}}
			{placeholder}
			readonly={readOnly}
			nodebounce={true}
		/>
	</div>
{/if}

<style>
	:global(.env-key) {
		color: #4d9375;
		font-weight: bold;
	}
	:global(.env-value) {
		color: #c98a7d;
	}
	:global(.cm-line) {
		/* Improve readability for ENV file */
		line-height: 1.5;
	}
</style>
