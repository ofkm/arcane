import { tags as t } from '@lezer/highlight';
import { createTheme, type CreateThemeOptions } from '@uiw/codemirror-themes';

export const arcaneDarkSettings: CreateThemeOptions['settings'] = {
	background: '#0d1117',
	foreground: '#c9d1d9',
	caret: '#a78bfa',
	selection: 'rgba(167,139,250,0.35)',
	selectionMatch: 'rgba(167,139,250,0.20)',
	lineHighlight: '#161b22',
	gutterBackground: '#0d1117',
	gutterForeground: '#8b949e',
	gutterActiveForeground: '#c9d1d9',
	gutterBorder: 'transparent',

	fontFamily: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
	fontSize: '13px'
};

export const arcaneDarkStyles: CreateThemeOptions['styles'] = [
	{ tag: [t.comment, t.meta], color: '#8b949e' },
	{ tag: [t.keyword, t.modifier, t.operatorKeyword], color: '#ff7b72' },

	{ tag: [t.typeName, t.namespace, t.number, t.atom, t.bool], color: '#ffa657' },
	{ tag: [t.function(t.variableName), t.labelName], color: '#79c0ff' },
	{ tag: [t.className, t.definition(t.variableName), t.propertyName, t.attributeName], color: '#d2a8ff' },

	{ tag: [t.variableName, t.name], color: '#e6edf3' },
	{ tag: [t.string, t.inserted, t.regexp, t.special(t.string)], color: '#7ee787' },
	{ tag: [t.operator, t.url, t.link, t.escape], color: '#a5d6ff' },

	{ tag: [t.separator, t.punctuation], color: '#6e7681' },

	{ tag: t.heading, color: '#e6edf3', fontWeight: 'bold' },
	{ tag: t.strong, fontWeight: 'bold' },
	{ tag: t.emphasis, fontStyle: 'italic' },
	{ tag: t.strikethrough, textDecoration: 'line-through' },
	{ tag: t.invalid, color: '#f85149' },
	{ tag: t.link, textDecoration: 'underline' }
];

export const arcaneDarkInit = (options?: Partial<CreateThemeOptions>) => {
	const { theme = 'dark', settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: { ...arcaneDarkSettings, ...settings },
		styles: [...arcaneDarkStyles, ...styles]
	});
};

export const arcaneDark = arcaneDarkInit();
