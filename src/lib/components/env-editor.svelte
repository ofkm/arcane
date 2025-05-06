<script lang="ts">
	import CodeMirror from 'svelte-codemirror-editor';
	import { browser } from '$app/environment';
	import { coolGlow } from 'thememirror';
	import { StreamLanguage } from '@codemirror/language';
	import { properties } from '@codemirror/legacy-modes/mode/properties';

	let { value = $bindable(''), placeholder = '# Add environment variables here', readOnly = false } = $props();
</script>

{#if browser}
	<div class="border rounded-md overflow-hidden">
		<CodeMirror
			bind:value
			theme={coolGlow}
			extensions={[StreamLanguage.define(properties)]}
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
