import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Arcane - Documentation',
  tagline: 'Modern Docker management, designed for everyone',
  favicon: 'img/arcane.png',

  url: 'https://arcane.ofkm.dev',
  baseUrl: '/',
  organizationName: 'ofkm',
  projectName: 'arcane',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  future: {
    v4: true,
    experimental_faster: true,
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        // theme: {
        //   customCss: ['./src/css/custom.css', './src/css/docs.css'],
        // },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/arcane.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Arcane',
      logo: {
        alt: 'Arcane',
        src: 'img/arcane.png',
      },
      items: [
        {
          href: 'https://github.com/ofkm/arcane',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

  plugins: [
    ...(process.env.UMAMI_WEBSITE_ID ?
      [
        [
          '@dipakparmar/docusaurus-plugin-umami',
          /** @type {import('@dipakparmar/docusaurus-plugin-umami').Options} */
          {
            websiteID: process.env.UMAMI_WEBSITE_ID,
            analyticsDomain: process.env.UMAMI_ANALYTICS_DOMAIN,
          },
        ],
      ]
    : []),
  ],
};

export default config;
