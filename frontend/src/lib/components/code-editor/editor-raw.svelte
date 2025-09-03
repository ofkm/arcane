<script lang="ts" module>
	export type ThemeSpec = Record<string, StyleSpec>;
	export type StyleSpec = {
		[propOrSelector: string]: string | number | StyleSpec | null;
	};
</script>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { basicSetup } from 'codemirror';
	import { EditorView, keymap, placeholder as placeholderExt } from '@codemirror/view';
	import { EditorState, StateEffect, type Extension } from '@codemirror/state';
	import { indentWithTab } from '@codemirror/commands';
	import { indentUnit, type LanguageSupport, foldGutter, foldKeymap } from '@codemirror/language';
	import { lineNumbers, highlightActiveLineGutter } from '@codemirror/view';

	interface Props {
		class?: string;
		value?: string | null | undefined;
		basic?: boolean;
		lang?: LanguageSupport | null | undefined;
		theme?: Extension | null | undefined;
		extensions?: Extension[];
		useTab?: boolean;
		tabSize?: number;
		styles?: ThemeSpec | null | undefined;
		lineWrapping?: boolean;
		editable?: boolean;
		readonly?: boolean;
		placeholder?: string | HTMLElement | null | undefined;
		nodebounce?: boolean;

		onReady?: (view: EditorView) => void;
		onChange?: (value: string) => void;
		onReconfigure?: (view: EditorView) => void;
	}

	function debounce<T extends (...args: any[]) => any>(func: T, threshold: number, execAsap = false): T {
		let timeout: any;
		return function debounced(this: any, ...args: any[]): any {
			const self = this;
			if (timeout) clearTimeout(timeout);
			else if (execAsap) func.apply(self, args);
			timeout = setTimeout(delayed, threshold || 100);
			function delayed(): void {
				if (!execAsap) func.apply(self, args);
				timeout = null;
			}
		} as T;
	}

	let {
		class: classes = '',
		value = $bindable(''),
		basic = true,
		lang = undefined,
		theme = undefined,
		extensions = [],
		useTab = true,
		tabSize = 2,
		styles = undefined,
		lineWrapping = false,
		editable = true,
		readonly = false,
		placeholder = undefined,
		nodebounce = false,
		onReady = undefined,
		onChange = undefined,
		onReconfigure = undefined
	}: Props = $props();

	const is_browser = typeof window !== 'undefined';

	let element: HTMLDivElement | undefined = $state();
	let view: EditorView | undefined = $state();

	let update_from_prop = false;
	let update_from_state = false;
	let first_config = true;
	let first_update = true;

	onMount(() => {
		if (!is_browser) return;
		view = create_editor_view();
		onReady?.(view!);
	});
	onDestroy(() => view?.destroy());

	function create_editor_view(): EditorView {
		return new EditorView({
			parent: element!,
			state: create_editor_state(value),
			dispatch(transaction) {
				view!.update([transaction]);
				if (!update_from_prop && transaction.docChanged) on_change();
			}
		});
	}

	function reconfigure(): void {
		if (first_config) {
			first_config = false;
			return;
		}
		view!.dispatch({
			effects: StateEffect.reconfigure.of(state_extensions)
		});
		onReconfigure?.(view!);
	}

	function update(newValue: string | null | undefined): void {
		if (first_update) {
			first_update = false;
			return;
		}
		if (update_from_state) {
			update_from_state = false;
			return;
		}
		update_from_prop = true;
		view!.setState(create_editor_state(newValue));
		update_from_prop = false;
	}

	function handle_change(): void {
		const new_value = view!.state.doc.toString();
		if (new_value === value) return;
		update_from_state = true;
		value = new_value;
		onChange?.(value);
	}

	function create_editor_state(docValue: string | null | undefined): EditorState {
		return EditorState.create({
			doc: docValue ?? undefined,
			extensions: state_extensions
		});
	}

	function get_base_extensions(
		basic: boolean,
		useTab: boolean,
		tabSize: number,
		lineWrapping: boolean,
		placeholder: string | HTMLElement | null | undefined,
		editable: boolean,
		readonly: boolean,
		lang: LanguageSupport | null | undefined
	): Extension[] {
		const exts: Extension[] = [
			indentUnit.of(' '.repeat(tabSize)),
			EditorView.editable.of(editable),
			EditorState.readOnly.of(readonly),

			// Gutters + folding
			lineNumbers(),
			highlightActiveLineGutter(),
			foldGutter({
				openText: '▾', // visible markers regardless of CSS
				closedText: '▸'
			}),
			keymap.of([...foldKeymap]),

			// Ensure fold gutter is visible over both themes
			EditorView.theme({
				'.cm-gutters': { background: 'transparent', border: 'none' },
				'.cm-foldGutter': { width: '16px' },
				'.cm-foldGutter .cm-gutterElement': { padding: '0 4px', color: 'var(--muted-foreground)' },
				'.cm-foldGutter .cm-gutterElement:hover': { color: 'var(--primary)', cursor: 'pointer' }
			})
		];

		if (basic) exts.push(basicSetup);
		if (useTab) exts.push(keymap.of([indentWithTab]));
		if (placeholder) exts.push(placeholderExt(placeholder));
		if (lang) exts.push(lang);
		if (lineWrapping) exts.push(EditorView.lineWrapping);
		return exts;
	}

	function get_theme(theme: Extension | null | undefined, styles: ThemeSpec | null | undefined): Extension[] {
		const exts: Extension[] = [];
		if (styles) exts.push(EditorView.theme(styles));
		if (theme) exts.push(theme);
		return exts;
	}

	let state_extensions = $derived([
		...get_base_extensions(basic, useTab, tabSize, lineWrapping, placeholder, editable, readonly, lang),
		...get_theme(theme, styles),
		...extensions
	]);

	$effect(() => {
		view && update(value);
	});

	$effect(() => {
		view && state_extensions && reconfigure();
	});

	let on_change = $derived(nodebounce ? handle_change : debounce(handle_change, 300));
</script>

{#if is_browser}
	<div class="codemirror-wrapper {classes}" bind:this={element}></div>
{:else}
	<div class="scm-waiting {classes}">
		<!-- SSR fallback trimmed -->
	</div>
{/if}

<style>
	.codemirror-wrapper :global(.cm-focused) {
		outline: none;
	}
</style>
