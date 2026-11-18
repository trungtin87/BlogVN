// server.ts
import express from "express";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import dotenv from "dotenv";
import { dump as dumpYaml2, load as loadYaml } from "js-yaml";
import { createServer as createViteServer } from "vite";

// src/utils/siteGenerators.ts
function escapeXml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function normalizeBaseUrl(pagesUrl) {
  const clean = (pagesUrl || "https://trungtin87.github.io").trim().replace(/\/+$/, "");
  return clean.startsWith("http") ? clean : `https://${clean}`;
}
function buildPostUrl(post, pagesUrl, framework = "jekyll") {
  if (post.canonicalUrl && post.canonicalUrl.startsWith("http")) {
    return post.canonicalUrl;
  }
  const base = normalizeBaseUrl(pagesUrl);
  const cleanSlug = encodeURIComponent(post.slug || "bai-viet");
  if (framework === "astro-vn") {
    const colSegment = post.collection === "du_an" ? "du-an" : post.collection === "sach" ? "sach" : post.collection === "cua_hang" ? "cua-hang" : "bai-viet";
    return `${base}/${colSegment}/${cleanSlug}/`;
  }
  if (framework === "astro") {
    return `${base}/blog/${cleanSlug}/`;
  }
  if (framework === "hugo") {
    return `${base}/posts/${cleanSlug}/`;
  }
  if (framework === "jekyll" || framework === "hexo") {
    const dateParts = (post.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)).split("-");
    if (dateParts.length === 3) {
      const [y, m, d] = dateParts;
      return framework === "hexo" ? `${base}/${y}/${m}/${d}/${cleanSlug}/` : `${base}/${y}/${m}/${d}/${cleanSlug}.html`;
    }
  }
  return `${base}/posts/${cleanSlug}/`;
}
function generateRssXml(params) {
  const { config, posts, framework = "jekyll" } = params;
  const base = normalizeBaseUrl(config.pagesUrl);
  const published = posts.filter((p) => !p.draft && !p.noindex).sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 40);
  const lastBuild = published[0]?.date && !Number.isNaN(Date.parse(published[0].date)) ? new Date(published[0].date).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString();
  const itemsXml = published.map((post) => {
    const link = buildPostUrl(post, base, framework);
    const pubDate = post.date && !Number.isNaN(Date.parse(post.date)) ? new Date(post.date).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString();
    const desc = post.seoDescription || post.excerpt || post.title;
    const categoriesXml = [post.category, ...post.tags || []].filter(Boolean).slice(0, 5).map((cat) => `      <category>${escapeXml(cat)}</category>`).join("\n");
    return [
      "    <item>",
      `      <title>${escapeXml(post.seoTitle || post.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <pubDate>${escapeXml(pubDate)}</pubDate>`,
      `      <description>${escapeXml(desc)}</description>`,
      categoriesXml,
      "    </item>"
    ].filter(Boolean).join("\n");
  }).join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(config.siteTitle || "\u0110\u1EA1o K\xFD")}</title>`,
    `    <link>${escapeXml(base)}/</link>`,
    `    <description>${escapeXml(config.tagline || config.siteTitle)}</description>`,
    "    <language>vi</language>",
    `    <lastBuildDate>${escapeXml(lastBuild)}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(base)}/rss.xml" rel="self" type="application/rss+xml" />`,
    itemsXml,
    "  </channel>",
    "</rss>",
    ""
  ].join("\n");
}
function generateSitemapXml(params) {
  const { config, posts, framework = "jekyll" } = params;
  const base = normalizeBaseUrl(config.pagesUrl);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const published = posts.filter((p) => !p.draft && !p.noindex).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const extraRoutes = framework === "astro-vn" ? ["/bai-viet/", "/du-an/", "/sach/", "/cua-hang/"] : [];
  const urls = [
    { loc: `${base}/`, lastmod: published[0]?.date || today, changefreq: "daily", priority: "1.0" },
    ...extraRoutes.map((route) => ({
      loc: `${base}${route}`,
      lastmod: today,
      changefreq: "weekly",
      priority: "0.8"
    })),
    ...published.map((post) => ({
      loc: buildPostUrl(post, base, framework),
      lastmod: post.date || today,
      changefreq: "monthly",
      priority: "0.7"
    }))
  ];
  const entriesXml = urls.map(
    (u) => [
      "  <url>",
      `    <loc>${escapeXml(u.loc)}</loc>`,
      `    <lastmod>${escapeXml(u.lastmod)}</lastmod>`,
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      "  </url>"
    ].join("\n")
  ).join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entriesXml,
    "</urlset>",
    ""
  ].join("\n");
}
function generateRobotsTxt(pagesUrl) {
  const base = normalizeBaseUrl(pagesUrl);
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /drafts/",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    ""
  ].join("\n");
}

