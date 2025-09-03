import { EditorView } from '@codemirror/view';
import { type Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const baseTheme = {
	'&': {
		color: 'var(--foreground)',
		backgroundColor: 'var(--background)'
	},
	'.cm-content': {
		caretColor: 'var(--primary)'
	},
	'.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--primary)' },
	'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
		backgroundColor: 'color-mix(in oklch, var(--primary) 18%, transparent)'
	},
	'.cm-panels': { backgroundColor: 'var(--card)', color: 'var(--card-foreground)' },
	'.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--border)' },
	'.cm-panels.cm-panels-bottom': { borderTop: '1px solid var(--border)' },

	'.cm-searchMatch': {
		backgroundColor: 'color-mix(in oklch, var(--ring) 35%, transparent)',
		outline: '1px solid var(--ring)'
	},
	'.cm-searchMatch.cm-searchMatch-selected': {
		backgroundColor: 'color-mix(in oklch, var(--ring) 20%, transparent)'
	},

	'.cm-activeLine': { backgroundColor: 'color-mix(in oklch, var(--primary) 10%, transparent)' },
	'.cm-selectionMatch': { backgroundColor: 'color-mix(in oklch, var(--chart-2) 18%, transparent)' },

	'&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
		backgroundColor: 'color-mix(in oklch, var(--chart-3) 30%, transparent)'
	},

	'.cm-gutters': {
		backgroundColor: 'var(--sidebar)',
		color: 'var(--muted-foreground)',
		border: 'none'
	},
	'.cm-activeLineGutter': {
		backgroundColor: 'color-mix(in oklch, var(--sidebar-accent) 28%, transparent)'
	},

	'.cm-foldPlaceholder': {
		backgroundColor: 'transparent',
		border: 'none',
		color: 'var(--muted-foreground)'
	},

	'.cm-tooltip': {
		border: '1px solid var(--border)',
		backgroundColor: 'var(--popover)',
		color: 'var(--popover-foreground)'
	},
	'.cm-tooltip .cm-tooltip-arrow:before': {
		borderTopColor: 'transparent',
		borderBottomColor: 'transparent'
	},
	'.cm-tooltip .cm-tooltip-arrow:after': {
		borderTopColor: 'var(--popover)',
		borderBottomColor: 'var(--popover)'
	},
	'.cm-tooltip-autocomplete': {
		'& > ul > li[aria-selected]': {
			backgroundColor: 'color-mix(in oklch, var(--accent) 35%, transparent)',
			color: 'var(--foreground)'
		}
	},

	'.cm-content, .cm-gutter, .cm-tooltip': {
		fontFamily:
			'"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		fontSize: 'inherit'
	}
};

const arcaneHighlightStyle = HighlightStyle.define([
	{ tag: t.keyword, color: 'var(--primary)' },
	{ tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: 'var(--chart-5)' },
	{ tag: [t.function(t.variableName), t.labelName], color: 'var(--chart-2)' },
	{ tag: [t.color, t.constant(t.name), t.standard(t.name)], color: 'var(--chart-1)' },
	{ tag: [t.definition(t.name), t.separator], color: 'var(--foreground)' },
	{ tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: 'var(--chart-3)' },
	{ tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: 'var(--chart-2)' },
	{ tag: [t.meta, t.comment], color: 'var(--muted-foreground)' },
	{ tag: t.strong, fontWeight: 'bold' },
	{ tag: t.emphasis, fontStyle: 'italic' },
	{ tag: t.strikethrough, textDecoration: 'line-through' },
	{ tag: t.link, color: 'var(--muted-foreground)', textDecoration: 'underline' },
	{ tag: t.heading, fontWeight: 'bold', color: 'var(--primary)' },
	{ tag: [t.atom, t.bool, t.special(t.variableName)], color: 'var(--chart-1)' },
	{ tag: [t.processingInstruction, t.string, t.inserted], color: 'var(--chart-4)' },
	{ tag: t.invalid, color: 'var(--destructive)' }
]);

// Export extensions (theme + highlighting), split for light/dark toggle flag
const arcaneThemeLight = EditorView.theme(baseTheme, { dark: false });
const arcaneThemeDark = EditorView.theme(baseTheme, { dark: true });

export const arcaneLight: Extension = [arcaneThemeLight, syntaxHighlighting(arcaneHighlightStyle)];
export const arcaneDark: Extension = [arcaneThemeDark, syntaxHighlighting(arcaneHighlightStyle)];
