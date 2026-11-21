import { isBackendAvailable } from './githubClient';
import { slugifyVietnamese } from './markdown';

export interface SeoOptimizationSuggestion {
  seoTitle: string;
  seoDescription: string;
  slug: string;
  excerpt: string;
  tags: string[];
  imageAltSuggestions: string[];
  mode: 'ai' | 'local';
}

function stripMarkdownToPlainText(markdown: string): string {
  return (markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*`~|_$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampSentence(text: string, maxLen: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.6 ? sliced.slice(0, lastSpace) : sliced).trim() + '…';
}

function buildLocalSeoOptimization(params: {
  title: string;
  category: string;
  markdownBody: string;
  tags: string[];
}): SeoOptimizationSuggestion {
  const cleanTitle = params.title.trim() || 'Bài viết mới';
  const plain = stripMarkdownToPlainText(params.markdownBody);

  // Build SEO title (~50-60 chars)
  const seoTitle =
    cleanTitle.length >= 28 && cleanTitle.length <= 62
      ? cleanTitle
      : cleanTitle.length > 62
      ? clampSentence(cleanTitle, 60)
      : params.category
      ? clampSentence(`${cleanTitle} — ${params.category}`, 60)
      : cleanTitle;

  // Build meta description (140-158 chars)
  const paragraphs = (params.markdownBody || '')
    .split(/\n\s*\n/)
    .map((p) => stripMarkdownToPlainText(p))
    .filter((p) => p.length > 30 && !p.startsWith('!'));

  const baseSummary = paragraphs[0] || plain || cleanTitle;
  const seoDescription = clampSentence(baseSummary, 155);
  const excerpt = clampSentence(baseSummary, 150);

  // Extract headings & candidate keywords for tags if missing
  const headings = [...(params.markdownBody || '').matchAll(/^#{1,3}\s+(.+)$/gm)]
    .map((m) => m[1].trim())
    .filter(Boolean);

  const normalizedTags = new Set<string>(
    (params.tags || []).map((t) => t.trim()).filter(Boolean)
  );
  if (params.category?.trim() && normalizedTags.size < 4) {
    normalizedTags.add(slugifyVietnamese(params.category));
  }
  for (const h of headings) {
    if (normalizedTags.size >= 5) break;
    const words = h
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join(' ');
    if (words.length >= 3) {
      normalizedTags.add(slugifyVietnamese(words));
    }
  }

  // Generate alt text suggestions for images in markdown
  const imgMatches = [...(params.markdownBody || '').matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)];
  const imageAltSuggestions = imgMatches.map((m, i) => {
    const existingAlt = (m[1] || '').trim();
    if (existingAlt) return existingAlt;
    const fileStem = (m[2] || '')
      .split('/')
      .pop()
      ?.replace(/\.[^.]+$/, '')
      .replace(/^\d{8}-/, '')
      .replace(/-[a-f0-9]{6}$/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    return fileStem
      ? `Minh họa ${fileStem} — ${cleanTitle}`
      : `Hình minh họa ${i + 1} trong bài ${cleanTitle}`;
  });

  return {
    seoTitle,
    seoDescription,
    slug: slugifyVietnamese(cleanTitle),
    excerpt,
    tags: Array.from(normalizedTags).slice(0, 5),
    imageAltSuggestions,
    mode: 'local',
  };
}

export async function autoOptimizePostSeo(params: {
  title: string;
  category: string;
  markdownBody: string;
  tags: string[];
}): Promise<SeoOptimizationSuggestion> {
  const hasBackend = await isBackendAvailable();
  if (hasBackend) {
    try {
      const resp = await fetch('/api/seo/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json?.ok && json?.result) {
          const r = json.result;
          return {
            seoTitle: String(r.seoTitle || params.title),
            seoDescription: String(r.seoDescription || ''),
            slug: slugifyVietnamese(String(r.slug || params.title)),
            excerpt: String(r.excerpt || r.seoDescription || ''),
            tags: Array.isArray(r.tags) ? r.tags.map(String).filter(Boolean).slice(0, 6) : params.tags,
            imageAltSuggestions: Array.isArray(r.imageAltSuggestions)
              ? r.imageAltSuggestions.map(String)
              : [],
            mode: 'ai',
          };
        }
      }
    } catch {
      // Fallback to local rule-based optimizer
    }
  }
  return buildLocalSeoOptimization(params);
}

export function applyMissingImageAltSuggestions(
  markdownBody: string,
  suggestions: string[]
): { updatedMarkdown: string; updatedCount: number } {
  if (!markdownBody || suggestions.length === 0) {
    return { updatedMarkdown: markdownBody, updatedCount: 0 };
  }
  let idx = 0;
  let updatedCount = 0;
  const updatedMarkdown = markdownBody.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (full, currentAlt: string, target: string) => {
      const altSuggestion = suggestions[idx] || '';
      idx++;
      if (!currentAlt.trim() && altSuggestion) {
        updatedCount++;
        return `![${altSuggestion}](${target})`;
      }
      return full;
    }
  );
  return { updatedMarkdown, updatedCount };
}
