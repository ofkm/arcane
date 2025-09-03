import { tags as t } from '@lezer/highlight';
import { createTheme, type CreateThemeOptions } from '@uiw/codemirror-themes';
import { EditorView } from '@codemirror/view';
import { type Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';

const chalky = 'oklch(0.769 0.188 70.08)',
	coral = 'oklch(0.704 0.191 22.216)',
	cyan = 'oklch(0.696 0.17 162.48)',
	invalid = 'oklch(1 0 0)',
	ivory = 'oklch(0.985 0 0)',
	stone = 'oklch(0.705 0.015 286.067)',
	malibu = 'oklch(0.488 0.243 264.376)',
	sage = 'oklch(0.696 0.17 162.48)',
	whiskey = 'oklch(0.645 0.246 16.439)',
	violet = 'oklch(0.541 0.281 293.009)',
	darkBackground = 'oklch(0.21 0.006 285.885)',
	highlightBackground = 'oklch(0.274 0.006 286.033)',
	background = 'oklch(0.141 0.005 285.823)',
	tooltipBackground = 'oklch(0.274 0.006 286.033)',
	selection = 'oklch(0.541 0.281 293.009)',
	cursor = 'oklch(0.541 0.281 293.009)';

/// The colors used in the theme, as CSS color strings.
export const color = {
	chalky,
	coral,
	cyan,
	invalid,
	ivory,
	stone,
	malibu,
	sage,
	whiskey,
	violet,
	darkBackground,
	highlightBackground,
	background,
	tooltipBackground,
	selection,
	cursor
};

export const arcaneDarkTheme = EditorView.theme(
	{
		'&': {
			color: ivory,
			backgroundColor: background
		},

		'.cm-content': {
			caretColor: cursor
		},

		'.cm-cursor, .cm-dropCursor': { borderLeftColor: cursor },
		'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
			{ backgroundColor: selection },

		'.cm-panels': { backgroundColor: darkBackground, color: ivory },
		'.cm-panels.cm-panels-top': { borderBottom: '2px solid black' },
		'.cm-panels.cm-panels-bottom': { borderTop: '2px solid black' },

		'.cm-searchMatch': {
			backgroundColor: '#72a1ff59',
			outline: '1px solid #457dff'
		},
		'.cm-searchMatch.cm-searchMatch-selected': {
			backgroundColor: '#6199ff2f'
		},

		'.cm-activeLine': { backgroundColor: '#6699ff0b' },
		'.cm-selectionMatch': { backgroundColor: '#aafe661a' },

		'&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
			backgroundColor: '#bad0f847'
		},

		'.cm-gutter, .cm-gutter.cm-lineNumbers': {
			backgroundColor: darkBackground,
			color: stone,
			border: 'none'
		},

		'.cm-gutters': {
			backgroundColor: darkBackground,
			color: stone,
			border: 'none',
			borderRight: 'none'
		},

		'.cm-foldGutter': {
			backgroundColor: darkBackground,
			color: stone,
			border: 'none'
		},

		'.cm-activeLineGutter': {
			backgroundColor: highlightBackground
		},

		'.cm-gutter.cm-lint-gutter': {
			backgroundColor: darkBackground,
			border: 'none'
		},

		'.cm-foldPlaceholder': {
			backgroundColor: 'transparent',
			border: 'none',
			color: '#ddd'
		},

		'.cm-tooltip': {
			border: 'none',
			backgroundColor: tooltipBackground
		},
		'.cm-tooltip .cm-tooltip-arrow:before': {
			borderTopColor: 'transparent',
			borderBottomColor: 'transparent'
		},
		'.cm-tooltip .cm-tooltip-arrow:after': {
			borderTopColor: tooltipBackground,
			borderBottomColor: tooltipBackground
		},
		'.cm-tooltip-autocomplete': {
			'& > ul > li[aria-selected]': {
				backgroundColor: highlightBackground,
				color: ivory
			}
		}
	},
	{ dark: true }
);

export const oneDarkHighlightStyle = HighlightStyle.define([
	{ tag: t.keyword, color: violet },
	{ tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: coral },
	{ tag: [t.function(t.variableName), t.labelName], color: malibu },
	{ tag: [t.color, t.constant(t.name), t.standard(t.name)], color: whiskey },
	{ tag: [t.definition(t.name), t.separator], color: ivory },
	{ tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: chalky },
	{ tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: cyan },
	{ tag: [t.meta, t.comment], color: stone },
	{ tag: t.strong, fontWeight: 'bold' },
	{ tag: t.emphasis, fontStyle: 'italic' },
	{ tag: t.strikethrough, textDecoration: 'line-through' },
	{ tag: t.link, color: stone, textDecoration: 'underline' },
	{ tag: t.heading, fontWeight: 'bold', color: coral },
	{ tag: [t.atom, t.bool, t.special(t.variableName)], color: whiskey },
	{ tag: [t.processingInstruction, t.string, t.inserted], color: sage },
	{ tag: t.invalid, color: invalid }
]);

