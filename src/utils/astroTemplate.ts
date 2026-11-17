import { dump as dumpYaml } from 'js-yaml';
import type { AstroTemplateId, BlogConfig, ThemeMode } from '../types/blog';

export interface AstroTemplatePresetMeta {
  id: AstroTemplateId;
  name: string;
  inspiration: string;
  toneLabel: 'Sáng' | 'Tối';
  badge: string;
  isDark: boolean;
  description: string;
}

export const ASTRO_TEMPLATE_PRESETS: AstroTemplatePresetMeta[] = [
  {
    id: 'newyorker-light',
    name: 'New Yorker Văn chương',
    inspiration: 'Cảm hứng The New Yorker',
    toneLabel: 'Sáng',
    badge: 'Sáng · Tiểu luận',
    isDark: false,
    description:
      'Giấy ngà ấm (#FAF7F2), kẻ chỉ đôi thanh mảnh, tiêu đề Serif cổ điển và nhịp đọc bài luận sâu sắc.',
  },
  {
    id: 'nytimes-light',
    name: 'NYTimes Nhật báo',
    inspiration: 'Cảm hứng The New York Times',
    toneLabel: 'Sáng',
    badge: 'Sáng · Báo in',
    isDark: false,
    description:
      'Nền trắng tinh khôi (#FFFFFF), bài tiêu điểm lớn cạnh cột tin nhanh, lưới nhật báo 1px sắc nét.',
  },
  {
    id: 'bbc-dark',
    name: 'BBC Studio Tối',
    inspiration: 'Cảm hứng BBC News',
    toneLabel: 'Tối',
    badge: 'Tối · Thời sự',
    isDark: true,
    description:
      'Than chì studio (#121214), điểm nhấn đỏ thẫm, lưới đa bài viết hiện đại tôn vinh ảnh bìa & video.',
  },
  {
    id: 'obsidian-broadsheet',
    name: 'Broadsheet Đêm',
    inspiration: 'Cảm hứng NYT Đêm',
    toneLabel: 'Tối',
    badge: 'Tối · Nhật báo',
    isDark: true,
    description:
      'Mực đêm xanh thẫm (#0B0D12), tiêu đề Serif uy nghiêm và ánh xanh coban dịu mắt đọc ban đêm.',
  },
  {
    id: 'espresso-salon',
    name: 'Salon Suy tư',
    inspiration: 'Cảm hứng Thư phòng Đêm',
    toneLabel: 'Tối',
    badge: 'Tối · Đọc sâu',
    isDark: true,
    description:
      'Nền gỗ espresso ấm áp (#161210), điểm nhấn hổ phách dịu nhẹ và chữ Serif êm cho bài viết dài.',
  },
];

export function normalizeAstroTemplateId(
  raw?: string | null,
  fallbackMode: ThemeMode = 'light'
): AstroTemplateId {
  if (
    raw === 'newyorker-light' ||
    raw === 'nytimes-light' ||
    raw === 'bbc-dark' ||
    raw === 'obsidian-broadsheet' ||
    raw === 'espresso-salon'
  ) {
    return raw;
  }
  if (raw === 'minimal') return 'newyorker-light';
  if (raw === 'editorial') return 'nytimes-light';
  if (raw === 'visual-grid') return 'bbc-dark';
  return fallbackMode === 'dark' ? 'obsidian-broadsheet' : 'newyorker-light';
}

interface ThemeTokenPair {
  bg: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  text2: string;
  muted: string;
  accent: string;
  accentText: string;
  link: string;
  fontDisplay: string;
  fontBody: string;
}

const TEMPLATE_TOKENS: Record<AstroTemplateId, ThemeTokenPair> = {
  'newyorker-light': {
    bg: '#FAF7F2',
    surface: '#F2EDE4',
    card: '#FFFFFF',
    border: '#DDD5C7',
    text: '#141414',
    text2: '#3A352E',
    muted: '#6E665A',
    accent: '#141414',
    accentText: '#FAF7F2',
    link: '#B91C1C',
    fontDisplay: "'Playfair Display', 'Fraunces', Georgia, serif",
    fontBody: "'Lora', Georgia, serif",
  },
  'nytimes-light': {
    bg: '#FFFFFF',
    surface: '#F5F6F8',
    card: '#FFFFFF',
    border: '#D4D4D8',
    text: '#0F172A',
    text2: '#334155',
    muted: '#64748B',
    accent: '#0F172A',
    accentText: '#FFFFFF',
    link: '#1E3A8A',
    fontDisplay: "'Fraunces', 'Playfair Display', Georgia, serif",
    fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  },
  'bbc-dark': {
    bg: '#121214',
    surface: '#1A1B1F',
    card: '#22242A',
    border: '#2E313A',
    text: '#F4F4F5',
    text2: '#D4D4D8',
    muted: '#A1A1AA',
    accent: '#E11D48',
    accentText: '#FFFFFF',
    link: '#FB7185',
    fontDisplay: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  },
  'obsidian-broadsheet': {
    bg: '#0B0D12',
    surface: '#131722',
    card: '#1A1F2E',
    border: '#273043',
    text: '#F3F4F6',
    text2: '#CBD5E1',
    muted: '#94A3B8',
    accent: '#F3F4F6',
    accentText: '#0B0D12',
    link: '#60A5FA',
    fontDisplay: "'Fraunces', Georgia, serif",
    fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  },
  'espresso-salon': {
    bg: '#161210',
    surface: '#201A17',
    card: '#29221E',
    border: '#3B312B',
    text: '#F5EFE6',
    text2: '#D6CBC0',
    muted: '#A39589',
    accent: '#E5A93C',
    accentText: '#161210',
    link: '#FBBF24',
    fontDisplay: "'Playfair Display', 'Fraunces', Georgia, serif",
    fontBody: "'Lora', Georgia, serif",
  },
};

