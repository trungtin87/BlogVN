import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { dump as dumpYaml } from 'js-yaml';

marked.setOptions({
  breaks: true,
  gfm: true,
});

function extractVimeoId(input: string): string | null {
  const m = String(input || '').trim().match(/vimeo\.com\/(?:video\/)?(\d{5,12})/i);
  if (m) return m[1];
  if (/^\d{5,12}$/.test(String(input || '').trim())) return String(input).trim();
  return null;
}

function preprocessAdvancedMarkdown(markdown: string): string {
  let text = markdown || '';

  // Protect code blocks first so we don't mutate inside fenced code
  const codePlaceholders: string[] = [];
  text = text.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (full, lang: string, body: string) => {
    const cleanLang = (lang || '').trim().toLowerCase();
    const idx = codePlaceholders.length;
    if (cleanLang === 'mermaid') {
      const escaped = body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      codePlaceholders.push(
        `\n<div class="dk-mermaid-card"><div class="dk-mermaid-label">Sơ đồ Mermaid</div><pre class="mermaid">${escaped}</pre></div>\n`
      );
      return `@@DK_CODE_BLOCK_${idx}@@`;
    }
    codePlaceholders.push(full);
    return `@@DK_CODE_BLOCK_${idx}@@`;
  });

  // Block math $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, formula: string) => {
    const escaped = formula.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `\n<div class="dk-math-block">$$${escaped}$$</div>\n`;
  });

  // Video embeds @[youtube](...) or @[vimeo](...) or standalone YouTube line
  text = text.replace(/@\[(youtube|vimeo)\]\(([^)]+)\)/gi, (_m, provider: string, target: string) => {
    const p = provider.toLowerCase();
    if (p === 'vimeo') {
      const vid = extractVimeoId(target);
      if (!vid) return _m;
      return `\n<div class="dk-video-embed"><iframe src="https://player.vimeo.com/video/${vid}" title="Vimeo Video" loading="lazy" allowfullscreen></iframe></div>\n`;
    }
    const ytId = extractYouTubeVideoId(target);
    if (!ytId) return _m;
    return `\n<div class="dk-video-embed"><iframe src="https://www.youtube.com/embed/${ytId}" title="YouTube Video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>\n`;
  });

  // Standalone YouTube URL on its own line -> responsive embed
  text = text.replace(
    /^(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[^\s]+)$/gim,
    (line) => {
      const ytId = extractYouTubeVideoId(line);
      if (!ytId) return line;
      return `<div class="dk-video-embed"><iframe src="https://www.youtube.com/embed/${ytId}" title="YouTube Video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
  );

  // Restore fenced code blocks / mermaid cards
  text = text.replace(/@@DK_CODE_BLOCK_(\d+)@@/g, (_m, idxStr) => codePlaceholders[Number(idxStr)] || '');
  return text;
}

function postprocessCalloutsAndLazyImages(html: string): string {
  // Convert Obsidian-style blockquotes > [!NOTE] ... into styled callouts
  let out = html.replace(
    /<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s+([^\n<]*))?(?:<br\s*\/?>|\n)?([\s\S]*?)<\/blockquote>/gi,
    (_m, rawType: string, customTitle: string, rest: string) => {
      const kind = rawType.toLowerCase();
      const defaultTitles: Record<string, string> = {
        note: 'Ghi chú',
        tip: 'Mẹo hay',
        important: 'Quan trọng',
        warning: 'Cảnh báo',
        caution: 'Lưu ý',
      };
      const title = (customTitle || '').trim() || defaultTitles[kind] || rawType;
      return `<div class="dk-callout dk-callout-${kind}"><div class="dk-callout-title">${title}</div><div class="dk-callout-body"><p>${rest}</div></div>`;
    }
  );

  // Ensure every <img> gets loading="lazy" decoding="async"
  out = out.replace(/<img\s+(?![^>]*loading=)/gi, '<img loading="lazy" decoding="async" ');
  return out;
}

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
  const prepared = preprocessAdvancedMarkdown(markdown || '');
  const rawHtml = marked.parse(prepared, { async: false }) as string;
  let processed = postprocessCalloutsAndLazyImages(rawHtml);

  if (assetContext) {
    const branch = assetContext.branch || 'main';
    const baseRaw = `https://raw.githubusercontent.com/${assetContext.owner}/${assetContext.repo}/${branch}`;
    const prefix =
      assetContext.assetsPrefix !== undefined
        ? assetContext.assetsPrefix
        : assetContext.isAstroRepo
        ? 'public'
        : '';
    processed = processed.replace(
      /(<img\s+[^>]*src=["'])(\/[^"']+)(["'][^>]*>)/gi,
      (_match, pfx, relPath, suffix) => {
        const repoPath = prefix ? `${prefix}${relPath}` : relPath.slice(1);
        return `${pfx}${baseRaw}/${repoPath}${suffix}`;
      }
    );
  }

  return DOMPurify.sanitize(processed, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'loading', 'decoding', 'title', 'src', 'class'],
  });
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

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;

  // Bare 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Already a ytimg thumbnail URL -> keep recognized too
  const ytimgMatch = trimmed.match(/i\.ytimg\.com\/vi\/([a-zA-Z0-9_-]{11})/i);
  if (ytimgMatch) {
    return ytimgMatch[1];
  }

  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
      const seg = url.pathname.split('/').filter(Boolean)[0];
      return seg && /^[a-zA-Z0-9_-]{11}$/.test(seg) ? seg : null;
    }
    if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
      const vParam = url.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }
      const pathMatch = url.pathname.match(/\/(?:shorts|embed|live|v|vi)\/([a-zA-Z0-9_-]{11})/);
      if (pathMatch) {
        return pathMatch[1];
      }
    }
  } catch {
    // fallback regex if URL fails
  }

  const fallbackMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  return fallbackMatch ? fallbackMatch[1] : null;
}

export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: 'maxresdefault' | 'hqdefault' = 'maxresdefault'
): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

export async function resolveYouTubeCoverUrl(
  youtubeUrl: string
): Promise<{ videoId: string; thumbnailUrl: string } | null> {
  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!videoId) return null;

  const maxResUrl = getYouTubeThumbnailUrl(videoId, 'maxresdefault');
  const hqUrl = getYouTubeThumbnailUrl(videoId, 'hqdefault');

  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return { videoId, thumbnailUrl: maxResUrl };
  }

  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (thumbnailUrl: string) => {
      if (settled) return;
      settled = true;
      resolve({ videoId, thumbnailUrl });
    };

    const timer = window.setTimeout(() => finish(hqUrl), 3500);
    img.onload = () => {
      window.clearTimeout(timer);
      // YouTube returns a 120x90 grey placeholder when maxresdefault is unavailable
      if (img.naturalWidth > 120) {
        finish(maxResUrl);
      } else {
        finish(hqUrl);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(hqUrl);
    };
    img.src = maxResUrl;
  });
}