// src/utils/astroTemplate.ts
import { dump as dumpYaml } from "js-yaml";
var ASTRO_TEMPLATE_PRESETS = [
  {
    id: "newyorker-light",
    name: "New Yorker V\u0103n ch\u01B0\u01A1ng",
    inspiration: "C\u1EA3m h\u1EE9ng The New Yorker",
    toneLabel: "S\xE1ng",
    badge: "S\xE1ng \xB7 Ti\u1EC3u lu\u1EADn",
    isDark: false,
    description: "Gi\u1EA5y ng\xE0 \u1EA5m (#FAF7F2), k\u1EBB ch\u1EC9 \u0111\xF4i thanh m\u1EA3nh, ti\xEAu \u0111\u1EC1 Serif c\u1ED5 \u0111i\u1EC3n (h\u1ED7 tr\u1EE3 S\xE1ng/T\u1ED1i)."
  },
  {
    id: "nytimes-light",
    name: "NYTimes Nh\u1EADt b\xE1o",
    inspiration: "C\u1EA3m h\u1EE9ng The New York Times",
    toneLabel: "S\xE1ng",
    badge: "S\xE1ng \xB7 B\xE1o in",
    isDark: false,
    description: "N\u1EC1n tr\u1EAFng tinh kh\xF4i (#FFFFFF), b\xE0i ti\xEAu \u0111i\u1EC3m l\u1EDBn c\u1EA1nh c\u1ED9t tin nhanh, l\u01B0\u1EDBi nh\u1EADt b\xE1o 1px (h\u1ED7 tr\u1EE3 S\xE1ng/T\u1ED1i)."
  },
  {
    id: "bbc-dark",
    name: "BBC Studio",
    inspiration: "C\u1EA3m h\u1EE9ng BBC News",
    toneLabel: "T\u1ED1i",
    badge: "T\u1ED1i \xB7 Th\u1EDDi s\u1EF1",
    isDark: true,
    description: "Than ch\xEC studio (#121214), \u0111i\u1EC3m nh\u1EA5n \u0111\u1ECF th\u1EABm, l\u01B0\u1EDBi \u0111a b\xE0i vi\u1EBFt hi\u1EC7n \u0111\u1EA1i t\xF4n vinh \u1EA3nh b\xECa (h\u1ED7 tr\u1EE3 S\xE1ng/T\u1ED1i)."
  },
  {
    id: "obsidian-broadsheet",
    name: "Broadsheet \u0110\xEAm",
    inspiration: "C\u1EA3m h\u1EE9ng NYT \u0110\xEAm",
    toneLabel: "T\u1ED1i",
    badge: "T\u1ED1i \xB7 Nh\u1EADt b\xE1o",
    isDark: true,
    description: "M\u1EF1c \u0111\xEAm xanh th\u1EABm (#0B0D12), ti\xEAu \u0111\u1EC1 Serif uy nghi\xEAm v\xE0 \xE1nh xanh coban d\u1ECBu m\u1EAFt (h\u1ED7 tr\u1EE3 S\xE1ng/T\u1ED1i)."
  },
  {
    id: "espresso-salon",
    name: "Salon Suy t\u01B0",
    inspiration: "C\u1EA3m h\u1EE9ng Th\u01B0 ph\xF2ng \u0110\xEAm",
    toneLabel: "T\u1ED1i",
    badge: "T\u1ED1i \xB7 \u0110\u1ECDc s\xE2u",
    isDark: true,
    description: "N\u1EC1n g\u1ED7 espresso \u1EA5m \xE1p (#161210), \u0111i\u1EC3m nh\u1EA5n h\u1ED5 ph\xE1ch d\u1ECBu nh\u1EB9 cho b\xE0i vi\u1EBFt d\xE0i (h\u1ED7 tr\u1EE3 S\xE1ng/T\u1ED1i)."
  }
];
function normalizeAstroTemplateId(raw, fallbackMode = "light") {
  if (raw === "newyorker-light" || raw === "nytimes-light" || raw === "bbc-dark" || raw === "obsidian-broadsheet" || raw === "espresso-salon") {
    return raw;
  }
  if (raw === "minimal") return "newyorker-light";
  if (raw === "editorial") return "nytimes-light";
  if (raw === "visual-grid") return "bbc-dark";
  return fallbackMode === "dark" ? "obsidian-broadsheet" : "newyorker-light";
}
var TEMPLATE_DUAL_TOKENS = {
  "newyorker-light": {
    light: {
      bg: "#FAF7F2",
      surface: "#F2EDE4",
      card: "#FFFFFF",
      border: "#DDD5C7",
      text: "#141414",
      text2: "#3A352E",
      muted: "#6E665A",
      accent: "#141414",
      accentText: "#FAF7F2",
      link: "#B91C1C",
      fontDisplay: "'Playfair Display', 'Fraunces', Georgia, serif",
      fontBody: "'Lora', Georgia, serif"
    },
    dark: {
      bg: "#161411",
      surface: "#201D18",
      card: "#28241E",
      border: "#3A332A",
      text: "#F5EFE6",
      text2: "#D8CFC2",
      muted: "#A19585",
      accent: "#FAF7F2",
      accentText: "#161411",
      link: "#F87171",
      fontDisplay: "'Playfair Display', 'Fraunces', Georgia, serif",
      fontBody: "'Lora', Georgia, serif"
    }
  },
  "nytimes-light": {
    light: {
      bg: "#FFFFFF",
      surface: "#F5F6F8",
      card: "#FFFFFF",
      border: "#D4D4D8",
      text: "#0F172A",
      text2: "#334155",
      muted: "#64748B",
      accent: "#0F172A",
      accentText: "#FFFFFF",
      link: "#1E3A8A",
      fontDisplay: "'Fraunces', 'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    },
    dark: {
      bg: "#0E1218",
      surface: "#161C26",
      card: "#1D2432",
      border: "#2C3548",
      text: "#F8FAFC",
      text2: "#CBD5E1",
      muted: "#94A3B8",
      accent: "#F8FAFC",
      accentText: "#0E1218",
      link: "#60A5FA",
      fontDisplay: "'Fraunces', 'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    }
  },
  "bbc-dark": {
    light: {
      bg: "#F6F7F9",
      surface: "#EBEDF2",
      card: "#FFFFFF",
      border: "#D4D7DF",
      text: "#111216",
      text2: "#374151",
      muted: "#6B7280",
      accent: "#E11D48",
      accentText: "#FFFFFF",
      link: "#BE123C",
      fontDisplay: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    },
    dark: {
      bg: "#121214",
      surface: "#1A1B1F",
      card: "#22242A",
      border: "#2E313A",
      text: "#F4F4F5",
      text2: "#D4D4D8",
      muted: "#A1A1AA",
      accent: "#E11D48",
      accentText: "#FFFFFF",
      link: "#FB7185",
      fontDisplay: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    }
  },
  "obsidian-broadsheet": {
    light: {
      bg: "#F3F6FB",
      surface: "#E6ECF5",
      card: "#FFFFFF",
      border: "#CBD5E1",
      text: "#0F172A",
      text2: "#334155",
      muted: "#64748B",
      accent: "#0F172A",
      accentText: "#FFFFFF",
      link: "#1D4ED8",
      fontDisplay: "'Fraunces', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    },
    dark: {
      bg: "#0B0D12",
      surface: "#131722",
      card: "#1A1F2E",
      border: "#273043",
      text: "#F3F4F6",
      text2: "#CBD5E1",
      muted: "#94A3B8",
      accent: "#F3F4F6",
      accentText: "#0B0D12",
      link: "#60A5FA",
      fontDisplay: "'Fraunces', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    }
  },
  "espresso-salon": {
    light: {
      bg: "#FAF4EC",
      surface: "#F1E7DA",
      card: "#FFFFFF",
      border: "#DECDB9",
      text: "#261C15",
      text2: "#4E3E31",
      muted: "#7D6A5A",
      accent: "#9A5B13",
      accentText: "#FFFFFF",
      link: "#B45309",
      fontDisplay: "'Playfair Display', 'Fraunces', Georgia, serif",
      fontBody: "'Lora', Georgia, serif"
    },
    dark: {
      bg: "#161210",
      surface: "#201A17",
      card: "#29221E",
      border: "#3B312B",
      text: "#F5EFE6",
      text2: "#D6CBC0",
      muted: "#A39589",
      accent: "#E5A93C",
      accentText: "#161210",
      link: "#FBBF24",
      fontDisplay: "'Playfair Display', 'Fraunces', Georgia, serif",
      fontBody: "'Lora', Georgia, serif"
    }
  }
};
function escapeSingleQuote(val) {
  return String(val || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
function isBundledDefaultIcon(rawIcon) {
  const clean = rawIcon.trim();
  return !clean || clean === "./icon.svg" || clean === "/icon.svg" || clean.includes("1794978557793_3b5d5cb0.png") || clean === "./pwa-192x192.png" || clean === "/pwa-192x192.png";
}
function buildAstroSiteConfigModule(params) {
  const { owner, repo, config, hasBundledPngFavicon = false } = params;
  const requestedMode = config.themeMode === "dark" ? "dark" : config.themeMode === "light" ? "light" : void 0;
  const templateStyle = normalizeAstroTemplateId(
    params.templateId || config.astroTemplate,
    requestedMode || "light"
  );
  const presetMeta = ASTRO_TEMPLATE_PRESETS.find((p) => p.id === templateStyle) || ASTRO_TEMPLATE_PRESETS[0];
  const resolvedMode = requestedMode || (presetMeta.isDark ? "dark" : "light");
  const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  const defaultPagesUrl = isUserSite ? `https://${repo}` : `https://${owner}.github.io/${repo}`;
  const rawIcon = (config.siteIcon || "").trim();
  const usePngFavicon = rawIcon.startsWith("data:image/") || hasBundledPngFavicon && isBundledDefaultIcon(rawIcon);
  const normalizedIcon = usePngFavicon ? "/favicon.png" : isBundledDefaultIcon(rawIcon) ? "/favicon.svg" : rawIcon;
  const siteCfg = {
    siteTitle: (config.siteTitle || repo || "\u0110\u1EA1o K\xFD").trim(),
    tagline: (config.tagline || `Nh\u1EADt k\xFD chia s\u1EBB g\xF3c nh\xECn, ti\u1EC3u lu\u1EADn v\xE0 ghi ch\xE9p c\xE1 nh\xE2n c\u1EE7a ${config.authorName || owner}.`).trim(),
    siteIcon: normalizedIcon,
    headerTitle: (config.headerTitle || config.siteTitle || "\u0110\u1EA1o K\xFD").trim(),
    headerNavLinks: Array.isArray(config.headerNavLinks) ? config.headerNavLinks.filter((l) => l?.label?.trim() && l?.url?.trim()) : [],
    footerText: (config.footerText || `\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${(config.siteTitle || repo || "\u0110\u1EA1o K\xFD").trim()} \xB7 Xu\u1EA5t b\u1EA3n tr\xEAn GitHub Pages.`).trim(),
    footerLinks: Array.isArray(config.footerLinks) ? config.footerLinks.filter((l) => l?.label?.trim() && l?.url?.trim()) : [],
    authorName: (config.authorName || owner || "T\xE1c gi\u1EA3").trim(),
    authorBio: (config.authorBio || "T\xE1c gi\u1EA3 blog c\xE1 nh\xE2n chia s\u1EBB b\xE0i vi\u1EBFt, quan \u0111i\u1EC3m v\xE0 ghi ch\xE9p d\xE0i h\u1EA1n.").trim(),
    themeMode: resolvedMode,
    templateStyle,
    pagesUrl: (config.pagesUrl || defaultPagesUrl).trim().replace(/\/+$/, ""),
    githubOwner: owner,
    githubRepo: repo,
    liveChat: config.liveChat ? {
      enabled: Boolean(config.liveChat.enabled),
      title: (config.liveChat.title || "Tr\xF2 chuy\u1EC7n v\u1EDBi t\xE1c gi\u1EA3").trim(),
      welcomeText: (config.liveChat.welcomeText || "Ch\u1ECDn k\xEAnh li\xEAn h\u1EC7 tr\u1EF1c ti\u1EBFp b\xEAn d\u01B0\u1EDBi.").trim(),
      channels: Array.isArray(config.liveChat.channels) ? config.liveChat.channels.filter((ch) => ch && ch.id && typeof ch.value === "string").map((ch) => ({
        id: ch.id,
        enabled: Boolean(ch.enabled),
        value: ch.value.trim(),
        label: ch.label ? String(ch.label).trim() : void 0
      })) : []
    } : { enabled: false, title: "Tr\xF2 chuy\u1EC7n v\u1EDBi t\xE1c gi\u1EA3", welcomeText: "", channels: [] }
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
function buildVietnameseAstroTemplateFiles(params) {
  const {
    owner,
    repo,
    config,
    includeStarterPosts = true,
    defaultFaviconPngBase64
  } = params;
  const requestedMode = config.themeMode === "dark" ? "dark" : config.themeMode === "light" ? "light" : void 0;
  const templateStyle = normalizeAstroTemplateId(
    params.templateId || config.astroTemplate,
    requestedMode || "light"
  );
  const presetMeta = ASTRO_TEMPLATE_PRESETS.find((p) => p.id === templateStyle) || ASTRO_TEMPLATE_PRESETS[0];
  const resolvedMode = requestedMode || (presetMeta.isDark ? "dark" : "light");
  const tokens = TEMPLATE_DUAL_TOKENS[templateStyle][resolvedMode];
  const siteTitle = (config.siteTitle || repo || "\u0110\u1EA1o K\xFD").trim();
  const tagline = (config.tagline || "Ghi ch\xE9p c\xE1 nh\xE2n, b\xE0i lu\u1EADn chuy\xEAn s\xE2u v\xE0 g\xF3c nh\xECn t\u0129nh t\u1EA1i tr\xEAn GitHub Pages.").trim();
  const headerBrand = (config.headerTitle || siteTitle).trim();
  const authorName = (config.authorName || owner || "T\xE1c gi\u1EA3").trim();
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const dayOffsetStr = (daysAgo) => {
    const d = new Date(Date.now() - daysAgo * 864e5);
    return d.toISOString().slice(0, 10);
  };
  const rawIcon = (config.siteIcon || "").trim();
  const hasDataIcon = rawIcon.startsWith("data:image/");
  const hasBundledPngFavicon = Boolean(
    hasDataIcon || defaultFaviconPngBase64 && isBundledDefaultIcon(rawIcon)
  );
  const faviconPngBase64 = hasDataIcon ? rawIcon.replace(/^data:[^;]+;base64,/, "") : defaultFaviconPngBase64 && isBundledDefaultIcon(rawIcon) ? defaultFaviconPngBase64.replace(/^data:[^;]+;base64,/, "") : void 0;
  const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  const defaultPagesUrl = isUserSite ? `https://${repo}` : `https://${owner}.github.io/${repo}`;
  const persistedConfig = {
    ...config,
    siteTitle,
    tagline,
    headerTitle: headerBrand,
    authorName,
    githubOwner: owner,
    githubRepo: repo,
    pagesUrl: (config.pagesUrl || defaultPagesUrl).trim().replace(/\/+$/, ""),
    postsDirectory: "src/content/bai_viet",
    themeMode: resolvedMode,
    astroTemplate: templateStyle
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
      name: `daoky-astro-${repo.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "site"}`,
      type: "module",
      version: "1.0.0",
      private: true,
      scripts: {
        dev: "astro dev",
        build: "astro build",
        preview: "astro preview"
      },
      dependencies: {
        astro: "^5.7.13"
      }
    },
    null,
    2
  ) + "\n";
  const tsconfigJson = JSON.stringify(
    {
      extends: "astro/tsconfigs/strict",
      include: [".astro/types.d.ts", "**/*"],
      exclude: ["dist"]
    },
    null,
    2
  ) + "\n";
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
  const deployWorkflowYml = `name: Build & Deploy Astro Blog (\u0110\u1EA1o K\xFD)

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
  <circle cx="32" cy="32" r="30" fill="#FAF7F2" stroke="#141414" stroke-width="4.5" stroke-dasharray="165 18" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="24" fill="none" stroke="#141414" stroke-width="1.2" opacity="0.35"/>
  <text x="32" y="38" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="22" fill="#141414">${(headerBrand[0] || "\u0110").toUpperCase()}</text>
</svg>
`;
  const escXml = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const wrapSvgTextLines = (raw, maxChars = 28, maxLines = 2) => {
    const words = String(raw || "").trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = w;
        if (lines.length >= maxLines) break;
      }
    }
    if (current && lines.length < maxLines) {
      lines.push(current);
    }
    if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, Math.max(4, maxChars - 1)) + "\u2026";
    }
    return lines.length > 0 ? lines : ["\u0110\u1EA1o K\xFD"];
  };
  const buildCoverSvg = (index, totalCovers2, kicker, headline) => {
    const headlineLines = wrapSvgTextLines(headline, 26, 2);
    const safeKicker = escXml(kicker.toUpperCase());
    const safeBrand = escXml(siteTitle.slice(0, 32));
    const motifByTemplate = {
      "newyorker-light": `
        <rect x="44" y="44" width="1112" height="542" fill="none" stroke="${tokens.border}" stroke-width="2"/>
        <rect x="54" y="54" width="1092" height="522" fill="none" stroke="${tokens.border}" stroke-width="1"/>
        <circle cx="960" cy="240" r="120" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="1.5"/>
        <path d="M900 295 Q960 170 1020 295" fill="none" stroke="${tokens.link}" stroke-width="3"/>
        <circle cx="960" cy="215" r="24" fill="${tokens.accent}" opacity="0.88"/>`,
      "nytimes-light": `
        <line x1="72" y1="88" x2="1128" y2="88" stroke="${tokens.text}" stroke-width="3"/>
        <line x1="72" y1="96" x2="1128" y2="96" stroke="${tokens.border}" stroke-width="1"/>
        <rect x="760" y="136" width="368" height="320" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="1.5"/>
        <line x1="790" y1="184" x2="1098" y2="184" stroke="${tokens.link}" stroke-width="4"/>
        <line x1="790" y1="224" x2="1060" y2="224" stroke="${tokens.border}" stroke-width="2"/>
        <line x1="790" y1="254" x2="1020" y2="254" stroke="${tokens.border}" stroke-width="2"/>
        <line x1="790" y1="284" x2="1080" y2="284" stroke="${tokens.border}" stroke-width="2"/>`,
      "bbc-dark": `
        <rect x="0" y="0" width="1200" height="10" fill="${tokens.accent}"/>
        <rect x="750" y="120" width="380" height="240" rx="14" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="2"/>
        <polygon points="920,205 920,275 980,240" fill="${tokens.accent}"/>
        <rect x="88" y="420" width="140" height="6" fill="${tokens.accent}"/>`,
      "obsidian-broadsheet": `
        <defs>
          <pattern id="grid-${index}" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${tokens.border}" stroke-width="0.8" opacity="0.45"/>
          </pattern>
        </defs>
        <rect x="64" y="64" width="1072" height="502" fill="url(#grid-${index})" stroke="${tokens.border}" stroke-width="1.5"/>
        <circle cx="960" cy="250" r="110" fill="none" stroke="${tokens.link}" stroke-width="2" opacity="0.65"/>
        <circle cx="960" cy="250" r="64" fill="none" stroke="${tokens.link}" stroke-width="1.5" stroke-dasharray="8 6"/>
        <circle cx="960" cy="250" r="12" fill="${tokens.link}"/>`,
      "espresso-salon": `
        <radialGradient id="lamp-${index}" cx="78%" cy="32%" r="48%">
          <stop offset="0%" stop-color="${tokens.link}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${tokens.bg}" stop-opacity="0"/>
        </radialGradient>
        <rect width="1200" height="630" fill="url(#lamp-${index})"/>
        <circle cx="940" cy="220" r="95" fill="none" stroke="${tokens.link}" stroke-width="1.5" opacity="0.5"/>
        <path d="M845 310 C890 250, 990 250, 1035 310" fill="none" stroke="${tokens.accent}" stroke-width="2.5"/>`
    };
    const tspanMarkup = headlineLines.map(
      (line, i) => `<tspan x="90" dy="${i === 0 ? 0 : 48}">${escXml(line)}</tspan>`
    ).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" fill="${tokens.bg}"/>
  ${motifByTemplate[templateStyle]}
  <text x="90" y="155" font-family="monospace" font-size="20" font-weight="700" letter-spacing="2" fill="${tokens.link}">${safeKicker}</text>
  <text x="90" y="232" font-family="Georgia, serif" font-weight="700" font-size="38" fill="${tokens.text}">${tspanMarkup}</text>
  <text x="90" y="346" font-family="sans-serif" font-size="22" fill="${tokens.text2}">${safeBrand} \xB7 ${escXml(presetMeta.name)}</text>
  <line x1="90" y1="470" x2="1110" y2="470" stroke="${tokens.border}" stroke-width="1.5"/>
  <text x="90" y="520" font-family="monospace" font-size="20" fill="${tokens.muted}">${escXml(authorName)} \xB7 S\u1ED1 0${index}/0${totalCovers2}</text>
</svg>
`;
  };
  const ogDefaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" fill="${tokens.bg}"/>
  <rect x="48" y="48" width="1104" height="534" rx="16" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="2"/>
  <text x="96" y="190" font-family="monospace" font-size="20" fill="${tokens.link}">${escXml(presetMeta.name.toUpperCase())}</text>
  <text x="96" y="280" font-family="Georgia, serif" font-weight="700" font-size="58" fill="${tokens.text}">${escXml(siteTitle)}</text>
  <text x="96" y="355" font-family="sans-serif" font-size="26" fill="${tokens.text2}">${escXml(tagline.slice(0, 78))}</text>
  <line x1="96" y1="450" x2="1104" y2="450" stroke="${tokens.border}" stroke-width="1"/>
  <text x="96" y="510" font-family="monospace" font-size="22" fill="${tokens.muted}">${escXml(authorName)} \xB7 GitHub Pages Blog</text>
</svg>
`;
  const manifestJson = JSON.stringify(
    {
      name: siteTitle,
      short_name: headerBrand.slice(0, 24),
      description: tagline,
      start_url: "./",
      display: "standalone",
      background_color: tokens.bg,
      theme_color: tokens.accent,
      icons: [
        {
          src: hasBundledPngFavicon ? "./favicon.png" : "./favicon.svg",
          sizes: hasBundledPngFavicon ? "192x192" : "any",
          type: hasBundledPngFavicon ? "image/png" : "image/svg+xml"
        }
      ]
    },
    null,
    2
  ) + "\n";
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
      'Ch\u01B0a \u0111\u1EB7t ti\xEAu \u0111\u1EC1'
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
const initialMode = SITE_CONFIG.themeMode === 'dark' ? 'dark' : 'light';
const initialDark = initialMode === 'dark';
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
const tawkWidgetId = tawkChannel?.value
  ? tawkChannel.value
      .trim()
      .replace(/^https?:\\/\\/embed\\.tawk\\.to\\//i, '')
      .replace(/^\\/+/, '')
  : '';

function resolveChatHref(id: string, rawValue: string): string {
  const val = rawValue.trim();
  if (/^(https?:|mailto:|tel:)/i.test(val)) return val;
  if (id === 'zalo') return \`https://zalo.me/\${encodeURIComponent(val.replace(/^@/, ''))}\`;
  if (id === 'messenger') return \`https://m.me/\${encodeURIComponent(val.replace(/^@/, ''))}\`;
  if (id === 'telegram') return \`https://t.me/\${encodeURIComponent(val.replace(/^@/, ''))}\`;
  if (id === 'whatsapp') {
    const digits = val.replace(/[^0-9]/g, '');
    const normalized = /^0\\d{8,10}$/.test(digits) ? \`84\${digits.slice(1)}\` : digits;
    return \`https://wa.me/\${normalized}\`;
  }
  if (id === 'email') return \`mailto:\${val}\`;
  return val;
}

const mainNav = [
  { label: 'Trang nh\u1EA5t', href: withBase('/') },
  { label: 'Kho b\xE0i vi\u1EBFt', href: withBase('/bai-viet/') },
];
---

<!doctype html>
<html lang="vi" data-mode={initialMode} class={initialDark ? 'dark' : ''}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{fullTitle}</title>
    <meta name="description" content={description} />
    {noindex && <meta name="robots" content="noindex" />}
    {canonical && <link rel="canonical" href={canonical} />}

    <script is:inline define:vars={{ defaultMode: initialMode }}>
      (function () {
        try {
          var saved = localStorage.getItem('daoky_theme_mode');
          var mode = saved === 'dark' || saved === 'light' ? saved : defaultMode;
          document.documentElement.setAttribute('data-mode', mode);
          document.documentElement.classList.toggle('dark', mode === 'dark');
        } catch (e) {}
      })();
    </script>

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
          <img src={iconHref} alt={SITE_CONFIG.headerTitle} width="30" height="30" />
          <span>{SITE_CONFIG.headerTitle}</span>
        </a>

        <nav class="nav-links" aria-label="\u0110i\u1EC1u h\u01B0\u1EDBng ch\xEDnh">
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
          <button
            id="themeToggleBtn"
            class="icon-btn theme-toggle-btn"
            type="button"
            aria-label="Chuy\u1EC3n ch\u1EBF \u0111\u1ED9 S\xE1ng / T\u1ED1i"
            title="Chuy\u1EC3n ch\u1EBF \u0111\u1ED9 S\xE1ng / T\u1ED1i"
          >
            <svg class="sun-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
            <svg class="moon-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          </button>
          <a class="icon-btn" href={withBase('/rss.xml')} title="RSS Feed" aria-label="RSS Feed">
            RSS
          </a>
          <button id="mobileMenuBtn" class="mobile-menu-btn" type="button" aria-label="M\u1EDF menu">
            \u2630
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
          <p class="footer-sub">T\xE1c gi\u1EA3: {SITE_CONFIG.authorName}</p>
        </div>
        <div class="footer-links">
          <a href={withBase('/bai-viet/')}>Kho b\xE0i vi\u1EBFt</a>
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
      <div id="daokyLiveChat" class="livechat-dock">
        <div id="livechatPanel" class="livechat-panel hidden" role="dialog" aria-label={liveChat.title || 'Live Chat'}>
          <div class="livechat-head">
            <div>
              <strong>{liveChat.title || 'Tr\xF2 chuy\u1EC7n v\u1EDBi t\xE1c gi\u1EA3'}</strong>
              {liveChat.welcomeText && <p>{liveChat.welcomeText}</p>}
            </div>
            <button id="livechatCloseBtn" type="button" aria-label="\u0110\xF3ng h\u1ED9p chat">\u2715</button>
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
                <span class="livechat-ch-arrow">Nh\u1EAFn ngay \u2192</span>
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

    {liveChat?.enabled && tawkWidgetId && (
      <script is:inline define:vars={{ tawkId: tawkWidgetId }}>
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
      const themeBtn = document.getElementById('themeToggleBtn');
      if (themeBtn) {
        themeBtn.addEventListener('click', () => {
          const cur = document.documentElement.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
          const next = cur === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-mode', next);
          document.documentElement.classList.toggle('dark', next === 'dark');
          try {
            localStorage.setItem('daoky_theme_mode', next);
          } catch (e) {}
        });
      }
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

  ${Object.keys(TEMPLATE_DUAL_TOKENS).flatMap(
    (tplId) => ["light", "dark"].map((mode) => {
      const t = TEMPLATE_DUAL_TOKENS[tplId][mode];
      return `html[data-mode='${mode}'] body[data-template='${tplId}'] {
    --bg: ${t.bg};
    --surface: ${t.surface};
    --card: ${t.card};
    --border: ${t.border};
    --text: ${t.text};
    --text-2: ${t.text2};
    --muted: ${t.muted};
    --accent: ${t.accent};
    --accent-text: ${t.accentText};
    --link: ${t.link};
    --font-display: ${t.fontDisplay};
    --font-body: ${t.fontBody};
  }`;
    })
  ).join("\n\n  ")}

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
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
    width: 100%;
    max-width: 1120px;
    margin: 0 auto;
    padding: 0 20px;
  }

  @media (max-width: 639px) {
    .wrap {
      padding: 0 16px;
    }
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
    gap: 12px;
    min-height: 60px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: var(--text);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.15rem;
    letter-spacing: -0.02em;
    text-decoration: none !important;
  }

  .brand img {
    border-radius: 9999px;
    border: 1px solid var(--border);
    object-fit: cover;
    flex-shrink: 0;
  }

  .brand span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    white-space: nowrap;
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
    flex-shrink: 0;
  }

  .icon-btn,
  .mobile-menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 0 10px;
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

  .theme-toggle-btn {
    min-width: 38px;
    padding: 0;
  }

  .theme-toggle-btn .sun-icon {
    display: none;
    color: #f59e0b;
  }

  .theme-toggle-btn .moon-icon {
    display: block;
    color: var(--link);
  }

  html[data-mode='dark'] .theme-toggle-btn .sun-icon {
    display: block;
  }

  html[data-mode='dark'] .theme-toggle-btn .moon-icon {
    display: none;
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
const category = String(entry.data?.danh_muc || entry.data?.category || 'B\xE0i vi\u1EBFt');
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
        <span>\xB7</span>
        <span>{formatVietnameseDate(date)}</span>
        <span>\xB7</span>
        <span>{minutes} ph\xFAt \u0111\u1ECDc</span>
      </div>
      <h3 class="post-title">{title}</h3>
      <p class="post-excerpt">{excerpt}</p>
    </div>
  </a>
</article>

<style>
  .post-card {
    height: 100%;
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
    flex-shrink: 0;
  }

  .post-cover-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .post-body {
    flex: 1;
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
    <div class="masthead-kicker">{SITE_CONFIG.authorName} \xB7 \u1EA4n ph\u1EA9m Blog c\xE1 nh\xE2n</div>
    <h1>{SITE_CONFIG.siteTitle}</h1>
    <p class="masthead-desc">{SITE_CONFIG.tagline}</p>

    <div class="masthead-tools">
      <input
        id="homeSearchInput"
        type="search"
        placeholder="T\xECm b\xE0i vi\u1EBFt theo ti\xEAu \u0111\u1EC1, ch\u1EE7 \u0111\u1EC1..."
        class="search-input"
      />
      <a class="masthead-cta" href={withBase('/bai-viet/')}>Kho b\xE0i vi\u1EBFt ({posts.length})</a>
    </div>
  </section>

  {leadPost && (
    <section class="lead-section" data-search={\`\${getPostTitle(leadPost)} \${getPostExcerpt(leadPost)}\`.toLowerCase()}>
      <a class="lead-card" href={leadHref}>
        <div class="lead-text">
          <div class="lead-meta">
            <span class="lead-rubric">{String(leadPost.data?.danh_muc || 'Ti\xEAu \u0111i\u1EC3m')}</span>
            <span>\xB7</span>
            <span>{formatVietnameseDate(getPostDate(leadPost))}</span>
            <span>\xB7</span>
            <span>{estimateReadingTime(leadPost.body || '')} ph\xFAt \u0111\u1ECDc</span>
          </div>
          <h2>{getPostTitle(leadPost)}</h2>
          <p>{getPostExcerpt(leadPost)}</p>
          <span class="read-more">\u0110\u1ECDc tr\u1ECDn b\xE0i vi\u1EBFt \u2192</span>
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
      <h2>B\xE0i vi\u1EBFt g\u1EA7n \u0111\xE2y</h2>
    </div>

    {posts.length === 0 ? (
      <p class="empty-note">Ch\u01B0a c\xF3 b\xE0i vi\u1EBFt n\xE0o \u0111\u01B0\u1EE3c xu\u1EA5t b\u1EA3n.</p>
    ) : (
      <div id="postsGrid" class={\`posts-grid template-\${SITE_CONFIG.templateStyle}\`}>
        {secondaryPosts.map((entry) => (
          <PostCard entry={entry} />
        ))}
      </div>
    )}
    <p id="searchEmptyMsg" class="empty-note hidden">Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt ph\xF9 h\u1EE3p v\u1EDBi t\u1EEB kh\xF3a c\u1EE7a b\u1EA1n.</p>
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
    margin-left: auto;
    margin-right: auto;
    max-width: 780px;
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
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    width: 100%;
  }

  .search-input {
    display: block;
    width: 100%;
    min-width: 0;
    height: 44px;
    min-height: 44px;
    max-height: 44px;
    line-height: normal;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    font-size: 0.92rem;
    font-family: inherit;
    box-sizing: border-box;
    -webkit-appearance: none;
    appearance: none;
  }

  .masthead-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    min-height: 44px;
    padding: 0 20px;
    border-radius: 10px;
    background: var(--accent);
    color: var(--accent-text);
    font-size: 0.88rem;
    font-weight: 600;
    text-decoration: none !important;
    white-space: nowrap;
  }

  @media (max-width: 639px) {
    .masthead-tools {
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
      max-width: none;
    }
    .search-input {
      width: 100%;
      height: 44px;
    }
    .masthead-cta {
      width: 100%;
      height: 44px;
    }
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
      .map((e) => String(e.data?.danh_muc || e.data?.category || 'B\xE0i vi\u1EBFt').trim())
      .filter(Boolean)
  )
);
---

<BaseLayout title="Kho b\xE0i vi\u1EBFt" description="To\xE0n b\u1ED9 b\xE0i vi\u1EBFt, ti\u1EC3u lu\u1EADn v\xE0 ghi ch\xE9p tr\xEAn blog.">
  <div class="col-header">
    <h1>Kho b\xE0i vi\u1EBFt</h1>
    <p>T\u1EA5t c\u1EA3 {entries.length} b\xE0i vi\u1EBFt \u0111\xE3 xu\u1EA5t b\u1EA3n.</p>

    <div class="archive-tools">
      <input
        id="archiveSearchInput"
        type="search"
        placeholder="T\xECm trong kho b\xE0i vi\u1EBFt..."
        class="archive-search"
      />
      {categories.length > 1 && (
        <div id="archiveCatBar" class="cat-bar" role="tablist" aria-label="L\u1ECDc theo chuy\xEAn m\u1EE5c">
          <button type="button" class="cat-btn active" data-cat="all">
            T\u1EA5t c\u1EA3 ({entries.length})
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
    <p style="color: var(--muted);">Ch\u01B0a c\xF3 b\xE0i vi\u1EBFt n\xE0o \u0111\u01B0\u1EE3c xu\u1EA5t b\u1EA3n.</p>
  ) : (
    <div id="archiveGrid" class={\`col-grid template-\${SITE_CONFIG.templateStyle}\`}>
      {entries.map((entry) => (
        <div
          class="archive-item"
          data-cat={String(entry.data?.danh_muc || entry.data?.category || 'B\xE0i vi\u1EBFt').trim().toLowerCase()}
        >
          <PostCard entry={entry} />
        </div>
      ))}
    </div>
  )}
  <p id="archiveEmptyMsg" class="empty-archive hidden">Kh\xF4ng c\xF3 b\xE0i vi\u1EBFt n\xE0o kh\u1EDBp b\u1ED9 l\u1ECDc hi\u1EC7n t\u1EA1i.</p>

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
    display: block;
    flex: 0 0 auto;
    width: 100%;
    max-width: 720px;
    min-width: 0;
    height: 44px;
    min-height: 44px;
    max-height: 44px;
    line-height: normal;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    font-size: 0.92rem;
    font-family: inherit;
    box-sizing: border-box;
    -webkit-appearance: none;
    appearance: none;
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
const category = String(entry.data?.danh_muc || entry.data?.category || 'B\xE0i vi\u1EBFt');
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
    <a class="back-link" href={withBase('/bai-viet/')}>\u2190 Quay l\u1EA1i kho b\xE0i vi\u1EBFt</a>

    <header class="article-header">
      <div class="article-meta">
        <span class="meta-cat">{category}</span>
        <span>\xB7</span>
        <span>{formatVietnameseDate(date)}</span>
        <span>\xB7</span>
        <span>{minutes} ph\xFAt \u0111\u1ECDc</span>
      </div>
      <h1>{title}</h1>
      {excerpt && <p class="article-lead">{excerpt}</p>}
      <div class="article-byline">B\u1EDFi <strong>{resolvedAuthor}</strong></div>
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
        Ch\u1EE7 \u0111\u1EC1: {tags.map((t) => \`#\${t}\`).join(' \xB7 ')}
      </div>
    )}

    <aside class="author-box">
      <div class="author-name">{resolvedAuthor}</div>
      <p class="author-bio">{SITE_CONFIG.authorBio}</p>
    </aside>
  </article>

  {relatedPosts.length > 0 && (
    <section class="related-section">
      <h2 class="related-title">B\xE0i vi\u1EBFt li\xEAn quan</h2>
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
    max-width: 1120px;
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

  @media (min-width: 640px) {
    .related-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 960px) {
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

<BaseLayout title="404 \u2014 Kh\xF4ng t\xECm th\u1EA5y trang" noindex={true}>
  <div class="box-404">
    <p class="code">404</p>
    <h1>Kh\xF4ng t\xECm th\u1EA5y n\u1ED9i dung n\xE0y</h1>
    <p>Li\xEAn k\u1EBFt c\xF3 th\u1EC3 \u0111\xE3 thay \u0111\u1ED5i ho\u1EB7c b\xE0i vi\u1EBFt ch\u01B0a \u0111\u01B0\u1EE3c xu\u1EA5t b\u1EA3n.</p>
    <a class="btn-home" href={withBase('/')}>Quay v\u1EC1 trang nh\u1EA5t</a>
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
  const makeMarkdown = (fm, body) => `---
${dumpYaml(fm, { lineWidth: -1 }).trim()}
---

${body.trim()}
`;
  const STARTER_SEEDS_BY_TEMPLATE = {
    "newyorker-light": [
      {
        fileName: "giu-tam-tri-tinh-tai.md",
        coverIndex: 1,
        title: "Ngh\u1EC7 thu\u1EADt gi\u1EEF t\xE2m tr\xED t\u0129nh t\u1EA1i gi\u1EEFa d\xF2ng tin t\u1EE9c h\u1ED1i h\u1EA3",
        category: "Ti\u1EC3u lu\u1EADn \xB7 V\u0103n ho\xE1",
        categorySlug: "tieu-luan-van-hoa",
        slug: "giu-tam-tri-tinh-tai",
        tags: ["tieu-luan", "van-hoa", "dao-ky"],
        excerpt: "M\u1ED9t b\xE0i ti\u1EC3u lu\u1EADn v\u1EC1 th\xF3i quen vi\u1EBFt ch\u1EADm, \u0111\u1ECDc s\xE2u v\xE0 gi\u1EEF m\u1ED9t th\u01B0 ph\xF2ng ch\u1EEF ngh\u0129a \u0111\u1ED9c l\u1EADp kh\u1ECFi thu\u1EADt to\xE1n tr\xEAn " + siteTitle + ".",
        date: today,
        body: `Gi\u1EEFa d\xF2ng ch\u1EA3y th\xF4ng tin ng\u1EAFn h\u1EA1n thay \u0111\u1ED5i t\u1EEBng ph\xFAt, vi\u1EC7c gi\u1EEF m\u1ED9t kh\xF4ng gian vi\u1EBFt l\xE1ch ch\u1EADm r\xE3i gi\u1ED1ng nh\u01B0 m\u1EDF m\u1ED9t \xF4 c\u1EEDa nh\xECn ra khu v\u01B0\u1EDDn t\u0129nh l\u1EB7ng. **${siteTitle}** \u0111\u01B0\u1EE3c ${authorName} d\u1EF1ng n\xEAn t\u1EEB tinh th\u1EA7n \u0111\xF3: m\u1ED7i b\xE0i vi\u1EBFt l\xE0 m\u1ED9t m\u1EA3nh suy t\u01B0 c\xF3 \u0111\u1EA7u c\xF3 cu\u1ED1i, kh\xF4ng ch\u1EA1y theo l\u01B0\u1EE3t b\u1EA5m v\u1ED9i v\xE0ng.

## \u0110\u1ECDc ch\u1EADm \u0111\u1EC3 hi\u1EC3u s\xE2u

Khi t\u1ED1c \u0111\u1ED9 l\u01B0\u1EDBt tin t\u0103ng l\xEAn, kh\u1EA3 n\u0103ng ki\xEAn nh\u1EABn v\u1EDBi m\u1ED9t l\u1EADp lu\u1EADn k\xE9o d\xE0i b\u1EA3y t\xE1m tr\u0103m ch\u1EEF l\u1EA1i tr\u1EDF th\xE0nh \u0111i\u1EC1u hi\u1EBFm hoi. T\u1EA1p ch\xED v\u0103n ch\u01B0\u01A1ng truy\u1EC1n th\u1ED1ng t\u1ED3n t\u1EA1i b\u1EC1n b\u1EC9 h\xE0ng tr\u0103m n\u0103m b\u1EDFi h\u1ECD t\xF4n tr\u1ECDng nh\u1ECBp th\u1EDF t\u1EF1 nhi\xEAn c\u1EE7a ng\u01B0\u1EDDi vi\u1EBFt l\u1EABn ng\u01B0\u1EDDi \u0111\u1ECDc.

> M\u1ED9t trang vi\u1EBFt t\u1ED1t kh\xF4ng ch\u1EC9 truy\u1EC1n \u0111\u1EA1t th\xF4ng tin, m\xE0 c\xF2n t\u1EA1o ra kho\u1EA3ng l\u1EB7ng \u0111\u1EC3 ng\u01B0\u1EDDi \u0111\u1ECDc t\u1EF1 \u0111\u1ED1i tho\u1EA1i v\u1EDBi ch\xEDnh m\xECnh.

## Gi\u1EEF \u0111\u1ED9c l\u1EADp kh\u1ECFi thu\u1EADt to\xE1n

- **Ch\u1EEF ngh\u0129a thu\u1EA7n Markdown**: L\u01B0u tr\u1EEF ngay tr\xEAn GitHub repository c\xE1 nh\xE2n d\u01B0\u1EDBi quy\u1EC1n ki\u1EC3m so\xE1t 100% c\u1EE7a b\u1EA1n.
- **Nh\u1ECBp tr\xECnh b\xE0y th\u01B0 th\xE1i**: \u0110\u1ED9 r\u1ED9ng d\xF2ng ch\u1EEF v\u1EEBa t\u1EA7m m\u1EAFt, gi\u1EA5y ng\xE0 d\u1ECBu nh\u1EB9 v\xE0 h\u1ED7 tr\u1EE3 b\u1EADt t\u1EAFt ch\u1EBF \u0111\u1ED9 S\xE1ng/T\u1ED1i b\u1EA5t c\u1EE9 l\xFAc n\xE0o.
- **\u0110\u1ECBnh danh r\xF5 r\xE0ng**: T\xEDch h\u1EE3p s\u1EB5n d\u1EEF li\u1EC7u c\u1EA5u tr\xFAc \`BlogPosting\`, RSS Feed v\xE0 Sitemap chu\u1EA9n m\u1EF1c.`
      },
      {
        fileName: "nhip-cau-chu-tap-chi-van-chuong.md",
        coverIndex: 2,
        title: "B\xE0n v\u1EC1 nh\u1ECBp c\xE2u ch\u1EEF trong t\u1EA1p ch\xED v\u0103n ch\u01B0\u01A1ng hi\u1EC7n \u0111\u1EA1i",
        category: "V\u0103n ch\u01B0\u01A1ng",
        categorySlug: "van-chuong",
        slug: "nhip-cau-chu-tap-chi-van-chuong",
        tags: ["van-chuong", "bien-tap", "serif"],
        excerpt: "C\xE1ch s\u1EAFp x\u1EBFp \u0111\u1ED9 d\xE0i \u0111o\u1EA1n v\u0103n, \u0111\u1EC1 m\u1EE5c v\xE0 kho\u1EA3ng tr\u1ED1ng \u0111\u1EC3 trang ti\u1EC3u lu\u1EADn gi\u1EEF \u0111\u01B0\u1EE3c s\u1EF1 trang nh\xE3 c\u1ED5 \u0111i\u1EC3n tr\xEAn m\xE0n h\xECnh \u0111i\u1EC7n tho\u1EA1i.",
        date: dayOffsetStr(1),
        body: `## Nh\u1ECBp \u0111i\u1EC7u c\u1EE7a \u0111o\u1EA1n v\u0103n v\xE0 kho\u1EA3ng tr\u1EAFng

M\u1ED9t b\xE0i ti\u1EC3u lu\u1EADn d\xF9 gi\xE0u \xFD t\u01B0\u1EDFng \u0111\u1EBFn \u0111\xE2u c\u0169ng kh\xF3 \u0111i h\u1EBFt l\xF2ng ng\u01B0\u1EDDi \u0111\u1ECDc n\u1EBFu thi\u1EBFu nh\u1ECBp ngh\u1EC9 h\u1EE3p l\xFD. Xen k\u1EBD gi\u1EEFa nh\u1EEFng \u0111o\u1EA1n ph\xE2n t\xEDch chi\u1EC1u s\xE2u l\xE0 m\u1ED9t tr\xEDch d\u1EABn s\xFAc t\xEDch hay m\u1ED9t ti\xEAu \u0111\u1EC1 ph\u1EE5 gi\xE0u s\u1EE9c g\u1EE3i.

### Ba nguy\xEAn t\u1EAFc bi\xEAn t\u1EADp ch\u1EEF ngh\u0129a

1. **M\u1EDF \u0111\u1EA7u gi\xE0u h\xECnh \u1EA3nh**: \u0110\u01B0a ng\u01B0\u1EDDi \u0111\u1ECDc b\u01B0\u1EDBc th\u1EB3ng v\xE0o b\u1ED1i c\u1EA3nh c\xE2u chuy\u1EC7n trong ba c\xE2u \u0111\u1EA7u.
2. **\u0110\u1EC1 m\u1EE5c v\u1EEBa \u0111\u1EE7**: Chia m\u1EA1ch \xFD th\xE0nh 2\u20134 ch\u1EB7ng l\u1EDBn gi\xFAp \u0111\u1ECDc tr\xEAn \u0111i\u1EC7n tho\u1EA1i v\u1EABn m\u1EA1ch l\u1EA1c.
3. **K\u1EBFt b\xE0i d\u01B0 \xE2m**: \u0110\u1EC3 l\u1EA1i m\u1ED9t c\xE2u h\u1ECFi m\u1EDF ho\u1EB7c m\u1ED9t suy ng\u1EABm \u0111\u1ECDng l\u1EA1i l\xE2u h\u01A1n sau khi kh\xE9p trang.`
      },
      {
        fileName: "ghi-chep-so-tay-bia-vai.md",
        coverIndex: 3,
        title: "Ghi ch\xE9p b\xEAn t\xE1ch c\xE0 ph\xEA s\xE1ng v\xE0 cu\u1ED1n s\u1ED5 tay b\xECa v\u1EA3i",
        category: "Th\u01B0 ph\xF2ng",
        categorySlug: "thu-phong",
        slug: "ghi-chep-so-tay-bia-vai",
        tags: ["so-tay", "thu-phong", "ghi-chep"],
        excerpt: "V\xEC sao th\xF3i quen ghi ch\xE9p m\u1ED7i s\xE1ng bi\u1EBFn th\xE0nh kho t\u01B0 li\u1EC7u qu\xFD gi\xE1 cho nh\u1EEFng b\xE0i vi\u1EBFt d\xE0i h\u01A1i v\u1EC1 sau.",
        date: dayOffsetStr(2),
        body: `## T\u1EEB trang gi\u1EA5y nh\xE1p \u0111\u1EBFn kho l\u01B0u tr\u1EEF s\u1ED1

M\u1ED7i \xFD t\u01B0\u1EDFng l\u1EDBn hi\u1EBFm khi xu\u1EA5t hi\u1EC7n tr\u1ECDn v\u1EB9n ngay l\u1EADp t\u1EE9c. Ch\xFAng th\u01B0\u1EDDng b\u1EAFt \u0111\u1EA7u t\u1EEB m\u1ED9t c\xE2u ghi ch\xFA v\u1ED9i b\xEAn l\u1EC1 s\xE1ch, m\u1ED9t \u0111o\u1EA1n quan s\xE1t ngo\xE0i ph\u1ED1 hay m\u1ED9t th\u1EAFc m\u1EAFc nh\u1ECF bu\u1ED5i s\u1EDBm mai.

## Xu\u1EA5t b\u1EA3n \u0111\u01A1n gi\u1EA3n c\xF9ng \u0110\u1EA1o K\xFD

Khi chuy\u1EC3n nh\u1EEFng ghi ch\xE9p \u1EA5y v\xE0o kho Markdown tr\xEAn **${siteTitle}**, b\u1EA1n gi\u1EEF nguy\xEAn \u0111\u01B0\u1EE3c t\xEDnh nguy\xEAn b\u1EA3n c\u1EE7a gi\u1ECDng v\u0103n c\xE1 nh\xE2n v\xE0 l\u01B0u gi\u1EEF tr\u1ECDn \u0111\u1EDDi tr\xEAn GitHub Pages.`
      }
    ],
    "nytimes-light": [
      {
        fileName: "bo-cuc-bao-in-ro-rang.md",
        coverIndex: 1,
        title: "V\xEC sao c\xE1c to\xE0 so\u1EA1n l\u1EDBn quay l\u1EA1i b\u1ED1 c\u1EE5c b\xE1o in r\xF5 r\xE0ng?",
        category: "Ti\xEAu \u0111i\u1EC3m \xB7 Ph\xE2n t\xEDch",
        categorySlug: "tieu-diem",
        slug: "bo-cuc-bao-in-ro-rang",
        tags: ["bao-chi", "bo-cuc", "editorial"],
        excerpt: "C\u1EA5u tr\xFAc c\u1ED9t tin m\u1EA1ch l\u1EA1c, \u0111\u01B0\u1EDDng k\u1EBB ch\u1EC9 s\u1EAFc n\xE9t v\xE0 h\u1EC7 ph\xE2n c\u1EA5p ti\xEAu \u0111\u1EC1 gi\xFAp \u0111\u1ED9c gi\u1EA3 c\u1EE7a " + siteTitle + " n\u1EAFm b\u1EAFt v\u1EA5n \u0111\u1EC1 trong v\xE0i gi\xE2y.",
        date: today,
        body: `C\xE1c \u1EA5n ph\u1EA9m tin t\u1EE9c v\xE0 ph\xE2n t\xEDch uy t\xEDn \u0111\u1EC1u chia s\u1EBB m\u1ED9t tri\u1EBFt l\xFD thi\u1EBFt k\u1EBF chung: \u0111\u1EEBng b\u1EAFt \u0111\u1ED9c gi\u1EA3 ph\u1EA3i \u0111o\xE1n xem \u0111\xE2u l\xE0 b\xE0i quan tr\u1ECDng nh\u1EA5t tr\xEAn trang. Tr\xEAn **${siteTitle}**, b\xE0i ti\xEAu \u0111i\u1EC3m \u0111\u01B0\u1EE3c \u0111\u1EB7t trang tr\u1ECDng ngay d\u01B0\u1EDBi m\u0103ng-s\xE9t \u0111\u1EC3 d\u1EABn d\u1EAFt to\xE0n b\u1ED9 c\xE2u chuy\u1EC7n trong ng\xE0y.

## S\u1EE9c m\u1EA1nh c\u1EE7a h\u1EC7 ph\xE2n c\u1EA5p b\xE1o in

M\u1ED9t \u0111\u01B0\u1EDDng k\u1EBB 1px s\u1EAFc n\xE9t, m\u1ED9t d\xF2ng kicker ng\u1EAFn b\u1EB1ng font Monospace k\u1EBFt h\u1EE3p c\xF9ng ti\xEAu \u0111\u1EC1 Serif kh\u1ED5 l\u1EDBn \u0111\u1EE7 s\u1EE9c t\u1EA1o ra tr\u1EADt t\u1EF1 th\u1ECB gi\xE1c r\xF5 r\xE0ng m\xE0 kh\xF4ng c\u1EA7n b\u1EA5t k\u1EF3 hi\u1EC7u \u1EE9ng r\u1ED1i m\u1EAFt n\xE0o.

- **B\xE0i ti\xEAu \u0111i\u1EC3m (Lead Story)**: T\u1EADp trung tr\u1ECDn v\u1EB9n v\xE0o c\xE2u chuy\u1EC7n trung t\xE2m v\xE0 h\xECnh \u1EA3nh ch\u1EE7 \u0111\u1EA1o.
- **L\u01B0\u1EDBi tin theo chuy\xEAn m\u1EE5c**: Cho ph\xE9p \u0111\u1ED9c gi\u1EA3 l\u01B0\u1EDBt nhanh ti\xEAu \u0111\u1EC1, t\xF3m t\u1EAFt v\xE0 th\u1EDDi gian \u0111\u1ECDc \u01B0\u1EDBc l\u01B0\u1EE3ng.
- **Ch\u1EBF \u0111\u1ED9 S\xE1ng / T\u1ED1i linh ho\u1EA1t**: Chuy\u1EC3n \u0111\u1ED5i m\u01B0\u1EE3t m\xE0 ch\u1EC9 b\u1EB1ng m\u1ED9t ch\u1EA1m ngay tr\xEAn thanh ti\xEAu \u0111\u1EC1.`
      },
      {
        fileName: "kien-truc-web-tinh-github-pages.md",
        coverIndex: 2,
        title: "To\xE0n c\u1EA3nh ki\u1EBFn tr\xFAc web t\u0129nh t\u1ED1c \u0111\u1ED9 cao tr\xEAn GitHub Pages",
        category: "K\u1EF9 thu\u1EADt",
        categorySlug: "ky-thuat",
        slug: "kien-truc-web-tinh-github-pages",
        tags: ["astro", "web-tinh", "hieu-nang"],
        excerpt: "Astro bi\xEAn d\u1ECBch tr\u01B0\u1EDBc to\xE0n b\u1ED9 HTML/CSS gi\xFAp trang blog \u0111\u1EA1t \u0111i\u1EC3m t\u1EA3i g\u1EA7n nh\u01B0 t\u1EE9c th\xEC \u1EDF m\u1ECDi n\u01A1i.",
        date: dayOffsetStr(1),
        body: `## Kh\xF4ng c\u01A1 s\u1EDF d\u1EEF li\u1EC7u c\u1ED3ng k\u1EC1nh, kh\xF4ng chi ph\xED v\u1EADn h\xE0nh

Thay v\xEC ch\u1EDD m\xE1y ch\u1EE7 truy v\u1EA5n m\u1ED7i khi c\xF3 ng\u01B0\u1EDDi m\u1EDF b\xE0i vi\u1EBFt, to\xE0n b\u1ED9 c\xE1c trang tr\xEAn **${siteTitle}** \u0111\u01B0\u1EE3c bi\xEAn d\u1ECBch s\u1EB5n th\xE0nh t\u1EC7p t\u0129nh si\xEAu nh\u1EB9. K\u1EBFt h\u1EE3p v\u1EDBi m\u1EA1ng ph\xE2n ph\u1ED1i to\xE0n c\u1EA7u c\u1EE7a GitHub Pages, th\u1EDDi gian ph\u1EA3n h\u1ED3i \u0111\u1EA7u ti\xEAn lu\xF4n \u1EDF m\u1EE9c th\u1EA5p nh\u1EA5t.

### L\u1EE3i \xEDch th\u1EF1c t\u1EBF cho ng\u01B0\u1EDDi vi\u1EBFt

1. **\u1ED4n \u0111\u1ECBnh tuy\u1EC7t \u0111\u1ED1i**: Kh\xF4ng lo s\u1EADp c\u01A1 s\u1EDF d\u1EEF li\u1EC7u hay l\u1ED7 h\u1ED5ng plugin.
2. **B\u1EA3o m\u1EADt l\u1ECBch s\u1EED s\u1EEDa \u0111\u1ED5i**: M\u1ECDi l\u1EA7n c\u1EADp nh\u1EADt n\u1ED9i dung \u0111\u1EC1u n\u1EB1m g\u1ECDn trong l\u1ECBch s\u1EED commit c\u1EE7a Git.`
      },
      {
        fileName: "chuan-seo-an-pham-bao-chi.md",
        coverIndex: 3,
        title: "Chu\u1EA9n SEO t\u1EF1 nhi\xEAn cho \u1EA5n ph\u1EA9m b\xE1o ch\xED c\xE1 nh\xE2n",
        category: "SEO & D\u1EEF li\u1EC7u",
        categorySlug: "seo-du-lieu",
        slug: "chuan-seo-an-pham-bao-chi",
        tags: ["seo", "json-ld", "rss"],
        excerpt: "T\u1EEB Sitemap XML, OpenGraph \u0111\u1EBFn d\u1EEF li\u1EC7u c\xF3 c\u1EA5u tr\xFAc BlogPosting \u2014 m\u1ECDi ti\xEAu chu\u1EA9n c\u1ED1t l\xF5i \u0111\u1EC1u \u0111\u01B0\u1EE3c sinh t\u1EF1 \u0111\u1ED9ng.",
        date: dayOffsetStr(2),
        body: `## Vi\u1EBFt hay \u0111i \u0111\xF4i v\u1EDBi c\u1EA5u tr\xFAc k\u1EF9 thu\u1EADt chu\u1EA9n

M\u1ED7i b\xE0i vi\u1EBFt xu\u1EA5t b\u1EA3n t\u1EEB \u0110\u1EA1o K\xFD l\xEAn **${siteTitle}** \u0111\u1EC1u t\u1EF1 \u0111\u1ED9ng s\u1EDF h\u1EEFu th\u1EBB Meta chu\u1EA9n x\xE1c, URL slug s\u1EA1ch ti\u1EBFng Vi\u1EC7t kh\xF4ng d\u1EA5u, Sitemap XML c\u1EADp nh\u1EADt li\xEAn t\u1EE5c v\xE0 JSON-LD \`BlogPosting\` \u0111\u1EC3 c\xF4ng c\u1EE5 t\xECm ki\u1EBFm hi\u1EC3u \u0111\xFAng ch\u1EE7 \u0111\u1EC1 l\u1EABn t\xE1c gi\u1EA3 **${authorName}**.`
      },
      {
        fileName: "luong-tin-chuyen-sau-hang-tuan.md",
        coverIndex: 4,
        title: "S\u1EAFp x\u1EBFp chuy\xEAn m\u1EE5c tin ph\xE2n t\xEDch & b\u1EA3n tin cu\u1ED1i tu\u1EA7n",
        category: "B\xECnh lu\u1EADn",
        categorySlug: "binh-luan",
        slug: "luong-tin-chuyen-sau-hang-tuan",
        tags: ["chuyen-muc", "ban-tin", "nytimes"],
        excerpt: "Gi\u1EEF nh\u1ECBp xu\u1EA5t b\u1EA3n \u0111\u1EC1u \u0111\u1EB7n theo chuy\xEAn m\u1EE5c gi\xFAp kho b\xE0i vi\u1EBFt ng\xE0y c\xE0ng c\xF3 chi\u1EC1u s\xE2u v\xE0 d\u1EC5 tra c\u1EE9u.",
        date: dayOffsetStr(3),
        body: `## Tr\u1EADt t\u1EF1 t\u1EEB nh\u1EEFng b\u1EA3n tin \u0111\u1ECBnh k\u1EF3

Khi ph\xE2n lo\u1EA1i r\xF5 r\xE0ng gi\u1EEFa **Ti\xEAu \u0111i\u1EC3m**, **K\u1EF9 thu\u1EADt**, **SEO & D\u1EEF li\u1EC7u** v\xE0 **B\xECnh lu\u1EADn**, ng\u01B0\u1EDDi \u0111\u1ECDc m\u1EDBi gh\xE9 **${siteTitle}** c\xF3 th\u1EC3 l\u1ECDc \u0111\xFAng ch\u1EE7 \u0111\u1EC1 quan t\xE2m ngay trong kho l\u01B0u tr\u1EEF.`
      }
    ],
    "bbc-dark": [
      {
        fileName: "trang-tin-da-phuong-tien.md",
        coverIndex: 1,
        title: "T\u1ED5 ch\u1EE9c trang tin \u0111a ph\u01B0\u01A1ng ti\u1EC7n & video YouTube s\u1EAFc b\xE9n",
        category: "Th\u1EDDi s\u1EF1 \xB7 Media",
        categorySlug: "thoi-su-media",
        slug: "trang-tin-da-phuong-tien",
        tags: ["media", "studio", "video"],
        excerpt: "Phong c\xE1ch ph\xF2ng tin t\u01B0\u01A1ng ph\u1EA3n cao tr\xEAn " + siteTitle + " l\xE0m n\u1ED5i b\u1EADt \u1EA3nh b\xECa kh\u1ED5 r\u1ED9ng, tr\xEDch xu\u1EA5t tr\u1EF1c ti\u1EBFp t\u1EEB video ho\u1EB7c \u1EA3nh ch\u1EE5p th\u1EF1c t\u1EBF.",
        date: today,
        body: `Trong k\u1EF7 nguy\xEAn n\u1ED9i dung \u0111a ph\u01B0\u01A1ng ti\u1EC7n, h\xECnh \u1EA3nh \u0111\u1EA1i di\u1EC7n 16:9 v\xE0 nh\u1ECBp l\u01B0\u1EDBi th\u1EBB tin hi\u1EC7n \u0111\u1EA1i quy\u1EBFt \u0111\u1ECBnh \u1EA5n t\u01B0\u1EE3ng \u0111\u1EA7u ti\xEAn c\u1EE7a \u0111\u1ED9c gi\u1EA3. Giao di\u1EC7n **BBC Studio** tr\xEAn **${siteTitle}** \u0111\u1EB7t tr\u1ECDng t\xE2m v\xE0o \u0111\u1ED9 t\u01B0\u01A1ng ph\u1EA3n s\u1EAFc n\xE9t v\xE0 \u0111i\u1EC3m nh\u1EA5n \u0111\u1ECF th\u1EABm \u0111\u1EB7c tr\u01B0ng ph\xF2ng tin.

## T\u1ED1i \u01B0u \u1EA3nh b\xECa v\xE0 video nh\xFAng

- **\u1EA2nh ch\u1EE5p tr\u1EF1c ti\u1EBFp t\u1EEB \u0111i\u1EC7n tho\u1EA1i**: \u0110\u01B0\u1EE3c n\xE9n t\u1EF1 \u0111\u1ED9ng sang WebP nh\u1EB9 nh\u01B0ng gi\u1EEF tr\u1ECDn \u0111\u1ED9 chi ti\u1EBFt.
- **L\u1EA5y \u1EA3nh thumbnail YouTube**: D\xE1n \u0111\u01B0\u1EDDng d\u1EABn video l\xE0 c\xF3 ngay \u1EA3nh b\xECa ph\xE2n gi\u1EA3i cao cho b\xE0i ph\xE2n t\xEDch ho\u1EB7c podcast.
- **H\u1ED7 tr\u1EE3 S\xE1ng / T\u1ED1i ch\u1EE7 \u0111\u1ED9ng**: Ph\xF9 h\u1EE3p c\u1EA3 khi \u0111\u1ECDc ngo\xE0i tr\u1EDDi l\u1EABn trong ph\xF2ng t\u1ED1i.`
      },
      {
        fileName: "trai-nghiem-doc-di-dong.md",
        coverIndex: 2,
        title: "G\xF3c nh\xECn qu\u1ED1c t\u1EBF: T\u1ED1i \u01B0u tr\u1EA3i nghi\u1EC7m \u0111\u1ECDc tr\xEAn m\xE0n h\xECnh nh\u1ECF",
        category: "G\xF3c nh\xECn",
        categorySlug: "goc-nhin",
        slug: "trai-nghiem-doc-di-dong",
        tags: ["mobile", "ui-ux", "doc-nhanh"],
        excerpt: "Thi\u1EBFt k\u1EBF \u01B0u ti\xEAn \u0111i\u1EC7n tho\u1EA1i gi\xFAp ng\u01B0\u1EDDi \u0111\u1ECDc l\u01B0\u1EDBt ti\xEAu \u0111i\u1EC3m, t\xECm ki\u1EBFm v\xE0 l\u1ECDc chuy\xEAn m\u1EE5c m\u01B0\u1EE3t m\xE0 b\u1EB1ng m\u1ED9t ng\xF3n tay.",
        date: dayOffsetStr(1),
        body: `## 70% \u0111\u1ED9c gi\u1EA3 \u0111\u1ECDc tin tr\xEAn thi\u1EBFt b\u1ECB c\u1EA7m tay

T\u1EEB k\xEDch th\u01B0\u1EDBc n\xFAt ch\u1EA1m t\u1ED1i thi\u1EC3u 44px \u0111\u1EBFn kho\u1EA3ng c\xE1ch l\u1EC1 g\u1ECDn g\xE0ng kh\xF4ng b\u1ECB tr\xE0n ngang, t\u1EEBng kh\u1ED1i giao di\u1EC7n tr\xEAn **${siteTitle}** \u0111\u1EC1u \u0111\u01B0\u1EE3c c\xE2n ch\u1EC9nh \u0111\u1EC3 \u0111\u1ECDc d\u1EC5 ch\u1ECBu tr\xEAn c\u1EA3 m\xE0n h\xECnh 375px l\u1EABn m\xE0n h\xECnh m\xE1y t\xEDnh r\u1ED9ng.`
      },
      {
        fileName: "bien-tap-markdown-di-dong.md",
        coverIndex: 3,
        title: "Quy tr\xECnh bi\xEAn t\u1EADp v\xE0 xu\u1EA5t b\u1EA3n Markdown t\u1EEB \u0111i\u1EC7n tho\u1EA1i",
        category: "Quy tr\xECnh",
        categorySlug: "quy-trinh",
        slug: "bien-tap-markdown-di-dong",
        tags: ["markdown", "workflow", "xuat-ban"],
        excerpt: "Vi\u1EBFt nh\xE1p nhanh m\u1ECDi l\xFAc m\u1ECDi n\u01A1i v\u1EDBi thanh c\xF4ng c\u1EE5 \u0111\u1ECBnh d\u1EA1ng \u1ED5n \u0111\u1ECBnh ngay ph\xEDa tr\xEAn b\xE0n ph\xEDm.",
        date: dayOffsetStr(2),
        body: `## Bi\u1EBFn m\u1ECDi kho\u1EA3nh kh\u1EAFc th\xE0nh b\xE0i vi\u1EBFt ho\xE0n ch\u1EC9nh

V\u1EDBi tr\xECnh so\u1EA1n th\u1EA3o t\xE1ch bi\u1EC7t kh\xF4ng gian vi\u1EBFt v\xE0 t\u1ED1i \u01B0u SEO trong **\u0110\u1EA1o K\xFD**, **${authorName}** c\xF3 th\u1EC3 \u0111\u1ECBnh d\u1EA1ng ti\xEAu \u0111\u1EC1, danh s\xE1ch hay tr\xEDch d\u1EABn ngay t\u1EA1i v\u1ECB tr\xED con tr\u1ECF m\xE0 kh\xF4ng b\u1ECB nh\u1EA3y m\xE0n h\xECnh, sau \u0111\xF3 \u0111\u1ED3ng b\u1ED9 m\u1ED9t ch\u1EA1m l\xEAn GitHub.`
      },
      {
        fileName: "dong-bo-kenh-live-chat-doc-gia.md",
        coverIndex: 4,
        title: "K\u1EBFt n\u1ED1i tr\u1EF1c ti\u1EBFp \u0111\u1ED9c gi\u1EA3 v\u1EDBi Live Chat & m\u1EA1ng x\xE3 h\u1ED9i",
        category: "T\u01B0\u01A1ng t\xE1c",
        categorySlug: "tuong-tac",
        slug: "dong-bo-kenh-live-chat-doc-gia",
        tags: ["live-chat", "zalo", "cong-dong"],
        excerpt: "Cho ph\xE9p \u0111\u1ED9c gi\u1EA3 nh\u1EAFn tin nhanh qua Zalo, Messenger, Telegram ho\u1EB7c Tawk.to ngay tr\xEAn trang blog.",
        date: dayOffsetStr(3),
        body: `## Kh\xF4ng b\u1ECF l\u1EE1 ph\u1EA3n h\u1ED3i t\u1EEB ng\u01B0\u1EDDi \u0111\u1ECDc

B\u1EB1ng h\u1ED9p tho\u1EA1i Live Chat \u1EDF g\xF3c d\u01B0\u1EDBi b\xEAn ph\u1EA3i, **${siteTitle}** k\u1EBFt n\u1ED1i t\u1EE9c th\xEC v\u1EDBi nh\u1EEFng k\xEAnh li\xEAn l\u1EA1c quen thu\u1ED9c m\xE0 b\u1EA1n ch\u1EE7 \u0111\u1ED9ng b\u1EADt ho\u1EB7c t\u1EAFt trong b\u1EA3ng \u0111i\u1EC1u khi\u1EC3n.`
      }
    ],
    "obsidian-broadsheet": [
      {
        fileName: "he-thong-blog-markdown-ben-vung.md",
        coverIndex: 1,
        title: "Thi\u1EBFt k\u1EBF h\u1EC7 th\u1ED1ng blog Markdown b\u1EC1n v\u1EEFng su\u1ED1t h\xE0ng ch\u1EE5c n\u0103m",
        category: "Nh\u1EADt b\xE1o \u0110\xEAm \xB7 C\xF4ng ngh\u1EC7",
        categorySlug: "cong-nghe",
        slug: "he-thong-blog-markdown-ben-vung",
        tags: ["markdown", "kien-truc", "ben-vung"],
        excerpt: "M\u1EF1c \u0111\xEAm xanh th\u1EABm d\u1ECBu m\u1EAFt k\u1EBFt h\u1EE3p ti\xEAu \u0111\u1EC1 Serif uy nghi\xEAm, mang l\u1EA1i s\u1EF1 t\u1EADp trung t\u1ED1i \u0111a cho \u0111\u1ED9c gi\u1EA3 tr\xEAn " + siteTitle + ".",
        date: today,
        body: `Nh\u1EEFng h\u1EC7 th\u1ED1ng qu\u1EA3n tr\u1ECB n\u1ED9i dung n\u1EB7ng n\u1EC1 th\u01B0\u1EDDng l\u1ED7i th\u1EDDi sau v\xE0i n\u0103m n\xE2ng c\u1EA5p, khi\u1EBFn vi\u1EC7c b\u1EA3o tr\xEC tr\u1EDF th\xE0nh g\xE1nh n\u1EB7ng thay v\xEC ni\u1EC1m vui vi\u1EBFt l\xE1ch. **${siteTitle}** ch\u1ECDn h\u01B0\u1EDBng \u0111i t\u1ED1i gi\u1EA3n m\xE0 tr\u01B0\u1EDDng t\u1ED3n: d\u1EEF li\u1EC7u thu\u1EA7n Markdown l\u01B0u tr\u1EEF tr\xEAn Git k\u1EBFt h\u1EE3p b\u1ED9 khung bi\xEAn d\u1ECBch t\u0129nh Astro 5.

## Ki\u1EBFn tr\xFAc h\u01B0\u1EDBng \u0111\u1EBFn s\u1EF1 t\u0129nh l\u1EB7ng v\xE0 d\xE0i h\u1EA1n

- **\u0110\u1ED9 t\u01B0\u01A1ng ph\u1EA3n t\xEDnh to\xE1n k\u1EF9**: N\u1EC1n m\u1EF1c \u0111\xEAm xanh th\u1EABm k\u1EBFt h\u1EE3p \xE1nh xanh coban gi\xFAp gi\u1EA3m ch\xF3i khi \u0111\u1ECDc b\xE0i ph\xE2n t\xEDch d\xE0i v\xE0o ban \u0111\xEAm.
- **\u0110\u1ED5i ch\u1EBF \u0111\u1ED9 S\xE1ng / T\u1ED1i t\u1EE9c th\xEC**: \u0110\xE1p \u1EE9ng linh ho\u1EA1t m\u1ECDi m\xF4i tr\u01B0\u1EDDng \xE1nh s\xE1ng c\u1EE7a \u0111\u1ED9c gi\u1EA3.
- **T\xE0i s\u1EA3n s\u1EDF h\u1EEFu tr\u1ECDn v\u1EB9n**: To\xE0n b\u1ED9 t\u1EC7p \`.md\` v\xE0 h\xECnh \u1EA3nh \u0111\u1EC1u n\u1EB1m trong kho l\u01B0u tr\u1EEF c\xE1 nh\xE2n c\u1EE7a ${authorName}.`
      },
      {
        fileName: "luu-tru-tron-doi-tren-git.md",
        coverIndex: 2,
        title: "L\u01B0u tr\u1EEF tr\u1ECDn \u0111\u1EDDi b\u1EB1ng t\u1EC7p v\u0103n b\u1EA3n thu\u1EA7n tr\xEAn Git repository",
        category: "L\u01B0u tr\u1EEF Git",
        categorySlug: "luu-tru-git",
        slug: "luu-tru-tron-doi-tren-git",
        tags: ["git", "luu-tru", "tu-chu"],
        excerpt: "L\xE0m ch\u1EE7 ho\xE0n to\xE0n l\u1ECBch s\u1EED ch\u1EC9nh s\u1EEDa, sao l\u01B0u t\u1EE9c th\xEC v\xE0 kh\xF4ng bao gi\u1EDD ph\u1EE5 thu\u1ED9c v\xE0o \u0111\u1ECBnh d\u1EA1ng \u0111\xF3ng.",
        date: dayOffsetStr(1),
        body: `## M\u1ECDi b\u1EA3n th\u1EA3o \u0111\u1EC1u c\xF3 th\u1EC3 \u0111\u1ECDc sau 30 n\u0103m

M\u1ED9t t\u1EC7p v\u0103n b\u1EA3n Markdown ho\xE0n to\xE0n trong su\u1ED1t v\u1EDBi m\u1ECDi tr\xECnh so\u1EA1n th\u1EA3o v\xE0 h\u1EC7 \u0111i\u1EC1u h\xE0nh. Khi k\u1EBFt h\u1EE3p v\u1EDBi Git, t\u1EEBng d\xF2ng s\u1EEDa nh\u1ECF nh\u1EA5t c\u1EE7a b\u1EA1n \u0111\u1EC1u \u0111\u01B0\u1EE3c ghi nh\u1EADn minh b\u1EA1ch v\xE0 d\u1EC5 d\xE0ng kh\xF4i ph\u1EE5c b\u1EA5t k\u1EF3 l\xFAc n\xE0o.`
      },
      {
        fileName: "toi-uu-blogposting-json-ld.md",
        coverIndex: 3,
        title: "T\u1ED1i \u01B0u d\u1EEF li\u1EC7u c\xF3 c\u1EA5u tr\xFAc BlogPosting JSON-LD cho Google",
        category: "C\u1EA5u tr\xFAc D\u1EEF li\u1EC7u",
        categorySlug: "cau-truc-du-lieu",
        slug: "toi-uu-blogposting-json-ld",
        tags: ["json-ld", "schema", "google-search"],
        excerpt: "Gi\xFAp b\u1ECD t\xECm ki\u1EBFm nh\u1EADn di\u1EC7n chu\u1EA9n x\xE1c t\xE1c gi\u1EA3, ng\xE0y \u0111\u0103ng, \u1EA3nh \u0111\u1EA1i di\u1EC7n v\xE0 ch\u1EE7 \u0111\u1EC1 c\u1EE7a t\u1EEBng b\xE0i vi\u1EBFt.",
        date: dayOffsetStr(2),
        body: `## Ng\xF4n ng\u1EEF chung v\u1EDBi c\xF4ng c\u1EE5 t\xECm ki\u1EBFm

Th\u1EBB l\u01B0\u1EE3c \u0111\u1ED3 \`BlogPosting\` \u0111\u01B0\u1EE3c nh\xFAng t\u1EF1 \u0111\u1ED9ng trong ph\u1EA7n \u0111\u1EA7u m\u1ED7i trang b\xE0i vi\u1EBFt tr\xEAn **${siteTitle}**, \u0111\u1EA3m b\u1EA3o li\xEAn k\u1EBFt khi chia s\u1EBB l\xEAn m\u1EA1ng x\xE3 h\u1ED9i hay xu\u1EA5t hi\u1EC7n tr\xEAn k\u1EBFt qu\u1EA3 t\xECm ki\u1EBFm lu\xF4n r\xF5 r\xE0ng v\xE0 chuy\xEAn nghi\u1EC7p.`
      },
      {
        fileName: "he-mau-broadsheet-hai-che-do.md",
        coverIndex: 4,
        title: "C\xE2n ch\u1EC9nh \u0111\u1ED9 t\u01B0\u01A1ng ph\u1EA3n S\xE1ng v\xE0 T\u1ED1i cho b\xE0i vi\u1EBFt chuy\xEAn s\xE2u",
        category: "Thi\u1EBFt k\u1EBF",
        categorySlug: "thiet-ke",
        slug: "he-mau-broadsheet-hai-che-do",
        tags: ["dark-mode", "light-mode", "typography"],
        excerpt: "T\u1EEB n\u1EC1n m\u1EF1c \u0111\xEAm xanh th\u1EABm sang gi\u1EA5y b\xE1o ban ng\xE0y ch\u1EC9 qua bi\u1EC3u t\u01B0\u1EE3ng M\u1EB7t tr\u1EDDi / M\u1EB7t tr\u0103ng tr\xEAn thanh ti\xEAu \u0111\u1EC1.",
        date: dayOffsetStr(3),
        body: `## \u0110\u1ECDc tho\u1EA3i m\xE1i \u1EDF m\u1ECDi \u0111i\u1EC1u ki\u1EC7n \xE1nh s\xE1ng

B\u1EA3ng m\xE0u k\xE9p c\u1EE7a **Broadsheet \u0110\xEAm** gi\u1EEF nguy\xEAn tinh th\u1EA7n nh\u1EADt b\xE1o nghi\xEAm c\u1EA9n cho c\u1EA3 hai ch\u1EBF \u0111\u1ED9 s\xE1ng v\xE0 t\u1ED1i, gi\xFAp \u0111\u1ED9c gi\u1EA3 c\u1EE7a **${siteTitle}** lu\xF4n \u0111\u1ECDc m\u01B0\u1EE3t m\xE0 d\xF9 \u0111ang ngo\xE0i tr\u1EDDi n\u1EAFng hay trong ph\xF2ng y\xEAn t\u0129nh.`
      }
    ],
    "espresso-salon": [
      {
        fileName: "nhung-trang-viet-cuoi-ngay.md",
        coverIndex: 1,
        title: "Nh\u1EEFng trang vi\u1EBFt cu\u1ED1i ng\xE0y b\xEAn \xE1nh \u0111\xE8n v\xE0ng \u1EA5m \xE1p",
        category: "Th\u01B0 ph\xF2ng \xB7 Suy t\u01B0",
        categorySlug: "thu-phong-suy-tu",
        slug: "nhung-trang-viet-cuoi-ngay",
        tags: ["suy-tu", "thu-phong", "hoi-ky"],
        excerpt: "S\u1EAFc n\u1EC1n th\u01B0 ph\xF2ng \xEAm d\u1ECBu v\u1EDBi ch\u1EEF Serif c\u1ED5 \u0111i\u1EC3n tr\xEAn " + siteTitle + ", gi\u1EA3m m\u1ECFi m\u1EAFt cho nh\u1EEFng b\xE0i vi\u1EBFt ph\xE2n t\xEDch v\xE0 h\u1ED3i k\xFD d\xE0i h\u01A1i.",
        date: today,
        body: `Cu\u1ED1i ng\xE0y l\xE0 l\xFAc nh\u1EEFng t\u1EA1p \xE2m th\u01B0\u1EDDng nh\u1EADt l\u1EAFng xu\u1ED1ng, nh\u01B0\u1EDDng ch\u1ED7 cho c\xE1c suy ngh\u0129 trung th\u1EF1c nh\u1EA5t c\u1EA5t l\u1EDDi. **${siteTitle}** v\u1EDBi giao di\u1EC7n **Salon Suy t\u01B0** \u0111\u01B0\u1EE3c ${authorName} l\u1EF1a ch\u1ECDn nh\u01B0 m\u1ED9t g\xF3c th\u01B0 ph\xF2ng nh\u1ECF \u2014 n\u01A1i ch\u1EEF ngh\u0129a mang h\u01A1i \u1EA5m gi\u1EA5y c\u0169 v\xE0 \xE1nh \u0111\xE8n h\u1ED5 ph\xE1ch d\u1ECBu d\xE0ng.

## Kh\xF4ng gian d\xE0nh ri\xEAng cho nh\u1EEFng b\xE0i vi\u1EBFt d\xE0i

> H\xE3y vi\u1EBFt nh\u01B0 th\u1EC3 \u0111ang tr\xF2 chuy\u1EC7n ch\xE2n th\xE0nh v\u1EDBi m\u1ED9t ng\u01B0\u1EDDi b\u1EA1n tri k\u1EF7 ng\u1ED3i \u0111\u1ED1i di\u1EC7n qua chi\u1EBFc b\xE0n g\u1ED7 nh\u1ECF.

- **Ph\xF4ng ch\u1EEF Serif \xEAm m\u1EAFt**: Kh\u01A1i g\u1EE3i c\u1EA3m gi\xE1c \u0111\u1ECDc s\xE1ch gi\u1EA5y d\xF9 \u0111ang xem tr\xEAn m\xE0n h\xECnh.
- **M\u1EDF \u0111\u1EA7u b\u1EB1ng ch\u1EEF hoa th\u1EA3 (Drop Cap)**: \u0110i\u1EC3m nh\u1EA5n c\u1ED5 \u0111i\u1EC3n t\xF4n vinh t\u1EEBng b\xE0i ti\u1EC3u lu\u1EADn v\xE0 h\u1ED3i k\xFD.
- **Chuy\u1EC3n \u0111\u1ED5i M\u1EB7t tr\u1EDDi / M\u1EB7t tr\u0103ng**: Chuy\u1EC3n t\u1EEB \xE1nh \u0111\xE8n v\xE0ng th\u01B0 ph\xF2ng sang gi\u1EA5y \u1EA5m ban ng\xE0y ch\u1EC9 trong m\u1ED9t c\xFA ch\u1EA1m.`
      },
      {
        fileName: "rut-gon-doan-mo-dau.md",
        coverIndex: 2,
        title: "S\u1ED5 tay \u0111\u1ECDc s\xE1ch: R\xFAt g\u1ECDn \u0111o\u1EA1n m\u1EDF \u0111\u1EA7u \u0111\u1EC3 gi\u1EEF m\u1EA1ch c\u1EA3m x\xFAc",
        category: "S\u1ED5 tay \u0110\u1ECDc s\xE1ch",
        categorySlug: "so-tay-doc-sach",
        slug: "rut-gon-doan-mo-dau",
        tags: ["doc-sach", "viet-lach", "bien-tap"],
        excerpt: "B\xED quy\u1EBFt g\u1ECDt b\u1ECF nh\u1EEFng l\u1EDDi r\xE0o \u0111\xF3n d\u01B0 th\u1EEBa \u0111\u1EC3 c\xE2u \u0111\u1EA7u ti\xEAn ch\u1EA1m th\u1EB3ng v\xE0o t\xE2m tr\u1EA1ng ng\u01B0\u1EDDi \u0111\u1ECDc.",
        date: dayOffsetStr(1),
        body: `## \u0110\u1EEBng kh\u1EDFi \u0111\u1ED9ng qu\xE1 l\xE2u tr\u01B0\u1EDBc khi v\xE0o c\xE2u chuy\u1EC7n

Ph\u1EA7n l\u1EDBn ng\u01B0\u1EDDi vi\u1EBFt hay d\xE0nh hai \u0111o\u1EA1n \u0111\u1EA7u ch\u1EC9 \u0111\u1EC3 r\xE0o \u0111\xF3n l\xFD do v\xEC sao m\xECnh vi\u1EBFt. Khi m\u1EA1nh d\u1EA1n c\u1EAFt b\u1EDBt l\u1EDBp s\u01B0\u01A1ng m\xF9 \u0111\xF3 v\xE0 b\u1EAFt \u0111\u1EA7u ngay t\u1EA1i chi ti\u1EBFt s\u1ED1ng \u0111\u1ED9ng nh\u1EA5t, c\u1EA3 b\xE0i vi\u1EBFt l\u1EADp t\u1EE9c c\xF3 s\u1EE9c n\u1EB7ng ri\xEAng.`
      },
      {
        fileName: "nhip-tho-de-muc-bai-viet.md",
        coverIndex: 3,
        title: "X\xE2y d\u1EF1ng nh\u1ECBp th\u1EDF \u0111\u1EC1u \u0111\u1EB7n qua t\u1EEBng \u0111\u1EC1 m\u1EE5c b\xE0i vi\u1EBFt",
        category: "Ghi ch\xE9p",
        categorySlug: "ghi-chep",
        slug: "nhip-tho-de-muc-bai-viet",
        tags: ["nhip-dieu", "cau-truc", "dao-ky"],
        excerpt: "M\u1ED7i ti\xEAu \u0111\u1EC1 ph\u1EE5 l\xE0 m\u1ED9t tr\u1EA1m ngh\u1EC9 gi\xFAp \u0111\u1ED9c gi\u1EA3 \u0111i tr\u1ECDn v\u1EB9n h\xE0nh tr\xECnh c\xE2u ch\u1EEF t\u1EEB \u0111\u1EA7u \u0111\u1EBFn cu\u1ED1i.",
        date: dayOffsetStr(2),
        body: `## C\xE2n b\u1EB1ng gi\u1EEFa chi\u1EC1u s\xE2u v\xE0 s\u1EF1 thanh tho\xE1t

D\xF9 vi\u1EBFt v\u1EC1 tri\u1EBFt l\xFD s\u1ED1ng, ghi ch\xE9p \u0111\u1ECDc s\xE1ch hay c\xE2u chuy\u1EC7n ngh\u1EC1 nghi\u1EC7p, vi\u1EC7c gi\u1EEF cho m\u1ED7i \u0111\u1EC1 m\u1EE5c gi\u1EA3i quy\u1EBFt tr\u1ECDn v\u1EB9n m\u1ED9t \xFD s\u1EBD gi\xFAp trang blog **${siteTitle}** lu\xF4n s\xE1ng s\u1EE7a v\xE0 l\xF4i cu\u1ED1n.`
      }
    ]
  };
  const selectedSeeds = STARTER_SEEDS_BY_TEMPLATE[templateStyle] || STARTER_SEEDS_BY_TEMPLATE["newyorker-light"];
  const totalCovers = selectedSeeds.length;
  const coverFiles = selectedSeeds.map((seed, idx) => ({
    path: `public/tainguyen/hinhanh/cover-${idx + 1}.svg`,
    content: buildCoverSvg(idx + 1, totalCovers, seed.category, seed.title)
  }));
  const starterFiles = selectedSeeds.map((seed, idx) => ({
    path: `src/content/bai_viet/${seed.fileName}`,
    content: makeMarkdown(
      {
        tieu_de: seed.title,
        danh_muc: seed.category,
        chuyen_muc: seed.categorySlug,
        slug: seed.slug,
        tags: seed.tags,
        mo_ta: seed.excerpt,
        ngay: seed.date,
        anh_bia: `/tainguyen/hinhanh/cover-${idx + 1}.svg`,
        nhap: false,
        tac_gia: authorName
      },
      seed.body
    )
  }));
  const files = [
    { path: ".gitignore", content: gitignore },
    { path: "package.json", content: packageJson },
    { path: "tsconfig.json", content: tsconfigJson },
    { path: "astro.config.mjs", content: astroConfigMjs },
    { path: ".github/workflows/deploy-astro.yml", content: deployWorkflowYml },
    { path: ".blogvn/site-config.json", content: JSON.stringify(persistedConfig, null, 2) + "\n" },
    { path: "public/.nojekyll", content: "" },
    { path: "public/robots.txt", content: robotsTxt },
    { path: "public/favicon.svg", content: faviconSvg },
    { path: "public/manifest.webmanifest", content: manifestJson },
    { path: "public/tainguyen/hinhanh/og-default.svg", content: ogDefaultSvg },
    ...coverFiles,
    { path: "public/tainguyen/hinhanh/uploads/.gitkeep", content: "" },
    {
      path: "src/cau_hinh/trang_web.ts",
      content: buildAstroSiteConfigModule({
        owner,
        repo,
        config: persistedConfig,
        templateId: templateStyle,
        hasBundledPngFavicon
      })
    },
    { path: "src/utils/url.ts", content: urlUtilsTs },
    { path: "src/content.config.ts", content: contentConfigTs },
    { path: "src/layouts/BaseLayout.astro", content: baseLayoutAstro },
    { path: "src/components/PostCard.astro", content: postCardAstro },
    { path: "src/pages/index.astro", content: indexAstro },
    { path: "src/pages/bai-viet/index.astro", content: archiveIndexAstro },
    { path: "src/pages/bai-viet/[slug].astro", content: articleDetailAstro },
    { path: "src/pages/404.astro", content: page404Astro },
    { path: "src/pages/rss.xml.ts", content: rssXmlTs },
    { path: "src/pages/sitemap.xml.ts", content: sitemapXmlTs }
  ];
  if (includeStarterPosts) {
    files.push(...starterFiles);
  }
  if (faviconPngBase64) {
    files.push({
      path: "public/favicon.png",
      content: faviconPngBase64,
      isBase64: true
    });
  }
  return files;
}

// server.ts
dotenv.config();
var PORT = 3e3;
var DEFAULT_OWNER = process.env.GITHUB_OWNER || "trungtin87";
var DEFAULT_REPO = process.env.GITHUB_REPO || "trungtin87.github.io";
var sessions = /* @__PURE__ */ new Map();
var SESSION_KEY = crypto.createHash("sha256").update(
  process.env.SESSION_SECRET || process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_TOKEN || "huyen-khong-studio-local-secret"
).digest();
function sealSession(record) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", SESSION_KEY, iv);
  const payload = JSON.stringify({
    accessToken: record.accessToken,
    user: {
      login: record.user.login,
      name: record.user.name,
      avatar_url: record.user.avatar_url,
      html_url: record.user.html_url,
      bio: record.user.bio
    },
    createdAt: record.createdAt
  });
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}
function unsealSession(tokenStr) {
  if (!tokenStr) return null;
  try {
    const parts = tokenStr.split(".");
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], "base64url");
    const tag = Buffer.from(parts[1], "base64url");
    const data = Buffer.from(parts[2], "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", SESSION_KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(decrypted);
    if (parsed?.accessToken && parsed?.user?.login) {
      return parsed;
    }
  } catch {
  }
  return null;
}
function getSessionRecord(req) {
  const sid = req.cookies?.gh_session;
  if (sid && sessions.has(sid)) {
    return sessions.get(sid);
  }
  const sealed = req.cookies?.gh_session_data;
  const restored = unsealSession(sealed);
  if (restored && sid) {
    sessions.set(sid, restored);
  }
  return restored;
}
function getSessionToken(req) {
  const session = getSessionRecord(req);
  if (session) {
    return session.accessToken;
  }
  return process.env.GITHUB_TOKEN || null;
}
async function githubRequest(endpoint, options = {}, token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "TrungTin87-Blog-Studio",
    "X-GitHub-Api-Version": "2022-11-28",
    ...options.headers
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data: parsed,
      error: parsed?.message || `GitHub API error (${response.status})`
    };
  }
  return { ok: true, status: response.status, data: parsed };
}
function slugify(input) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled-post";
}
function detectCollectionFromPath(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.startsWith("src/content/du_an/")) return "du_an";
  if (lower.startsWith("src/content/sach/")) return "sach";
  if (lower.startsWith("src/content/cua_hang/")) return "cua_hang";
  return "bai_viet";
}
function resolveCoverUrl(rawCover, owner, repo) {
  if (!rawCover) return void 0;
  const val = String(rawCover).trim();
  if (!val) return void 0;
  if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:")) {
    return val;
  }
  if (val.startsWith("/")) {
    const pagesBase = repo.endsWith(".github.io") ? `https://${repo}` : `https://${owner}.github.io/${repo}`;
    return `${pagesBase}${val}`;
  }
  return val;
}
function normalizeFrontmatterDate(raw, fallbackFileName) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (raw) {
    const str = String(raw).trim();
    const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const jekyllDateMatch = fallbackFileName.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  return jekyllDateMatch?.[1] || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function toStringArray(val) {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === "string") {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}
function parseMarkdownFile(rawContent, filePath, sha, owner, repo, htmlUrl) {
  let frontmatter = {};
  let markdownBody = rawContent;
  if (rawContent.startsWith("---")) {
    const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (match) {
      try {
        const parsed = loadYaml(match[1]);
        if (parsed && typeof parsed === "object") {
          frontmatter = parsed;
        }
        markdownBody = match[2] || "";
      } catch {
        markdownBody = rawContent;
      }
    }
  }
  const collection = detectCollectionFromPath(filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  const jekyllDateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  const rawDate = normalizeFrontmatterDate(
    frontmatter.ngay ?? frontmatter.pubDate ?? frontmatter.date,
    fileName
  );
  const rawTitle = frontmatter.tieu_de ?? frontmatter.ten_san_pham ?? frontmatter.title;
  const headingMatch = markdownBody.match(/^#\s+(.+)$/m);
  const title = rawTitle ? String(rawTitle) : headingMatch?.[1]?.trim() || fileName.replace(/-/g, " ");
  const rawSlug = frontmatter.slug ? String(frontmatter.slug) : jekyllDateMatch?.[2] || slugify(fileName || title);
  const plainText = markdownBody.replace(/```[\s\S]*?```/g, "").replace(/[#>*`!\[\]\(\)]/g, " ").replace(/\s+/g, " ").trim();
  const rawExcerpt = frontmatter.mo_ta ?? frontmatter.mo_ta_ngan ?? frontmatter.excerpt ?? frontmatter.description ?? frontmatter.summary;
  const excerpt = rawExcerpt ? String(rawExcerpt) : plainText.slice(0, 160) + (plainText.length > 160 ? "..." : "");
  const tags = collection === "du_an" ? toStringArray(frontmatter.cong_nghe) : collection === "sach" ? toStringArray(frontmatter.the_loai) : collection === "cua_hang" ? toStringArray(frontmatter.danh_muc) : toStringArray(frontmatter.tags);
  const rawCategory = collection === "du_an" ? "D\u1EF1 \xE1n" : collection === "sach" ? "S\xE1ch" : collection === "cua_hang" ? "C\u1EEDa h\xE0ng" : frontmatter.danh_muc ?? frontmatter.category;
  const category = rawCategory ? String(rawCategory) : Array.isArray(frontmatter.categories) && frontmatter.categories.length > 0 ? String(frontmatter.categories[0]) : "B\xE0i vi\u1EBFt";
  const rawCover = frontmatter.anh_bia ?? frontmatter.anh_dai_dien ?? frontmatter.anh_san_pham ?? frontmatter.heroImage ?? frontmatter.featured_image ?? frontmatter.cover ?? frontmatter.image;
  const cover = resolveCoverUrl(rawCover, owner, repo);
  const draft = Boolean(frontmatter.nhap ?? frontmatter.draft);
  return {
    id: sha || filePath,
    collection,
    slug: rawSlug,
    title,
    date: rawDate,
    category,
    tags,
    excerpt,
    cover,
    draft,
    markdownBody: markdownBody.trim(),
    rawContent,
    path: filePath,
    sha,
    htmlUrl,
    source: "github",
    rawFrontmatter: frontmatter,
    seoTitle: frontmatter.seo_title ? String(frontmatter.seo_title) : frontmatter.seoTitle ? String(frontmatter.seoTitle) : void 0,
    seoDescription: frontmatter.seo_description ? String(frontmatter.seo_description) : frontmatter.seoDescription ? String(frontmatter.seoDescription) : void 0,
    canonicalUrl: frontmatter.canonical_url ? String(frontmatter.canonical_url) : frontmatter.canonical ? String(frontmatter.canonical) : void 0,
    noindex: frontmatter.noindex !== void 0 ? Boolean(frontmatter.noindex) : void 0,
    authorName: frontmatter.tac_gia ? String(frontmatter.tac_gia) : frontmatter.author ? String(frontmatter.author) : void 0,
    price: frontmatter.gia !== void 0 ? String(frontmatter.gia) : void 0,
    originalPrice: frontmatter.gia_goc !== void 0 ? String(frontmatter.gia_goc) : void 0,
    inStock: frontmatter.con_hang !== void 0 ? Boolean(frontmatter.con_hang) : void 0,
    linkDemo: frontmatter.link_demo ? String(frontmatter.link_demo) : void 0,
    linkGithub: frontmatter.link_github ? String(frontmatter.link_github) : void 0,
    linkBuy: frontmatter.link_mua ? String(frontmatter.link_mua) : void 0,
    formats: frontmatter.dinh_dang ? toStringArray(frontmatter.dinh_dang) : void 0,
    publishYear: frontmatter.nam_xuat_ban !== void 0 ? Number(frontmatter.nam_xuat_ban) : void 0,
    featured: frontmatter.noi_bat !== void 0 ? Boolean(frontmatter.noi_bat) : void 0
  };
}
function defaultFrontmatterSchema(framework) {
  if (framework === "astro-vn") {
    return {
      titleKey: "tieu_de",
      dateKey: "ngay",
      excerptKey: "mo_ta",
      coverKey: "anh_bia",
      draftKey: "nhap",
      categoryKey: "danh_muc",
      usesDateInFilename: false
    };
  }
  if (framework === "astro") {
    return {
      titleKey: "title",
      dateKey: "pubDate",
      excerptKey: "description",
      coverKey: "heroImage",
      draftKey: "draft",
      categoryKey: "category",
      usesDateInFilename: false
    };
  }
  if (framework === "hugo") {
    return {
      titleKey: "title",
      dateKey: "date",
      excerptKey: "summary",
      coverKey: "image",
      draftKey: "draft",
      categoryKey: "categories",
      usesDateInFilename: false
    };
  }
  if (framework === "jekyll") {
    return {
      titleKey: "title",
      dateKey: "date",
      excerptKey: "excerpt",
      coverKey: "image",
      draftKey: "draft",
      categoryKey: "categories",
      usesDateInFilename: true
    };
  }
  return {
    titleKey: "title",
    dateKey: "date",
    excerptKey: "description",
    coverKey: "cover",
    draftKey: "draft",
    categoryKey: "categories",
    usesDateInFilename: false
  };
}
function inferFrontmatterSchema(framework, posts) {
  const base = defaultFrontmatterSchema(framework);
  const fms = posts.map((p) => p.rawFrontmatter).filter((f) => Boolean(f));
  if (fms.length === 0) return base;
  const hasKey = (k) => fms.some((f) => Object.prototype.hasOwnProperty.call(f, k));
  const titleKey = hasKey("tieu_de") ? "tieu_de" : "title";
  const dateKey = hasKey("ngay") ? "ngay" : hasKey("pubDate") ? "pubDate" : "date";
  const excerptKey = hasKey("mo_ta") ? "mo_ta" : hasKey("description") ? "description" : hasKey("summary") ? "summary" : hasKey("excerpt") ? "excerpt" : base.excerptKey;
  const coverKey = hasKey("anh_bia") ? "anh_bia" : hasKey("heroImage") ? "heroImage" : hasKey("image") ? "image" : hasKey("cover") ? "cover" : base.coverKey;
  const draftKey = hasKey("nhap") ? "nhap" : "draft";
  const categoryKey = hasKey("danh_muc") ? "danh_muc" : hasKey("categories") ? "categories" : hasKey("category") ? "category" : base.categoryKey;
  return {
    titleKey,
    dateKey,
    excerptKey,
    coverKey,
    draftKey,
    categoryKey,
    usesDateInFilename: framework === "jekyll"
  };
}
function serializePostMarkdown(input, options) {
  const { framework, existingFrontmatter, isAstroVnPath } = options;
  const schema = options.schema || defaultFrontmatterSchema(framework);
  const safeDesc = input.excerpt || input.title;
  if (isAstroVnPath) {
    let fm2;
    const safeCover = input.cover || "/tainguyen/hinhanh/og-default.svg";
    if (input.collection === "du_an") {
      fm2 = {
        ...existingFrontmatter || {},
        tieu_de: input.title,
        mo_ta_ngan: safeDesc,
        anh_dai_dien: safeCover,
        cong_nghe: input.tags,
        link_demo: input.linkDemo || "",
        link_github: input.linkGithub || "",
        slug: input.slug
      };
    } else if (input.collection === "sach") {
      fm2 = {
        ...existingFrontmatter || {},
        tieu_de: input.title,
        tac_gia: input.authorName || "B\xF9i Trung T\xEDn",
        mo_ta_ngan: safeDesc,
        anh_bia: safeCover,
        the_loai: input.tags,
        ...input.publishYear ? { nam_xuat_ban: Number(input.publishYear) } : {},
        dinh_dang: input.formats && input.formats.length > 0 ? input.formats : ["PDF", "EPUB"],
        gia: input.price || "Mi\u1EC5n ph\xED",
        link_mua: input.linkBuy || "#",
        noi_bat: Boolean(input.featured)
      };
    } else if (input.collection === "cua_hang") {
      fm2 = {
        ...existingFrontmatter || {},
        ten_san_pham: input.title,
        mo_ta_ngan: safeDesc,
        anh_san_pham: safeCover,
        danh_muc: input.tags.length > 0 ? input.tags : [input.category || "S\u1EA3n ph\u1EA9m s\u1ED1"],
        gia: input.price || "99.000\u20AB",
        gia_goc: input.originalPrice || "",
        con_hang: input.inStock !== false,
        link_mua: input.linkBuy || "#"
      };
    } else {
      fm2 = {
        ...existingFrontmatter || {},
        tieu_de: input.title,
        danh_muc: input.category || "K\u1EF9 thu\u1EADt",
        chuyen_muc: slugify(input.category || "ky-thuat"),
        slug: input.slug,
        tags: input.tags,
        mo_ta: safeDesc,
        ngay: input.date,
        anh_bia: safeCover,
        nhap: Boolean(input.draft)
      };
    }
    return `---
${dumpYaml2(fm2, { lineWidth: -1 }).trim()}
---

${input.markdownBody.trim()}
`;
  }
  const fm = {
    ...existingFrontmatter || {}
  };
  if (framework === "jekyll" && !fm.layout) {
    fm.layout = "post";
  }
  fm[schema.titleKey] = input.title;
  fm[schema.dateKey] = input.date;
  if (schema.categoryKey === "categories") {
    fm.categories = [input.category || "Ghi ch\xE9p"];
  } else {
    fm[schema.categoryKey] = input.category || "Ghi ch\xE9p";
  }
  fm.tags = input.tags;
  fm[schema.excerptKey] = safeDesc;
  if (framework === "astro" || framework === "hugo" || existingFrontmatter?.[schema.draftKey] !== void 0 || input.draft) {
    fm[schema.draftKey] = Boolean(input.draft);
  }
  if (framework !== "jekyll" && framework !== "hugo") {
    fm.slug = input.slug;
  }
  if (input.cover) {
    fm[schema.coverKey] = input.cover;
  } else {
    delete fm[schema.coverKey];
  }
  if (input.seoTitle?.trim()) {
    fm.seo_title = input.seoTitle.trim();
  }
  if (input.seoDescription?.trim()) {
    fm.seo_description = input.seoDescription.trim();
  }
  if (input.canonicalUrl?.trim()) {
    fm.canonical_url = input.canonicalUrl.trim();
  }
  if (input.noindex) {
    fm.noindex = true;
  } else {
    delete fm.noindex;
  }
  return `---
${dumpYaml2(fm, { lineWidth: -1 }).trim()}
---

${input.markdownBody.trim()}
`;
}
function parseAstroTrangWebTs(source) {
  const extract = (key) => {
    const regex = new RegExp(`${key}:\\s*["'\`]([^"'\`]+)["'\`]`, "m");
    const match = source.match(regex);
    return match?.[1]?.trim();
  };
  const extractMultiline = (key) => {
    const regex = new RegExp(`${key}:\\s*\\n?\\s*["'\`]([^"'\`]+)["'\`]`, "m");
    const match = source.match(regex);
    return match?.[1]?.trim();
  };
  return {
    siteTitle: extract("ten_trangweb"),
    tagline: extractMultiline("mo_ta") || extract("khau_hieu"),
    authorName: extract("tac_gia")
  };
}
function getBaseAppUrl(req) {
  if (process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL") {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}
async function upsertRepoFile(params) {
  let currentSha = params.sha;
  if (!currentSha) {
    const existing = await githubRequest(
      `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.filePath).replace(/%2F/g, "/")}?ref=${encodeURIComponent(params.branch)}`,
      {},
      params.token
    );
    if (existing.ok && existing.data?.sha) {
      currentSha = existing.data.sha;
    }
  }
  const body = {
    message: params.message,
    content: Buffer.from(params.content, "utf8").toString("base64"),
    branch: params.branch
  };
  if (currentSha) {
    body.sha = currentSha;
  }
  return githubRequest(
    `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.filePath).replace(/%2F/g, "/")}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    },
    params.token
  );
}
async function commitMultipleFilesAtomic(params) {
  let refResp = await githubRequest(
    `/repos/${params.owner}/${params.repo}/git/ref/heads/${encodeURIComponent(params.branch)}`,
    {},
    params.token
  );
  if (!refResp.ok || !refResp.data?.object?.sha) {
    if (refResp.status === 404 || refResp.status === 409) {
      await githubRequest(
        `/repos/${params.owner}/${params.repo}/contents/.blogvn-init`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Initialize repository",
            content: Buffer.from("\u0110\u1EA1o K\xFD\n", "utf8").toString("base64"),
            branch: params.branch
          })
        },
        params.token
      );
      await new Promise((r) => setTimeout(r, 600));
      refResp = await githubRequest(
        `/repos/${params.owner}/${params.repo}/git/ref/heads/${encodeURIComponent(params.branch)}`,
        {},
        params.token
      );
    }
  }
  if (!refResp.ok || !refResp.data?.object?.sha) {
    return {
      ok: false,
      status: refResp.status || 400,
      error: refResp.error || `Kh\xF4ng t\xECm th\u1EA5y nh\xE1nh "${params.branch}" tr\xEAn GitHub.`
    };
  }
  const headCommitSha = refResp.data.object.sha;
  const commitResp = await githubRequest(
    `/repos/${params.owner}/${params.repo}/git/commits/${headCommitSha}`,
    {},
    params.token
  );
  if (!commitResp.ok || !commitResp.data?.tree?.sha) {
    return {
      ok: false,
      status: commitResp.status || 400,
      error: commitResp.error || "Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c commit hi\u1EC7n t\u1EA1i tr\xEAn GitHub."
    };
  }
  const baseTreeSha = commitResp.data.tree.sha;
  const blobResults = await Promise.all(
    params.files.map(async (f) => {
      const contentB64 = f.isBase64 ? f.content.replace(/^data:[^;]+;base64,/, "") : Buffer.from(f.content, "utf8").toString("base64");
      const blobResp = await githubRequest(
        `/repos/${params.owner}/${params.repo}/git/blobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: contentB64, encoding: "base64" })
        },
        params.token
      );
      return { path: f.path.replace(/^\/+/, ""), blobResp };
    })
  );
  const failedBlob = blobResults.find((b) => !b.blobResp.ok || !b.blobResp.data?.sha);
  if (failedBlob) {
    return {
      ok: false,
      status: failedBlob.blobResp.status || 400,
      error: failedBlob.blobResp.error || `Kh\xF4ng th\u1EC3 t\u1EA1o blob cho ${failedBlob.path}.`
    };
  }
  const writtenPaths = new Set(blobResults.map((b) => b.path));
  const preservedNodes = (params.preservedTreeEntries || []).map((entry) => ({
    path: entry.path.replace(/^\/+/, ""),
    mode: entry.mode || "100644",
    type: "blob",
    sha: entry.sha
  })).filter((entry) => entry.path && entry.sha && !writtenPaths.has(entry.path));
  const treePayload = {
    tree: [
      ...blobResults.map((b) => ({
        path: b.path,
        mode: "100644",
        type: "blob",
        sha: b.blobResp.data.sha
      })),
      ...preservedNodes
    ]
  };
  if (!params.replaceAllFiles) {
    treePayload.base_tree = baseTreeSha;
  }
  const treeResp = await githubRequest(
    `/repos/${params.owner}/${params.repo}/git/trees`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(treePayload)
    },
    params.token
  );
  if (!treeResp.ok || !treeResp.data?.sha) {
    return {
      ok: false,
      status: treeResp.status || 400,
      error: treeResp.error || "Kh\xF4ng th\u1EC3 t\u1EA1o Git tree tr\xEAn GitHub."
    };
  }
  const newCommitResp = await githubRequest(
    `/repos/${params.owner}/${params.repo}/git/commits`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: params.message,
        tree: treeResp.data.sha,
        parents: [headCommitSha]
      })
    },
    params.token
  );
  if (!newCommitResp.ok || !newCommitResp.data?.sha) {
    return {
      ok: false,
      status: newCommitResp.status || 400,
      error: newCommitResp.error || "Kh\xF4ng th\u1EC3 t\u1EA1o Git commit m\u1EDBi."
    };
  }
  const updateRefResp = await githubRequest(
    `/repos/${params.owner}/${params.repo}/git/refs/heads/${encodeURIComponent(params.branch)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha: newCommitResp.data.sha })
    },
    params.token
  );
  if (!updateRefResp.ok) {
    return {
      ok: false,
      status: updateRefResp.status || 400,
      error: updateRefResp.error || "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt nh\xE1nh tr\xEAn GitHub."
    };
  }
  return {
    ok: true,
    status: 200,
    commitSha: newCommitResp.data.sha,
    commitHtmlUrl: `https://github.com/${params.owner}/${params.repo}/commit/${newCommitResp.data.sha}`
  };
}
var SCHEDULES_DIR = path.resolve(process.cwd(), "data");
var SCHEDULES_FILE = path.join(SCHEDULES_DIR, "schedules.json");
function loadSchedulesFromDisk() {
  try {
    if (!fs.existsSync(SCHEDULES_FILE)) return [];
    const raw = fs.readFileSync(SCHEDULES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveSchedulesToDisk(tasks) {
  try {
    if (!fs.existsSync(SCHEDULES_DIR)) {
      fs.mkdirSync(SCHEDULES_DIR, { recursive: true });
    }
    fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(tasks, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist schedules:", err);
  }
}
function buildSerializedPayload(payload) {
  const framework = payload.framework || "jekyll";
  const isAstroVnPath = framework === "astro-vn" || String(payload.filePath).startsWith("src/content/bai_viet/") || String(payload.filePath).startsWith("src/content/du_an/") || String(payload.filePath).startsWith("src/content/sach/") || String(payload.filePath).startsWith("src/content/cua_hang/");
  const normalizedSlug = payload.slug ? slugify(payload.slug) : slugify(payload.title);
  return serializePostMarkdown(
    {
      collection: payload.collection || "bai_viet",
      title: payload.title,
      date: payload.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      slug: normalizedSlug,
      category: payload.category || "K\u1EF9 thu\u1EADt",
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      excerpt: payload.excerpt || "",
      cover: payload.cover,
      draft: Boolean(payload.draft),
      markdownBody: payload.markdownBody || "",
      authorName: payload.authorName,
      price: payload.price,
      originalPrice: payload.originalPrice,
      inStock: payload.inStock,
      linkDemo: payload.linkDemo,
      linkGithub: payload.linkGithub,
      linkBuy: payload.linkBuy,
      formats: payload.formats,
      publishYear: payload.publishYear,
      featured: payload.featured,
      seoTitle: payload.seoTitle,
      seoDescription: payload.seoDescription,
      canonicalUrl: payload.canonicalUrl,
      noindex: Boolean(payload.noindex)
    },
    {
      framework,
      schema: payload.frontmatterSchema,
      existingFrontmatter: payload.existingFrontmatter,
      isAstroVnPath
    }
  );
}
var SITE_CONFIGS_FILE = path.join(SCHEDULES_DIR, "site-configs.json");
function ensureDataDir() {
  if (!fs.existsSync(SCHEDULES_DIR)) {
    fs.mkdirSync(SCHEDULES_DIR, { recursive: true });
  }
}
function repoConfigKey(owner, repo) {
  return `${String(owner || DEFAULT_OWNER).toLowerCase()}/${String(repo || DEFAULT_REPO).toLowerCase()}`;
}
function loadSiteConfigsFromDisk() {
  try {
    if (!fs.existsSync(SITE_CONFIGS_FILE)) return {};
    const raw = fs.readFileSync(SITE_CONFIGS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function saveSiteConfigsToDisk(configs) {
  try {
    ensureDataDir();
    fs.writeFileSync(SITE_CONFIGS_FILE, JSON.stringify(configs, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist site configs:", err);
  }
}
function escapeHtmlAttr(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function readDefaultDaoKyPngBase64() {
  try {
    const p = path.join(process.cwd(), "public", "pwa-192x192.png");
    if (fs.existsSync(p)) {
      return fs.readFileSync(p).toString("base64");
    }
  } catch {
  }
  return void 0;
}
function isBundledDefaultSiteIcon(siteIcon) {
  const clean = (siteIcon || "").trim();
  return !clean || clean === "./icon.svg" || clean === "/icon.svg" || clean.includes("1794978557793_3b5d5cb0.png") || clean === "./pwa-192x192.png" || clean === "/pwa-192x192.png";
}
function buildStandaloneWebAppFiles(params) {
  const { owner, repo, siteConfig, posts } = params;
  const title = siteConfig.siteTitle || repo || "\u0110\u1EA1o K\xFD";
  const headerBrand = siteConfig.headerTitle || title;
  const tagline = siteConfig.tagline || `Trang blog c\xE1 nh\xE2n ${title}`;
  const footerText = siteConfig.footerText || `\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${title} \xB7 Xu\u1EA5t b\u1EA3n t\u1EEB \u0110\u1EA1o K\xFD.`;
  const defaultPngB64 = isBundledDefaultSiteIcon(siteConfig.siteIcon) ? readDefaultDaoKyPngBase64() : void 0;
  const usePng = Boolean(siteConfig.siteIcon?.startsWith("data:image/") || defaultPngB64);
  const iconHref = usePng ? "./favicon.png" : siteConfig.siteIcon || "./favicon.png";
  const headerLinks = Array.isArray(siteConfig.headerNavLinks) ? siteConfig.headerNavLinks : [];
  const footerLinks = Array.isArray(siteConfig.footerLinks) ? siteConfig.footerLinks : [];
  const cleanPosts = posts.filter((p) => !p.draft).map((p) => ({
    id: p.id,
    path: p.path,
    slug: p.slug,
    title: p.title,
    date: p.date,
    category: p.category,
    tags: p.tags,
    excerpt: p.excerpt,
    cover: p.cover,
    markdownBody: p.markdownBody
  }));
  const manifest = {
    name: title,
    short_name: headerBrand.slice(0, 24),
    description: tagline,
    start_url: "./",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#111827",
    icons: [
      {
        src: iconHref,
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
  const swJs = `const CACHE_NAME = 'daoky-site-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './posts-manifest.json'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
`;
  const indexHtml = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtmlAttr(title)}</title>
  <meta name="description" content="${escapeHtmlAttr(tagline)}" />
  <meta property="og:title" content="${escapeHtmlAttr(title)}" />
  <meta property="og:description" content="${escapeHtmlAttr(tagline)}" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="${escapeHtmlAttr(headerBrand)}" />
  <link rel="manifest" href="./manifest.webmanifest" />
  <link rel="icon" href="${escapeHtmlAttr(iconHref)}" />
  <link rel="apple-touch-icon" href="${escapeHtmlAttr(iconHref)}" />
  <link rel="alternate" type="application/rss+xml" title="${escapeHtmlAttr(title)} RSS" href="./rss.xml" />
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    :root { --bg:#fafafa; --surface:#f3f4f6; --card:#ffffff; --border:#e5e7eb; --text:#111827; --muted:#6b7280; --link:#2563eb; --accent:#111827; --accent-text:#ffffff; }
    html.dark { --bg:#0b0d12; --surface:#141720; --card:#1b202c; --border:#272d3d; --text:#f3f4f6; --muted:#9ca3af; --link:#60a5fa; --accent:#f3f4f6; --accent-text:#0b0d12; }
    * { box-sizing:border-box; }
    body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:var(--bg); color:var(--text); line-height:1.65; }
    a { color:var(--link); text-decoration:none; } a:hover { text-decoration:underline; }
    header { position:sticky; top:0; z-index:20; background:var(--bg); border-bottom:1px solid var(--border); }
    .wrap { max-width:960px; margin:0 auto; padding:0 18px; }
    .nav { display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:60px; }
    .brand { display:flex; align-items:center; gap:10px; font-weight:700; font-size:18px; color:var(--text); }
    .brand img { width:28px; height:28px; border-radius:8px; object-fit:cover; }
    .links { display:flex; align-items:center; gap:16px; flex-wrap:wrap; font-size:14px; }
    .btn { background:var(--surface); color:var(--text); border:1px solid var(--border); border-radius:10px; padding:8px 12px; font-size:13px; cursor:pointer; }
    .hero { padding:42px 0 28px; border-bottom:1px solid var(--border); }
    .hero h1 { font-size:clamp(28px, 4vw, 42px); line-height:1.15; margin:0 0 10px; }
    .hero p { color:var(--muted); margin:0; max-width:65ch; }
    .search { margin:24px 0 10px; width:100%; padding:11px 14px; border-radius:12px; border:1px solid var(--border); background:var(--card); color:var(--text); font-size:14px; }
    .post { padding:26px 0; border-bottom:1px solid var(--border); cursor:pointer; }
    .meta { font-size:12px; color:var(--muted); margin-bottom:6px; font-family:ui-monospace, monospace; }
    .post h2 { margin:0 0 6px; font-size:22px; }
    .post p { margin:0; color:var(--muted); font-size:15px; }
    .prose img { max-width:100%; border-radius:12px; margin:16px 0; }
    .prose pre { background:var(--surface); padding:14px; border-radius:10px; overflow:auto; border:1px solid var(--border); }
    .prose blockquote { margin:18px 0; padding:12px 16px; background:var(--surface); border-radius:10px; border:1px solid var(--border); }
    footer { border-top:1px solid var(--border); padding:28px 0; margin-top:48px; font-size:13px; color:var(--muted); }
    .foot-flex { display:flex; flex-wrap:wrap; justify-content:space-between; gap:12px; align-items:center; }
  </style>
</head>
<body>
  <header>
    <div class="wrap nav">
      <a class="brand" href="#/">
        <img src="${escapeHtmlAttr(iconHref)}" alt="${escapeHtmlAttr(headerBrand)}" onerror="this.style.display='none'" />
        <span>${escapeHtmlAttr(headerBrand)}</span>
      </a>
      <div class="links">
        ${headerLinks.map((l) => `<a href="${escapeHtmlAttr(l.url)}">${escapeHtmlAttr(l.label)}</a>`).join("")}
        <a href="./rss.xml">RSS</a>
        <button class="btn" id="themeBtn" type="button">\u0110\u1ED5i S\xE1ng/T\u1ED1i</button>
      </div>
    </div>
  </header>
  <main class="wrap" id="app"></main>
  <footer>
    <div class="wrap foot-flex">
      <span>${escapeHtmlAttr(footerText)}</span>
      <div class="links">
        ${footerLinks.map((l) => `<a href="${escapeHtmlAttr(l.url)}">${escapeHtmlAttr(l.label)}</a>`).join("")}
      </div>
    </div>
  </footer>
  <script>
    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }
    const savedTheme = localStorage.getItem('blogvn_site_theme');
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    document.getElementById('themeBtn').onclick = () => {
      const dark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('blogvn_site_theme', dark ? 'dark' : 'light');
    };
    const SITE_META = ${JSON.stringify({ title, tagline })};
    let POSTS = []; let query = ''; let activeSlug = null;
    function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function render() {
      const root = document.getElementById('app');
      const post = activeSlug ? POSTS.find(p => p.slug === activeSlug) : null;
      if (post) {
        const htmlBody = window.marked ? window.marked.parse(post.markdownBody || '') : '<pre>' + esc(post.markdownBody) + '</pre>';
        root.innerHTML = '<div style="padding:28px 0">' +
          '<button class="btn" onclick="activeSlug=null;location.hash='#/';render()">\u2190 Quay l\u1EA1i danh s\xE1ch</button>' +
          '<div class="meta" style="margin-top:20px">' + esc(post.date) + ' \xB7 ' + esc(post.category) + '</div>' +
          '<h1 style="font-size:34px;line-height:1.2;margin:6px 0 18px">' + esc(post.title) + '</h1>' +
          (post.cover ? '<img src="' + esc(post.cover) + '" alt="' + esc(post.title) + '" style="width:100%;max-height:420px;object-fit:cover;border-radius:14px;margin-bottom:24px" />' : '') +
          '<div class="prose">' + htmlBody + '</div>' +
          '</div>';
        return;
      }
      const filtered = POSTS.filter(p => !query || (p.title + ' ' + p.excerpt + ' ' + p.category).toLowerCase().includes(query.toLowerCase()));
      root.innerHTML = '<section class="hero"><h1>' + esc(SITE_META.title) + '</h1><p>' + esc(SITE_META.tagline) + '</p>' +
        '<input class="search" placeholder="T\xECm b\xE0i vi\u1EBFt..." value="' + esc(query) + '" oninput="query=this.value;render()" /></section>' +
        '<div>' + (filtered.length ? filtered.map(p => '<article class="post" onclick="activeSlug='' + esc(p.slug) + '';location.hash='#/post/' + encodeURIComponent(p.slug) + '';render()">' +
        '<div class="meta">' + esc(p.date) + ' \xB7 ' + esc(p.category) + '</div>' +
        '<h2>' + esc(p.title) + '</h2><p>' + esc(p.excerpt) + '</p></article>').join('') : '<p style="padding:36px 0;color:var(--muted)">Kh\xF4ng c\xF3 b\xE0i vi\u1EBFt n\xE0o ph\xF9 h\u1EE3p.</p>') + '</div>';
    }
    window.addEventListener('hashchange', () => {
      const m = location.hash.match(/^#\\/post\\/(.+)$/);
      activeSlug = m ? decodeURIComponent(m[1]) : null;
      render();
    });
    fetch('./posts-manifest.json').then(r => r.json()).catch(() => ({ posts: [] })).then((pData) => {
      POSTS = Array.isArray(pData.posts) ? pData.posts : [];
      const m = location.hash.match(/^#\\/post\\/(.+)$/);
      if (m) activeSlug = decodeURIComponent(m[1]);
      render();
    });
  </script>
</body>
</html>
`;
  const files = [
    { path: ".nojekyll", content: "", isBase64: false },
    { path: ".blogvn/site-config.json", content: JSON.stringify(siteConfig, null, 2) + "\n", isBase64: false },
    {
      path: "posts-manifest.json",
      content: JSON.stringify({ owner, repo, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), posts: cleanPosts }, null, 2) + "\n",
      isBase64: false
    },
    { path: "manifest.webmanifest", content: JSON.stringify(manifest, null, 2) + "\n", isBase64: false },
    { path: "sw.js", content: swJs, isBase64: false },
    { path: "index.html", content: indexHtml, isBase64: false }
  ];
  if (siteConfig.siteIcon && siteConfig.siteIcon.startsWith("data:image/")) {
    const cleanB64 = siteConfig.siteIcon.replace(/^data:[^;]+;base64,/, "");
    files.push({ path: "favicon.png", content: cleanB64, isBase64: true });
  } else if (defaultPngB64) {
    files.push({ path: "favicon.png", content: defaultPngB64, isBase64: true });
  }
  return files;
}
async function executeScheduledPublish(payload, token) {
  const owner = payload.owner || DEFAULT_OWNER;
  const repo = payload.repo || DEFAULT_REPO;
  const branch = payload.branch || "main";
  const rawContent = buildSerializedPayload({ ...payload, draft: false });
  const message = payload.commitMessage || `Scheduled publish (${payload.collection}): ${payload.title}`;
  const result = await upsertRepoFile({
    owner,
    repo,
    branch,
    filePath: payload.filePath,
    content: rawContent,
    message,
    token,
    sha: payload.sha
  });
  if (!result.ok || !result.data) {
    return {
      ok: false,
      status: result.status || 400,
      error: result.error || "Kh\xF4ng th\u1EC3 \u0111\u0103ng b\xE0i l\xEAn GitHub."
    };
  }
  const savedPost = parseMarkdownFile(
    rawContent,
    payload.filePath,
    result.data.content?.sha || "",
    owner,
    repo,
    result.data.content?.html_url
  );
  return {
    ok: true,
    status: 200,
    post: savedPost,
    commitUrl: result.data.commit?.html_url
  };
}
async function executeScheduledDelete(params, token) {
  let targetSha = params.sha;
  const existing = await githubRequest(
    `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.filePath).replace(
      /%2F/g,
      "/"
    )}?ref=${encodeURIComponent(params.branch || "main")}`,
    {},
    token
  );
  if (existing.status === 404) {
    return { ok: true, status: 200 };
  }
  if (existing.ok && existing.data?.sha) {
    targetSha = existing.data.sha;
  }
  if (!targetSha) {
    return {
      ok: false,
      status: 400,
      error: "Kh\xF4ng x\xE1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c SHA hi\u1EC7n t\u1EA1i c\u1EE7a t\u1EC7p c\u1EA7n xo\xE1."
    };
  }
  const delRes = await githubRequest(
    `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.filePath).replace(
      /%2F/g,
      "/"
    )}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: params.message || `Auto-delete scheduled post: ${params.filePath}`,
        sha: targetSha,
        branch: params.branch || "main"
      })
    },
    token
  );
  if (!delRes.ok) {
    return {
      ok: false,
      status: delRes.status || 400,
      error: delRes.error || "Kh\xF4ng th\u1EC3 xo\xE1 t\u1EC7p kh\u1ECFi GitHub."
    };
  }
  return {
    ok: true,
    status: 200,
    commitUrl: delRes.data?.commit?.html_url
  };
}
var isProcessingSchedules = false;
async function runSingleScheduleTask(task, token) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  if (task.type === "publish") {
    if (!task.postPayload) {
      return {
        updated: {
          ...task,
          status: "failed",
          executedAt: nowIso,
          error: "Thi\u1EBFu d\u1EEF li\u1EC7u b\xE0i vi\u1EBFt \u0111\u1EC3 \u0111\u0103ng t\u1EF1 \u0111\u1ED9ng."
        }
      };
    }
    const res = await executeScheduledPublish(task.postPayload, token);
    if (!res.ok) {
      return {
        updated: {
          ...task,
          status: "failed",
          executedAt: nowIso,
          error: res.error
        }
      };
    }
    let spawnedDelete;
    if (task.autoDeleteAt && !Number.isNaN(Date.parse(task.autoDeleteAt))) {
      spawnedDelete = {
        id: `del-${crypto.randomBytes(4).toString("hex")}`,
        type: "delete",
        status: "pending",
        owner: task.owner,
        repo: task.repo,
        branch: task.branch,
        filePath: task.filePath,
        title: task.title,
        scheduledAt: task.autoDeleteAt,
        createdAt: nowIso
      };
    }
    return {
      updated: {
        ...task,
        status: "completed",
        executedAt: nowIso,
        commitUrl: res.commitUrl,
        error: void 0
      },
      spawnedDelete
    };
  }
  const delRes = await executeScheduledDelete(
    {
      owner: task.owner,
      repo: task.repo,
      branch: task.branch,
      filePath: task.filePath
    },
    token
  );
  if (!delRes.ok) {
    return {
      updated: {
        ...task,
        status: "failed",
        executedAt: nowIso,
        error: delRes.error
      }
    };
  }
  return {
    updated: {
      ...task,
      status: "completed",
      executedAt: nowIso,
      commitUrl: delRes.commitUrl,
      error: void 0
    }
  };
}
async function processDueSchedules(token, ownerFilter, repoFilter) {
  if (isProcessingSchedules) {
    return { executedCount: 0, tasks: loadSchedulesFromDisk() };
  }
  isProcessingSchedules = true;
  let executedCount = 0;
  try {
    const tasks = loadSchedulesFromDisk();
    const now = Date.now();
    let changed = false;
    const spawned = [];
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (t.status !== "pending") continue;
      if (ownerFilter && t.owner.toLowerCase() !== ownerFilter.toLowerCase()) continue;
      if (repoFilter && t.repo.toLowerCase() !== repoFilter.toLowerCase()) continue;
      const dueTime = Date.parse(t.scheduledAt);
      if (Number.isNaN(dueTime) || dueTime > now) continue;
      const { updated, spawnedDelete } = await runSingleScheduleTask(t, token);
      tasks[i] = updated;
      if (spawnedDelete) spawned.push(spawnedDelete);
      changed = true;
      executedCount++;
    }
    const finalTasks = spawned.length > 0 ? [...spawned, ...tasks] : tasks;
    if (changed) {
      saveSchedulesToDisk(finalTasks);
    }
    return { executedCount, tasks: finalTasks };
  } finally {
    isProcessingSchedules = false;
  }
}
function buildGitHubSchedulerWorkflowYaml() {
  return `name: \u0110\u1EA1o K\xFD Scheduled Publish & Auto-Delete

on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  run-schedules:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Process due publish & auto-delete jobs
        run: |
          node -e '
          const fs = require("fs");
          const path = require("path");
          const schedulePath = ".blogvn/schedules.json";
          if (!fs.existsSync(schedulePath)) {
            console.log("No schedules file found.");
            process.exit(0);
          }
          const jobs = JSON.parse(fs.readFileSync(schedulePath, "utf8"));
          const now = Date.now();
          let changed = false;
          for (const job of jobs) {
            if (job.status !== "pending") continue;
            const due = Date.parse(job.scheduledAt);
            if (Number.isNaN(due) || due > now) continue;
            if (job.type === "publish" && job.rawContent) {
              const dir = path.dirname(job.filePath);
              fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(job.filePath, job.rawContent, "utf8");
              job.status = "completed";
              job.executedAt = new Date().toISOString();
              changed = true;
              console.log("Published:", job.filePath);
              if (job.autoDeleteAt) {
                jobs.push({
                  id: "del-" + Math.random().toString(36).slice(2, 8),
                  type: "delete",
                  status: "pending",
                  filePath: job.filePath,
                  title: job.title,
                  scheduledAt: job.autoDeleteAt
                });
              }
            } else if (job.type === "delete") {
              if (fs.existsSync(job.filePath)) {
                fs.unlinkSync(job.filePath);
                console.log("Deleted:", job.filePath);
              }
              job.status = "completed";
              job.executedAt = new Date().toISOString();
              changed = true;
            }
          }
          if (changed) {
            fs.writeFileSync(schedulePath, JSON.stringify(jobs, null, 2), "utf8");
          }
          '

      - name: Commit & Push scheduled changes
        run: |
          git config user.name "\u0110\u1EA1o K\xFD Scheduler"
          git config user.email "actions@users.noreply.github.com"
          git add -A
          if ! git diff --staged --quiet; then
            git commit -m "\u0110\u1EA1o K\xFD: Execute scheduled post publish / auto-delete"
            git push
          else
            echo "No due scheduled jobs."
          fi
`;
}
async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(cookieParser());
  app.get("/api/auth/status", async (req, res) => {
    const oauthConfigured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    const session = getSessionRecord(req);
    const envToken = process.env.GITHUB_TOKEN;
    let status = {
      authenticated: false,
      mode: "readonly",
      oauthConfigured,
      user: null,
      targetRepo: {
        owner: DEFAULT_OWNER,
        repo: DEFAULT_REPO,
        pagesUrl: `https://${DEFAULT_OWNER}.github.io`
      }
    };
    if (session) {
      status = {
        ...status,
        authenticated: true,
        mode: "oauth",
        user: session.user
      };
    } else if (envToken) {
      const userResp = await githubRequest("/user", {}, envToken);
      status = {
        ...status,
        authenticated: true,
        mode: "env_token",
        user: userResp.ok ? userResp.data : null
      };
    }
    res.json(status);
  });
  app.get("/api/auth/github/url", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
      res.status(400).json({
        error: "GitHub OAuth ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET)."
      });
      return;
    }
    const baseUrl = getBaseAppUrl(req);
    const redirectUri = `${baseUrl}/auth/callback`;
    const state = crypto.randomBytes(16).toString("hex");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "repo workflow read:user",
      state
    });
    res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
  });
  const handleOAuthCallback = async (req, res) => {
    const code = req.query.code ? String(req.query.code) : "";
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!code || !clientId || !clientSecret) {
      res.status(400).send("Thi\u1EBFu m\xE3 x\xE1c th\u1EF1c OAuth ho\u1EB7c c\u1EA5u h\xECnh OAuth.");
      return;
    }
    try {
      const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code
        })
      });
      const tokenJson = await tokenResp.json();
      if (!tokenJson.access_token) {
        res.status(400).send(`X\xE1c th\u1EF1c GitHub th\u1EA5t b\u1EA1i: ${tokenJson.error_description || "Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c token"}`);
        return;
      }
      const userResp = await githubRequest("/user", {}, tokenJson.access_token);
      if (!userResp.ok || !userResp.data) {
        res.status(400).send("Kh\xF4ng th\u1EC3 l\u1EA5y th\xF4ng tin ng\u01B0\u1EDDi d\xF9ng GitHub.");
        return;
      }
      const sid = crypto.randomUUID();
      const record = {
        accessToken: tokenJson.access_token,
        user: userResp.data,
        createdAt: Date.now()
      };
      sessions.set(sid, record);
      const cookieOpts = {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1e3
      };
      res.cookie("gh_session", sid, cookieOpts);
      res.cookie("gh_session_data", sealSession(record), cookieOpts);
      res.send(`
        <!doctype html>
        <html lang="vi">
          <body style="font-family:sans-serif;padding:32px;text-align:center;">
            <p>K\u1EBFt n\u1ED1i GitHub th\xE0nh c\xF4ng. C\u1EEDa s\u1ED5 s\u1EBD t\u1EF1 \u0111\u1ED9ng \u0111\xF3ng...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).send("L\u1ED7i x\u1EED l\xFD x\xE1c th\u1EF1c GitHub.");
    }
  };
  app.get(["/auth/callback", "/auth/callback/"], handleOAuthCallback);
  app.post("/api/auth/logout", (req, res) => {
    const sid = req.cookies?.gh_session;
    if (sid) sessions.delete(sid);
    res.clearCookie("gh_session", { httpOnly: true, sameSite: "none", secure: true });
    res.clearCookie("gh_session_data", { httpOnly: true, sameSite: "none", secure: true });
    res.json({ ok: true });
  });
  app.get("/api/github/user-repos", async (req, res) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({ repos: [] });
      return;
    }
    try {
      const reposResp = await githubRequest(
        "/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator",
        {},
        token
      );
      if (!reposResp.ok || !Array.isArray(reposResp.data)) {
        res.status(reposResp.status || 400).json({ repos: [], error: reposResp.error });
        return;
      }
      const mapped = reposResp.data.map((r) => {
        const ownerLogin = r.owner?.login || "";
        const isUserSite = r.name.toLowerCase() === `${ownerLogin.toLowerCase()}.github.io` || r.name.toLowerCase().endsWith(".github.io");
        const pagesUrl = isUserSite ? `https://${r.name}` : `https://${ownerLogin}.github.io/${r.name}`;
        return {
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          owner: ownerLogin,
          description: r.description || null,
          isPrivate: Boolean(r.private),
          hasPages: Boolean(r.has_pages || isUserSite),
          isUserSite,
          defaultBranch: r.default_branch || "main",
          pagesUrl,
          updatedAt: r.updated_at || ""
        };
      }).sort((a, b) => {
        if (a.isUserSite !== b.isUserSite) return a.isUserSite ? -1 : 1;
        if (a.hasPages !== b.hasPages) return a.hasPages ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
      res.json({ repos: mapped });
    } catch (error) {
      console.error("List user repos error:", error);
      res.status(500).json({ repos: [], error: "Kh\xF4ng th\u1EC3 l\u1EA5y danh s\xE1ch repository c\u1EE7a ng\u01B0\u1EDDi d\xF9ng." });
    }
  });
  app.get("/api/github/repo", async (req, res) => {
    const owner = String(req.query.owner || DEFAULT_OWNER);
    const repo = String(req.query.repo || DEFAULT_REPO);
    const token = getSessionToken(req);
    try {
      const [repoResp, userResp, commitsResp] = await Promise.all([
        githubRequest(`/repos/${owner}/${repo}`, {}, token),
        githubRequest(`/users/${owner}`, {}, token),
        githubRequest(`/repos/${owner}/${repo}/commits?per_page=8`, {}, token)
      ]);
      if (!repoResp.ok || !repoResp.data) {
        res.status(repoResp.status || 404).json({
          error: repoResp.error || `Kh\xF4ng t\xECm th\u1EA5y repository ${owner}/${repo}`
        });
        return;
      }
      const r = repoResp.data;
      const u = userResp.ok ? userResp.data : null;
      const commits = commitsResp.ok && Array.isArray(commitsResp.data) ? commitsResp.data.map((c) => ({
        sha: c.sha,
        message: c.commit?.message || "",
        authorName: c.commit?.author?.name || owner,
        date: c.commit?.author?.date || "",
        htmlUrl: c.html_url
      })) : [];
      const payload = {
        owner,
        repo,
        fullName: r.full_name,
        description: r.description,
        defaultBranch: r.default_branch || "main",
        htmlUrl: r.html_url,
        pagesUrl: r.homepage || `https://${owner}.github.io`,
        updatedAt: r.pushed_at || r.updated_at,
        stargazersCount: r.stargazers_count || 0,
        isPrivate: Boolean(r.private),
        hasPagesSite: Boolean(r.has_pages),
        ownerProfile: u ? {
          login: u.login,
          name: u.name,
          avatarUrl: u.avatar_url,
          bio: u.bio,
          htmlUrl: u.html_url,
          publicRepos: u.public_repos || 0,
          followers: u.followers || 0
        } : null,
        commits
      };
      res.json(payload);
    } catch (error) {
      console.error("Repo fetch error:", error);
      res.status(500).json({ error: "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i t\u1EDBi GitHub API." });
    }
  });
  app.get("/api/github/posts", async (req, res) => {
    const owner = String(req.query.owner || DEFAULT_OWNER);
    const repo = String(req.query.repo || DEFAULT_REPO);
    const branch = String(req.query.branch || "main");
    const token = getSessionToken(req);
    try {
      const treeResp = await githubRequest(
        `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
        {},
        token
      );
      if (!treeResp.ok || !treeResp.data) {
        if (treeResp.status === 404 || treeResp.status === 409) {
          res.json({
            posts: [],
            config: null,
            structure: {
              framework: "jekyll",
              frameworkLabel: "Jekyll",
              postsDir: "_posts",
              assetsPrefix: "",
              uploadDir: "assets/uploads",
              publicUploadPrefix: "/assets/uploads",
              hasPostsDir: false,
              hasJekyllPosts: false,
              hasAstroEngine: false,
              hasStaticEngine: false,
              hasConfigFile: false,
              detectedPostsDir: "_posts",
              totalFiles: 0,
              markdownFilesCount: 0,
              frontmatterSchema: defaultFrontmatterSchema("jekyll")
            }
          });
          return;
        }
        res.status(treeResp.status).json({ error: treeResp.error });
        return;
      }
      const tree = treeResp.data.tree || [];
      const blobs = tree.filter((item) => item.type === "blob");
      const hasAstroTrangWeb = blobs.some((b) => b.path === "src/cau_hinh/trang_web.ts");
      const hasAstroVnContent = blobs.some((b) => b.path.startsWith("src/content/bai_viet/"));
      const hasAstroContentDir = blobs.some((b) => b.path.startsWith("src/content/"));
      const hasAstroConfig = blobs.some((b) => b.path.startsWith("astro.config."));
      const hasHexoPosts = blobs.some((b) => b.path.startsWith("source/_posts/"));
      const hasHexoScaffolds = blobs.some((b) => b.path.startsWith("scaffolds/"));
      const hasHugoConfig = blobs.some(
        (b) => ["hugo.toml", "hugo.yaml", "hugo.json", "config.toml"].includes(b.path)
      );
      const hasHugoPosts = blobs.some(
        (b) => b.path.startsWith("content/posts/") || b.path.startsWith("content/blog/")
      );
      const hasJekyllPosts = blobs.some((b) => b.path.startsWith("_posts/"));
      const hasJekyllConfig = blobs.some((b) => b.path === "_config.yml");
      const hasPostsDir = blobs.some((b) => b.path.startsWith("posts/"));
      const isAstroEngine = hasAstroContentDir || hasAstroConfig;
      const isAstroVn = hasAstroTrangWeb || hasAstroVnContent;
      let framework = "static";
      let frameworkLabel = "Markdown t\u0129nh";
      let postsDir = "posts";
      let assetsPrefix = "";
      let uploadDir = "assets/uploads";
      let publicUploadPrefix = "/assets/uploads";
      if (isAstroVn) {
        framework = "astro-vn";
        frameworkLabel = "Astro (Huy\u1EC1n Kh\xF4ng)";
        postsDir = "src/content/bai_viet";
        assetsPrefix = "public";
        uploadDir = "public/tainguyen/hinhanh/uploads";
        publicUploadPrefix = "/tainguyen/hinhanh/uploads";
      } else if (isAstroEngine) {
        framework = "astro";
        frameworkLabel = "Astro";
        const hasBlogDir = blobs.some((b) => b.path.startsWith("src/content/blog/"));
        const hasAstroPostsDir = blobs.some((b) => b.path.startsWith("src/content/posts/"));
        postsDir = hasBlogDir ? "src/content/blog" : hasAstroPostsDir ? "src/content/posts" : "src/content/blog";
        assetsPrefix = "public";
        uploadDir = "public/images/uploads";
        publicUploadPrefix = "/images/uploads";
      } else if (hasHexoPosts || hasJekyllConfig && hasHexoScaffolds) {
        framework = "hexo";
        frameworkLabel = "Hexo";
        postsDir = "source/_posts";
        assetsPrefix = "source";
        uploadDir = "source/images/uploads";
        publicUploadPrefix = "/images/uploads";
      } else if (hasHugoConfig || hasHugoPosts) {
        framework = "hugo";
        frameworkLabel = "Hugo";
        postsDir = blobs.some((b) => b.path.startsWith("content/blog/")) ? "content/blog" : "content/posts";
        assetsPrefix = "static";
        uploadDir = "static/images/uploads";
        publicUploadPrefix = "/images/uploads";
      } else if (hasJekyllPosts || hasJekyllConfig || blobs.some((b) => b.path.startsWith("_layouts/"))) {
        framework = "jekyll";
        frameworkLabel = "Jekyll";
        postsDir = "_posts";
        assetsPrefix = "";
        uploadDir = "assets/uploads";
        publicUploadPrefix = "/assets/uploads";
      } else if (hasPostsDir) {
        framework = "static";
        frameworkLabel = "Markdown t\u0129nh";
        postsDir = "posts";
      }
      const mdFiles = blobs.filter((item) => {
        const lower = item.path.toLowerCase();
        if (!lower.endsWith(".md") && !lower.endsWith(".markdown") && !lower.endsWith(".mdx")) {
          return false;
        }
        if (lower.startsWith("readme") || lower === "license.md" || lower === "index.md") return false;
        if (lower.endsWith("/_index.md")) return false;
        return lower.startsWith("src/content/") || lower.startsWith("_posts/") || lower.startsWith("source/_posts/") || lower.startsWith("posts/") || lower.startsWith("content/") || !lower.includes("/");
      });
      const hasConfigFile = blobs.some((b) => b.path === "blog-config.json");
      const hasStaticEngine = blobs.some((b) => b.path === "posts-manifest.json") && blobs.some((b) => b.path === "index.html");
      let remoteConfig = null;
      if (hasAstroTrangWeb) {
        const astroCfgResp = await githubRequest(
          `/repos/${owner}/${repo}/contents/src/cau_hinh/trang_web.ts?ref=${encodeURIComponent(branch)}`,
          {},
          token
        );
        if (astroCfgResp.ok && astroCfgResp.data?.content) {
          const decoded = Buffer.from(astroCfgResp.data.content, "base64").toString("utf8");
          remoteConfig = {
            ...parseAstroTrangWebTs(decoded),
            postsDirectory: postsDir
          };
        }
      } else if (hasJekyllConfig) {
        const jekyllCfgResp = await githubRequest(
          `/repos/${owner}/${repo}/contents/_config.yml?ref=${encodeURIComponent(branch)}`,
          {},
          token
        );
        if (jekyllCfgResp.ok && jekyllCfgResp.data?.content) {
          try {
            const decoded = Buffer.from(jekyllCfgResp.data.content, "base64").toString("utf8");
            const parsedYml = loadYaml(decoded);
            if (parsedYml && typeof parsedYml === "object") {
              const cfg = parsedYml;
              remoteConfig = {
                siteTitle: cfg.title ? String(cfg.title) : void 0,
                tagline: cfg.description ? String(cfg.description) : void 0,
                authorName: cfg.author ? String(cfg.author) : void 0,
                postsDirectory: postsDir
              };
            }
          } catch {
          }
        }
      } else if (hasHugoConfig) {
        const hugoCfgFile = blobs.find(
          (b) => ["hugo.toml", "hugo.yaml", "config.toml", "hugo.json"].includes(b.path)
        );
        if (hugoCfgFile) {
          const hugoCfgResp = await githubRequest(
            `/repos/${owner}/${repo}/contents/${hugoCfgFile.path}?ref=${encodeURIComponent(branch)}`,
            {},
            token
          );
          if (hugoCfgResp.ok && hugoCfgResp.data?.content) {
            const decoded = Buffer.from(hugoCfgResp.data.content, "base64").toString("utf8");
            if (hugoCfgFile.path.endsWith(".toml")) {
              const titleMatch = decoded.match(/^\s*title\s*=\s*["']([^"']+)["']/m);
              const descMatch = decoded.match(/^\s*description\s*=\s*["']([^"']+)["']/m);
              remoteConfig = {
                siteTitle: titleMatch?.[1],
                tagline: descMatch?.[1],
                postsDirectory: postsDir
              };
            } else if (hugoCfgFile.path.endsWith(".yaml")) {
              try {
                const parsed = loadYaml(decoded);
                remoteConfig = {
                  siteTitle: parsed?.title ? String(parsed.title) : void 0,
                  tagline: parsed?.params?.description ? String(parsed.params.description) : void 0,
                  postsDirectory: postsDir
                };
              } catch {
              }
            }
          }
        }
      }
      const targetFiles = mdFiles.slice(0, 50);
      const fetchedPosts = await Promise.all(
        targetFiles.map(async (file) => {
          const fileResp = await githubRequest(
            `/repos/${owner}/${repo}/contents/${encodeURIComponent(file.path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`,
            {},
            token
          );
          if (!fileResp.ok || !fileResp.data?.content) return null;
          const decoded = Buffer.from(fileResp.data.content, "base64").toString("utf8");
          return parseMarkdownFile(
            decoded,
            file.path,
            fileResp.data.sha,
            owner,
            repo,
            fileResp.data.html_url
          );
        })
      );
      const posts = fetchedPosts.filter((p) => p !== null).sort((a, b) => b.date.localeCompare(a.date));
      const frontmatterSchema = inferFrontmatterSchema(framework, posts);
      const blogvnCfgBlob = blobs.find((b) => b.path === ".blogvn/site-config.json");
      if (blogvnCfgBlob) {
        const cfgResp = await githubRequest(
          `/repos/${owner}/${repo}/contents/.blogvn/site-config.json?ref=${encodeURIComponent(branch)}`,
          {},
          token
        );
        if (cfgResp.ok && cfgResp.data?.content) {
          try {
            const parsedJson = JSON.parse(Buffer.from(cfgResp.data.content, "base64").toString("utf8"));
            if (parsedJson && typeof parsedJson === "object") {
              remoteConfig = {
                ...remoteConfig || {},
                ...parsedJson,
                postsDirectory: postsDir
              };
            }
          } catch {
          }
        }
      }
      const localSiteConfigs = loadSiteConfigsFromDisk();
      const savedRepoCfg = localSiteConfigs[repoConfigKey(owner, repo)];
      if (savedRepoCfg) {
        remoteConfig = {
          ...remoteConfig || {},
          ...savedRepoCfg,
          postsDirectory: postsDir
        };
      }
      const structure = {
        framework,
        frameworkLabel,
        postsDir,
        assetsPrefix,
        uploadDir,
        publicUploadPrefix,
        hasPostsDir,
        hasJekyllPosts,
        hasAstroEngine: isAstroVn,
        hasStaticEngine,
        hasConfigFile,
        detectedPostsDir: postsDir,
        totalFiles: blobs.length,
        markdownFilesCount: mdFiles.length,
        frontmatterSchema
      };
      res.json({ posts, config: remoteConfig, structure });
    } catch (error) {
      console.error("Fetch posts error:", error);
      res.status(500).json({ error: "Kh\xF4ng th\u1EC3 \u0111\u1ECDc danh s\xE1ch b\xE0i vi\u1EBFt t\u1EEB GitHub." });
    }
  });
  app.get("/api/github/build-status", async (req, res) => {
    const owner = String(req.query.owner || DEFAULT_OWNER);
    const repo = String(req.query.repo || DEFAULT_REPO);
    const token = getSessionToken(req);
    try {
      const runsResp = await githubRequest(
        `/repos/${owner}/${repo}/actions/runs?per_page=1`,
        {},
        token
      );
      const latestRun = runsResp.ok ? runsResp.data?.workflow_runs?.[0] : null;
      if (latestRun) {
        const payload = {
          status: latestRun.status === "queued" || latestRun.status === "in_progress" ? latestRun.status : "completed",
          conclusion: latestRun.conclusion === "success" || latestRun.conclusion === "failure" || latestRun.conclusion === "cancelled" ? latestRun.conclusion : null,
          workflowName: latestRun.name || "GitHub Pages Build",
          updatedAt: latestRun.updated_at || latestRun.created_at || "",
          htmlUrl: latestRun.html_url
        };
        res.json(payload);
        return;
      }
      if (token) {
        const pagesBuildResp = await githubRequest(
          `/repos/${owner}/${repo}/pages/builds/latest`,
          {},
          token
        );
        if (pagesBuildResp.ok && pagesBuildResp.data) {
          const b = pagesBuildResp.data;
          const payload = {
            status: b.status === "building" ? "in_progress" : "completed",
            conclusion: b.status === "built" ? "success" : b.status === "errored" ? "failure" : null,
            workflowName: "GitHub Pages",
            updatedAt: b.updated_at || b.created_at || ""
          };
          res.json(payload);
          return;
        }
      }
      res.json({
        status: "unknown",
        conclusion: null,
        workflowName: "GitHub Pages",
        updatedAt: ""
      });
    } catch {
      res.json({
        status: "unknown",
        conclusion: null,
        workflowName: "GitHub Pages",
        updatedAt: ""
      });
    }
  });
  app.post("/api/github/create-pages-site", async (req, res) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: "Vui l\xF2ng \u0111\u0103ng nh\u1EADp GitHub tr\u01B0\u1EDBc khi t\u1EA1o blog m\u1EDBi."
      });
      return;
    }
    const { siteTitle, tagline, repoName } = req.body || {};
    try {
      const userResp = await githubRequest("/user", {}, token);
      if (!userResp.ok || !userResp.data?.login) {
        res.status(401).json({ error: "Kh\xF4ng th\u1EC3 x\xE1c \u0111\u1ECBnh t\xE0i kho\u1EA3n GitHub hi\u1EC7n t\u1EA1i." });
        return;
      }
      const owner = userResp.data.login;
      const cleanRepoName = String(repoName || "").trim().replace(/[^a-zA-Z0-9._-]/g, "-") || `${owner}.github.io`;
      const finalTitle = String(siteTitle || "").trim() || `Blog c\u1EE7a ${userResp.data.name || owner}`;
      const finalTagline = String(tagline || "").trim() || "Ghi ch\xE9p c\xE1 nh\xE2n, chia s\u1EBB ki\u1EBFn th\u1EE9c \u0111\u01B0\u1EE3c t\u1EA1o t\u1EEB \u0110\u1EA1o K\xFD.";
      let defaultBranch = "main";
      const createRepoResp = await githubRequest(
        "/user/repos",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanRepoName,
            description: finalTagline,
            private: false,
            auto_init: true
          })
        },
        token
      );
      if (createRepoResp.ok && createRepoResp.data) {
        defaultBranch = createRepoResp.data.default_branch || "main";
      } else if (createRepoResp.status === 422) {
        const existingRepoResp = await githubRequest(
          `/repos/${owner}/${cleanRepoName}`,
          {},
          token
        );
        if (!existingRepoResp.ok || !existingRepoResp.data) {
          res.status(400).json({
            error: createRepoResp.error || `Kh\xF4ng th\u1EC3 t\u1EA1o repository ${owner}/${cleanRepoName}.`
          });
          return;
        }
        defaultBranch = existingRepoResp.data.default_branch || "main";
      } else {
        res.status(createRepoResp.status || 400).json({
          error: createRepoResp.error || "Kh\xF4ng th\u1EC3 kh\u1EDFi t\u1EA1o repository tr\xEAn GitHub."
        });
        return;
      }
      await new Promise((r) => setTimeout(r, 900));
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const configYml = [
        `title: "${finalTitle.replace(/"/g, '\\"')}"`,
        `description: "${finalTagline.replace(/"/g, '\\"')}"`,
        `author: "${(userResp.data.name || owner).replace(/"/g, '\\"')}"`,
        `theme: minima`,
        `markdown: kramdown`,
        `plugins:`,
        `  - jekyll-feed`
      ].join("\n");
      const indexMd = [
        `---`,
        `layout: home`,
        `title: "${finalTitle.replace(/"/g, '\\"')}"`,
        `---`,
        ``,
        `Ch\xE0o m\u1EEBng \u0111\u1EBFn v\u1EDBi **${finalTitle}** \u2014 trang blog \u0111\u01B0\u1EE3c t\u1EA1o v\xE0 qu\u1EA3n l\xFD b\u1EB1ng **\u0110\u1EA1o K\xFD**.`
      ].join("\n");
      const welcomePost = [
        `---`,
        `layout: post`,
        `title: "Ch\xE0o m\u1EEBng \u0111\u1EBFn v\u1EDBi ${finalTitle.replace(/"/g, '\\"')}"`,
        `date: ${today}`,
        `categories: [Ghi ch\xE9p]`,
        `tags: [dao-ky, github-pages]`,
        `excerpt: "B\xE0i vi\u1EBFt \u0111\u1EA7u ti\xEAn \u0111\u01B0\u1EE3c kh\u1EDFi t\u1EA1o t\u1EF1 \u0111\u1ED9ng t\u1EEB \u1EE9ng d\u1EE5ng \u0110\u1EA1o K\xFD."`,
        `---`,
        ``,
        `Xin ch\xE0o! \u0110\xE2y l\xE0 b\xE0i vi\u1EBFt \u0111\u1EA7u ti\xEAn tr\xEAn trang GitHub Pages m\u1EDBi c\u1EE7a b\u1EA1n.`,
        ``,
        `T\u1EEB nay b\u1EA1n c\xF3 th\u1EC3 vi\u1EBFt b\xE0i Markdown, t\u1EA3i \u1EA3nh tr\u1EF1c ti\u1EBFp t\u1EEB \u0111i\u1EC7n tho\u1EA1i v\xE0 b\u1EA5m **\u0110\u0103ng l\xEAn GitHub** ngay trong \u1EE9ng d\u1EE5ng **\u0110\u1EA1o K\xFD**.`
      ].join("\n");
      await upsertRepoFile({
        owner,
        repo: cleanRepoName,
        branch: defaultBranch,
        filePath: "_config.yml",
        content: configYml + "\n",
        message: "Kh\u1EDFi t\u1EA1o c\u1EA5u h\xECnh \u0110\u1EA1o K\xFD (_config.yml)",
        token
      });
      await upsertRepoFile({
        owner,
        repo: cleanRepoName,
        branch: defaultBranch,
        filePath: "index.md",
        content: indexMd + "\n",
        message: "Kh\u1EDFi t\u1EA1o trang ch\u1EE7 \u0110\u1EA1o K\xFD",
        token
      });
      await upsertRepoFile({
        owner,
        repo: cleanRepoName,
        branch: defaultBranch,
        filePath: `_posts/${today}-chao-mung-den-voi-dao-ky.md`,
        content: welcomePost + "\n",
        message: "Th\xEAm b\xE0i vi\u1EBFt ch\xE0o m\u1EEBng t\u1EEB \u0110\u1EA1o K\xFD",
        token
      });
      await githubRequest(
        `/repos/${owner}/${cleanRepoName}/pages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: { branch: defaultBranch, path: "/" }
          })
        },
        token
      );
      const isUserSite = cleanRepoName.toLowerCase() === `${owner.toLowerCase()}.github.io`;
      const pagesUrl = isUserSite ? `https://${cleanRepoName}` : `https://${owner}.github.io/${cleanRepoName}`;
      res.json({
        ok: true,
        owner,
        repo: cleanRepoName,
        defaultBranch,
        pagesUrl
      });
    } catch (error) {
      console.error("Create pages site error:", error);
      res.status(500).json({ error: "L\u1ED7i m\xE1y ch\u1EE7 khi kh\u1EDFi t\u1EA1o blog GitHub Pages." });
    }
  });
  app.put("/api/github/posts", async (req, res) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: "C\u1EA7n x\xE1c th\u1EF1c GitHub (OAuth ho\u1EB7c GITHUB_TOKEN) \u0111\u1EC3 ghi b\xE0i vi\u1EBFt l\xEAn repository."
      });
      return;
    }
    const {
      owner = DEFAULT_OWNER,
      repo = DEFAULT_REPO,
      branch = "main",
      collection = "bai_viet",
      filePath,
      title,
      date,
      slug,
      category = "K\u1EF9 thu\u1EADt",
      tags = [],
      excerpt = "",
      cover,
      draft = false,
      markdownBody = "",
      sha,
      commitMessage,
      framework = "jekyll",
      frontmatterSchema,
      existingFrontmatter,
      authorName,
      price,
      originalPrice,
      inStock,
      linkDemo,
      linkGithub,
      linkBuy,
      formats,
      publishYear,
      featured,
      seoTitle,
      seoDescription,
      canonicalUrl,
      noindex
    } = req.body || {};
    if (!title || !filePath) {
      res.status(400).json({ error: "Thi\u1EBFu ti\xEAu \u0111\u1EC1 ho\u1EB7c \u0111\u01B0\u1EDDng d\u1EABn t\u1EC7p Markdown." });
      return;
    }
    try {
      const normalizedSlug = slug ? slugify(slug) : slugify(title);
      const isAstroVnPath = framework === "astro-vn" || String(filePath).startsWith("src/content/bai_viet/") || String(filePath).startsWith("src/content/du_an/") || String(filePath).startsWith("src/content/sach/") || String(filePath).startsWith("src/content/cua_hang/");
      const rawContent = serializePostMarkdown(
        {
          collection,
          title,
          date: date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          slug: normalizedSlug,
          category,
          tags: Array.isArray(tags) ? tags : [],
          excerpt,
          cover,
          draft: Boolean(draft),
          markdownBody,
          authorName,
          price,
          originalPrice,
          inStock,
          linkDemo,
          linkGithub,
          linkBuy,
          formats,
          publishYear,
          featured,
          seoTitle,
          seoDescription,
          canonicalUrl,
          noindex: Boolean(noindex)
        },
        {
          framework,
          schema: frontmatterSchema,
          existingFrontmatter,
          isAstroVnPath
        }
      );
      const message = commitMessage || `${sha ? "Update" : "Publish"} ${collection}: ${title}`;
      const result = await upsertRepoFile({
        owner,
        repo,
        branch,
        filePath,
        content: rawContent,
        message,
        token,
        sha
      });
      if (!result.ok || !result.data) {
        res.status(result.status || 400).json({
          error: result.error || "Kh\xF4ng th\u1EC3 commit n\u1ED9i dung l\xEAn GitHub."
        });
        return;
      }
      const savedPost = parseMarkdownFile(
        rawContent,
        filePath,
        result.data.content?.sha || "",
        owner,
        repo,
        result.data.content?.html_url
      );
      res.json({
        post: savedPost,
        commit: result.data.commit
      });
    } catch (error) {
      console.error("Publish post error:", error);
      res.status(500).json({ error: "L\u1ED7i m\xE1y ch\u1EE7 khi xu\u1EA5t b\u1EA3n l\xEAn GitHub." });
    }
  });
  app.delete("/api/github/posts", async (req, res) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: "C\u1EA7n x\xE1c th\u1EF1c GitHub \u0111\u1EC3 xo\xE1 t\u1EC7p tr\xEAn repository."
      });
      return;
    }
    const { owner = DEFAULT_OWNER, repo = DEFAULT_REPO, branch = "main", filePath, sha } = req.body || {};
    if (!filePath || !sha) {
      res.status(400).json({ error: "Thi\u1EBFu \u0111\u01B0\u1EDDng d\u1EABn file ho\u1EB7c SHA \u0111\u1EC3 xo\xE1." });
      return;
    }
    try {
      const result = await githubRequest(
        `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Delete ${filePath}`,
            sha,
            branch
          })
        },
        token
      );
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({ error: "Kh\xF4ng th\u1EC3 xo\xE1 t\u1EC7p tr\xEAn GitHub." });
    }
  });
  app.post("/api/github/upload-image", async (req, res) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: "C\u1EA7n x\xE1c th\u1EF1c GitHub \u0111\u1EC3 t\u1EA3i \u1EA3nh l\xEAn repository."
      });
      return;
    }
    const {
      owner = DEFAULT_OWNER,
      repo = DEFAULT_REPO,
      branch = "main",
      filename = "image.jpg",
      base64Data = "",
      isAstroRepo = true,
      uploadDir,
      publicUploadPrefix
    } = req.body || {};
    if (!base64Data) {
      res.status(400).json({ error: "Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c d\u1EEF li\u1EC7u h\xECnh \u1EA3nh." });
      return;
    }
    try {
      const cleanBase64 = String(base64Data).replace(/^data:[^;]+;base64,/, "");
      const extMatch = String(filename).match(/\.([a-zA-Z0-9]+)$/);
      const ext = (extMatch?.[1] || "jpg").toLowerCase();
      const baseName = slugify(String(filename).replace(/\.[^.]+$/, "")) || "image";
      const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
      const uniqueSuffix = crypto.randomBytes(3).toString("hex");
      const finalFileName = `${stamp}-${baseName}-${uniqueSuffix}.${ext}`;
      const cleanUploadDir = uploadDir ? String(uploadDir).replace(/^\/+|\/+$/g, "") : isAstroRepo ? "public/tainguyen/hinhanh/uploads" : "assets/uploads";
      const cleanPublicPrefix = publicUploadPrefix ? "/" + String(publicUploadPrefix).replace(/^\/+|\/+$/g, "") : isAstroRepo ? "/tainguyen/hinhanh/uploads" : "/assets/uploads";
      const repoPath = `${cleanUploadDir}/${finalFileName}`;
      const publicPath = `${cleanPublicPrefix}/${finalFileName}`;
      const putRes = await githubRequest(
        `/repos/${owner}/${repo}/contents/${encodeURIComponent(repoPath).replace(/%2F/g, "/")}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Upload image: ${finalFileName}`,
            content: cleanBase64,
            branch
          })
        },
        token
      );
      if (!putRes.ok || !putRes.data) {
        res.status(putRes.status || 400).json({
          error: putRes.error || "Kh\xF4ng th\u1EC3 t\u1EA3i \u1EA3nh l\xEAn GitHub."
        });
        return;
      }
      const previewUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${repoPath}`;
      res.json({
        ok: true,
        repoPath,
        publicPath,
        previewUrl,
        sha: putRes.data.content?.sha
      });
    } catch (error) {
      console.error("Upload image error:", error);
      res.status(500).json({ error: "L\u1ED7i m\xE1y ch\u1EE7 khi t\u1EA3i \u1EA3nh l\xEAn GitHub." });
    }
  });
  app.post("/api/github/upload-images-batch", async (req, res) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: "C\u1EA7n x\xE1c th\u1EF1c GitHub \u0111\u1EC3 t\u1EA3i lo\u1EA1t \u1EA3nh l\xEAn repository."
      });
      return;
    }
    const {
      owner = DEFAULT_OWNER,
      repo = DEFAULT_REPO,
      branch = "main",
      isAstroRepo = true,
      uploadDir,
      publicUploadPrefix,
      commitMessage,
      images = []
    } = req.body || {};
    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: "Danh s\xE1ch h\xECnh \u1EA3nh tr\u1ED1ng." });
      return;
    }
    if (images.length > 20) {
      res.status(400).json({ error: "M\u1ED7i l\u1EA7n t\u1EA3i h\xE0ng lo\u1EA1t t\u1ED1i \u0111a 20 \u1EA3nh." });
      return;
    }
    try {
      const cleanUploadDir = uploadDir ? String(uploadDir).replace(/^\/+|\/+$/g, "") : isAstroRepo ? "public/tainguyen/hinhanh/uploads" : "assets/uploads";
      const cleanPublicPrefix = publicUploadPrefix ? "/" + String(publicUploadPrefix).replace(/^\/+|\/+$/g, "") : isAstroRepo ? "/tainguyen/hinhanh/uploads" : "/assets/uploads";
      const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
      const prepared = images.map((img) => {
        const rawName = String(img?.filename || "photo.webp");
        const extMatch = rawName.match(/\.([a-zA-Z0-9]+)$/);
        const ext = (extMatch?.[1] || "webp").toLowerCase();
        const baseName = slugify(rawName.replace(/\.[^.]+$/, "")) || "image";
        const uniqueSuffix = crypto.randomBytes(3).toString("hex");
        const finalFileName = `${stamp}-${baseName}-${uniqueSuffix}.${ext}`;
        const repoPath = `${cleanUploadDir}/${finalFileName}`;
        const publicPath = `${cleanPublicPrefix}/${finalFileName}`;
        const previewUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${repoPath}`;
        return {
          repoPath,
          publicPath,
          previewUrl,
          base64Data: String(img?.base64Data || "")
        };
      });
      const commitRes = await commitMultipleFilesAtomic({
        owner,
        repo,
        branch,
        files: prepared.map((p) => ({
          path: p.repoPath,
          content: p.base64Data,
          isBase64: true
        })),
        message: commitMessage || `Upload ${prepared.length} images via \u0110\u1EA1o K\xFD Image Batch`,
        token
      });
      if (!commitRes.ok) {
        res.status(commitRes.status || 400).json({
          error: commitRes.error || "Kh\xF4ng th\u1EC3 commit lo\u1EA1t \u1EA3nh l\xEAn GitHub."
        });
        return;
      }
      res.json({
        ok: true,
        commit: {
          sha: commitRes.commitSha,
          htmlUrl: commitRes.commitHtmlUrl
        },
        results: prepared.map(({ repoPath, publicPath, previewUrl }) => ({
          repoPath,
          publicPath,
          previewUrl
        }))
      });
    } catch (error) {
      console.error("Batch upload images error:", error);
      res.status(500).json({ error: "L\u1ED7i m\xE1y ch\u1EE7 khi t\u1EA3i lo\u1EA1t \u1EA3nh l\xEAn GitHub." });
    }
  });
  app.get("/api/github/site-essentials", async (req, res) => {
    const owner = String(req.query.owner || DEFAULT_OWNER);
    const repo = String(req.query.repo || DEFAULT_REPO);
    const branch = String(req.query.branch || "main");
    const framework = String(req.query.framework || "jekyll") || "jekyll";
    const token = getSessionToken(req);
    try {
      const treeResp = await githubRequest(
        `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
        {},
        token
      );
      const blobs = treeResp.ok && treeResp.data?.tree ? treeResp.data.tree.filter((i) => i.type === "blob") : [];
      const staticRoot = framework === "astro-vn" || framework === "astro" ? "public" : framework === "hugo" ? "static" : framework === "hexo" ? "source" : "";
      const joinStatic = (file) => staticRoot ? `${staticRoot}/${file}` : file;
      const paths = blobs.map((b) => b.path);
      const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
      const basePagesUrl = isUserSite ? `https://${repo}` : `https://${owner}.github.io/${repo}`;
      const rssMatches = paths.filter(
        (p) => /(^|\/)(rss\.xml|feed\.xml|atom\.xml|index\.xml|rss\.xml\.ts|rss\.xml\.js)$/i.test(p)
      );
      const sitemapMatches = paths.filter(
        (p) => /(^|\/)(sitemap\.xml|sitemap-index\.xml|sitemap-0\.xml)$/i.test(p) || p.includes("astro-sitemap")
      );
      const robotsMatches = paths.filter((p) => /(^|\/)robots\.txt$/i.test(p));
      const feedJsonMatches = paths.filter((p) => /(^|\/)feed\.json$/i.test(p));
      const nojekyllMatches = paths.filter((p) => p === ".nojekyll");
      const notFoundMatches = paths.filter((p) => /(^|\/)404\.(html|astro|md)$/i.test(p));
      const files = [
        {
          key: "rss",
          label: "RSS 2.0 Feed (rss.xml)",
          description: "Cho ph\xE9p \u0111\u1ED9c gi\u1EA3 theo d\xF5i b\xE0i vi\u1EBFt m\u1EDBi qua tr\xECnh \u0111\u1ECDc RSS / Feedly.",
          targetPath: joinStatic("rss.xml"),
          exists: rssMatches.length > 0,
          detectedPaths: rssMatches,
          publicUrl: `${basePagesUrl}/rss.xml`
        },
        {
          key: "sitemap",
          label: "Sitemap XML (sitemap.xml)",
          description: "B\u1EA3n \u0111\u1ED3 website gi\xFAp Google Search & Bing l\u1EADp ch\u1EC9 m\u1EE5c to\xE0n b\u1ED9 b\xE0i vi\u1EBFt.",
          targetPath: joinStatic("sitemap.xml"),
          exists: sitemapMatches.length > 0,
          detectedPaths: sitemapMatches,
          publicUrl: `${basePagesUrl}/sitemap.xml`
        },
        {
          key: "robots",
          label: "Robots.txt (robots.txt)",
          description: "Khai b\xE1o quy\u1EC1n thu th\u1EADp d\u1EEF li\u1EC7u c\u1EE7a Bot t\xECm ki\u1EBFm v\xE0 tr\u1ECF t\u1EDBi Sitemap.",
          targetPath: joinStatic("robots.txt"),
          exists: robotsMatches.length > 0,
          detectedPaths: robotsMatches,
          publicUrl: `${basePagesUrl}/robots.txt`
        },
        {
          key: "feedJson",
          label: "JSON Feed 1.1 (feed.json)",
          description: "Chu\u1EA9n Feed JSON hi\u1EC7n \u0111\u1EA1i d\xE0nh cho \u1EE9ng d\u1EE5ng di \u0111\u1ED9ng & t\xEDch h\u1EE3p API.",
          targetPath: joinStatic("feed.json"),
          exists: feedJsonMatches.length > 0,
          detectedPaths: feedJsonMatches,
          publicUrl: `${basePagesUrl}/feed.json`
        },
        {
          key: "notFound",
          label: "Trang l\u1ED7i 404 tu\u1EF3 ch\u1EC9nh (404.html)",
          description: "Hi\u1EC3n th\u1ECB trang d\u1EABn h\u01B0\u1EDBng \u0111\u1EB9p m\u1EAFt khi ng\u01B0\u1EDDi \u0111\u1ECDc truy c\u1EADp link sai.",
          targetPath: joinStatic("404.html"),
          exists: notFoundMatches.length > 0,
          detectedPaths: notFoundMatches,
          publicUrl: `${basePagesUrl}/404.html`
        },
        {
          key: "nojekyll",
          label: "T\u1EC7p .nojekyll (Tu\u1EF3 ch\u1ECDn)",
          description: "T\u1EAFt b\u1ED9 x\u1EED l\xFD Jekyll m\u1EB7c \u0111\u1ECBnh khi repo d\xF9ng HTML t\u0129nh ho\u1EB7c b\u1EA3n build s\u1EB5n.",
          targetPath: ".nojekyll",
          exists: nojekyllMatches.length > 0,
          detectedPaths: nojekyllMatches
        }
      ];
      const report = {
        framework,
        staticRoot,
        files
      };
      res.json(report);
    } catch (error) {
      console.error("Inspect site essentials error:", error);
      res.status(500).json({ error: "Kh\xF4ng th\u1EC3 ki\u1EC3m tra t\u1EC7p SEO/RSS tr\xEAn repository." });
    }
  });
  app.post("/api/github/site-essentials/publish", async (req, res) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: "C\u1EA7n x\xE1c th\u1EF1c GitHub \u0111\u1EC3 \u0111\u1ED3ng b\u1ED9 RSS/Sitemap l\xEAn repository."
      });
      return;
    }
    const {
      owner = DEFAULT_OWNER,
      repo = DEFAULT_REPO,
      branch = "main",
      commitMessage,
      files = []
    } = req.body || {};
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "Ch\u01B0a c\xF3 t\u1EC7p n\xE0o \u0111\u01B0\u1EE3c ch\u1ECDn \u0111\u1EC3 \u0111\u1ED3ng b\u1ED9." });
      return;
    }
    try {
      const cleanFiles = files.filter((f) => f?.path && typeof f?.content === "string").map((f) => ({
        path: String(f.path).replace(/^\/+/, ""),
        content: String(f.content),
        isBase64: false
      }));
      const result = await commitMultipleFilesAtomic({
        owner,
        repo,
        branch,
        files: cleanFiles,
        message: commitMessage || `Update SEO & Feed essentials (${cleanFiles.map((f) => path.basename(f.path)).join(", ")})`,
        token
      });
      if (!result.ok) {
        res.status(result.status || 400).json({
          error: result.error || "Kh\xF4ng th\u1EC3 commit t\u1EC7p RSS/SEO l\xEAn GitHub."
        });
        return;
      }
      res.json({
        ok: true,
        commit: {
          sha: result.commitSha,
          htmlUrl: result.commitHtmlUrl
        }
      });
    } catch (error) {
      console.error("Publish site essentials error:", error);
      res.status(500).json({ error: "L\u1ED7i m\xE1y ch\u1EE7 khi xu\u1EA5t b\u1EA3n RSS/Sitemap l\xEAn GitHub." });
    }
  });
  app.get("/api/github/insights", async (req, res) => {
    const owner = String(req.query.owner || DEFAULT_OWNER);
    const repo = String(req.query.repo || DEFAULT_REPO);
    const token = getSessionToken(req);
    const mapEventLabel = (ev) => {
      switch (ev?.type) {
        case "WatchEvent":
          return "\u0110\xE3 g\u1EAFn sao (Star) repository";
        case "ForkEvent":
          return "\u0110\xE3 Fork repository";
        case "PushEvent": {
          const commitsCount = ev.payload?.size || ev.payload?.commits?.length || 1;
          return `\u0110\xE3 \u0111\u1EA9y ${commitsCount} commit c\u1EADp nh\u1EADt`;
        }
        case "CreateEvent":
          return `\u0110\xE3 t\u1EA1o ${ev.payload?.ref_type || "t\u1EC7p"}${ev.payload?.ref ? ` (${ev.payload.ref})` : ""}`;
        case "IssuesEvent":
          return `${ev.payload?.action === "closed" ? "\u0110\xE3 \u0111\xF3ng" : "\u0110\xE3 m\u1EDF"} Issue`;
        case "IssueCommentEvent":
          return "\u0110\xE3 b\xECnh lu\u1EADn tr\xEAn Issue";
        case "PullRequestEvent":
          return `Pull Request (${ev.payload?.action || "updated"})`;
        case "ReleaseEvent":
          return `\u0110\xE3 ph\xE1t h\xE0nh phi\xEAn b\u1EA3n ${ev.payload?.release?.tag_name || ""}`.trim();
        default:
          return String(ev?.type || "Activity").replace(/Event$/, "");
      }
    };
    try {
      const [repoResp, eventsResp, viewsResp, clonesResp, referrersResp, pathsResp] = await Promise.all([
        githubRequest(`/repos/${owner}/${repo}`, {}, token),
        githubRequest(`/repos/${owner}/${repo}/events?per_page=15`, {}, token),
        token ? githubRequest(`/repos/${owner}/${repo}/traffic/views`, {}, token) : Promise.resolve({ ok: false, status: 401, data: null, error: "Unauthorized" }),
        token ? githubRequest(`/repos/${owner}/${repo}/traffic/clones`, {}, token) : Promise.resolve({ ok: false, status: 401, data: null, error: "Unauthorized" }),
        token ? githubRequest(`/repos/${owner}/${repo}/traffic/popular/referrers`, {}, token) : Promise.resolve({ ok: false, status: 401, data: null, error: "Unauthorized" }),
        token ? githubRequest(`/repos/${owner}/${repo}/traffic/popular/paths`, {}, token) : Promise.resolve({ ok: false, status: 401, data: null, error: "Unauthorized" })
      ]);
      if (!repoResp.ok || !repoResp.data) {
        res.status(repoResp.status || 404).json({
          error: repoResp.error || `Kh\xF4ng th\u1EC3 t\u1EA3i th\u1ED1ng k\xEA cho ${owner}/${repo}.`
        });
        return;
      }
      const r = repoResp.data;
      const trafficAvailable = viewsResp.ok && Boolean(viewsResp.data);
      let trafficNotice;
      if (!token) {
        trafficNotice = "\u0110\u0103ng nh\u1EADp GitHub OAuth v\u1EDBi t\xE0i kho\u1EA3n ch\u1EE7 s\u1EDF h\u1EEFu kho l\u01B0u tr\u1EEF \u0111\u1EC3 xem d\u1EEF li\u1EC7u l\u01B0u l\u01B0\u1EE3ng 14 ng\xE0y (Traffic Views / Clones).";
      } else if (!viewsResp.ok) {
        trafficNotice = viewsResp.status === 403 ? "GitHub API ch\u1EC9 cho ph\xE9p xem d\u1EEF li\u1EC7u Traffic 14 ng\xE0y n\u1EBFu t\xE0i kho\u1EA3n \u0111ang \u0111\u0103ng nh\u1EADp c\xF3 quy\u1EC1n Push/Admin tr\xEAn repository n\xE0y." : viewsResp.error || "Ch\u01B0a l\u1EA5y \u0111\u01B0\u1EE3c d\u1EEF li\u1EC7u Traffic t\u1EEB GitHub API.";
      }
      const recentEvents = eventsResp.ok && Array.isArray(eventsResp.data) ? eventsResp.data.slice(0, 12).map((ev) => ({
        id: String(ev.id),
        type: String(ev.type || ""),
        actorLogin: ev.actor?.login || owner,
        actorAvatar: ev.actor?.avatar_url,
        actionLabel: mapEventLabel(ev),
        createdAt: ev.created_at || ""
      })) : [];
      const payload = {
        owner,
        repo,
        trafficAvailable,
        trafficNotice,
        views: viewsResp.ok && viewsResp.data ? {
          count: Number(viewsResp.data.count || 0),
          uniques: Number(viewsResp.data.uniques || 0),
          daily: Array.isArray(viewsResp.data.views) ? viewsResp.data.views.map((v) => ({
            timestamp: String(v.timestamp || "").slice(0, 10),
            count: Number(v.count || 0),
            uniques: Number(v.uniques || 0)
          })) : []
        } : null,
        clones: clonesResp.ok && clonesResp.data ? {
          count: Number(clonesResp.data.count || 0),
          uniques: Number(clonesResp.data.uniques || 0),
          daily: Array.isArray(clonesResp.data.clones) ? clonesResp.data.clones.map((c) => ({
            timestamp: String(c.timestamp || "").slice(0, 10),
            count: Number(c.count || 0),
            uniques: Number(c.uniques || 0)
          })) : []
        } : null,
        referrers: referrersResp.ok && Array.isArray(referrersResp.data) ? referrersResp.data.map((ref) => ({
          referrer: String(ref.referrer || "Direct"),
          count: Number(ref.count || 0),
          uniques: Number(ref.uniques || 0)
        })) : [],
        popularPaths: pathsResp.ok && Array.isArray(pathsResp.data) ? pathsResp.data.map((p) => ({
          path: String(p.path || ""),
          title: String(p.title || p.path || ""),
          count: Number(p.count || 0),
          uniques: Number(p.uniques || 0)
        })) : [],
        engagement: {
          stars: Number(r.stargazers_count || 0),
          forks: Number(r.forks_count || 0),
          subscribers: Number(r.subscribers_count ?? r.watchers_count ?? 0),
          openIssues: Number(r.open_issues_count || 0),
          pushedAt: r.pushed_at || r.updated_at || ""
        },
        recentEvents,
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      res.json(payload);
    } catch (error) {
      console.error("Fetch insights error:", error);
      res.status(500).json({ error: "Kh\xF4ng th\u1EC3 t\u1EA3i d\u1EEF li\u1EC7u Site Insights t\u1EEB GitHub API." });
    }
  });
  app.get("/api/schedules", (req, res) => {
    const owner = req.query.owner ? String(req.query.owner).toLowerCase() : "";
    const repo = req.query.repo ? String(req.query.repo).toLowerCase() : "";
    const all = loadSchedulesFromDisk();
    const filtered = owner && repo ? all.filter((t) => t.owner.toLowerCase() === owner && t.repo.toLowerCase() === repo) : all;
    filtered.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    res.json({ tasks: filtered });
  });
  app.post("/api/schedules", (req, res) => {
    const body = req.body || {};
    const type = body.type === "delete" ? "delete" : "publish";
    const owner = String(body.owner || DEFAULT_OWNER);
    const repo = String(body.repo || DEFAULT_REPO);
    const branch = String(body.branch || "main");
    const filePath = String(body.filePath || "").trim();
    const title = String(body.title || filePath || "B\xE0i vi\u1EBFt");
    const scheduledAt = String(body.scheduledAt || "");
    const autoDeleteAt = body.autoDeleteAt ? String(body.autoDeleteAt) : void 0;
    if (!filePath || !scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
      res.status(400).json({ error: "Thi\u1EBFu \u0111\u01B0\u1EDDng d\u1EABn t\u1EC7p ho\u1EB7c th\u1EDDi gian h\u1EB9n gi\u1EDD kh\xF4ng h\u1EE3p l\u1EC7." });
      return;
    }
    if (type === "publish" && !body.postPayload) {
      res.status(400).json({ error: "Thi\u1EBFu n\u1ED9i dung b\xE0i vi\u1EBFt cho l\u1ECBch \u0111\u0103ng t\u1EF1 \u0111\u1ED9ng." });
      return;
    }
    const newTask = {
      id: `${type}-${crypto.randomBytes(4).toString("hex")}`,
      type,
      status: "pending",
      owner,
      repo,
      branch,
      filePath,
      title,
      scheduledAt: new Date(scheduledAt).toISOString(),
      autoDeleteAt: autoDeleteAt && !Number.isNaN(Date.parse(autoDeleteAt)) ? new Date(autoDeleteAt).toISOString() : void 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      postPayload: body.postPayload
    };
    const existing = loadSchedulesFromDisk();
    const deduped = type === "delete" ? existing.filter(
      (t) => !(t.status === "pending" && t.type === "delete" && t.owner.toLowerCase() === owner.toLowerCase() && t.repo.toLowerCase() === repo.toLowerCase() && t.filePath === filePath)
    ) : existing;
    const updated = [newTask, ...deduped];
    saveSchedulesToDisk(updated);
    res.json({ ok: true, task: newTask });
  });
  app.patch("/api/schedules/:id", (req, res) => {
    const { id } = req.params;
    const { scheduledAt, autoDeleteAt } = req.body || {};
    if (!scheduledAt || Number.isNaN(Date.parse(String(scheduledAt)))) {
      res.status(400).json({ error: "Th\u1EDDi gian h\u1EB9n gi\u1EDD m\u1EDBi kh\xF4ng h\u1EE3p l\u1EC7." });
      return;
    }
    const tasks = loadSchedulesFromDisk();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y l\u1ECBch tr\xECnh n\xE0y." });
      return;
    }
    tasks[idx] = {
      ...tasks[idx],
      scheduledAt: new Date(String(scheduledAt)).toISOString(),
      ...autoDeleteAt !== void 0 ? {
        autoDeleteAt: autoDeleteAt && !Number.isNaN(Date.parse(String(autoDeleteAt))) ? new Date(String(autoDeleteAt)).toISOString() : void 0
      } : {},
      status: "pending",
      error: void 0
    };
    saveSchedulesToDisk(tasks);
    res.json({ ok: true, task: tasks[idx] });
  });
  app.post("/api/schedules/run-due", async (req, res) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: "C\u1EA7n x\xE1c th\u1EF1c GitHub \u0111\u1EC3 th\u1EF1c thi l\u1ECBch \u0111\u0103ng/xo\xE1 b\xE0i."
      });
      return;
    }
    const owner = req.body?.owner ? String(req.body.owner) : void 0;
    const repo = req.body?.repo ? String(req.body.repo) : void 0;
    const result = await processDueSchedules(token, owner, repo);
    res.json({ ok: true, ...result });
  });
  app.post("/api/schedules/:id/run", async (req, res) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: "C\u1EA7n x\xE1c th\u1EF1c GitHub \u0111\u1EC3 th\u1EF1c thi ngay t\xE1c v\u1EE5 n\xE0y."
      });
      return;
    }
    const { id } = req.params;
    const tasks = loadSchedulesFromDisk();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y t\xE1c v\u1EE5 c\u1EA7n ch\u1EA1y." });
      return;
    }
    const { updated, spawnedDelete } = await runSingleScheduleTask(tasks[idx], token);
    tasks[idx] = updated;
    const nextTasks = spawnedDelete ? [spawnedDelete, ...tasks] : tasks;
    saveSchedulesToDisk(nextTasks);
    if (updated.status === "failed") {
      res.status(400).json({ error: updated.error || "Th\u1EF1c thi t\xE1c v\u1EE5 th\u1EA5t b\u1EA1i.", task: updated });
      return;
    }
    res.json({ ok: true, task: updated, spawnedDelete });
  });
  app.delete("/api/schedules/:id", (req, res) => {
    const { id } = req.params;
    const tasks = loadSchedulesFromDisk();
    const next = tasks.filter((t) => t.id !== id);
    saveSchedulesToDisk(next);
    res.json({ ok: true });
  });
  app.get("/api/schedules/github-workflow-status", async (req, res) => {
    const owner = String(req.query.owner || DEFAULT_OWNER);
    const repo = String(req.query.repo || DEFAULT_REPO);
    const branch = String(req.query.branch || "main");
    const token = getSessionToken(req);
    try {
      const wfResp = await githubRequest(
        `/repos/${owner}/${repo}/contents/.github/workflows/blogvn-scheduler.yml?ref=${encodeURIComponent(
          branch
        )}`,
        {},
        token
      );
      res.json({ installed: wfResp.ok });
    } catch {
      res.json({ installed: false });
    }
  });
  app.post("/api/schedules/sync-github-workflow", async (req, res) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: "C\u1EA7n x\xE1c th\u1EF1c GitHub \u0111\u1EC3 c\xE0i \u0111\u1EB7t Workflow t\u1EF1 \u0111\u1ED9ng l\xEAn repository."
      });
      return;
    }
    const { owner = DEFAULT_OWNER, repo = DEFAULT_REPO, branch = "main" } = req.body || {};
    try {
      const pendingRepoTasks = loadSchedulesFromDisk().filter(
        (t) => t.status === "pending" && t.owner.toLowerCase() === String(owner).toLowerCase() && t.repo.toLowerCase() === String(repo).toLowerCase()
      ).map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        filePath: t.filePath,
        title: t.title,
        scheduledAt: t.scheduledAt,
        autoDeleteAt: t.autoDeleteAt,
        ...t.type === "publish" && t.postPayload ? { rawContent: buildSerializedPayload({ ...t.postPayload, draft: false }) } : {}
      }));
      const result = await commitMultipleFilesAtomic({
        owner,
        repo,
        branch,
        files: [
          {
            path: ".github/workflows/blogvn-scheduler.yml",
            content: buildGitHubSchedulerWorkflowYaml(),
            isBase64: false
          },
          {
            path: ".blogvn/schedules.json",
            content: JSON.stringify(pendingRepoTasks, null, 2) + "\n",
            isBase64: false
          }
        ],
        message: `\u0110\u1EA1o K\xFD: Sync ${pendingRepoTasks.length} scheduled jobs & 24/7 GitHub Actions workflow`,
        token
      });
      if (!result.ok) {
        res.status(result.status || 400).json({
          error: result.error || "Kh\xF4ng th\u1EC3 c\xE0i \u0111\u1EB7t GitHub Actions Scheduler."
        });
        return;
      }
      res.json({
        ok: true,
        syncedCount: pendingRepoTasks.length,
        commit: {
          sha: result.commitSha,
          htmlUrl: result.commitHtmlUrl
        }
      });
    } catch (error) {
      console.error("Sync workflow error:", error);
      res.status(500).json({ error: "L\u1ED7i m\xE1y ch\u1EE7 khi \u0111\u1ED3ng b\u1ED9 GitHub Actions Scheduler." });
    }
  });
  app.get("/api/site-config", (req, res) => {
    const owner = String(req.query.owner || DEFAULT_OWNER);
    const repo = String(req.query.repo || DEFAULT_REPO);
    const all = loadSiteConfigsFromDisk();
    res.json({ config: all[repoConfigKey(owner, repo)] || null });
  });
  app.put("/api/site-config", async (req, res) => {
    const {
      owner = DEFAULT_OWNER,
      repo = DEFAULT_REPO,
      branch = "main",
      config: incomingCfg = {},
      syncToGitHub = false,
      publishWebApp = false,
      posts = []
    } = req.body || {};
    const cleanCfg = {
      siteTitle: String(incomingCfg.siteTitle || "").trim() || void 0,
      tagline: String(incomingCfg.tagline || "").trim() || void 0,
      siteIcon: incomingCfg.siteIcon ? String(incomingCfg.siteIcon).trim() : void 0,
      headerTitle: String(incomingCfg.headerTitle || "").trim() || void 0,
      headerNavLinks: Array.isArray(incomingCfg.headerNavLinks) ? incomingCfg.headerNavLinks.filter((l) => l?.label && l?.url).map((l) => ({ label: String(l.label).trim(), url: String(l.url).trim() })) : [],
      footerText: String(incomingCfg.footerText || "").trim() || void 0,
      footerLinks: Array.isArray(incomingCfg.footerLinks) ? incomingCfg.footerLinks.filter((l) => l?.label && l?.url).map((l) => ({ label: String(l.label).trim(), url: String(l.url).trim() })) : [],
      authorName: String(incomingCfg.authorName || "").trim() || void 0,
      authorBio: String(incomingCfg.authorBio || "").trim() || void 0,
      authorAvatar: incomingCfg.authorAvatar ? String(incomingCfg.authorAvatar).trim() : void 0,
      themeMode: incomingCfg.themeMode === "dark" ? "dark" : "light",
      astroTemplate: incomingCfg.astroTemplate ? normalizeAstroTemplateId(
        String(incomingCfg.astroTemplate),
        incomingCfg.themeMode === "dark" ? "dark" : "light"
      ) : void 0,
      liveChat: incomingCfg.liveChat && typeof incomingCfg.liveChat === "object" ? {
        enabled: Boolean(incomingCfg.liveChat.enabled),
        title: incomingCfg.liveChat.title ? String(incomingCfg.liveChat.title).trim() : void 0,
        welcomeText: incomingCfg.liveChat.welcomeText ? String(incomingCfg.liveChat.welcomeText).trim() : void 0,
        channels: Array.isArray(incomingCfg.liveChat.channels) ? incomingCfg.liveChat.channels.map((ch) => ({
          id: ch.id,
          enabled: Boolean(ch.enabled),
          value: String(ch.value || "").trim(),
          label: ch.label ? String(ch.label).trim() : void 0
        })) : []
      } : void 0
    };
    const all = loadSiteConfigsFromDisk();
    all[repoConfigKey(owner, repo)] = cleanCfg;
    saveSiteConfigsToDisk(all);
    if (!syncToGitHub && !publishWebApp) {
      res.json({ ok: true, config: cleanCfg });
      return;
    }
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: "C\u1EA7n x\xE1c th\u1EF1c GitHub \u0111\u1EC3 \u0111\u1EA9y c\u1EA5u h\xECnh l\xEAn repository.",
        config: cleanCfg
      });
      return;
    }
    try {
      const filesToCommit = publishWebApp ? buildStandaloneWebAppFiles({
        owner,
        repo,
        siteConfig: cleanCfg,
        posts: Array.isArray(posts) ? posts : []
      }) : [
        {
          path: ".blogvn/site-config.json",
          content: JSON.stringify(cleanCfg, null, 2) + "\n",
          isBase64: false
        }
      ];
      if (!publishWebApp) {
        const astroCfgCheck = await githubRequest(
          `/repos/${owner}/${repo}/contents/src/cau_hinh/trang_web.ts?ref=${encodeURIComponent(branch)}`,
          {},
          token
        );
        if (astroCfgCheck.ok) {
          const defaultPngB64 = isBundledDefaultSiteIcon(cleanCfg.siteIcon) ? readDefaultDaoKyPngBase64() : void 0;
          filesToCommit.push({
            path: "src/cau_hinh/trang_web.ts",
            content: buildAstroSiteConfigModule({
              owner,
              repo,
              config: cleanCfg,
              hasBundledPngFavicon: Boolean(cleanCfg.siteIcon?.startsWith("data:image/") || defaultPngB64)
            }),
            isBase64: false
          });
          if (cleanCfg.siteIcon?.startsWith("data:image/")) {
            filesToCommit.push({
              path: "public/favicon.png",
              content: cleanCfg.siteIcon.replace(/^data:[^;]+;base64,/, ""),
              isBase64: true
            });
          } else if (defaultPngB64) {
            filesToCommit.push({
              path: "public/favicon.png",
              content: defaultPngB64,
              isBase64: true
            });
          }
        }
      }
      const commitRes = await commitMultipleFilesAtomic({
        owner,
        repo,
        branch,
        files: filesToCommit,
        message: publishWebApp ? `\u0110\u1EA1o K\xFD: Xu\u1EA5t b\u1EA3n Web App GitHub Pages & c\u1EA5u h\xECnh nh\u1EADn d\u1EA1ng (${cleanCfg.siteTitle || repo})` : `\u0110\u1EA1o K\xFD: C\u1EADp nh\u1EADt c\u1EA5u h\xECnh nh\u1EADn d\u1EA1ng web (${cleanCfg.siteTitle || repo})`,
        token
      });
      if (!commitRes.ok) {
        res.status(commitRes.status || 400).json({
          error: commitRes.error || "Kh\xF4ng th\u1EC3 \u0111\u1EA9y c\u1EA5u h\xECnh l\xEAn GitHub.",
          config: cleanCfg
        });
        return;
      }
      res.json({
        ok: true,
        config: cleanCfg,
        commit: {
          sha: commitRes.commitSha,
          htmlUrl: commitRes.commitHtmlUrl
        }
      });
    } catch (error) {
      console.error("Save site config error:", error);
      res.status(500).json({ error: "L\u1ED7i m\xE1y ch\u1EE7 khi \u0111\u1EA9y c\u1EA5u h\xECnh web l\xEAn GitHub." });
    }
  });
  app.post("/api/github/deploy-astro-template", async (req, res) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: "Vui l\xF2ng k\u1EBFt n\u1ED1i GitHub tr\u01B0\u1EDBc khi tri\u1EC3n khai template Astro."
      });
      return;
    }
    const {
      owner = DEFAULT_OWNER,
      repo = DEFAULT_REPO,
      branch,
      config = {},
      templateId,
      preservePosts = false
    } = req.body || {};
    try {
      let targetBranch = branch ? String(branch) : "";
      if (!targetBranch) {
        const repoResp = await githubRequest(`/repos/${owner}/${repo}`, {}, token);
        targetBranch = repoResp.ok && repoResp.data?.default_branch ? repoResp.data.default_branch : "main";
      }
      const preservedTreeEntries = [];
      let preservedPostsCount = 0;
      if (preservePosts === true) {
        const existingTreeResp = await githubRequest(
          `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`,
          {},
          token
        );
        if (existingTreeResp.ok && Array.isArray(existingTreeResp.data?.tree)) {
          const blobs = existingTreeResp.data.tree.filter((i) => i.type === "blob" && i.path && i.sha);
          for (const blob of blobs) {
            const p = String(blob.path);
            const isPost = p.startsWith("src/content/bai_viet/") && (p.endsWith(".md") || p.endsWith(".mdx") || p.endsWith(".markdown"));
            const isAsset = p.startsWith("public/tainguyen/hinhanh/uploads/") || p.startsWith("public/images/");
            const isBlogvnMeta = p.startsWith(".blogvn/") && p !== ".blogvn/site-config.json";
            if (isPost || isAsset || isBlogvnMeta) {
              preservedTreeEntries.push({ path: p, sha: blob.sha, mode: blob.mode || "100644" });
              if (isPost) preservedPostsCount++;
            }
          }
        }
      }
      const defaultFaviconPngBase64 = isBundledDefaultSiteIcon(config?.siteIcon) ? readDefaultDaoKyPngBase64() : void 0;
      const files = buildVietnameseAstroTemplateFiles({
        owner,
        repo,
        config,
        templateId: templateId || config?.astroTemplate,
        includeStarterPosts: preservePosts !== true || preservedPostsCount === 0,
        defaultFaviconPngBase64
      });
      const commitRes = await commitMultipleFilesAtomic({
        owner,
        repo,
        branch: targetBranch,
        files,
        message: preservePosts === true && preservedPostsCount > 0 ? `\u0110\u1EA1o K\xFD: C\u1EADp nh\u1EADt giao di\u1EC7n Astro 5 (gi\u1EEF nguy\xEAn ${preservedPostsCount} b\xE0i vi\u1EBFt) (${config.siteTitle || repo})` : `\u0110\u1EA1o K\xFD: Tri\u1EC3n khai Template Astro \u0110\u1EA1o K\xFD s\u1EA1ch & nh\u1EADn d\u1EA1ng web (${config.siteTitle || repo})`,
        token,
        replaceAllFiles: true,
        preservedTreeEntries
      });
      if (!commitRes.ok) {
        const rawErr = commitRes.error || "";
        const friendlyErr = rawErr.toLowerCase().includes("workflow") ? 'Token GitHub ch\u01B0a c\xF3 quy\u1EC1n "workflow" \u0111\u1EC3 t\u1EA1o file GitHub Actions (.github/workflows/deploy-astro.yml). H\xE3y c\u1EA5p l\u1EA1i token v\u1EDBi quy\u1EC1n repo + workflow.' : rawErr || "Kh\xF4ng th\u1EC3 \u0111\u1EA9y template Astro l\xEAn GitHub.";
        res.status(commitRes.status || 400).json({ error: friendlyErr });
        return;
      }
      const pagesGet = await githubRequest(`/repos/${owner}/${repo}/pages`, {}, token);
      if (pagesGet.ok) {
        if (pagesGet.data?.build_type !== "workflow") {
          await githubRequest(
            `/repos/${owner}/${repo}/pages`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ build_type: "workflow" })
            },
            token
          );
        }
      } else {
        await githubRequest(
          `/repos/${owner}/${repo}/pages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ build_type: "workflow" })
          },
          token
        );
      }
      const isUserSite = String(repo).toLowerCase() === `${String(owner).toLowerCase()}.github.io`;
      const pagesUrl = config.pagesUrl || (isUserSite ? `https://${repo}` : `https://${owner}.github.io/${repo}`);
      res.json({
        ok: true,
        pagesUrl,
        preservedCount: preservedPostsCount,
        actionsUrl: `https://github.com/${owner}/${repo}/actions`,
        commit: {
          sha: commitRes.commitSha,
          htmlUrl: commitRes.commitHtmlUrl
        }
      });
    } catch (error) {
      console.error("Deploy Astro template error:", error);
      res.status(500).json({ error: "L\u1ED7i m\xE1y ch\u1EE7 khi tri\u1EC3n khai template Astro Vi\u1EC7t." });
    }
  });
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain").send(generateRobotsTxt(getBaseAppUrl(req)));
  });
  app.get("/sitemap.xml", (req, res) => {
    const base = getBaseAppUrl(req);
    const xml = generateSitemapXml({
      config: {
        siteTitle: "\u0110\u1EA1o K\xFD",
        tagline: "Kh\xF4ng gian vi\u1EBFt Blog & Qu\u1EA3n l\xFD Markdown chuy\xEAn s\xE2u",
        authorName: "\u0110\u1EA1o K\xFD",
        authorBio: "",
        githubOwner: DEFAULT_OWNER,
        githubRepo: DEFAULT_REPO,
        pagesUrl: base,
        themeMode: "light",
        postsDirectory: "_posts"
      },
      posts: [],
      framework: "static"
    });
    res.type("application/xml").send(xml);
  });
  app.get("/rss.xml", (req, res) => {
    const base = getBaseAppUrl(req);
    const xml = generateRssXml({
      config: {
        siteTitle: "\u0110\u1EA1o K\xFD \u2014 Kh\xF4ng gian vi\u1EBFt Blog & Qu\u1EA3n l\xFD Markdown",
        tagline: "Kh\u1EDFi t\u1EA1o blog GitHub Pages trong 1 ch\u1EA1m, bi\xEAn so\u1EA1n Markdown, n\xE9n t\u1EA3i \u1EA3nh h\xE0ng lo\u1EA1t v\xE0 xu\u1EA5t b\u1EA3n tr\u1EF1c ti\u1EBFp.",
        authorName: "\u0110\u1EA1o K\xFD",
        authorBio: "",
        githubOwner: DEFAULT_OWNER,
        githubRepo: DEFAULT_REPO,
        pagesUrl: base,
        themeMode: "light",
        postsDirectory: "_posts"
      },
      posts: [],
      framework: "static"
    });
    res.type("application/rss+xml").send(xml);
  });
  app.post("/api/social/publish", async (req, res) => {
    const { platform, credentials = {}, payload = {} } = req.body || {};
    const title = String(payload.title || "").trim();
    const excerpt = String(payload.excerpt || "").trim();
    const caption = String(payload.caption || title).trim();
    const url = String(payload.url || "").trim();
    if (!platform || !url) {
      res.status(400).json({ ok: false, message: "Thi\u1EBFu th\xF4ng tin n\u1EC1n t\u1EA3ng ho\u1EB7c URL b\xE0i vi\u1EBFt." });
      return;
    }
    try {
      if (platform === "x") {
        const accessToken = String(credentials.accessToken || "").trim();
        if (!accessToken) {
          res.status(400).json({ ok: false, message: "Thi\u1EBFu X OAuth 2.0 User Access Token." });
          return;
        }
        const rawText = caption.includes(url) ? caption : `${caption}
${url}`;
        const tweetText = rawText.length > 275 ? `${rawText.slice(0, 240).trim()}\u2026
${url}` : rawText;
        const apiRes = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ text: tweetText })
        });
        const json = await apiRes.json().catch(() => ({}));
        if (!apiRes.ok || !json?.data?.id) {
          res.status(apiRes.status || 400).json({
            ok: false,
            message: json?.detail || json?.title || "Kh\xF4ng th\u1EC3 \u0111\u0103ng l\xEAn X API v2."
          });
          return;
        }
        res.json({
          ok: true,
          message: "\u0110\xE3 \u0111\u0103ng b\xE0i l\xEAn X (Twitter) qua X API v2.",
          postUrl: `https://x.com/i/web/status/${json.data.id}`
        });
        return;
      }
      if (platform === "linkedin") {
        const accessToken = String(credentials.accessToken || "").trim();
        const authorUrn = String(credentials.authorUrn || "").trim();
        if (!accessToken || !authorUrn) {
          res.status(400).json({ ok: false, message: "Thi\u1EBFu LinkedIn Access Token ho\u1EB7c Author URN." });
          return;
        }
        const commentary = caption.includes(url) ? caption : `${caption}

${url}`;
        const apiRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0"
          },
          body: JSON.stringify({
            author: authorUrn,
            lifecycleState: "PUBLISHED",
            specificContent: {
              "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: commentary },
                shareMediaCategory: "ARTICLE",
                media: [
                  {
                    status: "READY",
                    originalUrl: url,
                    title: { text: title || "B\xE0i vi\u1EBFt m\u1EDBi" },
                    description: { text: excerpt || caption.slice(0, 180) }
                  }
                ]
              }
            },
            visibility: {
              "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
          })
        });
        const json = await apiRes.json().catch(() => ({}));
        if (!apiRes.ok) {
          res.status(apiRes.status || 400).json({
            ok: false,
            message: json?.message || "Kh\xF4ng th\u1EC3 chia s\u1EBB qua LinkedIn UGC API."
          });
          return;
        }
        const postId = json?.id || apiRes.headers.get("x-restli-id") || "";
        res.json({
          ok: true,
          message: "\u0110\xE3 \u0111\u0103ng b\xE0i l\xEAn LinkedIn qua REST API.",
          postUrl: postId ? `https://www.linkedin.com/feed/update/${postId}` : void 0
        });
        return;
      }
      res.status(400).json({ ok: false, message: `N\u1EC1n t\u1EA3ng "${platform}" h\u1ED7 tr\u1EE3 g\u1ECDi tr\u1EF1c ti\u1EBFp t\u1EEB tr\xECnh duy\u1EC7t.` });
    } catch (err) {
      console.error("Social publish proxy error:", err);
      res.status(500).json({ ok: false, message: err?.message || "L\u1ED7i k\u1EBFt n\u1ED1i API m\u1EA1ng x\xE3 h\u1ED9i." });
    }
  });
  const httpServer = http.createServer(app);
  if (process.env.NODE_ENV !== "production") {
    const disableHmr = process.env.DISABLE_HMR === "true";
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
        ...disableHmr ? { ws: false } : {}
      },
      appType: "spa"
    });
    if (disableHmr) {
      app.get("/@vite/client", async (_req, res, next) => {
        try {
          const transformed = await vite.transformRequest("/@vite/client");
          if (!transformed?.code) return next();
          const safeCode = transformed.code.replace("await wsTransport.connect(handlers);", "return;").replace("await wsTransport.disconnect();", "return;").replace("wsTransport.send(data);", "return;");
          res.setHeader("Content-Type", "application/javascript");
          res.send(safeCode);
        } catch {
          next();
        }
      });
    }
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  setInterval(() => {
    const serverToken = process.env.GITHUB_TOKEN;
    if (serverToken) {
      processDueSchedules(serverToken).catch((err) => {
        console.error("Background schedule ticker error:", err);
      });
    }
  }, 2e4);
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Huyen Khong Studio listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
