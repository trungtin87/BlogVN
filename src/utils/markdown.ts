import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { dump as dumpYaml } from 'js-yaml';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function renderMarkdownToSafeHtml(
  markdown: string,
  assetContext?: {
    owner: string;
    repo: string;
    isAstroRepo?: boolean;
    assetsPrefix?: string;
    branch?: string;
  }
): string {
  const rawHtml = marked.parse(markdown || '', { async: false }) as string;
  let processed = rawHtml;

  if (assetContext) {
    const branch = assetContext.branch || 'main';
    const baseRaw = `https://raw.githubusercontent.com/${assetContext.owner}/${assetContext.repo}/${branch}`;
    const prefix =
      assetContext.assetsPrefix !== undefined
        ? assetContext.assetsPrefix
        : assetContext.isAstroRepo
        ? 'public'
        : '';
    processed = rawHtml.replace(
      /(<img\s+[^>]*src=["'])(\/[^"']+)(["'][^>]*>)/gi,
      (_match, pfx, relPath, suffix) => {
        const repoPath = prefix ? `${prefix}${relPath}` : relPath.slice(1);
        return `${pfx}${baseRaw}/${repoPath}${suffix}`;
      }
    );
  }

  return DOMPurify.sanitize(processed);
}

export function slugifyVietnamese(input: string): string {
  return (
    input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'bai-viet-moi'
  );
}

export function estimateReadingStats(markdown: string): {
  words: number;
  chars: number;
  minutes: number;
} {
  const clean = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`!\[\]\(\)|_-]/g, ' ')
    .trim();
  const words = clean ? clean.split(/\s+/).length : 0;
  const chars = markdown.length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return { words, chars, minutes };
}

export function composeMarkdownWithFrontmatter(fields: {
  title: string;
  date: string;
  slug: string;
  category: string;
  tags: string[];
  excerpt: string;
  cover?: string;
  draft: boolean;
  markdownBody: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  noindex?: boolean;
}): string {
  const fm: Record<string, any> = {
    title: fields.title,
    date: fields.date,
    slug: fields.slug,
    category: fields.category || 'Ghi chép',
    tags: fields.tags,
    excerpt: fields.excerpt,
    draft: fields.draft,
  };
  if (fields.cover) {
    fm.cover = fields.cover;
  }
  if (fields.seoTitle) {
    fm.seo_title = fields.seoTitle;
  }
  if (fields.seoDescription) {
    fm.seo_description = fields.seoDescription;
  }
  if (fields.canonicalUrl) {
    fm.canonical_url = fields.canonicalUrl;
  }
  if (fields.noindex) {
    fm.noindex = true;
  }
  const yamlText = dumpYaml(fm, { lineWidth: -1 }).trim();
  return `---\n${yamlText}\n---\n\n${fields.markdownBody.trim()}\n`;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
