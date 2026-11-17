import { dump as dumpYaml } from 'js-yaml';
import type { AstroTemplateId, BlogConfig } from '../types/blog';

export interface AstroTemplatePresetMeta {
  id: AstroTemplateId;
  name: string;
  badge: string;
  description: string;
}

export const ASTRO_TEMPLATE_PRESETS: AstroTemplatePresetMeta[] = [
  {
    id: 'editorial',
    name: 'Tạp chí Biên tập',
    badge: 'Cân bằng',
    description:
      'Lưới 2 cột thanh thoát, không hiển thị hộp mục lục tự động, giữ đầy đủ thẻ SEO, RSS và JSON-LD.',
  },
  {
    id: 'minimal',
    name: 'Tối giản Tập trung',
    badge: 'Đọc sâu',
    description:
      'Luồng bài viết 1 cột thoáng đãng theo phong cách ghi chép cá nhân, tối đa sự tập trung vào nội dung.',
  },
  {
    id: 'visual-grid',
    name: 'Lưới Hình ảnh & Video',
    badge: 'Media / YouTube',
    description:
      'Lưới 3 cột tôn vinh ảnh bìa khổ rộng (hỗ trợ ảnh đại diện trích từ link YouTube) và tìm kiếm nhanh.',
  },
];

function escapeSingleQuote(val: string): string {
  return String(val || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function buildAstroSiteConfigModule(params: {
  owner: string;
  repo: string;
  config: Partial<BlogConfig>;
  templateId?: AstroTemplateId;
}): string {
  const { owner, repo, config } = params;
  const templateStyle: AstroTemplateId =
    params.templateId || config.astroTemplate || 'editorial';
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
      `Nhật ký chia sẻ kiến thức và ghi chép cá nhân của ${config.authorName || owner}.`
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
      'Tác giả blog cá nhân chia sẻ góc nhìn về công nghệ, viết lách và cuộc sống.'
    ).trim(),
    themeMode: config.themeMode === 'dark' ? 'dark' : 'light',
    templateStyle,
    pagesUrl: (config.pagesUrl || defaultPagesUrl).trim().replace(/\/+$/, ''),
    githubOwner: owner,
    githubRepo: repo,
  };

  return `export interface SiteLink {
  label: string;
  url: string;
}

export type AstroTemplateStyle = 'editorial' | 'minimal' | 'visual-grid';

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
}

export const SITE_CONFIG: SiteIdentityConfig = ${JSON.stringify(siteCfg, null, 2)};
`;
}

