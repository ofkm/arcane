import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
	title: 'Arcane - Documentation',
	tagline: 'Modern Docker management, designed for everyone',
	favicon: 'img/arcane.png',

	// Set the production url of your site here
	url: 'https://arcane.ofkm.dev',
	// Set the /<baseUrl>/ pathname under which your site is served
	// For GitHub pages deployment, it is often '/<projectName>/'
	baseUrl: '/',
	organizationName: 'ofkm',
	projectName: 'arcane',
	onBrokenLinks: 'warn',
	onBrokenMarkdownLinks: 'warn',
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
	} satisfies Preset.ThemeConfig,

	plugins: [
		// Only include the analytics plugin if the environment variable exists
		// This ensures analytics won't run during local development
		...(process.env.UMAMI_WEBSITE_ID
			? [
					[
						'@dipakparmar/docusaurus-plugin-umami',
						/** @type {import('@dipakparmar/docusaurus-plugin-umami').Options} */
						{
							websiteID: process.env.UMAMI_WEBSITE_ID,
							analyticsDomain: process.env.UMAMI_ANALYTICS_DOMAIN
						}
					]
				]
			: [])
	]
};

export default config;
