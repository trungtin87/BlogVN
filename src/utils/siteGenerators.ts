import type { BlogConfig, BlogPost, FrameworkId } from '../types/blog';

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function normalizeBaseUrl(pagesUrl: string): string {
  const clean = (pagesUrl || 'https://trungtin87.github.io').trim().replace(/\/+$/, '');
  return clean.startsWith('http') ? clean : `https://${clean}`;
}

export function buildPostUrl(
  post: Pick<BlogPost, 'slug' | 'date' | 'collection' | 'canonicalUrl'>,
  pagesUrl: string,
  framework: FrameworkId = 'jekyll'
): string {
  if (post.canonicalUrl && post.canonicalUrl.startsWith('http')) {
    return post.canonicalUrl;
  }
  const base = normalizeBaseUrl(pagesUrl);
  const cleanSlug = encodeURIComponent(post.slug || 'bai-viet');

  if (framework === 'astro-vn') {
    const colSegment =
      post.collection === 'du_an'
        ? 'du-an'
        : post.collection === 'sach'
        ? 'sach'
        : post.collection === 'cua_hang'
        ? 'cua-hang'
        : 'bai-viet';
    return `${base}/${colSegment}/${cleanSlug}/`;
  }

  if (framework === 'astro') {
    return `${base}/blog/${cleanSlug}/`;
  }

  if (framework === 'hugo') {
    return `${base}/posts/${cleanSlug}/`;
  }

  if (framework === 'jekyll' || framework === 'hexo') {
    const dateParts = (post.date || new Date().toISOString().slice(0, 10)).split('-');
    if (dateParts.length === 3) {
      const [y, m, d] = dateParts;
      return framework === 'hexo'
        ? `${base}/${y}/${m}/${d}/${cleanSlug}/`
        : `${base}/${y}/${m}/${d}/${cleanSlug}.html`;
    }
  }

  return `${base}/posts/${cleanSlug}/`;
}

export function generateRssXml(params: {
  config: BlogConfig;
  posts: BlogPost[];
  framework?: FrameworkId;
}): string {
  const { config, posts, framework = 'jekyll' } = params;
  const base = normalizeBaseUrl(config.pagesUrl);
  const published = posts
    .filter((p) => !p.draft && !p.noindex)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 40);

  const lastBuild =
    published[0]?.date && !Number.isNaN(Date.parse(published[0].date))
      ? new Date(published[0].date).toUTCString()
      : new Date().toUTCString();

  const itemsXml = published
    .map((post) => {
      const link = buildPostUrl(post, base, framework);
      const pubDate =
        post.date && !Number.isNaN(Date.parse(post.date))
          ? new Date(post.date).toUTCString()
          : new Date().toUTCString();
      const desc = post.seoDescription || post.excerpt || post.title;
      const categoriesXml = [post.category, ...(post.tags || [])]
        .filter(Boolean)
        .slice(0, 5)
        .map((cat) => `      <category>${escapeXml(cat)}</category>`)
        .join('\n');

      return [
        '    <item>',
        `      <title>${escapeXml(post.seoTitle || post.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${escapeXml(pubDate)}</pubDate>`,
        `      <description>${escapeXml(desc)}</description>`,
        categoriesXml,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(config.siteTitle || 'BlogVN')}</title>`,
    `    <link>${escapeXml(base)}/</link>`,
    `    <description>${escapeXml(config.tagline || config.siteTitle)}</description>`,
    '    <language>vi</language>',
    `    <lastBuildDate>${escapeXml(lastBuild)}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(base)}/rss.xml" rel="self" type="application/rss+xml" />`,
    itemsXml,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

export function generateJsonFeed(params: {
  config: BlogConfig;
  posts: BlogPost[];
  framework?: FrameworkId;
}): string {
  const { config, posts, framework = 'jekyll' } = params;
  const base = normalizeBaseUrl(config.pagesUrl);
  const published = posts
    .filter((p) => !p.draft && !p.noindex)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 40);

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: config.siteTitle || 'BlogVN',
    home_page_url: `${base}/`,
    feed_url: `${base}/feed.json`,
    description: config.tagline || config.siteTitle,
    language: 'vi',
    authors: config.authorName
      ? [
          {
            name: config.authorName,
            ...(config.authorAvatar ? { avatar: config.authorAvatar } : {}),
          },
        ]
      : undefined,
    items: published.map((post) => {
      const url = buildPostUrl(post, base, framework);
      const item: Record<string, any> = {
        id: url,
        url,
        title: post.seoTitle || post.title,
        summary: post.seoDescription || post.excerpt || '',
        content_text: post.markdownBody.slice(0, 800),
        date_published: post.date ? `${post.date}T00:00:00Z` : new Date().toISOString(),
        tags: post.tags,
      };
      if (post.cover) {
        item.image = post.cover.startsWith('http') ? post.cover : `${base}${post.cover}`;
      }
      return item;
    }),
  };

  return JSON.stringify(feed, null, 2) + '\n';
}

