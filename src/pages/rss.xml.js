import rss from '@astrojs/rss';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context) {
  const posts = Object.values(await import.meta.glob('./blog/**/*.md', { eager: true }));
  
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      link: `/blog/${post.file.split('/').pop().replace('.md', '')}/`,
      title: post.frontmatter.title,
      pubDate: post.frontmatter.pubDate,
      description: post.frontmatter.description,
      categories: [post.frontmatter.category],
    })),
    customData: `<language>en-za</language>`,
  });
}
