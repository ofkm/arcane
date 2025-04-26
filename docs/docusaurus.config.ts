import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
	title: 'Arcane - Documentation',
	tagline: 'Simple and Elegant Docker Management UI written in Typescript and SvelteKit',
	favicon: 'img/arcane.png',

	// Set the production url of your site here
	url: 'https://ofkm.github.io',
	// Set the /<baseUrl>/ pathname under which your site is served
	// For GitHub pages deployment, it is often '/<projectName>/'
	baseUrl: '/',

	// GitHub pages deployment config.
	// If you aren't using GitHub pages, you don't need these.
	organizationName: 'ofkm', // Usually your GitHub org/user name.
	projectName: 'arcane', // Usually your repo name.

	onBrokenLinks: 'throw',
	onBrokenMarkdownLinks: 'warn',

	// Even if you don't use internationalization, you can use this field to set
	// useful metadata like html lang. For example, if your site is Chinese, you
	// may want to replace "en" with "zh-Hans".
	i18n: {
		defaultLocale: 'en',
		locales: ['en']
	},

	presets: [
		[
			'classic',
			{
				docs: {
					sidebarPath: './sidebars.ts'
				},
				theme: {
					customCss: ['./src/css/custom.css', './src/css/docs.css']
				}
			} satisfies Preset.Options
		]
	],

	themeConfig: {
		navbar: {
			title: 'Arcane',
			logo: {
				alt: 'Arcane',
				src: 'img/arcane.png'
			},
			items: [
				{
					href: 'https://github.com/ofkm/arcane',
					label: 'GitHub',
					position: 'right'
				}
			]
		},
		prism: {
			theme: prismThemes.vsLight,
			darkTheme: prismThemes.vsDark
		}
	} satisfies Preset.ThemeConfig
};

export default config;