function escapeSingleQuote(val: string): string {
  return String(val || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function buildAstroSiteConfigModule(params: {
  owner: string;
  repo: string;
  config: Partial<BlogConfig>;
  templateId?: AstroTemplateId | string;
}): string {
  const { owner, repo, config } = params;
  const fallbackMode: ThemeMode = config.themeMode === 'dark' ? 'dark' : 'light';
  const templateStyle = normalizeAstroTemplateId(
    params.templateId || config.astroTemplate,
    fallbackMode
  );
  const presetMeta =
    ASTRO_TEMPLATE_PRESETS.find((p) => p.id === templateStyle) || ASTRO_TEMPLATE_PRESETS[0];
  const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  const defaultPagesUrl = isUserSite ? `https://${repo}` : `https://${owner}.github.io/${repo}`;

  const rawIcon = (config.siteIcon || '').trim();
  const normalizedIcon = rawIcon.startsWith('data:image/')
    ? '/favicon.png'
    : rawIcon === './icon.svg' || rawIcon === '/icon.svg' || !rawIcon
    ? '/favicon.svg'
    : rawIcon;

  const siteCfg = {
    siteTitle: (config.siteTitle || repo || 'BlogVN').trim(),
    tagline: (
      config.tagline ||
      `Nhật ký chia sẻ góc nhìn, tiểu luận và ghi chép cá nhân của ${config.authorName || owner}.`
    ).trim(),
    siteIcon: normalizedIcon,
    headerTitle: (config.headerTitle || config.siteTitle || 'BlogVN').trim(),
    headerNavLinks: Array.isArray(config.headerNavLinks)
      ? config.headerNavLinks.filter((l) => l?.label?.trim() && l?.url?.trim())
      : [],
    footerText: (
      config.footerText ||
      `© ${new Date().getFullYear()} ${(config.siteTitle || repo || 'BlogVN').trim()} · Xuất bản trên GitHub Pages.`
    ).trim(),
    footerLinks: Array.isArray(config.footerLinks)
      ? config.footerLinks.filter((l) => l?.label?.trim() && l?.url?.trim())
      : [],
    authorName: (config.authorName || owner || 'Tác giả').trim(),
    authorBio: (
      config.authorBio ||
      'Tác giả blog cá nhân chia sẻ bài viết, quan điểm và ghi chép dài hạn.'
    ).trim(),
    themeMode: presetMeta.isDark ? 'dark' : 'light',
    templateStyle,
    pagesUrl: (config.pagesUrl || defaultPagesUrl).trim().replace(/\/+$/, ''),
    githubOwner: owner,
    githubRepo: repo,
    liveChat: config.liveChat
      ? {
          enabled: Boolean(config.liveChat.enabled),
          title: (config.liveChat.title || 'Trò chuyện với tác giả').trim(),
          welcomeText: (config.liveChat.welcomeText || 'Chọn kênh liên hệ trực tiếp bên dưới.').trim(),
          channels: Array.isArray(config.liveChat.channels)
            ? config.liveChat.channels
                .filter((ch) => ch && ch.id && typeof ch.value === 'string')
                .map((ch) => ({
                  id: ch.id,
                  enabled: Boolean(ch.enabled),
                  value: ch.value.trim(),
                  label: ch.label ? String(ch.label).trim() : undefined,
                }))
            : [],
        }
      : { enabled: false, title: 'Trò chuyện với tác giả', welcomeText: '', channels: [] },
  };

  return `export interface SiteLink {
  label: string;
  url: string;
}

export interface LiveChatChannel {
  id: 'messenger' | 'zalo' | 'telegram' | 'whatsapp' | 'tawkto' | 'crisp' | 'email';
  enabled: boolean;
  value: string;
  label?: string;
}

export interface LiveChatSettings {
  enabled: boolean;
  title?: string;
  welcomeText?: string;
  channels: LiveChatChannel[];
}

export type AstroTemplateStyle =
  | 'newyorker-light'
  | 'nytimes-light'
  | 'bbc-dark'
  | 'obsidian-broadsheet'
  | 'espresso-salon';

export interface SiteIdentityConfig {
  siteTitle: string;
  tagline: string;
  siteIcon: string;
  headerTitle: string;
  headerNavLinks: SiteLink[];
  footerText: string;
  footerLinks: SiteLink[];
  authorName: string;
  authorBio: string;
  themeMode: 'light' | 'dark';
  templateStyle: AstroTemplateStyle;
  pagesUrl: string;
  githubOwner: string;
  githubRepo: string;
  liveChat?: LiveChatSettings;
}

export const SITE_CONFIG: SiteIdentityConfig = ${JSON.stringify(siteCfg, null, 2)};
`;
}

export function buildVietnameseAstroTemplateFiles(params: {
  owner: string;
  repo: string;
  config: Partial<BlogConfig>;
  templateId?: AstroTemplateId | string;
  includeStarterPosts?: boolean;
}): Array<{ path: string; content: string; isBase64?: boolean }> {
  const { owner, repo, config, includeStarterPosts = true } = params;
  const fallbackMode: ThemeMode = config.themeMode === 'dark' ? 'dark' : 'light';
  const templateStyle = normalizeAstroTemplateId(
    params.templateId || config.astroTemplate,
    fallbackMode
  );
  const presetMeta =
    ASTRO_TEMPLATE_PRESETS.find((p) => p.id === templateStyle) || ASTRO_TEMPLATE_PRESETS[0];
  const tokens = TEMPLATE_TOKENS[templateStyle];

  const siteTitle = (config.siteTitle || repo || 'Blog Việt').trim();
  const tagline = (
    config.tagline ||
    'Ghi chép cá nhân, bài luận chuyên sâu và góc nhìn tĩnh tại trên GitHub Pages.'
  ).trim();
  const headerBrand = (config.headerTitle || siteTitle).trim();
  const authorName = (config.authorName || owner || 'Tác giả').trim();
  const today = new Date().toISOString().slice(0, 10);
  const rawIcon = (config.siteIcon || '').trim();
  const hasDataIcon = rawIcon.startsWith('data:image/');
  const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  const defaultPagesUrl = isUserSite ? `https://${repo}` : `https://${owner}.github.io/${repo}`;

  const persistedConfig: Partial<BlogConfig> = {
    ...config,
    siteTitle,
    tagline,
    headerTitle: headerBrand,
    authorName,
    githubOwner: owner,
    githubRepo: repo,
    pagesUrl: (config.pagesUrl || defaultPagesUrl).trim().replace(/\/+$/, ''),
    postsDirectory: 'src/content/bai_viet',
    themeMode: presetMeta.isDark ? 'dark' : 'light',
    astroTemplate: templateStyle,
  };

  const gitignore = `node_modules/
/dist/
/.astro/
.DS_Store
*.log
.env*
`;

  const packageJson = JSON.stringify(
    {
      name: `blogvn-astro-${repo.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'site'}`,
      type: 'module',
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'astro dev',
        build: 'astro build',
        preview: 'astro preview',
      },
      dependencies: {
        astro: '^5.7.13',
      },
    },
    null,
    2
  ) + '\n';

  const tsconfigJson = JSON.stringify(
    {
      extends: 'astro/tsconfigs/strict',
      include: ['.astro/types.d.ts', '**/*'],
      exclude: ['dist'],
    },
    null,
    2
  ) + '\n';

  const astroConfigMjs = `import { defineConfig } from 'astro/config';

const repoOwner = process.env.GITHUB_REPOSITORY_OWNER || '${escapeSingleQuote(owner)}';
const repoFull = process.env.GITHUB_REPOSITORY || '${escapeSingleQuote(owner)}/${escapeSingleQuote(repo)}';
const repoName = repoFull.split('/')[1] || '${escapeSingleQuote(repo)}';
const isUserSite =
  Boolean(repoName && repoOwner) &&
  repoName.toLowerCase() === \`\${repoOwner.toLowerCase()}.github.io\`;

const site =
  process.env.SITE_URL ||
  (repoOwner ? \`https://\${repoOwner}.github.io\` : '${escapeSingleQuote(defaultPagesUrl)}');
const base =
  process.env.BASE_PATH ||
  (repoName && !isUserSite ? \`/\${repoName}\` : '/');

function remarkPrefixLocalAssets() {
  const cleanBase = base === '/' ? '' : base.replace(/\\/+$/, '');
  if (!cleanBase) return () => {};
  const rewriteSrc = (val) => {
    if (typeof val !== 'string') return val;
    if (
      (val.startsWith('/tainguyen/') || val.startsWith('/images/')) &&
      !val.startsWith(cleanBase + '/')
    ) {
      return cleanBase + val;
    }
    return val;
  };
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'image' && typeof node.url === 'string') {
      node.url = rewriteSrc(node.url);
    }
    if (node.type === 'html' && typeof node.value === 'string') {
      node.value = node.value.replace(
        /(src=["'])(\\/(?:tainguyen|images)\\/[^"']+)(["'])/gi,
        (_m, p, rel, s) => p + rewriteSrc(rel) + s
      );
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  };
  return (tree) => walk(tree);
}

export default defineConfig({
  site,
  base,
  output: 'static',
  markdown: {
    remarkPlugins: [remarkPrefixLocalAssets],
  },
});
`;

  const deployWorkflowYml = `name: Build & Deploy Astro Blog (BlogVN)

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm install --no-audit --no-fund

      - name: Configure Pages
        id: pages
        continue-on-error: true
        uses: actions/configure-pages@v5

      - name: Build Astro static site
        env:
          SITE_URL: \${{ steps.pages.outputs.origin || format('https://{0}.github.io', github.repository_owner) }}
          BASE_PATH: \${{ steps.pages.outputs.base_path != '' && steps.pages.outputs.base_path || (github.event.repository.name == format('{0}.github.io', github.repository_owner) && '/' || format('/{0}', github.event.repository.name)) }}
        run: npx astro build

      - name: Ensure .nojekyll
        run: touch dist/.nojekyll

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="14" fill="${tokens.accent}"/>
  <text x="32" y="42" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="28" fill="${tokens.accentText}">${(headerBrand[0] || 'B').toUpperCase()}</text>
</svg>
`;

  const ogDefaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" fill="${tokens.bg}"/>
  <rect x="48" y="48" width="1104" height="534" rx="16" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="2"/>
  <text x="96" y="190" font-family="monospace" font-size="20" fill="${tokens.link}">${presetMeta.name.toUpperCase()}</text>
  <text x="96" y="280" font-family="Georgia, serif" font-weight="700" font-size="58" fill="${tokens.text}">${siteTitle.replace(/[<>&]/g, '')}</text>
  <text x="96" y="355" font-family="sans-serif" font-size="26" fill="${tokens.text2}">${tagline.slice(0, 78).replace(/[<>&]/g, '')}</text>
  <line x1="96" y1="450" x2="1104" y2="450" stroke="${tokens.border}" stroke-width="1"/>
  <text x="96" y="510" font-family="monospace" font-size="22" fill="${tokens.muted}">${authorName.replace(/[<>&]/g, '')} · GitHub Pages Blog</text>
</svg>
`;

  const manifestJson = JSON.stringify(
    {
      name: siteTitle,
      short_name: headerBrand.slice(0, 24),
      description: tagline,
      start_url: './',
      display: 'standalone',
      background_color: tokens.bg,
      theme_color: tokens.accent,
      icons: [
        {
          src: hasDataIcon ? './favicon.png' : './favicon.svg',
          sizes: hasDataIcon ? '256x256' : 'any',
          type: hasDataIcon ? 'image/png' : 'image/svg+xml',
        },
      ],
    },
    null,
    2
  ) + '\n';

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${persistedConfig.pagesUrl || defaultPagesUrl}/sitemap.xml
`;

  const urlUtilsTs = `export function withBase(path = '/'): string {
  if (!path) return import.meta.env.BASE_URL || '/';
  if (/^(https?:|mailto:|tel:|data:|#)/i.test(path)) return path;
  const rawBase = import.meta.env.BASE_URL || '/';
  const cleanBase = rawBase === '/' ? '' : rawBase.replace(/\\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : \`/\${path}\`;
  return \`\${cleanBase}\${cleanPath}\` || '/';
}

export function getPostSlug(entry: { id: string; data?: Record<string, any> }): string {
  const raw = entry.data?.slug || entry.id || 'bai-viet';
  return String(raw).replace(/\\.mdx?$/i, '').split('/').pop() || 'bai-viet';
}

export function getPostTitle(entry: { id: string; data?: Record<string, any> }): string {
  return String(
    entry.data?.tieu_de ||
      entry.data?.title ||
      entry.id ||
      'Chưa đặt tiêu đề'
  );
}

export function getPostDate(entry: { data?: Record<string, any> }): string {
  const raw = entry.data?.ngay || entry.data?.date || entry.data?.pubDate || '';
  const match = String(raw).match(/^(\\d{4}-\\d{2}-\\d{2})/);
  return match ? match[1] : new Date().toISOString().slice(0, 10);
}

export function getPostExcerpt(entry: { body?: string; data?: Record<string, any> }): string {
  const raw =
    entry.data?.mo_ta ||
    entry.data?.excerpt ||
    entry.data?.description ||
    '';
  if (raw) return String(raw);
  const plain = String(entry.body || '')
    .replace(/\`\`\`[\\s\\S]*?\`\`\`/g, '')
    .replace(/[#>*\`!\\[\\]\\(\\)]/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();
  return plain.slice(0, 160) + (plain.length > 160 ? '...' : '');
}

export function getPostCover(entry: { data?: Record<string, any> }): string | undefined {
  const raw =
    entry.data?.anh_bia ||
    entry.data?.cover ||
    entry.data?.heroImage ||
    entry.data?.image;
  if (!raw) return undefined;
  return withBase(String(raw).trim());
}

export function formatVietnameseDate(dateStr?: string): string {
  if (!dateStr) return '';
  const m = String(dateStr).match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (!m) return String(dateStr);
  return \`\${m[3]}/\${m[2]}/\${m[1]}\`;
}

export function estimateReadingTime(body = ''): number {
  const words = String(body).trim().split(/\\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
`;

  const contentConfigTs = `import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const postSchema = z.object({
  tieu_de: z.string().optional(),
  title: z.string().optional(),
  danh_muc: z.union([z.string(), z.array(z.string())]).optional(),
  category: z.string().optional(),
  chuyen_muc: z.string().optional(),
  slug: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  mo_ta: z.string().optional(),
  excerpt: z.string().optional(),
  description: z.string().optional(),
  ngay: z.coerce.string().optional(),
  date: z.coerce.string().optional(),
  pubDate: z.coerce.string().optional(),
  anh_bia: z.string().optional(),
  cover: z.string().optional(),
  heroImage: z.string().optional(),
  image: z.string().optional(),
  nhap: z.boolean().optional().default(false),
  draft: z.boolean().optional().default(false),
  tac_gia: z.string().optional(),
  author: z.string().optional(),
  noi_bat: z.boolean().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  canonical_url: z.string().optional(),
  noindex: z.boolean().optional(),
});

export const collections = {
  bai_viet: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/bai_viet' }),
    schema: postSchema,
  }),
};
`;

  const baseLayoutAstro = `---
import { SITE_CONFIG } from '../cau_hinh/trang_web';
import { withBase } from '../utils/url';

interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
  noindex?: boolean;
  canonical?: string;
  jsonLd?: Record<string, any>;
}

const {
  title = SITE_CONFIG.siteTitle,
  description = SITE_CONFIG.tagline,
  ogImage = '/tainguyen/hinhanh/og-default.svg',
  noindex = false,
  canonical,
  jsonLd,
} = Astro.props;

const fullTitle =
  title === SITE_CONFIG.siteTitle ? title : \`\${title} | \${SITE_CONFIG.siteTitle}\`;
const iconHref = withBase(SITE_CONFIG.siteIcon || '/favicon.svg');
const ogImgHref = withBase(ogImage);
const initialDark = SITE_CONFIG.themeMode === 'dark';
const currentPath = Astro.url.pathname;
const liveChat = SITE_CONFIG.liveChat;
const activeChatChannels = (liveChat?.channels || []).filter(
  (ch) => ch.enabled && ch.value && ch.value.trim().length > 0
);
const directChatChannels = activeChatChannels.filter(
  (ch) => ch.id !== 'tawkto' && ch.id !== 'crisp'
);
const tawkChannel = activeChatChannels.find((ch) => ch.id === 'tawkto');
const crispChannel = activeChatChannels.find((ch) => ch.id === 'crisp');

function resolveChatHref(id: string, rawValue: string): string {
  const val = rawValue.trim();
  if (/^(https?:|mailto:|tel:)/i.test(val)) return val;
  if (id === 'zalo') return \`https://zalo.me/\${encodeURIComponent(val.replace(/^@/, ''))}\`;
  if (id === 'messenger') return \`https://m.me/\${encodeURIComponent(val.replace(/^@/, ''))}\`;
  if (id === 'telegram') return \`https://t.me/\${encodeURIComponent(val.replace(/^@/, ''))}\`;
  if (id === 'whatsapp') return \`https://wa.me/\${val.replace(/[^0-9]/g, '')}\`;
  if (id === 'email') return \`mailto:\${val}\`;
  return val;
}

const mainNav = [
  { label: 'Trang nhất', href: withBase('/') },
  { label: 'Kho bài viết', href: withBase('/bai-viet/') },
];
---

<!doctype html>
<html lang="vi" class={initialDark ? 'dark' : ''}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{fullTitle}</title>
    <meta name="description" content={description} />
    {noindex && <meta name="robots" content="noindex" />}
    {canonical && <link rel="canonical" href={canonical} />}

    <meta property="og:type" content="website" />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={ogImgHref} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={fullTitle} />
    <meta name="twitter:description" content={description} />

    <link rel="icon" href={iconHref} />
    <link rel="apple-touch-icon" href={iconHref} />
    <link rel="manifest" href={withBase('/manifest.webmanifest')} />
    <link rel="sitemap" type="application/xml" title="Sitemap" href={withBase('/sitemap.xml')} />
    <link rel="alternate" type="application/rss+xml" title={\`\${SITE_CONFIG.siteTitle} RSS\`} href={withBase('/rss.xml')} />
    {jsonLd && <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />}

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,400&family=JetBrains+Mono:wght@400;500&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body data-template={SITE_CONFIG.templateStyle}>
    <header class="site-header">
      <div class="wrap nav-inner">
        <a class="brand" href={withBase('/')}>
          <img src={iconHref} alt={SITE_CONFIG.headerTitle} width="28" height="28" />
          <span>{SITE_CONFIG.headerTitle}</span>
        </a>

        <nav class="nav-links" aria-label="Điều hướng chính">
          {mainNav.map((item) => (
            <a
              href={item.href}
              class={currentPath === item.href ? 'active' : ''}
            >
              {item.label}
            </a>
          ))}
          {SITE_CONFIG.headerNavLinks.map((link) => (
            <a
              href={withBase(link.url)}
              target={link.url.startsWith('http') ? '_blank' : undefined}
              rel={link.url.startsWith('http') ? 'noreferrer' : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div class="nav-actions">
          <a class="icon-btn" href={withBase('/rss.xml')} title="RSS Feed" aria-label="RSS Feed">
            RSS
          </a>
          <button id="mobileMenuBtn" class="mobile-menu-btn" type="button" aria-label="Mở menu">
            ☰
          </button>
        </div>
      </div>

      <div id="mobileDrawer" class="mobile-drawer hidden">
        <div class="wrap mobile-drawer-links">
          {mainNav.map((item) => (
            <a href={item.href}>{item.label}</a>
          ))}
          {SITE_CONFIG.headerNavLinks.map((link) => (
            <a href={withBase(link.url)}>{link.label}</a>
          ))}
        </div>
      </div>
    </header>

    <main class="wrap main-content">
      <slot />
    </main>

    <footer class="site-footer">
      <div class="wrap footer-inner">
        <div>
          <p class="footer-copy">{SITE_CONFIG.footerText}</p>
          <p class="footer-sub">Tác giả: {SITE_CONFIG.authorName}</p>
        </div>
        <div class="footer-links">
          <a href={withBase('/bai-viet/')}>Kho bài viết</a>
          <a href={withBase('/rss.xml')}>RSS</a>
          {SITE_CONFIG.footerLinks.map((link) => (
            <a
              href={withBase(link.url)}
              target={link.url.startsWith('http') ? '_blank' : undefined}
              rel={link.url.startsWith('http') ? 'noreferrer' : undefined}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>

    {liveChat?.enabled && directChatChannels.length > 0 && (
      <div id="blogvnLiveChat" class="livechat-dock">
        <div id="livechatPanel" class="livechat-panel hidden" role="dialog" aria-label={liveChat.title || 'Live Chat'}>
          <div class="livechat-head">
            <div>
              <strong>{liveChat.title || 'Trò chuyện với tác giả'}</strong>
              {liveChat.welcomeText && <p>{liveChat.welcomeText}</p>}
            </div>
            <button id="livechatCloseBtn" type="button" aria-label="Đóng hộp chat">✕</button>
          </div>
          <div class="livechat-list">
            {directChatChannels.map((ch) => (
              <a
                class="livechat-item"
                href={resolveChatHref(ch.id, ch.value)}
                target={ch.id === 'email' ? undefined : '_blank'}
                rel={ch.id === 'email' ? undefined : 'noreferrer'}
              >
                <span class="livechat-ch-name">{ch.label || ch.id.toUpperCase()}</span>
                <span class="livechat-ch-arrow">Nhắn ngay →</span>
              </a>
            ))}
          </div>
        </div>
        <button id="livechatToggleBtn" class="livechat-fab" type="button" aria-expanded="false">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Chat</span>
        </button>
      </div>
    )}

    {liveChat?.enabled && tawkChannel?.value && (
      <script is:inline define:vars={{ tawkId: tawkChannel.value }}>
        var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
        (function () {
          var s1 = document.createElement('script'),
            s0 = document.getElementsByTagName('script')[0];
          s1.async = true;
          s1.src = 'https://embed.tawk.to/' + tawkId;
          s1.charset = 'UTF-8';
          s1.setAttribute('crossorigin', '*');
          s0.parentNode.insertBefore(s1, s0);
        })();
      </script>
    )}

    {liveChat?.enabled && crispChannel?.value && (
      <script is:inline define:vars={{ crispId: crispChannel.value }}>
        window.$crisp = [];
        window.CRISP_WEBSITE_ID = crispId;
        (function () {
          var d = document;
          var s = d.createElement('script');
          s.src = 'https://client.crisp.chat/l.js';
          s.async = true;
          d.getElementsByTagName('head')[0].appendChild(s);
        })();
      </script>
    )}

    <script is:inline>
      const mBtn = document.getElementById('mobileMenuBtn');
      const mDrawer = document.getElementById('mobileDrawer');
      if (mBtn && mDrawer) {
        mBtn.addEventListener('click', () => {
          mDrawer.classList.toggle('hidden');
        });
      }
      const chatToggle = document.getElementById('livechatToggleBtn');
      const chatPanel = document.getElementById('livechatPanel');
      const chatClose = document.getElementById('livechatCloseBtn');
      if (chatToggle && chatPanel) {
        chatToggle.addEventListener('click', () => {
          const isHidden = chatPanel.classList.toggle('hidden');
          chatToggle.setAttribute('aria-expanded', String(!isHidden));
        });
        if (chatClose) {
          chatClose.addEventListener('click', () => {
            chatPanel.classList.add('hidden');
            chatToggle.setAttribute('aria-expanded', 'false');
          });
        }
      }
    </script>
  </body>
</html>

<style is:global>
  :root {
    --bg: ${tokens.bg};
    --surface: ${tokens.surface};
    --card: ${tokens.card};
    --border: ${tokens.border};
    --text: ${tokens.text};
    --text-2: ${tokens.text2};
    --muted: ${tokens.muted};
    --accent: ${tokens.accent};
    --accent-text: ${tokens.accentText};
    --link: ${tokens.link};
    --font-display: ${tokens.fontDisplay};
    --font-body: ${tokens.fontBody};
    --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  }

  body[data-template='newyorker-light'] {
    --bg: ${TEMPLATE_TOKENS['newyorker-light'].bg};
    --surface: ${TEMPLATE_TOKENS['newyorker-light'].surface};
    --card: ${TEMPLATE_TOKENS['newyorker-light'].card};
    --border: ${TEMPLATE_TOKENS['newyorker-light'].border};
    --text: ${TEMPLATE_TOKENS['newyorker-light'].text};
    --text-2: ${TEMPLATE_TOKENS['newyorker-light'].text2};
    --muted: ${TEMPLATE_TOKENS['newyorker-light'].muted};
    --accent: ${TEMPLATE_TOKENS['newyorker-light'].accent};
    --accent-text: ${TEMPLATE_TOKENS['newyorker-light'].accentText};
    --link: ${TEMPLATE_TOKENS['newyorker-light'].link};
    --font-display: ${TEMPLATE_TOKENS['newyorker-light'].fontDisplay};
    --font-body: ${TEMPLATE_TOKENS['newyorker-light'].fontBody};
  }

  body[data-template='nytimes-light'] {
    --bg: ${TEMPLATE_TOKENS['nytimes-light'].bg};
    --surface: ${TEMPLATE_TOKENS['nytimes-light'].surface};
    --card: ${TEMPLATE_TOKENS['nytimes-light'].card};
    --border: ${TEMPLATE_TOKENS['nytimes-light'].border};
    --text: ${TEMPLATE_TOKENS['nytimes-light'].text};
    --text-2: ${TEMPLATE_TOKENS['nytimes-light'].text2};
    --muted: ${TEMPLATE_TOKENS['nytimes-light'].muted};
    --accent: ${TEMPLATE_TOKENS['nytimes-light'].accent};
    --accent-text: ${TEMPLATE_TOKENS['nytimes-light'].accentText};
    --link: ${TEMPLATE_TOKENS['nytimes-light'].link};
    --font-display: ${TEMPLATE_TOKENS['nytimes-light'].fontDisplay};
    --font-body: ${TEMPLATE_TOKENS['nytimes-light'].fontBody};
  }

  body[data-template='bbc-dark'] {
    --bg: ${TEMPLATE_TOKENS['bbc-dark'].bg};
    --surface: ${TEMPLATE_TOKENS['bbc-dark'].surface};
    --card: ${TEMPLATE_TOKENS['bbc-dark'].card};
    --border: ${TEMPLATE_TOKENS['bbc-dark'].border};
    --text: ${TEMPLATE_TOKENS['bbc-dark'].text};
    --text-2: ${TEMPLATE_TOKENS['bbc-dark'].text2};
    --muted: ${TEMPLATE_TOKENS['bbc-dark'].muted};
    --accent: ${TEMPLATE_TOKENS['bbc-dark'].accent};
    --accent-text: ${TEMPLATE_TOKENS['bbc-dark'].accentText};
    --link: ${TEMPLATE_TOKENS['bbc-dark'].link};
    --font-display: ${TEMPLATE_TOKENS['bbc-dark'].fontDisplay};
    --font-body: ${TEMPLATE_TOKENS['bbc-dark'].fontBody};
  }

  body[data-template='obsidian-broadsheet'] {
    --bg: ${TEMPLATE_TOKENS['obsidian-broadsheet'].bg};
    --surface: ${TEMPLATE_TOKENS['obsidian-broadsheet'].surface};
    --card: ${TEMPLATE_TOKENS['obsidian-broadsheet'].card};
    --border: ${TEMPLATE_TOKENS['obsidian-broadsheet'].border};
    --text: ${TEMPLATE_TOKENS['obsidian-broadsheet'].text};
    --text-2: ${TEMPLATE_TOKENS['obsidian-broadsheet'].text2};
    --muted: ${TEMPLATE_TOKENS['obsidian-broadsheet'].muted};
    --accent: ${TEMPLATE_TOKENS['obsidian-broadsheet'].accent};
    --accent-text: ${TEMPLATE_TOKENS['obsidian-broadsheet'].accentText};
    --link: ${TEMPLATE_TOKENS['obsidian-broadsheet'].link};
    --font-display: ${TEMPLATE_TOKENS['obsidian-broadsheet'].fontDisplay};
    --font-body: ${TEMPLATE_TOKENS['obsidian-broadsheet'].fontBody};
  }

  body[data-template='espresso-salon'] {
    --bg: ${TEMPLATE_TOKENS['espresso-salon'].bg};
    --surface: ${TEMPLATE_TOKENS['espresso-salon'].surface};
    --card: ${TEMPLATE_TOKENS['espresso-salon'].card};
    --border: ${TEMPLATE_TOKENS['espresso-salon'].border};
    --text: ${TEMPLATE_TOKENS['espresso-salon'].text};
    --text-2: ${TEMPLATE_TOKENS['espresso-salon'].text2};
    --muted: ${TEMPLATE_TOKENS['espresso-salon'].muted};
    --accent: ${TEMPLATE_TOKENS['espresso-salon'].accent};
    --accent-text: ${TEMPLATE_TOKENS['espresso-salon'].accentText};
    --link: ${TEMPLATE_TOKENS['espresso-salon'].link};
    --font-display: ${TEMPLATE_TOKENS['espresso-salon'].fontDisplay};
    --font-body: ${TEMPLATE_TOKENS['espresso-salon'].fontBody};
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    line-height: 1.72;
    -webkit-font-smoothing: antialiased;
  }

  a {
    color: var(--link);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .wrap {
    max-width: 1080px;
    margin: 0 auto;
    padding: 0 20px;
  }

  body[data-template='newyorker-light'] .wrap,
  body[data-template='espresso-salon'] .wrap {
    max-width: 900px;
  }

  body[data-template='nytimes-light'] .wrap,
  body[data-template='obsidian-broadsheet'] .wrap,
  body[data-template='bbc-dark'] .wrap {
    max-width: 1180px;
  }

  .site-header {
    position: sticky;
    top: 0;
    z-index: 40;
    background: color-mix(in srgb, var(--bg) 92%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }

  body[data-template='newyorker-light'] .site-header {
    border-bottom: 3px double var(--border);
  }

  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 60px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.2rem;
    letter-spacing: -0.02em;
    text-decoration: none !important;
  }

  .brand img {
    border-radius: 6px;
    object-fit: cover;
  }

  .nav-links {
    display: none;
    align-items: center;
    gap: 22px;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .nav-links a {
    color: var(--text-2);
    text-decoration: none;
  }

  .nav-links a:hover,
  .nav-links a.active {
    color: var(--text);
    font-weight: 600;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .icon-btn,
  .mobile-menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 0 11px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none !important;
  }

  .mobile-menu-btn {
    min-width: 38px;
    padding: 0 10px;
    font-size: 1rem;
  }

  .mobile-drawer {
    border-top: 1px solid var(--border);
    background: var(--bg);
    padding: 12px 0 16px;
  }

  .mobile-drawer.hidden {
    display: none;
  }

  .mobile-drawer-links {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .mobile-drawer-links a {
    color: var(--text);
    font-size: 0.95rem;
    font-weight: 500;
    padding: 6px 0;
  }

  @media (min-width: 820px) {
    .nav-links {
      display: flex;
    }
    .mobile-menu-btn,
    .mobile-drawer {
      display: none !important;
    }
  }

  .main-content {
    min-height: calc(100vh - 200px);
    padding-top: 28px;
    padding-bottom: 64px;
  }

  .site-footer {
    border-top: 1px solid var(--border);
    background: var(--surface);
    padding: 28px 0;
  }

  body[data-template='newyorker-light'] .site-footer {
    border-top: 3px double var(--border);
  }

  .footer-inner {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .footer-copy {
    margin: 0;
    font-size: 0.88rem;
    color: var(--text-2);
  }

  .footer-sub {
    margin: 4px 0 0;
    font-size: 0.78rem;
    color: var(--muted);
    font-family: var(--font-mono);
  }

  .footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    font-size: 0.84rem;
  }

  .prose {
    font-size: 1.08rem;
    line-height: 1.82;
    color: var(--text-2);
    max-width: 68ch;
  }

  body[data-template='newyorker-light'] .prose > p:first-of-type::first-letter,
  body[data-template='espresso-salon'] .prose > p:first-of-type::first-letter {
    float: left;
    font-family: var(--font-display);
    font-size: 3.4rem;
    line-height: 0.85;
    font-weight: 700;
    color: var(--text);
    padding-right: 10px;
    padding-top: 4px;
  }

  .prose h2,
  .prose h3 {
    font-family: var(--font-display);
    color: var(--text);
    margin-top: 2.1rem;
    margin-bottom: 0.75rem;
    line-height: 1.25;
  }

  .prose p {
    margin: 1.15rem 0;
  }

  .prose img {
    max-width: 100%;
    height: auto;
    border-radius: 10px;
    margin: 1.6rem 0;
    border: 1px solid var(--border);
  }

  .prose blockquote {
    margin: 1.8rem 0;
    padding: 1.1rem 1.25rem;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.15rem;
    color: var(--text);
  }

  .prose pre {
    padding: 1rem;
    border-radius: 10px;
    overflow-x: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 0.88rem;
  }

  .prose code {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: var(--surface);
    padding: 0.15em 0.4em;
    border-radius: 5px;
  }

  .prose pre code {
    background: transparent;
    padding: 0;
  }

  .livechat-dock {
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 60;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
  }

  .livechat-fab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--accent);
    color: var(--accent-text);
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  }

  .livechat-panel {
    width: min(320px, calc(100vw - 36px));
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .livechat-panel.hidden {
    display: none;
  }

  .livechat-head {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .livechat-head strong {
    display: block;
    font-size: 0.92rem;
    font-family: var(--font-display);
  }

  .livechat-head p {
    margin: 4px 0 0;
    font-size: 0.78rem;
    color: var(--text-2);
    line-height: 1.45;
  }

  .livechat-head button {
    border: 0;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: 0.95rem;
    padding: 2px 6px;
  }

  .livechat-list {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .livechat-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 0.84rem;
    font-weight: 600;
    text-decoration: none !important;
  }

  .livechat-item:hover {
    border-color: var(--link);
  }

  .livechat-ch-arrow {
    font-size: 0.76rem;
    color: var(--link);
    font-family: var(--font-mono);
  }
</style>
`;

  const postCardAstro = `---
import {
  estimateReadingTime,
  formatVietnameseDate,
  getPostCover,
  getPostDate,
  getPostExcerpt,
  getPostSlug,
  getPostTitle,
  withBase,
} from '../utils/url';

interface Props {
  entry: any;
  featured?: boolean;
}

const { entry, featured = false } = Astro.props;
const slug = getPostSlug(entry);
const href = withBase(\`/bai-viet/\${slug}/\`);
const title = getPostTitle(entry);
const date = getPostDate(entry);
const excerpt = getPostExcerpt(entry);
const cover = getPostCover(entry);
const category = String(entry.data?.danh_muc || entry.data?.category || 'Bài viết');
const minutes = estimateReadingTime(entry.body || '');
---

<article
  class={\`post-card \${featured ? 'is-featured' : ''}\`}
  data-search={\`\${title} \${excerpt} \${category}\`.toLowerCase()}
>
  <a class="post-card-link" href={href}>
    {cover && (
      <div class="post-cover-wrap">
        <img src={cover} alt={title} loading="lazy" />
      </div>
    )}
    <div class="post-body">
      <div class="post-meta">
        <span class="post-cat">{category}</span>
        <span>·</span>
        <span>{formatVietnameseDate(date)}</span>
        <span>·</span>
        <span>{minutes} phút đọc</span>
      </div>
      <h3 class="post-title">{title}</h3>
      <p class="post-excerpt">{excerpt}</p>
    </div>
  </a>
</article>

<style>
  .post-card {
    border: 1px solid var(--border);
    background: var(--card);
    border-radius: 12px;
    overflow: hidden;
    transition: border-color 0.18s ease, transform 0.18s ease;
  }

  :global(body[data-template='nytimes-light']) .post-card,
  :global(body[data-template='obsidian-broadsheet']) .post-card,
  :global(body[data-template='newyorker-light']) .post-card {
    border-radius: 6px;
  }

  .post-card:hover {
    border-color: var(--link);
    transform: translateY(-1px);
  }

  .post-card-link {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: inherit;
    text-decoration: none !important;
  }

  .post-cover-wrap {
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .post-cover-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .post-body {
    padding: 18px 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .post-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.02em;
    color: var(--muted);
  }

  .post-cat {
    color: var(--link);
    font-weight: 600;
    text-transform: uppercase;
  }

  .post-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.24rem;
    line-height: 1.3;
    color: var(--text);
  }

  .post-card.is-featured .post-title {
    font-size: 1.65rem;
    line-height: 1.2;
  }

  .post-excerpt {
    margin: 0;
    font-size: 0.92rem;
    color: var(--text-2);
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
`;

  const indexAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import PostCard from '../components/PostCard.astro';
import { SITE_CONFIG } from '../cau_hinh/trang_web';
import {
  estimateReadingTime,
  formatVietnameseDate,
  getPostCover,
  getPostDate,
  getPostExcerpt,
  getPostSlug,
  getPostTitle,
  withBase,
} from '../utils/url';

const posts = (await getCollection('bai_viet'))
  .filter((e) => !e.data.nhap && !e.data.draft)
  .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));

