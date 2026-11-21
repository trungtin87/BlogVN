import JSZip from 'jszip';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import type { BlogCollection, BlogConfig, BlogPost } from '../types/blog';
import { slugifyVietnamese } from './markdown';

function sanitizeConfigForBackup(config: BlogConfig): Partial<BlogConfig> {
  return {
    siteTitle: config.siteTitle,
    tagline: config.tagline,
    siteIcon: config.siteIcon,
    headerTitle: config.headerTitle,
    headerNavLinks: config.headerNavLinks,
    footerText: config.footerText,
    footerLinks: config.footerLinks,
    authorName: config.authorName,
    authorBio: config.authorBio,
    authorAvatar: config.authorAvatar,
    githubOwner: config.githubOwner,
    githubRepo: config.githubRepo,
    pagesUrl: config.pagesUrl,
    themeMode: config.themeMode,
    postsDirectory: config.postsDirectory,
    astroTemplate: config.astroTemplate,
    liveChat: config.liveChat,
    customDomain: config.customDomain,
    analyticsProvider: config.analyticsProvider,
    analyticsId: config.analyticsId,
    giscus: config.giscus,
  };
}

function serializePostForZip(post: BlogPost): string {
  if (post.rawContent?.trim().startsWith('---')) {
    return post.rawContent;
  }
  const fm: Record<string, any> = {
    tieu_de: post.title,
    danh_muc: post.category || 'Ghi chép',
    slug: post.slug || slugifyVietnamese(post.title),
    tags: post.tags || [],
    mo_ta: post.excerpt || '',
    ngay: post.date || new Date().toISOString().slice(0, 10),
    nhap: Boolean(post.draft),
  };
  if (post.cover) fm.anh_bia = post.cover;
  if (post.seoTitle) fm.seo_title = post.seoTitle;
  if (post.seoDescription) fm.seo_description = post.seoDescription;
  if (post.canonicalUrl) fm.canonical_url = post.canonicalUrl;
  if (post.noindex) fm.noindex = true;
  if (post.authorName) fm.tac_gia = post.authorName;
  if (post.price) fm.gia = post.price;
  if (post.originalPrice) fm.gia_goc = post.originalPrice;
  if (post.linkDemo) fm.link_demo = post.linkDemo;
  if (post.linkGithub) fm.link_github = post.linkGithub;
  if (post.linkBuy) fm.link_mua = post.linkBuy;

  return `---\n${dumpYaml(fm, { lineWidth: -1 }).trim()}\n---\n\n${(post.markdownBody || '').trim()}\n`;
}