export const arcaneDark: Extension = [arcaneDarkTheme, syntaxHighlighting(oneDarkHighlightStyle)];

// export const arcaneDarkSettings: CreateThemeOptions['settings'] = {
// 	background: '#09090b',
// 	foreground: '#fafafa',
// 	caret: '#7920fe',
// 	selection: '#7920fe',
// 	lineHighlight: '#27272a',
// 	gutterBackground: '#18181b',
// 	gutterForeground: '#fafafa'
// };

// export const arcaneDarkStyles: CreateThemeOptions['styles'] = [
// 	{ tag: [t.standard(t.tagName), t.tagName], color: '#7920fe' }
// 	// { tag: [t.comment, t.bracket], color: '#6a737d' },
// 	// { tag: [t.className, t.propertyName], color: '#6f42c1' },
// 	// { tag: [t.variableName, t.attributeName, t.number, t.operator], color: '#005cc5' },
// 	// { tag: [t.keyword, t.typeName, t.typeOperator, t.typeName], color: '#d73a49' },
// 	// { tag: [t.string, t.meta, t.regexp], color: '#032f62' },
// 	// { tag: [t.name, t.quote], color: '#22863a' },
// 	// { tag: [t.heading, t.strong], color: '#24292e', fontWeight: 'bold' },
// 	// { tag: [t.emphasis], color: '#24292e', fontStyle: 'italic' },
// 	// { tag: [t.deleted], color: '#b31d28', backgroundColor: 'ffeef0' },
// 	// { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#e36209' },
// 	// { tag: [t.url, t.escape, t.regexp, t.link], color: '#032f62' },
// 	// { tag: t.link, textDecoration: 'underline' },
// 	// { tag: t.strikethrough, textDecoration: 'line-through' },
// 	// { tag: t.invalid, color: '#cb2431' }
// ];

// export const arcaneDarkInit = (options?: Partial<CreateThemeOptions>) => {
// 	const { theme = 'dark', settings = {}, styles = [] } = options || {};
// 	return createTheme({
// 		theme: theme,
// 		settings: {
// 			...arcaneDarkSettings,
// 			...settings
// 		},
// 		styles: [...arcaneDarkStyles, ...styles]
// 	});
// };

// export const arcaneDark = arcaneDarkInit();

// export const myTheme = createTheme({
// 	variant: 'dark',
// 	settings: {
// 		background: '#09090b',
// 		foreground: '#fafafa',
// 		caret: '#7920fe',
// 		selection: '#7920fe',
// 		lineHighlight: '#27272a',
// 		gutterBackground: '#18181b',
// 		gutterForeground: '#fafafa'
// 	},
// 	styles: [
// 		{
// 			tag: t.comment,
// 			color: '#9e9ea9'
// 		},
// 		{
// 			tag: t.variableName,
// 			color: '#7c3aed'
// 		},
// 		{
// 			tag: [t.string, t.special(t.brace)],
// 			color: '#7920fe'
// 		},
// 		{
// 			tag: t.number,
// 			color: '#7920fe'
// 		},
// 		{
// 			tag: t.bool,
// 			color: '#5c6166'
// 		},
// 		{
// 			tag: t.null,
// 			color: '#5c6166'
// 		},
// 		{
// 			tag: t.keyword,
// 			color: '#7920fe'
// 		},
// 		{
// 			tag: t.operator,
// 			color: '#5c6166'
// 		},
// 		{
// 			tag: t.className,
// 			color: '#7920fe'
// 		},
// 		{
// 			tag: t.definition(t.typeName),
// 			color: '#5c6166'
// 		},
// 		{
// 			tag: t.emphasis,
// 			color: '#7920fe'
// 		},
// 		{
// 			tag: t.typeName,
// 			color: '#5c6166'
// 		},
// 		{
// 			tag: t.angleBracket,
// 			color: '#5c6166'
// 		},
// 		{
// 			tag: t.tagName,
// 			color: '#5c6166'
// 		},
// 		{
// 			tag: t.attributeName,
// 			color: '#5c6166'
// 		}
// 	]
// });