const leadPost = posts[0] || null;
const secondaryPosts = posts.slice(1);
const leadCover = leadPost ? getPostCover(leadPost) : undefined;
const leadSlug = leadPost ? getPostSlug(leadPost) : '';
const leadHref = leadPost ? withBase(\`/bai-viet/\${leadSlug}/\`) : '#';

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: SITE_CONFIG.siteTitle,
  description: SITE_CONFIG.tagline,
  url: SITE_CONFIG.pagesUrl,
  author: {
    '@type': 'Person',
    name: SITE_CONFIG.authorName,
  },
};
---

<BaseLayout jsonLd={homeJsonLd}>
  <section class="masthead">
    <div class="masthead-kicker">{SITE_CONFIG.authorName} · Ấn phẩm Blog cá nhân</div>
    <h1>{SITE_CONFIG.siteTitle}</h1>
    <p class="masthead-desc">{SITE_CONFIG.tagline}</p>

    <div class="masthead-tools">
      <input
        id="homeSearchInput"
        type="search"
        placeholder="Tìm bài viết theo tiêu đề, chủ đề..."
        class="search-input"
      />
      <a class="masthead-cta" href={withBase('/bai-viet/')}>Kho bài viết ({posts.length})</a>
    </div>
  </section>

  {leadPost && (
    <section class="lead-section" data-search={\`\${getPostTitle(leadPost)} \${getPostExcerpt(leadPost)}\`.toLowerCase()}>
      <a class="lead-card" href={leadHref}>
        <div class="lead-text">
          <div class="lead-meta">
            <span class="lead-rubric">{String(leadPost.data?.danh_muc || 'Tiêu điểm')}</span>
            <span>·</span>
            <span>{formatVietnameseDate(getPostDate(leadPost))}</span>
            <span>·</span>
            <span>{estimateReadingTime(leadPost.body || '')} phút đọc</span>
          </div>
          <h2>{getPostTitle(leadPost)}</h2>
          <p>{getPostExcerpt(leadPost)}</p>
          <span class="read-more">Đọc trọn bài viết →</span>
        </div>
        {leadCover && (
          <div class="lead-media">
            <img src={leadCover} alt={getPostTitle(leadPost)} />
          </div>
        )}
      </a>
    </section>
  )}

  <section class="posts-section">
    <div class="section-head">
      <h2>Bài viết gần đây</h2>
    </div>

    {posts.length === 0 ? (
      <p class="empty-note">Chưa có bài viết nào được xuất bản.</p>
    ) : (
      <div id="postsGrid" class={\`posts-grid template-\${SITE_CONFIG.templateStyle}\`}>
        {secondaryPosts.map((entry) => (
          <PostCard entry={entry} />
        ))}
      </div>
    )}
    <p id="searchEmptyMsg" class="empty-note hidden">Không tìm thấy bài viết phù hợp với từ khóa của bạn.</p>
  </section>

  <script is:inline>
    const input = document.getElementById('homeSearchInput');
    const grid = document.getElementById('postsGrid');
    const leadSection = document.querySelector('.lead-section');
    const emptyMsg = document.getElementById('searchEmptyMsg');
    if (input && grid) {
      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        const cards = grid.querySelectorAll('.post-card');
        let visible = 0;
        if (leadSection) {
          const leadText = leadSection.getAttribute('data-search') || '';
          const matchLead = !q || leadText.includes(q);
          leadSection.style.display = matchLead ? '' : 'none';
          if (matchLead) visible++;
        }
        cards.forEach((card) => {
          const text = card.getAttribute('data-search') || '';
          const match = !q || text.includes(q);
          card.style.display = match ? '' : 'none';
          if (match) visible++;
        });
        if (emptyMsg) {
          emptyMsg.classList.toggle('hidden', visible > 0);
        }
      });
    }
  </script>
</BaseLayout>

<style>
  .masthead {
    padding: 18px 0 28px;
    border-bottom: 1px solid var(--border);
  }

  :global(body[data-template='newyorker-light']) .masthead {
    text-align: center;
    border-bottom: 3px double var(--border);
    padding: 26px 0 32px;
  }

  :global(body[data-template='newyorker-light']) .masthead-desc {
    margin-left: auto;
    margin-right: auto;
  }

  :global(body[data-template='newyorker-light']) .masthead-tools {
    justify-content: center;
  }

  .masthead-kicker {
    font-family: var(--font-mono);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--link);
    margin-bottom: 10px;
  }

  .masthead h1 {
    margin: 0 0 12px;
    font-family: var(--font-display);
    font-size: clamp(2.1rem, 4.8vw, 3.25rem);
    line-height: 1.12;
    letter-spacing: -0.025em;
  }

  .masthead-desc {
    margin: 0;
    max-width: 62ch;
    color: var(--text-2);
    font-size: 1.02rem;
  }

  .masthead-tools {
    margin-top: 22px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .search-input {
    flex: 1;
    max-width: 420px;
    min-width: 220px;
    min-height: 44px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    font-size: 0.9rem;
    font-family: inherit;
  }

  .masthead-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 18px;
    border-radius: 10px;
    background: var(--accent);
    color: var(--accent-text);
    font-size: 0.86rem;
    font-weight: 600;
    text-decoration: none !important;
  }

  .lead-section {
    padding: 28px 0;
    border-bottom: 1px solid var(--border);
  }

  .lead-card {
    display: grid;
    grid-template-columns: 1fr;
    gap: 22px;
    align-items: center;
    color: inherit;
    text-decoration: none !important;
  }

  @media (min-width: 800px) {
    .lead-card {
      grid-template-columns: 1.15fr 1fr;
      gap: 32px;
    }
  }

  .lead-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--muted);
    margin-bottom: 10px;
  }

  .lead-rubric {
    color: var(--link);
    font-weight: 600;
    text-transform: uppercase;
  }

  .lead-text h2 {
    margin: 0 0 12px;
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 3vw, 2.25rem);
    line-height: 1.18;
    color: var(--text);
  }

  .lead-card:hover .lead-text h2 {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .lead-text p {
    margin: 0 0 14px;
    color: var(--text-2);
    font-size: 1rem;
    line-height: 1.65;
  }

  .read-more {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--link);
  }

  .lead-media {
    aspect-ratio: 16 / 10;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--surface);
  }

  .lead-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .posts-section {
    padding-top: 28px;
  }

  .section-head h2 {
    font-family: var(--font-display);
    font-size: 1.4rem;
    margin: 0 0 18px;
  }

  .posts-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }

  @media (min-width: 720px) {
    .posts-grid.template-newyorker-light,
    .posts-grid.template-espresso-salon {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .posts-grid.template-nytimes-light,
    .posts-grid.template-obsidian-broadsheet,
    .posts-grid.template-bbc-dark {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1024px) {
    .posts-grid.template-nytimes-light,
    .posts-grid.template-obsidian-broadsheet,
    .posts-grid.template-bbc-dark {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .empty-note {
    color: var(--muted);
    padding: 24px 0;
  }

  .hidden {
    display: none;
  }
</style>
`;

  const archiveIndexAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { SITE_CONFIG } from '../../cau_hinh/trang_web';
import { getPostDate } from '../../utils/url';

const entries = (await getCollection('bai_viet'))
  .filter((e) => !e.data.nhap && !e.data.draft)
  .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));