export function generateSitemapXml(params: {
  config: BlogConfig;
  posts: BlogPost[];
  framework?: FrameworkId;
}): string {
  const { config, posts, framework = 'jekyll' } = params;
  const base = normalizeBaseUrl(config.pagesUrl);
  const today = new Date().toISOString().slice(0, 10);
  const published = posts
    .filter((p) => !p.draft && !p.noindex)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const extraRoutes =
    framework === 'astro-vn'
      ? ['/bai-viet/', '/du-an/', '/sach/', '/cua-hang/']
      : [];

  const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [
    { loc: `${base}/`, lastmod: published[0]?.date || today, changefreq: 'daily', priority: '1.0' },
    ...extraRoutes.map((route) => ({
      loc: `${base}${route}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    })),
    ...published.map((post) => ({
      loc: buildPostUrl(post, base, framework),
      lastmod: post.date || today,
      changefreq: 'monthly',
      priority: '0.7',
    })),
  ];

  const entriesXml = urls
    .map(
      (u) =>
        [
          '  <url>',
          `    <loc>${escapeXml(u.loc)}</loc>`,
          `    <lastmod>${escapeXml(u.lastmod)}</lastmod>`,
          `    <changefreq>${u.changefreq}</changefreq>`,
          `    <priority>${u.priority}</priority>`,
          '  </url>',
        ].join('\n')
    )
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entriesXml,
    '</urlset>',
    '',
  ].join('\n');
}

export function generateRobotsTxt(pagesUrl: string): string {
  const base = normalizeBaseUrl(pagesUrl);
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /drafts/',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
}

export function generate404Html(config: BlogConfig): string {
  const title = escapeHtml(config.siteTitle || 'Blog');
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>404 — Không tìm thấy trang | ${title}</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #ffffff;
        color: #1c1e1f;
        padding: 24px;
      }
      @media (prefers-color-scheme: dark) {
        body { background: #111111; color: #eeeeee; }
        .card { background: #181818; border-color: #2c2d2e; }
        .muted { color: #9a9d9e; }
        a.btn { background: #eeeeee; color: #111111; }
      }
      .card {
        max-width: 460px;
        width: 100%;
        padding: 32px;
        border: 1px solid #e6e7e6;
        border-radius: 16px;
        background: #f5f5f5;
        text-align: center;
      }
      .code { font-size: 48px; font-weight: 700; letter-spacing: -0.04em; margin: 0 0 8px; }
      h1 { font-size: 20px; margin: 0 0 10px; }
      .muted { color: #4b4f51; font-size: 14px; line-height: 1.6; margin: 0 0 22px; }
      a.btn {
        display: inline-block;
        padding: 12px 20px;
        border-radius: 10px;
        background: #1c1e1f;
        color: #ffffff;
        text-decoration: none;
        font-size: 14px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <p class="code">404</p>
      <h1>Không tìm thấy nội dung này</h1>
      <p class="muted">Liên kết có thể đã thay đổi hoặc bài viết đã được chuyển sang địa chỉ mới trên ${title}.</p>
      <a class="btn" href="/">Quay về trang chủ</a>
    </main>
  </body>
</html>
`;
}

export interface SeoCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface SeoAuditResult {
  score: number;
  checks: SeoCheckItem[];
  effectiveTitle: string;
  effectiveDescription: string;
  previewUrl: string;
  articleJsonLd: string;
}

export function evaluatePostSeo(params: {
  title: string;
  seoTitle?: string;
  excerpt: string;
  seoDescription?: string;
  slug: string;
  cover?: string;
  date: string;
  markdownBody: string;
  tags: string[];
  authorName: string;
  pagesUrl: string;
  canonicalUrl?: string;
  collection?: BlogPost['collection'];
  framework?: FrameworkId;
}): SeoAuditResult {
  const effectiveTitle = (params.seoTitle || params.title || '').trim();
  const effectiveDescription = (params.seoDescription || params.excerpt || '').trim();
  const previewUrl = buildPostUrl(
    {
      slug: params.slug || 'bai-viet',
      date: params.date,
      collection: params.collection || 'bai_viet',
      canonicalUrl: params.canonicalUrl,
    },
    params.pagesUrl,
    params.framework
  );

  const titleLen = effectiveTitle.length;
  const descLen = effectiveDescription.length;
  const words = params.markdownBody.trim().split(/\s+/).filter(Boolean).length;
  const hasHeading = /^#{2,3}\s+.+/m.test(params.markdownBody);

  const imgMatches = Array.from(params.markdownBody.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g));
  const missingAltCount = imgMatches.filter((m) => !m[1] || !m[1].trim()).length;

  const checks: SeoCheckItem[] = [
    {
      id: 'title',
      label: 'Độ dài tiêu đề SEO (25–65 ký tự)',
      passed: titleLen >= 25 && titleLen <= 65,
      detail: titleLen === 0 ? 'Chưa có tiêu đề' : `${titleLen} ký tự`,
    },
    {
      id: 'desc',
      label: 'Mô tả Meta Description (90–165 ký tự)',
      passed: descLen >= 90 && descLen <= 165,
      detail: descLen === 0 ? 'Chưa nhập mô tả' : `${descLen} ký tự`,
    },
    {
      id: 'slug',
      label: 'URL Slug ngắn gọn, không dấu',
      passed: /^[a-z0-9-]+$/.test(params.slug || '') && (params.slug || '').length <= 75,
      detail: params.slug ? `/${params.slug}` : 'Chưa có slug',
    },
    {
      id: 'cover',
      label: 'Ảnh bìa OpenGraph (og:image)',
      passed: Boolean(params.cover && params.cover.trim()),
      detail: params.cover ? 'Đã có ảnh chia sẻ MXH' : 'Thiếu ảnh bìa khi chia sẻ link',
    },
    {
      id: 'content',
      label: 'Cấu trúc bài & Độ sâu nội dung (>= 120 từ + H2)',
      passed: words >= 120 && hasHeading,
      detail: `${words} từ · ${hasHeading ? 'Đã có tiêu đề H2/H3' : 'Nên thêm tiêu đề H2 (##)'}`,
    },
    {
      id: 'alt',
      label: 'Thuộc tính Alt mô tả ảnh trong bài',
      passed: missingAltCount === 0,
      detail:
        imgMatches.length === 0
          ? 'Chưa chèn ảnh nội dung'
          : missingAltCount === 0
          ? `Đủ Alt cho ${imgMatches.length}/${imgMatches.length} ảnh`
          : `Thiếu Alt ở ${missingAltCount} ảnh`,
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  const base = normalizeBaseUrl(params.pagesUrl);
  const fullImage = params.cover
    ? params.cover.startsWith('http')
      ? params.cover
      : `${base}${params.cover.startsWith('/') ? '' : '/'}${params.cover}`
    : undefined;

  const jsonLdObj: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: effectiveTitle || 'Bài viết mới',
    description: effectiveDescription || effectiveTitle,
    datePublished: params.date || new Date().toISOString().slice(0, 10),
    dateModified: params.date || new Date().toISOString().slice(0, 10),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': previewUrl,
    },
    author: {
      '@type': 'Person',
      name: params.authorName || 'Author',
    },
    ...(fullImage ? { image: [fullImage] } : {}),
    ...(params.tags.length > 0 ? { keywords: params.tags.join(', ') } : {}),
  };

  return {
    score,
    checks,
    effectiveTitle: effectiveTitle || 'Tiêu đề bài viết sẽ hiển thị tại đây',
    effectiveDescription:
      effectiveDescription || 'Nhập mô tả ngắn (Meta Description) để tối ưu hiển thị trên Google Search.',
    previewUrl,
    articleJsonLd: JSON.stringify(jsonLdObj, null, 2),
  };
}