export function buildVietnameseAstroTemplateFiles(params: {
  owner: string;
  repo: string;
  config: Partial<BlogConfig>;
  templateId?: AstroTemplateId;
}): Array<{ path: string; content: string; isBase64?: boolean }> {
  const { owner, repo, config } = params;
  const templateStyle: AstroTemplateId =
    params.templateId || config.astroTemplate || 'editorial';
  const siteTitle = (config.siteTitle || repo || 'Blog Việt').trim();
  const tagline = (
    config.tagline ||
    'Ghi chép cá nhân, chia sẻ kiến thức và lưu trữ lâu dài trên GitHub Pages.'
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

export default defineConfig({
  site,
  base,
  output: 'static',
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
  <rect width="64" height="64" rx="16" fill="#111827"/>
  <path d="M20 18h14c6.627 0 12 4.925 12 11 0 3.7-2 7-5.1 9 3.7 1.7 6.1 5.3 6.1 9.5C47 54 41.4 58 34.2 58H20V18z" fill="#FAFAFA" opacity="0.14"/>
  <text x="32" y="42" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="28" fill="#FAFAFA">${(headerBrand[0] || 'B').toUpperCase()}</text>
</svg>
`;

  const ogDefaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" fill="#111827"/>
  <rect x="48" y="48" width="1104" height="534" rx="28" fill="#181C26" stroke="#2B3245" stroke-width="2"/>
  <text x="96" y="250" font-family="Georgia, serif" font-weight="700" font-size="60" fill="#F9FAFB">${siteTitle.replace(/[<>&]/g, '')}</text>
  <text x="96" y="325" font-family="sans-serif" font-size="28" fill="#9CA3AF">${tagline.slice(0, 82).replace(/[<>&]/g, '')}</text>
  <text x="96" y="510" font-family="monospace" font-size="22" fill="#60A5FA">${authorName.replace(/[<>&]/g, '')} · GitHub Pages Astro Blog</text>
</svg>
`;

  const manifestJson = JSON.stringify(
    {
      name: siteTitle,
      short_name: headerBrand.slice(0, 24),
      description: tagline,
      start_url: './',
      display: 'standalone',
      background_color: config.themeMode === 'dark' ? '#0B0D12' : '#FAFAFA',
      theme_color: '#111827',
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

Sitemap: ${(persistedConfig.pagesUrl || defaultPagesUrl)}/sitemap.xml
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
      entry.data?.ten_san_pham ||
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
    entry.data?.mo_ta_ngan ||
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
    entry.data?.anh_dai_dien ||
    entry.data?.anh_san_pham ||
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

const sharedFields = z.object({
  tieu_de: z.string().optional(),
  ten_san_pham: z.string().optional(),
  title: z.string().optional(),
  danh_muc: z.union([z.string(), z.array(z.string())]).optional(),
  category: z.string().optional(),
  chuyen_muc: z.string().optional(),
  slug: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  cong_nghe: z.array(z.string()).optional().default([]),
  the_loai: z.array(z.string()).optional().default([]),
  mo_ta: z.string().optional(),
  mo_ta_ngan: z.string().optional(),
  excerpt: z.string().optional(),
  description: z.string().optional(),
  ngay: z.coerce.string().optional(),
  date: z.coerce.string().optional(),
  pubDate: z.coerce.string().optional(),
  anh_bia: z.string().optional(),
  anh_dai_dien: z.string().optional(),
  anh_san_pham: z.string().optional(),
  cover: z.string().optional(),
  heroImage: z.string().optional(),
  image: z.string().optional(),
  nhap: z.boolean().optional().default(false),
  draft: z.boolean().optional().default(false),
  tac_gia: z.string().optional(),
  author: z.string().optional(),
  gia: z.union([z.string(), z.number()]).optional(),
  gia_goc: z.union([z.string(), z.number()]).optional(),
  con_hang: z.boolean().optional(),
  dinh_dang: z.array(z.string()).optional(),
  nam_xuat_ban: z.union([z.number(), z.string()]).optional(),
  link_demo: z.string().optional(),
  link_github: z.string().optional(),
  link_mua: z.string().optional(),
  noi_bat: z.boolean().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  canonical_url: z.string().optional(),
  noindex: z.boolean().optional(),
});

export const collections = {
  bai_viet: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/bai_viet' }),
    schema: sharedFields,
  }),
  du_an: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/du_an' }),
    schema: sharedFields,
  }),
  sach: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/sach' }),
    schema: sharedFields,
  }),
  cua_hang: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/cua_hang' }),
    schema: sharedFields,
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

const mainNav = [
  { label: 'Trang chủ', href: withBase('/') },
  { label: 'Bài viết', href: withBase('/bai-viet/') },
  { label: 'Dự án', href: withBase('/du-an/') },
  { label: 'Sách', href: withBase('/sach/') },
  { label: 'Cửa hàng', href: withBase('/cua-hang/') },
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
      href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,400&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />

    <script is:inline define:vars={{ initialDark }}>
      try {
        const stored = localStorage.getItem('blogvn_astro_theme');
        if (stored === 'dark' || (!stored && initialDark)) {
          document.documentElement.classList.add('dark');
        } else if (stored === 'light') {
          document.documentElement.classList.remove('dark');
        }
      } catch {}
    </script>
  </head>
  <body data-template={SITE_CONFIG.templateStyle}>
    <header class="site-header">
      <div class="wrap nav-inner">
        <a class="brand" href={withBase('/')}>
          <img src={iconHref} alt={SITE_CONFIG.headerTitle} width="30" height="30" />
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
          <button id="themeToggleBtn" class="theme-btn" type="button" aria-label="Đổi chế độ Sáng/Tối">
            <span class="sun-label">Âm / Dương</span>
          </button>
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

    <script is:inline>
      const tBtn = document.getElementById('themeToggleBtn');
      if (tBtn) {
        tBtn.addEventListener('click', () => {
          const isDark = document.documentElement.classList.toggle('dark');
          try {
            localStorage.setItem('blogvn_astro_theme', isDark ? 'dark' : 'light');
          } catch {}
        });
      }
      const mBtn = document.getElementById('mobileMenuBtn');
      const mDrawer = document.getElementById('mobileDrawer');
      if (mBtn && mDrawer) {
        mBtn.addEventListener('click', () => {
          mDrawer.classList.toggle('hidden');
        });
      }
    </script>
  </body>
</html>

<style is:global>
  :root {
    --bg: #fafafa;
    --surface: #f3f4f6;
    --card: #ffffff;
    --border: #e5e7eb;
    --text: #111827;
    --text-2: #374151;
    --muted: #6b7280;
    --accent: #111827;
    --accent-text: #ffffff;
    --link: #2563eb;
    --font-display: 'Fraunces', Georgia, serif;
    --font-body: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  }

  html.dark {
    --bg: #0b0d12;
    --surface: #141720;
    --card: #1b202c;
    --border: #272d3d;
    --text: #f3f4f6;
    --text-2: #d1d5db;
    --muted: #9ca3af;
    --accent: #f3f4f6;
    --accent-text: #0b0d12;
    --link: #60a5fa;
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
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }

  a {
    color: var(--link);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .wrap {
    max-width: 1040px;
    margin: 0 auto;
    padding: 0 20px;
  }

  body[data-template='minimal'] .wrap {
    max-width: 780px;
  }

  body[data-template='visual-grid'] .wrap {
    max-width: 1200px;
  }

  .site-header {
    position: sticky;
    top: 0;
    z-index: 40;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }

  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 64px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.15rem;
    text-decoration: none !important;
  }

  .brand img {
    border-radius: 8px;
    object-fit: cover;
  }

  .nav-links {
    display: none;
    align-items: center;
    gap: 20px;
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
  .theme-btn,
  .mobile-menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 0.78rem;
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
    padding-top: 32px;
    padding-bottom: 56px;
  }

  .site-footer {
    border-top: 1px solid var(--border);
    background: var(--surface);
    padding: 28px 0;
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
    gap: 16px;
    font-size: 0.84rem;
  }

  .prose {
    font-size: 1.04rem;
    line-height: 1.8;
    color: var(--text-2);
  }

  .prose h2,
  .prose h3 {
    font-family: var(--font-display);
    color: var(--text);
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    line-height: 1.3;
  }

  .prose p {
    margin: 1rem 0;
  }

  .prose img {
    max-width: 100%;
    height: auto;
    border-radius: 14px;
    margin: 1.5rem 0;
    border: 1px solid var(--border);
  }

  .prose blockquote {
    margin: 1.5rem 0;
    padding: 0.9rem 1.25rem;
    border-left: 3px solid var(--link);
    background: var(--surface);
    border-radius: 0 12px 12px 0;
    color: var(--text);
  }

  .prose pre {
    padding: 1rem;
    border-radius: 12px;
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
    border-radius: 6px;
  }

  .prose pre code {
    background: transparent;
    padding: 0;
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
  routePrefix?: string;
}

const { entry, routePrefix = '/bai-viet' } = Astro.props;
const slug = getPostSlug(entry);
const href = withBase(\`\${routePrefix}/\${slug}/\`);
const title = getPostTitle(entry);
const date = getPostDate(entry);
const excerpt = getPostExcerpt(entry);
const cover = getPostCover(entry);
const category = String(entry.data?.danh_muc || entry.data?.category || 'Bài viết');
const minutes = estimateReadingTime(entry.body || '');
---

<article class="post-card" data-search={\`\${title} \${excerpt} \${category}\`.toLowerCase()}>
  <a class="post-card-link" href={href}>
    {cover && (
      <div class="post-cover-wrap">
        <img src={cover} alt={title} loading="lazy" />
      </div>
    )}
    <div class="post-body">
      <div class="post-meta">
        <span>{formatVietnameseDate(date)}</span>
        <span>·</span>
        <span>{category}</span>
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
    border-radius: 16px;
    overflow: hidden;
    transition: transform 0.18s ease, border-color 0.18s ease;
  }

  .post-card:hover {
    transform: translateY(-2px);
    border-color: var(--link);
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
    font-size: 0.74rem;
    color: var(--muted);
  }

  .post-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.2rem;
    line-height: 1.35;
    color: var(--text);
  }

  .post-excerpt {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-2);
    line-height: 1.55;
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
import { getPostDate, withBase } from '../utils/url';

const posts = (await getCollection('bai_viet'))
  .filter((e) => !e.data.nhap && !e.data.draft)
  .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));

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
  <section class="hero">
    <div class="hero-kicker">{SITE_CONFIG.authorName} · Blog cá nhân</div>
    <h1>{SITE_CONFIG.siteTitle}</h1>
    <p class="hero-desc">{SITE_CONFIG.tagline}</p>

    <div class="hero-tools">
      <input
        id="homeSearchInput"
        type="search"
        placeholder="Tìm kiếm bài viết theo tiêu đề, chủ đề..."
        class="search-input"
      />
      <a class="hero-cta" href={withBase('/bai-viet/')}>Xem tất cả ({posts.length})</a>
    </div>
  </section>

  <section class="posts-section">
    <div class="section-head">
      <h2>Bài viết mới nhất</h2>
    </div>

    {posts.length === 0 ? (
      <p class="empty-note">Chưa có bài viết nào được xuất bản.</p>
    ) : (
      <div id="postsGrid" class={\`posts-grid template-\${SITE_CONFIG.templateStyle}\`}>
        {posts.map((entry) => (
          <PostCard entry={entry} routePrefix="/bai-viet" />
        ))}
      </div>
    )}
    <p id="searchEmptyMsg" class="empty-note hidden">Không tìm thấy bài viết phù hợp với từ khóa của bạn.</p>
  </section>

  <script is:inline>
    const input = document.getElementById('homeSearchInput');
    const grid = document.getElementById('postsGrid');
    const emptyMsg = document.getElementById('searchEmptyMsg');
    if (input && grid) {
      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        const cards = grid.querySelectorAll('.post-card');
        let visible = 0;
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
  .hero {
    padding: 18px 0 32px;
    border-bottom: 1px solid var(--border);
  }

  .hero-kicker {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--link);
    margin-bottom: 10px;
  }

  .hero h1 {
    margin: 0 0 12px;
    font-family: var(--font-display);
    font-size: clamp(2rem, 4.5vw, 3.1rem);
    line-height: 1.15;
    letter-spacing: -0.02em;
  }

  .hero-desc {
    margin: 0;
    max-width: 65ch;
    color: var(--text-2);
    font-size: 1.05rem;
  }

  .hero-tools {
    margin-top: 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .search-input {
    flex: 1;
    min-width: 220px;
    min-height: 44px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    font-size: 0.92rem;
    font-family: inherit;
  }

  .hero-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 18px;
    border-radius: 12px;
    background: var(--accent);
    color: var(--accent-text);
    font-size: 0.88rem;
    font-weight: 600;
    text-decoration: none !important;
  }

  .posts-section {
    padding-top: 28px;
  }

  .section-head h2 {
    font-family: var(--font-display);
    font-size: 1.5rem;
    margin: 0 0 18px;
  }

  .posts-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }

  @media (min-width: 720px) {
    .posts-grid.template-editorial {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .posts-grid.template-minimal {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .posts-grid.template-visual-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1024px) {
    .posts-grid.template-visual-grid {
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

  function buildCollectionIndexPage(opts: {
    collection: 'bai_viet' | 'du_an' | 'sach' | 'cua_hang';
    routePrefix: string;
    heading: string;
    subtitle: string;
  }): string {
    return `---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { SITE_CONFIG } from '../../cau_hinh/trang_web';
import { getPostDate } from '../../utils/url';

const entries = (await getCollection('${opts.collection}'))
  .filter((e) => !e.data.nhap && !e.data.draft)
  .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));
---

<BaseLayout title="${opts.heading}" description="${opts.subtitle}">
  <div class="col-header">
    <h1>${opts.heading}</h1>
    <p>${opts.subtitle}</p>
  </div>

  {entries.length === 0 ? (
    <p style="color: var(--muted);">Chưa có mục nào trong danh mục này.</p>
  ) : (
    <div class={\`col-grid template-\${SITE_CONFIG.templateStyle}\`}>
      {entries.map((entry) => (
        <PostCard entry={entry} routePrefix="${opts.routePrefix}" />
      ))}
    </div>
  )}
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
  .col-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 720px) {
    .col-grid.template-editorial,
    .col-grid.template-visual-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .col-grid.template-minimal {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }
  @media (min-width: 1024px) {
    .col-grid.template-visual-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
`;
  }

  function buildCollectionDetailPage(opts: {
    collection: 'bai_viet' | 'du_an' | 'sach' | 'cua_hang';
    routePrefix: string;
    backLabel: string;
  }): string {
    return `---
import { getCollection, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
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
  const entries = await getCollection('${opts.collection}');
  return entries
    .filter((e) => !e.data.nhap && !e.data.draft)
    .map((entry) => ({
      params: { slug: getPostSlug(entry) },
      props: { entry },
    }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
const title = getPostTitle(entry);
const date = getPostDate(entry);
const excerpt = getPostExcerpt(entry);
const cover = getPostCover(entry);
const category = String(entry.data?.danh_muc || entry.data?.category || '${opts.backLabel}');
const tags: string[] = Array.isArray(entry.data?.tags)
  ? entry.data.tags
  : Array.isArray(entry.data?.cong_nghe)
  ? entry.data.cong_nghe
  : Array.isArray(entry.data?.the_loai)
  ? entry.data.the_loai
  : [];
const minutes = estimateReadingTime(entry.body || '');
const resolvedAuthor = String(entry.data?.tac_gia || entry.data?.author || SITE_CONFIG.authorName);
const pageSlug = getPostSlug(entry);
const canonicalTarget =
  entry.data?.canonical_url ||
  \`\${SITE_CONFIG.pagesUrl.replace(/\\/+$/, '')}\${withBase(\`${opts.routePrefix}/\${pageSlug}/\`)}\`;
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
    <a class="back-link" href={withBase('${opts.routePrefix}/')}>← Quay lại ${opts.backLabel}</a>

    <header class="article-header">
      <div class="article-meta">
        <span>{formatVietnameseDate(date)}</span>
        <span>·</span>
        <span>{category}</span>
        <span>·</span>
        <span>{minutes} phút đọc</span>
      </div>
      <h1>{title}</h1>
      {excerpt && <p class="article-lead">{excerpt}</p>}
      {tags.length > 0 && (
        <div class="tag-row">
          {tags.map((t) => (
            <span class="tag-chip">#{t}</span>
          ))}
        </div>
      )}
    </header>

    {cover && (
      <figure class="article-cover">
        <img src={cover} alt={title} />
      </figure>
    )}

    <div class="prose">
      <Content />
    </div>

    <aside class="author-box">
      <div class="author-name">{entry.data?.tac_gia || entry.data?.author || SITE_CONFIG.authorName}</div>
      <p class="author-bio">{SITE_CONFIG.authorBio}</p>
    </aside>
  </article>
</BaseLayout>

<style>
  .article-wrap {
    max-width: 760px;
    margin: 0 auto;
  }

  .back-link {
    display: inline-block;
    font-size: 0.88rem;
    font-weight: 500;
    margin-bottom: 18px;
  }

  .article-header {
    padding-bottom: 22px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
  }

  .article-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--muted);
    margin-bottom: 10px;
  }

  .article-header h1 {
    margin: 0 0 12px;
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 3.8vw, 2.5rem);
    line-height: 1.2;
  }

  .article-lead {
    margin: 0;
    font-size: 1.05rem;
    color: var(--text-2);
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }

  .tag-chip {
    font-family: var(--font-mono);
    font-size: 0.76rem;
    padding: 3px 9px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-2);
  }

  .article-cover {
    margin: 0 0 28px;
  }

  .article-cover img {
    width: 100%;
    max-height: 440px;
    object-fit: cover;
    border-radius: 16px;
    border: 1px solid var(--border);
  }

  .author-box {
    margin-top: 40px;
    padding: 20px;
    border-radius: 16px;
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
</style>
`;
  }

  const page404Astro = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import { withBase } from '../utils/url';
---

<BaseLayout title="404 — Không tìm thấy trang" noindex={true}>
  <div class="box-404">
    <p class="code">404</p>
    <h1>Không tìm thấy nội dung này</h1>
    <p>Liên kết có thể đã thay đổi hoặc bài viết chưa được xuất bản.</p>
    <a class="btn-home" href={withBase('/')}>Quay về trang chủ</a>
  </div>
</BaseLayout>

<style>
  .box-404 {
    max-width: 480px;
    margin: 48px auto;
    padding: 32px;
    border-radius: 18px;
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

  const staticRoutes = ['/', '/bai-viet/', '/du-an/', '/sach/', '/cua-hang/'];
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
      danh_muc: 'Ghi chép',
      chuyen_muc: 'ghi-chep',
      slug: 'chao-mung-den-voi-blog',
      tags: ['astro', 'blogvn', 'github-pages'],
      mo_ta: `Bài viết khởi đầu của ${siteTitle}, triển khai sạch bằng Astro Blog Việt kết hợp nhận dạng web cá nhân.`,
      ngay: today,
      anh_bia: '/tainguyen/hinhanh/og-default.svg',
      nhap: false,
    },
    `## Xin chào bạn đọc

Chào mừng bạn ghé thăm **${siteTitle}** — không gian ghi chép cá nhân do **${authorName}** biên soạn và xuất bản tự động lên GitHub Pages thông qua Astro.

## Điểm nổi bật của mẫu blog này

- **Tải siêu nhanh**: Toàn bộ trang được biên dịch tĩnh 100% bằng Astro 5, tối ưu cho tốc độ và SEO tiếng Việt.
- **Nhận dạng cá nhân đồng bộ**: Tiêu đề, biểu tượng, Header, Footer và màu sắc Âm/Dương đều bám sát cấu hình bạn đã thiết lập trong BlogVN.
- **Chủ quyền dữ liệu tuyệt đối**: Mọi bài viết được lưu dưới dạng tệp Markdown thuần túy ngay trong Git repository của riêng bạn.

> Chúc bạn có những trang viết mạch lạc, sâu sắc và bền vững theo thời gian.`
  );

  const starterPost2 = makeMarkdown(
    {
      tieu_de: 'Ghi chép về cách viết Markdown gọn gàng và bền vững',
      danh_muc: 'Kỹ thuật',
      chuyen_muc: 'ky-thuat',
      slug: 'cach-viet-markdown-gon-gang',
      tags: ['markdown', 'viet-lach', 'quy-trinh'],
      mo_ta: 'Vì sao định dạng Markdown thuần túy kết hợp GitHub Pages giúp bạn làm chủ hoàn toàn nội dung suốt nhiều năm.',
      ngay: today,
      anh_bia: '/tainguyen/hinhanh/og-default.svg',
      nhap: false,
    },
    `## Nội dung tách rời khỏi nền tảng

Khi viết bằng Markdown, mỗi bài viết chỉ là một tệp văn bản đơn giản. Bạn có thể chuyển đổi công cụ bất cứ lúc nào mà không bao giờ bị khóa dữ liệu.

### Ba thói quen giúp bài viết dễ đọc

1. Đặt tiêu đề mục rõ ràng bằng thẻ \`##\` và \`###\`.
2. Giữ đoạn văn ngắn từ 2–4 câu để đọc thoải mái trên cả điện thoại.
3. Tối ưu mô tả ngắn và thuộc tính Alt cho hình ảnh minh họa.`
  );

  const starterProject = makeMarkdown(
    {
      tieu_de: `Website ${siteTitle} trên Astro & GitHub Pages`,
      mo_ta_ngan: 'Hệ thống blog tĩnh tiếng Việt hỗ trợ xuất bản Markdown trực tiếp từ BlogVN.',
      anh_dai_dien: '/tainguyen/hinhanh/og-default.svg',
      cong_nghe: ['Astro 5', 'TypeScript', 'GitHub Actions', 'GitHub Pages'],
      link_demo: persistedConfig.pagesUrl,
      link_github: `https://github.com/${owner}/${repo}`,
      slug: 'website-blog-astro-viet',
      ngay: today,
    },
    `## Tổng quan dự án

Dự án này được khởi tạo tự động bằng bộ mẫu **Astro Blog Việt**, tích hợp sẵn RSS, Sitemap, tìm kiếm tức thì và giao diện Âm/Dương.`
  );

  const starterBook = makeMarkdown(
    {
      tieu_de: 'Sổ tay viết lách mạch lạc cho người làm kỹ thuật',
      tac_gia: authorName,
      mo_ta_ngan: 'Tổng hợp những ghi chú về cấu trúc lập luận, đặt vấn đề và trình bày tài liệu rõ ràng.',
      anh_bia: '/tainguyen/hinhanh/og-default.svg',
      the_loai: ['Kỹ năng viết', 'Tư duy'],
      dinh_dang: ['Web', 'Markdown'],
      gia: 'Đọc trực tuyến',
      slug: 'so-tay-viet-lach-mach-lac',
      ngay: today,
    },
    `## Nội dung trọng tâm

Ghi chép những nguyên tắc đơn giản nhưng hiệu quả giúp truyền đạt ý tưởng phức tạp một cách dễ hiểu nhất.`
  );

  const starterProduct = makeMarkdown(
    {
      ten_san_pham: 'Bộ mẫu bài viết Markdown chuẩn SEO tiếng Việt',
      mo_ta_ngan: 'Khung cấu trúc bài viết sẵn sàng cho blog cá nhân, trang dự án và nhật ký đọc sách.',
      anh_san_pham: '/tainguyen/hinhanh/og-default.svg',
      danh_muc: ['Tài nguyên số'],
      gia: 'Miễn phí',
      con_hang: true,
      slug: 'bo-mau-bai-viet-markdown',
      ngay: today,
    },
    `## Bao gồm trong bộ tài nguyên

- Cấu trúc mở bài đặt vấn đề tự nhiên.
- Checklist tiêu đề, mô tả Meta và thẻ chia sẻ mạng xã hội.`
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
    { path: 'src/cau_hinh/trang_web.ts', content: buildAstroSiteConfigModule({ owner, repo, config, templateId: templateStyle }) },
    { path: 'src/utils/url.ts', content: urlUtilsTs },
    { path: 'src/content.config.ts', content: contentConfigTs },
    { path: 'src/layouts/BaseLayout.astro', content: baseLayoutAstro },
    { path: 'src/components/PostCard.astro', content: postCardAstro },
    { path: 'src/pages/index.astro', content: indexAstro },
    {
      path: 'src/pages/bai-viet/index.astro',
      content: buildCollectionIndexPage({
        collection: 'bai_viet',
        routePrefix: '/bai-viet',
        heading: 'Bài viết',
        subtitle: 'Tất cả ghi chép, chia sẻ kinh nghiệm và bài viết chuyên sâu.',
      }),
    },
    {
      path: 'src/pages/bai-viet/[slug].astro',
      content: buildCollectionDetailPage({
        collection: 'bai_viet',
        routePrefix: '/bai-viet',
        backLabel: 'Bài viết',
      }),
    },
    {
      path: 'src/pages/du-an/index.astro',
      content: buildCollectionIndexPage({
        collection: 'du_an',
        routePrefix: '/du-an',
        heading: 'Dự án',
        subtitle: 'Các sản phẩm, công cụ và dự án cá nhân đang thực hiện.',
      }),
    },
    {
      path: 'src/pages/du-an/[slug].astro',
      content: buildCollectionDetailPage({
        collection: 'du_an',
        routePrefix: '/du-an',
        backLabel: 'Dự án',
      }),
    },
    {
      path: 'src/pages/sach/index.astro',
      content: buildCollectionIndexPage({
        collection: 'sach',
        routePrefix: '/sach',
        heading: 'Sách & Tài liệu',
        subtitle: 'Ghi chú đọc sách, tóm tắt tài liệu và ấn phẩm hay.',
      }),
    },
    {
      path: 'src/pages/sach/[slug].astro',
      content: buildCollectionDetailPage({
        collection: 'sach',
        routePrefix: '/sach',
        backLabel: 'Sách',
      }),
    },
    {
      path: 'src/pages/cua-hang/index.astro',
      content: buildCollectionIndexPage({
        collection: 'cua_hang',
        routePrefix: '/cua-hang',
        heading: 'Cửa hàng & Tài nguyên',
        subtitle: 'Các ấn phẩm, bộ mẫu và tài nguyên số hữu ích.',
      }),
    },
    {
      path: 'src/pages/cua-hang/[slug].astro',
      content: buildCollectionDetailPage({
        collection: 'cua_hang',
        routePrefix: '/cua-hang',
        backLabel: 'Cửa hàng',
      }),
    },
    { path: 'src/pages/404.astro', content: page404Astro },
    { path: 'src/pages/rss.xml.ts', content: rssXmlTs },
    { path: 'src/pages/sitemap.xml.ts', content: sitemapXmlTs },
    { path: 'src/content/bai_viet/chao-mung-den-voi-blog.md', content: starterPost1 },
    { path: 'src/content/bai_viet/cach-viet-markdown-gon-gang.md', content: starterPost2 },
    { path: 'src/content/du_an/website-blog-astro-viet.md', content: starterProject },
    { path: 'src/content/sach/so-tay-viet-lach-mach-lac.md', content: starterBook },
    { path: 'src/content/cua_hang/bo-mau-bai-viet-markdown.md', content: starterProduct },
  ];

  if (hasDataIcon) {
    files.push({
      path: 'public/favicon.png',
      content: rawIcon.replace(/^data:[^;]+;base64,/, ''),
      isBase64: true,
    });
  }

  return files;
}