const categories = Array.from(
  new Set(
    entries
      .map((e) => String(e.data?.danh_muc || e.data?.category || 'Bài viết').trim())
      .filter(Boolean)
  )
);
---

<BaseLayout title="Kho bài viết" description="Toàn bộ bài viết, tiểu luận và ghi chép trên blog.">
  <div class="col-header">
    <h1>Kho bài viết</h1>
    <p>Tất cả {entries.length} bài viết đã xuất bản.</p>

    <div class="archive-tools">
      <input
        id="archiveSearchInput"
        type="search"
        placeholder="Tìm trong kho bài viết..."
        class="archive-search"
      />
      {categories.length > 1 && (
        <div id="archiveCatBar" class="cat-bar" role="tablist" aria-label="Lọc theo chuyên mục">
          <button type="button" class="cat-btn active" data-cat="all">
            Tất cả ({entries.length})
          </button>
          {categories.map((cat) => (
            <button type="button" class="cat-btn" data-cat={cat.toLowerCase()}>
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>

  {entries.length === 0 ? (
    <p style="color: var(--muted);">Chưa có bài viết nào được xuất bản.</p>
  ) : (
    <div id="archiveGrid" class={\`col-grid template-\${SITE_CONFIG.templateStyle}\`}>
      {entries.map((entry) => (
        <div
          class="archive-item"
          data-cat={String(entry.data?.danh_muc || entry.data?.category || 'Bài viết').trim().toLowerCase()}
        >
          <PostCard entry={entry} />
        </div>
      ))}
    </div>
  )}
  <p id="archiveEmptyMsg" class="empty-archive hidden">Không có bài viết nào khớp bộ lọc hiện tại.</p>

  <script is:inline>
    const archiveInput = document.getElementById('archiveSearchInput');
    const archiveCatBar = document.getElementById('archiveCatBar');
    const archiveGrid = document.getElementById('archiveGrid');
    const archiveEmpty = document.getElementById('archiveEmptyMsg');
    let currentCat = 'all';

    function filterArchive() {
      if (!archiveGrid) return;
      const q = (archiveInput ? archiveInput.value : '').trim().toLowerCase();
      const items = archiveGrid.querySelectorAll('.archive-item');
      let shown = 0;
      items.forEach((item) => {
        const cat = item.getAttribute('data-cat') || '';
        const card = item.querySelector('.post-card');
        const txt = card ? (card.getAttribute('data-search') || '') : '';
        const okCat = currentCat === 'all' || cat === currentCat;
        const okSearch = !q || txt.includes(q);
        const visible = okCat && okSearch;
        item.style.display = visible ? '' : 'none';
        if (visible) shown++;
      });
      if (archiveEmpty) {
        archiveEmpty.classList.toggle('hidden', shown > 0);
      }
    }

    if (archiveInput) {
      archiveInput.addEventListener('input', filterArchive);
    }
    if (archiveCatBar) {
      archiveCatBar.querySelectorAll('.cat-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentCat = btn.getAttribute('data-cat') || 'all';
          archiveCatBar.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          filterArchive();
        });
      });
    }
  </script>
</BaseLayout>

<style>
  .col-header {
    padding-bottom: 20px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .col-header h1 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 2rem;
  }
  .col-header p {
    margin: 0;
    color: var(--text-2);
  }
  .archive-tools {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .archive-search {
    max-width: 420px;
    min-height: 42px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    font-size: 0.9rem;
    font-family: inherit;
  }
  .cat-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cat-btn {
    min-height: 36px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-2);
    font-size: 0.82rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
  }
  .cat-btn.active {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
  }
  .col-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 720px) {
    .col-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (min-width: 1024px) {
    .col-grid.template-nytimes-light,
    .col-grid.template-obsidian-broadsheet,
    .col-grid.template-bbc-dark {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  .empty-archive {
    color: var(--muted);
    padding: 20px 0;
  }
  .hidden {
    display: none;
  }
</style>
`;

  const articleDetailAstro = `---
import { getCollection, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { SITE_CONFIG } from '../../cau_hinh/trang_web';
import {
  estimateReadingTime,
  formatVietnameseDate,
  getPostCover,
  getPostDate,
  getPostExcerpt,
  getPostSlug,
  getPostTitle,
  withBase,
} from '../../utils/url';

export async function getStaticPaths() {
  const entries = (await getCollection('bai_viet'))
    .filter((e) => !e.data.nhap && !e.data.draft)
    .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));
  return entries.map((entry) => ({
    params: { slug: getPostSlug(entry) },
    props: { entry, allEntries: entries },
  }));
}

const { entry, allEntries = [] } = Astro.props;
const { Content } = await render(entry);
const title = getPostTitle(entry);
const date = getPostDate(entry);
const excerpt = getPostExcerpt(entry);
const cover = getPostCover(entry);
const category = String(entry.data?.danh_muc || entry.data?.category || 'Bài viết');
const tags: string[] = Array.isArray(entry.data?.tags) ? entry.data.tags : [];
const minutes = estimateReadingTime(entry.body || '');
const resolvedAuthor = String(entry.data?.tac_gia || entry.data?.author || SITE_CONFIG.authorName);
const pageSlug = getPostSlug(entry);
const canonicalTarget =
  entry.data?.canonical_url ||
  \`\${SITE_CONFIG.pagesUrl.replace(/\\/+$/, '')}\${withBase(\`/bai-viet/\${pageSlug}/\`)}\`;

const relatedPosts = allEntries
  .filter((other) => getPostSlug(other) !== pageSlug)
  .sort((a, b) => {
    const catA = String(a.data?.danh_muc || a.data?.category || '') === category ? 2 : 0;
    const catB = String(b.data?.danh_muc || b.data?.category || '') === category ? 2 : 0;
    const tagsA: string[] = Array.isArray(a.data?.tags) ? a.data.tags : [];
    const tagsB: string[] = Array.isArray(b.data?.tags) ? b.data.tags : [];
    const overlapA = tagsA.filter((t) => tags.includes(t)).length;
    const overlapB = tagsB.filter((t) => tags.includes(t)).length;
    return catB + overlapB - (catA + overlapA) || getPostDate(b).localeCompare(getPostDate(a));
  })
  .slice(0, 3);

const blogPostingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: entry.data?.seo_title || title,
  description: entry.data?.seo_description || excerpt,
  datePublished: date,
  mainEntityOfPage: canonicalTarget,
  ...(cover ? { image: cover } : {}),
  author: {
    '@type': 'Person',
    name: resolvedAuthor,
  },
  publisher: {
    '@type': 'Person',
    name: SITE_CONFIG.authorName,
  },
};
---

<BaseLayout
  title={entry.data?.seo_title || title}
  description={entry.data?.seo_description || excerpt}
  ogImage={cover}
  noindex={Boolean(entry.data?.noindex)}
  canonical={entry.data?.canonical_url}
  jsonLd={blogPostingJsonLd}
>
  <article class="article-wrap">
    <a class="back-link" href={withBase('/bai-viet/')}>← Quay lại kho bài viết</a>

    <header class="article-header">
      <div class="article-meta">
        <span class="meta-cat">{category}</span>
        <span>·</span>
        <span>{formatVietnameseDate(date)}</span>
        <span>·</span>
        <span>{minutes} phút đọc</span>
      </div>
      <h1>{title}</h1>
      {excerpt && <p class="article-lead">{excerpt}</p>}
      <div class="article-byline">Bởi <strong>{resolvedAuthor}</strong></div>
    </header>

    {cover && (
      <figure class="article-cover">
        <img src={cover} alt={title} />
      </figure>
    )}

    <div class="prose">
      <Content />
    </div>

    {tags.length > 0 && (
      <div class="tag-row">
        Chủ đề: {tags.map((t) => \`#\${t}\`).join(' · ')}
      </div>
    )}

    <aside class="author-box">
      <div class="author-name">{resolvedAuthor}</div>
      <p class="author-bio">{SITE_CONFIG.authorBio}</p>
    </aside>
  </article>

  {relatedPosts.length > 0 && (
    <section class="related-section">
      <h2 class="related-title">Bài viết liên quan</h2>
      <div class="related-grid">
        {relatedPosts.map((rel) => (
          <PostCard entry={rel} />
        ))}
      </div>
    </section>
  )}
</BaseLayout>

<style>
  .article-wrap {
    max-width: 720px;
    margin: 0 auto;
  }

  .back-link {
    display: inline-block;
    font-size: 0.86rem;
    font-weight: 500;
    margin-bottom: 20px;
  }

  .article-header {
    padding-bottom: 22px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 26px;
  }

  .article-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    color: var(--muted);
    margin-bottom: 12px;
  }

  .meta-cat {
    color: var(--link);
    font-weight: 600;
    text-transform: uppercase;
  }

  .article-header h1 {
    margin: 0 0 12px;
    font-family: var(--font-display);
    font-size: clamp(1.9rem, 4vw, 2.7rem);
    line-height: 1.15;
  }

  .article-lead {
    margin: 0 0 12px;
    font-size: 1.08rem;
    color: var(--text-2);
    line-height: 1.6;
  }

  .article-byline {
    font-size: 0.88rem;
    color: var(--muted);
  }

  .tag-row {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--muted);
  }

  .article-cover {
    margin: 0 0 28px;
  }

  .article-cover img {
    width: 100%;
    max-height: 440px;
    object-fit: cover;
    border-radius: 12px;
    border: 1px solid var(--border);
  }

  .author-box {
    margin-top: 36px;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface);
  }

  .author-name {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.05rem;
    margin-bottom: 6px;
  }

  .author-bio {
    margin: 0;
    font-size: 0.92rem;
    color: var(--text-2);
  }

  .related-section {
    max-width: 960px;
    margin: 48px auto 0;
    padding-top: 28px;
    border-top: 1px solid var(--border);
  }

  .related-title {
    margin: 0 0 18px;
    font-family: var(--font-display);
    font-size: 1.35rem;
  }

  .related-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
  }

  @media (min-width: 720px) {
    .related-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
`;

  const page404Astro = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import { withBase } from '../utils/url';
---

<BaseLayout title="404 — Không tìm thấy trang" noindex={true}>
  <div class="box-404">
    <p class="code">404</p>
    <h1>Không tìm thấy nội dung này</h1>
    <p>Liên kết có thể đã thay đổi hoặc bài viết chưa được xuất bản.</p>
    <a class="btn-home" href={withBase('/')}>Quay về trang nhất</a>
  </div>
</BaseLayout>

<style>
  .box-404 {
    max-width: 480px;
    margin: 48px auto;
    padding: 32px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--surface);
    text-align: center;
  }
  .code {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 3rem;
    font-weight: 700;
  }
  h1 {
    margin: 0 0 10px;
    font-size: 1.3rem;
  }
  p {
    color: var(--text-2);
    margin: 0 0 20px;
  }
  .btn-home {
    display: inline-block;
    padding: 10px 18px;
    border-radius: 10px;
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 600;
    text-decoration: none !important;
  }
</style>
`;

  const rssXmlTs = `import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_CONFIG } from '../cau_hinh/trang_web';
import { getPostDate, getPostExcerpt, getPostSlug, getPostTitle, withBase } from '../utils/url';

function escXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async ({ site }) => {
  const origin = site ? site.toString().replace(/\\/+$/, '') : SITE_CONFIG.pagesUrl.replace(/\\/+$/, '');
  const posts = (await getCollection('bai_viet'))
    .filter((e) => !e.data.nhap && !e.data.draft && !e.data.noindex)
    .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)))
    .slice(0, 40);

  const items = posts
    .map((entry) => {
      const slug = getPostSlug(entry);
      const link = \`\${origin}\${withBase(\`/bai-viet/\${slug}/\`)}\`;
      const rawDate = getPostDate(entry);
      const parsedMs = Date.parse(rawDate);
      const pubDate = Number.isNaN(parsedMs) ? new Date().toUTCString() : new Date(parsedMs).toUTCString();
      return [
        '    <item>',
        \`      <title>\${escXml(getPostTitle(entry))}</title>\`,
        \`      <link>\${escXml(link)}</link>\`,
        \`      <guid isPermaLink="true">\${escXml(link)}</guid>\`,
        \`      <pubDate>\${escXml(pubDate)}</pubDate>\`,
        \`      <description>\${escXml(getPostExcerpt(entry))}</description>\`,
        '    </item>',
      ].join('\\n');
    })
    .join('\\n');

  const homeUrl = \`\${origin}\${withBase('/')}\`;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    \`    <title>\${escXml(SITE_CONFIG.siteTitle)}</title>\`,
    \`    <link>\${escXml(homeUrl)}</link>\`,
    \`    <description>\${escXml(SITE_CONFIG.tagline)}</description>\`,
    '    <language>vi</language>',
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
`;

  const sitemapXmlTs = `import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_CONFIG } from '../cau_hinh/trang_web';
import { getPostDate, getPostSlug, withBase } from '../utils/url';

function escXml(str: string): string {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const GET: APIRoute = async ({ site }) => {
  const origin = site ? site.toString().replace(/\\/+$/, '') : SITE_CONFIG.pagesUrl.replace(/\\/+$/, '');
  const posts = (await getCollection('bai_viet')).filter(
    (e) => !e.data.nhap && !e.data.draft && !e.data.noindex
  );

  const staticRoutes = ['/', '/bai-viet/'];
  const urls = [
    ...staticRoutes.map((r) => ({
      loc: \`\${origin}\${withBase(r)}\`,
      lastmod: new Date().toISOString().slice(0, 10),
    })),
    ...posts.map((p) => ({
      loc: \`\${origin}\${withBase(\`/bai-viet/\${getPostSlug(p)}/\`)}\`,
      lastmod: getPostDate(p),
    })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) => \`  <url><loc>\${escXml(u.loc)}</loc><lastmod>\${escXml(u.lastmod)}</lastmod></url>\`
    ),
    '</urlset>',
    '',
  ].join('\\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
`;

  const makeMarkdown = (fm: Record<string, any>, body: string) =>
    `---\n${dumpYaml(fm, { lineWidth: -1 }).trim()}\n---\n\n${body.trim()}\n`;

  const starterPost1 = makeMarkdown(
    {
      tieu_de: `Chào mừng đến với ${siteTitle}`,
      danh_muc: 'Tiểu luận',
      chuyen_muc: 'tieu-luan',
      slug: 'chao-mung-den-voi-blog',
      tags: ['astro', 'blogvn', 'github-pages'],
      mo_ta: `Bài viết khởi đầu của ${siteTitle} với giao diện ${presetMeta.name}, tối ưu cho việc đọc sâu và xuất bản lâu dài.`,
      ngay: today,
      anh_bia: '/tainguyen/hinhanh/og-default.svg',
      nhap: false,
    },
    `Chào mừng bạn ghé thăm **${siteTitle}** — không gian viết và lưu trữ suy nghĩ cá nhân do **${authorName}** biên soạn và xuất bản trực tiếp lên GitHub Pages.

## Tinh thần của một ấn phẩm cá nhân

Khi viết trên một nền tảng do chính bạn làm chủ, từng câu chữ không bị cuốn vào vòng xoáy thuật toán hay giao diện rối mắt. Trang blog này chỉ phục vụ một mục tiêu duy nhất: giúp người viết tập trung viết hay và người đọc tập trung đọc sâu.

## Những gì đã được cấu hình sẵn

- **Hạ tầng SEO hoàn chỉnh**: \`sitemap.xml\`, \`robots.txt\`, RSS Feed và dữ liệu có cấu trúc \`BlogPosting\` JSON-LD được sinh tự động.
- **Định dạng Markdown bền vững**: Mọi bài viết được lưu trong thư mục \`src/content/bai_viet\` ngay trên GitHub của riêng bạn.
- **Ảnh bìa linh hoạt**: Hỗ trợ tải ảnh nén trực tiếp hoặc trích xuất ảnh đại diện độ phân giải cao từ video YouTube.

> Chúc bạn luôn giữ được niềm vui viết lách đều đặn và những trang viết sáng rõ theo năm tháng.`
  );

  const starterPost2 = makeMarkdown(
    {
      tieu_de: 'Nghệ thuật giữ cấu trúc bài viết sáng rõ trên di động',
      danh_muc: 'Kỹ năng viết',
      chuyen_muc: 'ky-nang-viet',
      slug: 'giu-cau-truc-bai-viet-sang-ro',
      tags: ['viet-lach', 'markdown', 'bien-tap'],
      mo_ta: 'Cách chia đoạn, đặt tiêu đề phụ và chọn ảnh bìa thu hút để bài blog luôn dễ đọc trên cả điện thoại và máy tính.',
      ngay: today,
      anh_bia: '/tainguyen/hinhanh/og-default.svg',
      nhap: false,
    },
    `## Độc giả ngày nay đọc trên màn hình nhỏ

Phần lớn người đọc sẽ tiếp cận bài viết của bạn từ điện thoại trước khi mở máy tính. Một đoạn văn dài mười dòng trên màn hình rộng có thể biến thành một bức tường chữ dày đặc trên màn hình 390px.

### Ba thói quen biên tập hiệu quả

1. **Giữ đoạn mở đầu súc tích**: Nêu thẳng vấn đề hoặc câu hỏi trung tâm trong 2–3 câu đầu tiên.
2. **Dùng đề mục \`##\` làm nhịp thở**: Cứ sau khoảng 250–300 chữ nên có một tiêu đề phụ rõ ý.
3. **Tối ưu phần mô tả ngắn và Slug**: Giúp đường dẫn sạch đẹp khi chia sẻ lên mạng xã hội hoặc Google Search.`
  );

  const starterPost3 = makeMarkdown(
    {
      tieu_de: 'Vì sao Markdown và Git là kho lưu trữ lâu dài tốt nhất cho người viết',
      danh_muc: 'Góc nhìn',
      chuyen_muc: 'goc-nhin',
      slug: 'markdown-va-git-cho-nguoi-viet',
      tags: ['markdown', 'git', 'tu-chu'],
      mo_ta: 'Làm chủ hoàn toàn dữ liệu bài viết bằng tệp văn bản thuần túy, không phụ thuộc nền tảng đóng.',
      ngay: today,
      anh_bia: '/tainguyen/hinhanh/og-default.svg',
      nhap: false,
    },
    `## Tuổi thọ của tệp văn bản thuần

Nhiều nền tảng blog miễn phí xuất hiện rồi biến mất sau vài năm, kéo theo toàn bộ công sức viết lách của tác giả. Ngược lại, một tệp \`.md\` thuần túy luôn có thể mở được bằng bất kỳ trình soạn thảo nào từ nay đến hàng chục năm sau.

## Kết hợp sức mạnh GitHub Pages

Mỗi lần nhấn xuất bản trong BlogVN, bài viết của bạn được lưu như một bản commit minh bạch có lịch sử chỉnh sửa rõ ràng — vừa an toàn vừa hoàn toàn miễn phí hosting trọn đời.`
  );

  const files: Array<{ path: string; content: string; isBase64?: boolean }> = [
    { path: '.gitignore', content: gitignore },
    { path: 'package.json', content: packageJson },
    { path: 'tsconfig.json', content: tsconfigJson },
    { path: 'astro.config.mjs', content: astroConfigMjs },
    { path: '.github/workflows/deploy-astro.yml', content: deployWorkflowYml },
    { path: '.blogvn/site-config.json', content: JSON.stringify(persistedConfig, null, 2) + '\n' },
    { path: 'public/.nojekyll', content: '' },
    { path: 'public/robots.txt', content: robotsTxt },
    { path: 'public/favicon.svg', content: faviconSvg },
    { path: 'public/manifest.webmanifest', content: manifestJson },
    { path: 'public/tainguyen/hinhanh/og-default.svg', content: ogDefaultSvg },
    { path: 'public/tainguyen/hinhanh/uploads/.gitkeep', content: '' },
    {
      path: 'src/cau_hinh/trang_web.ts',
      content: buildAstroSiteConfigModule({
        owner,
        repo,
        config: persistedConfig,
        templateId: templateStyle,
      }),
    },
    { path: 'src/utils/url.ts', content: urlUtilsTs },
    { path: 'src/content.config.ts', content: contentConfigTs },
    { path: 'src/layouts/BaseLayout.astro', content: baseLayoutAstro },
    { path: 'src/components/PostCard.astro', content: postCardAstro },
    { path: 'src/pages/index.astro', content: indexAstro },
    { path: 'src/pages/bai-viet/index.astro', content: archiveIndexAstro },
    { path: 'src/pages/bai-viet/[slug].astro', content: articleDetailAstro },
    { path: 'src/pages/404.astro', content: page404Astro },
    { path: 'src/pages/rss.xml.ts', content: rssXmlTs },
    { path: 'src/pages/sitemap.xml.ts', content: sitemapXmlTs },
  ];

  if (includeStarterPosts) {
    files.push(
      { path: 'src/content/bai_viet/chao-mung-den-voi-blog.md', content: starterPost1 },
      { path: 'src/content/bai_viet/giu-cau-truc-bai-viet-sang-ro.md', content: starterPost2 },
      { path: 'src/content/bai_viet/markdown-va-git-cho-nguoi-viet.md', content: starterPost3 }
    );
  }

  if (hasDataIcon) {
    files.push({
      path: 'public/favicon.png',
      content: rawIcon.replace(/^data:[^;]+;base64,/, ''),
      isBase64: true,
    });
  }

  return files;
}
