import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.ridethetide.site',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/drafts/') && !page.includes('/admin/'),
      customPages: [
        'https://www.ridethetide.info/',
        'https://ridethetide.site/',
      ],
    }),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
    remarkPlugins: [],
    rehypePlugins: [],
  },
  build: {
    format: 'directory',
  },
  server: {
    port: 4321,
    host: true,
  },
});