export async function exportSiteBackupZip(
  posts: BlogPost[],
  config: BlogConfig
): Promise<{ fileName: string; count: number }> {
  const zip = new JSZip();
  const stamp = new Date().toISOString().slice(0, 10);
  const safeRepo = slugifyVietnamese(config.githubRepo || config.siteTitle || 'dao-ky');

  const manifest = {
    app: 'Đạo Ký Studio',
    version: 1,
    exportedAt: new Date().toISOString(),
    postsCount: posts.length,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('config/site-config.json', JSON.stringify(sanitizeConfigForBackup(config), null, 2));

  const seenPaths = new Set<string>();
  for (const post of posts) {
    const col: BlogCollection = post.collection || 'bai_viet';
    const baseSlug = slugifyVietnamese(post.slug || post.title || 'bai-viet');
    let candidate = `posts/${col}/${baseSlug}.md`;
    let counter = 2;
    while (seenPaths.has(candidate)) {
      candidate = `posts/${col}/${baseSlug}-${counter}.md`;
      counter++;
    }
    seenPaths.add(candidate);
    zip.file(candidate, serializePostForZip(post));
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const fileName = `daoky-backup-${safeRepo}-${stamp}.zip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { fileName, count: posts.length };
}

function detectCollectionFromZipPath(filePath: string): BlogCollection {
  const lower = filePath.toLowerCase();
  if (lower.includes('/du_an/')) return 'du_an';
  if (lower.includes('/sach/')) return 'sach';
  if (lower.includes('/cua_hang/')) return 'cua_hang';
  return 'bai_viet';
}

function parseImportedMarkdown(raw: string, filePath: string): BlogPost {
  let fm: Record<string, any> = {};
  let body = raw;
  if (raw.startsWith('---')) {
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (m) {
      try {
        const parsed = loadYaml(m[1]);
        if (parsed && typeof parsed === 'object') fm = parsed as Record<string, any>;
        body = m[2] || '';
      } catch {
        // fallback raw
      }
    }
  }

  const collection = detectCollectionFromZipPath(filePath);
  const baseName = (filePath.split('/').pop() || 'post').replace(/\.(md|mdx|markdown)$/i, '');
  const title = String(fm.tieu_de || fm.ten_san_pham || fm.title || baseName);
  const slug = slugifyVietnamese(String(fm.slug || baseName || title));
  const dateRaw = fm.ngay || fm.pubDate || fm.date;
  const date =
    dateRaw instanceof Date
      ? dateRaw.toISOString().slice(0, 10)
      : String(dateRaw || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const tagsRaw = fm.tags || fm.cong_nghe || fm.the_loai;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map(String)
    : typeof tagsRaw === 'string'
    ? tagsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    collection,
    slug,
    title,
    date,
    category: String(fm.danh_muc || fm.category || 'Nhập khẩu'),
    tags,
    excerpt: String(fm.mo_ta || fm.mo_ta_ngan || fm.excerpt || fm.description || ''),
    cover: fm.anh_bia || fm.anh_dai_dien || fm.anh_san_pham || fm.cover || fm.image || undefined,
    draft: Boolean(fm.nhap ?? fm.draft ?? true),
    markdownBody: body.trim(),
    rawContent: raw,
    path: `src/content/${collection}/${slug}.md`,
    source: 'local',
    updatedAt: new Date().toISOString(),
    seoTitle: fm.seo_title ? String(fm.seo_title) : undefined,
    seoDescription: fm.seo_description ? String(fm.seo_description) : undefined,
    canonicalUrl: fm.canonical_url ? String(fm.canonical_url) : undefined,
    noindex: fm.noindex !== undefined ? Boolean(fm.noindex) : undefined,
    authorName: fm.tac_gia ? String(fm.tac_gia) : undefined,
    price: fm.gia ? String(fm.gia) : undefined,
    originalPrice: fm.gia_goc ? String(fm.gia_goc) : undefined,
    linkDemo: fm.link_demo ? String(fm.link_demo) : undefined,
    linkGithub: fm.link_github ? String(fm.link_github) : undefined,
    linkBuy: fm.link_mua ? String(fm.link_mua) : undefined,
  };
}

export async function importBackupZip(file: File): Promise<{
  posts: BlogPost[];
  config: Partial<BlogConfig> | null;
}> {
  const zip = await JSZip.loadAsync(file);
  let config: Partial<BlogConfig> | null = null;

  const cfgEntry = zip.file('config/site-config.json');
  if (cfgEntry) {
    try {
      const cfgText = await cfgEntry.async('string');
      config = JSON.parse(cfgText) as Partial<BlogConfig>;
    } catch {
      // ignore malformed config
    }
  }

  const posts: BlogPost[] = [];
  const entries = Object.values(zip.files).filter(
    (entry) => !entry.dir && /\.(md|mdx|markdown)$/i.test(entry.name)
  );
  for (const entry of entries) {
    const content = await entry.async('string');
    posts.push(parseImportedMarkdown(content, entry.name));
  }

  return { posts, config };
}

function htmlToSimpleMarkdown(html: string): string {
  if (!html) return '';
  let md = html
    .replace(/<!--\s*\/?wp:[^>]*-->/gi, '')
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner) => {
      const clean = inner.replace(/<\/?p[^>]*>/gi, '').trim();
      return `\n> ${clean.replace(/\n/g, '\n> ')}\n\n`;
    })
    .replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '![]($1)')
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**')
    .replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '');

  const textarea = document.createElement('textarea');
  textarea.innerHTML = md;
  md = textarea.value;
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

export async function importWordPressXml(file: File): Promise<BlogPost[]> {
  const xmlText = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const items = Array.from(doc.getElementsByTagName('item'));

  const posts: BlogPost[] = [];
  for (const item of items) {
    const getTag = (tagName: string): string => {
      const el = item.getElementsByTagName(tagName)[0];
      return el?.textContent?.trim() || '';
    };
    const postType = getTag('wp:post_type') || 'post';
    if (postType !== 'post' && postType !== 'page') continue;

    const status = getTag('wp:status');
    if (status === 'trash' || status === 'auto-draft') continue;

    const title = getTag('title') || 'Bài viết WordPress';
    const rawSlug = getTag('wp:post_name') || slugifyVietnamese(title);
    const dateStr = (getTag('wp:post_date') || getTag('pubDate') || '').slice(0, 10);
    const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? dateStr
      : new Date().toISOString().slice(0, 10);

    const htmlContent = getTag('content:encoded') || getTag('description');
    const markdownBody = htmlToSimpleMarkdown(htmlContent);
    const excerptRaw = htmlToSimpleMarkdown(getTag('excerpt:encoded'));
    const excerpt = excerptRaw || markdownBody.replace(/[#>*`!\[\]\(\)]/g, '').slice(0, 155);

    const categoryNodes = Array.from(item.getElementsByTagName('category'));
    let category = 'WordPress';
    const tags: string[] = [];
    for (const c of categoryNodes) {
      const domain = c.getAttribute('domain');
      const val = c.textContent?.trim();
      if (!val) continue;
      if (domain === 'category' && category === 'WordPress') category = val;
      if (domain === 'post_tag') tags.push(val);
    }

    const firstImgMatch = markdownBody.match(/!\[[^\]]*\]\(([^)\s]+)/);

    posts.push({
      id: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      collection: 'bai_viet',
      slug: slugifyVietnamese(rawSlug),
      title,
      date: isoDate,
      category,
      tags: tags.slice(0, 8),
      excerpt,
      cover: firstImgMatch?.[1],
      draft: status !== 'publish',
      markdownBody,
      rawContent: markdownBody,
      path: `src/content/bai_viet/${slugifyVietnamese(rawSlug)}.md`,
      source: 'local',
      updatedAt: new Date().toISOString(),
    });
  }

  return posts;
}
