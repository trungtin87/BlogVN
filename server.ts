import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import dotenv from 'dotenv';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AuthStatus,
  BlogCollection,
  BlogConfig,
  BlogPost,
  BuildStatusInfo,
  EngagementEvent,
  FrameworkId,
  FrontmatterSchemaHint,
  GitHubRepoInfo,
  GitHubUser,
  MediaAssetItem,
  RepoInsightsData,
  RepoStructureInfo,
  ScheduledPostPayload,
  ScheduledTask,
  SiteEssentialFileStatus,
  SiteEssentialsReport,
} from './src/types/blog.ts';
import {
  generateRobotsTxt,
  generateRssXml,
  generateSitemapXml,
} from './src/utils/siteGenerators.ts';
import {
  buildAstroBaseLayoutModule,
  buildAstroManifestJson,
  buildAstroOgDefaultSvg,
  buildAstroSiteConfigModule,
  buildVietnameseAstroTemplateFiles,
  normalizeAstroTemplateId,
} from './src/utils/astroTemplate.ts';
import { resolveBlogTheme, sanitizeThemeCustomColors } from './src/data/themes.ts';

dotenv.config();

const PORT = 3000;
const DEFAULT_OWNER = process.env.GITHUB_OWNER || '';
const DEFAULT_REPO = process.env.GITHUB_REPO || '';

interface SessionRecord {
  accessToken: string;
  user: GitHubUser;
  createdAt: number;
}

const sessions = new Map<string, SessionRecord>();
const SESSION_KEY = crypto
  .createHash('sha256')
  .update(
    process.env.SESSION_SECRET ||
      process.env.GITHUB_CLIENT_SECRET ||
      process.env.GITHUB_TOKEN ||
      'dao-ky-studio-local-secret'
  )
  .digest();

function sealSession(record: SessionRecord): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SESSION_KEY, iv);
  const payload = JSON.stringify({
    accessToken: record.accessToken,
    user: {
      login: record.user.login,
      name: record.user.name,
      avatar_url: record.user.avatar_url,
      html_url: record.user.html_url,
      bio: record.user.bio,
    },
    createdAt: record.createdAt,
  });
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function unsealSession(tokenStr?: string): SessionRecord | null {
  if (!tokenStr) return null;
  try {
    const parts = tokenStr.split('.');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'base64url');
    const tag = Buffer.from(parts[1], 'base64url');
    const data = Buffer.from(parts[2], 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', SESSION_KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    const parsed = JSON.parse(decrypted);
    if (parsed?.accessToken && parsed?.user?.login) {
      return parsed as SessionRecord;
    }
  } catch {
    // ignore tampered/stale cookies
  }
  return null;
}

function getSessionRecord(req: Request): SessionRecord | null {
  const sid = req.cookies?.gh_session;
  if (sid && sessions.has(sid)) {
    return sessions.get(sid)!;
  }
  const sealed = req.cookies?.gh_session_data;
  const restored = unsealSession(sealed);
  if (restored && sid) {
    sessions.set(sid, restored);
  }
  return restored;
}

function getSessionToken(req: Request): string | null {
  const session = getSessionRecord(req);
  if (session) {
    return session.accessToken;
  }
  return process.env.GITHUB_TOKEN || null;
}

async function githubRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'DaoKy-Blog-Studio',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let parsed: any = null;
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
      error: parsed?.message || `GitHub API error (${response.status})`,
    };
  }

  return { ok: true, status: response.status, data: parsed };
}

function slugify(input: string): string {
  return (
    input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled-post'
  );
}

function detectCollectionFromPath(filePath: string): BlogCollection {
  const lower = filePath.toLowerCase();
  if (lower.startsWith('src/content/du_an/')) return 'du_an';
  if (lower.startsWith('src/content/sach/')) return 'sach';
  if (lower.startsWith('src/content/cua_hang/')) return 'cua_hang';
  return 'bai_viet';
}

function resolveCoverUrl(rawCover: unknown, owner: string, repo: string): string | undefined {
  if (!rawCover) return undefined;
  const val = String(rawCover).trim();
  if (!val) return undefined;
  if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:')) {
    return val;
  }
  if (val.startsWith('/')) {
    const pagesBase = repo.endsWith('.github.io')
      ? `https://${repo}`
      : `https://${owner}.github.io/${repo}`;
    return `${pagesBase}${val}`;
  }
  return val;
}

function normalizeFrontmatterDate(raw: unknown, fallbackFileName: string): string {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (raw) {
    const str = String(raw).trim();
    const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const jekyllDateMatch = fallbackFileName.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  return jekyllDateMatch?.[1] || new Date().toISOString().slice(0, 10);
}

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === 'string') {
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function parseMarkdownFile(
  rawContent: string,
  filePath: string,
  sha: string,
  owner: string,
  repo: string,
  htmlUrl?: string
): BlogPost {
  let frontmatter: Record<string, any> = {};
  let markdownBody = rawContent;

  if (rawContent.startsWith('---')) {
    const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (match) {
      try {
        const parsed = loadYaml(match[1]);
        if (parsed && typeof parsed === 'object') {
          frontmatter = parsed as Record<string, any>;
        }
        markdownBody = match[2] || '';
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
  const title = rawTitle
    ? String(rawTitle)
    : headingMatch?.[1]?.trim() || fileName.replace(/-/g, ' ');

  const rawSlug = frontmatter.slug
    ? String(frontmatter.slug)
    : jekyllDateMatch?.[2] || slugify(fileName || title);

  const plainText = markdownBody
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#>*`!\[\]\(\)]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawExcerpt =
    frontmatter.mo_ta ??
    frontmatter.mo_ta_ngan ??
    frontmatter.excerpt ??
    frontmatter.description ??
    frontmatter.summary;
  const excerpt = rawExcerpt
    ? String(rawExcerpt)
    : plainText.slice(0, 160) + (plainText.length > 160 ? '...' : '');

  const tags =
    collection === 'du_an'
      ? toStringArray(frontmatter.cong_nghe)
      : collection === 'sach'
      ? toStringArray(frontmatter.the_loai)
      : collection === 'cua_hang'
      ? toStringArray(frontmatter.danh_muc)
      : toStringArray(frontmatter.tags);

  const rawCategory =
    collection === 'du_an'
      ? 'Dự án'
      : collection === 'sach'
      ? 'Sách'
      : collection === 'cua_hang'
      ? 'Cửa hàng'
      : frontmatter.danh_muc ?? frontmatter.category;

  const category = rawCategory
    ? String(rawCategory)
    : Array.isArray(frontmatter.categories) && frontmatter.categories.length > 0
    ? String(frontmatter.categories[0])
    : 'Bài viết';

  const rawCover =
    frontmatter.anh_bia ??
    frontmatter.anh_dai_dien ??
    frontmatter.anh_san_pham ??
    frontmatter.heroImage ??
    frontmatter.featured_image ??
    frontmatter.cover ??
    frontmatter.image;
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
    source: 'github',
    rawFrontmatter: frontmatter,
    seoTitle: frontmatter.seo_title
      ? String(frontmatter.seo_title)
      : frontmatter.seoTitle
      ? String(frontmatter.seoTitle)
      : undefined,
    seoDescription: frontmatter.seo_description
      ? String(frontmatter.seo_description)
      : frontmatter.seoDescription
      ? String(frontmatter.seoDescription)
      : undefined,
    canonicalUrl: frontmatter.canonical_url
      ? String(frontmatter.canonical_url)
      : frontmatter.canonical
      ? String(frontmatter.canonical)
      : undefined,
    noindex: frontmatter.noindex !== undefined ? Boolean(frontmatter.noindex) : undefined,
    authorName: frontmatter.tac_gia
      ? String(frontmatter.tac_gia)
      : frontmatter.author
      ? String(frontmatter.author)
      : undefined,
    price: frontmatter.gia !== undefined ? String(frontmatter.gia) : undefined,
    originalPrice: frontmatter.gia_goc !== undefined ? String(frontmatter.gia_goc) : undefined,
    inStock: frontmatter.con_hang !== undefined ? Boolean(frontmatter.con_hang) : undefined,
    linkDemo: frontmatter.link_demo ? String(frontmatter.link_demo) : undefined,
    linkGithub: frontmatter.link_github ? String(frontmatter.link_github) : undefined,
    linkBuy: frontmatter.link_mua ? String(frontmatter.link_mua) : undefined,
    formats: frontmatter.dinh_dang ? toStringArray(frontmatter.dinh_dang) : undefined,
    publishYear:
      frontmatter.nam_xuat_ban !== undefined ? Number(frontmatter.nam_xuat_ban) : undefined,
    featured: frontmatter.noi_bat !== undefined ? Boolean(frontmatter.noi_bat) : undefined,
  };
}

function defaultFrontmatterSchema(framework: FrameworkId): FrontmatterSchemaHint {
  if (framework === 'astro-vn') {
    return {
      titleKey: 'tieu_de',
      dateKey: 'ngay',
      excerptKey: 'mo_ta',
      coverKey: 'anh_bia',
      draftKey: 'nhap',
      categoryKey: 'danh_muc',
      usesDateInFilename: false,
    };
  }
  if (framework === 'astro') {
    return {
      titleKey: 'title',
      dateKey: 'pubDate',
      excerptKey: 'description',
      coverKey: 'heroImage',
      draftKey: 'draft',
      categoryKey: 'category',
      usesDateInFilename: false,
    };
  }
  if (framework === 'hugo') {
    return {
      titleKey: 'title',
      dateKey: 'date',
      excerptKey: 'summary',
      coverKey: 'image',
      draftKey: 'draft',
      categoryKey: 'categories',
      usesDateInFilename: false,
    };
  }
  if (framework === 'jekyll') {
    return {
      titleKey: 'title',
      dateKey: 'date',
      excerptKey: 'excerpt',
      coverKey: 'image',
      draftKey: 'draft',
      categoryKey: 'categories',
      usesDateInFilename: true,
    };
  }
  return {
    titleKey: 'title',
    dateKey: 'date',
    excerptKey: 'description',
    coverKey: 'cover',
    draftKey: 'draft',
    categoryKey: 'categories',
    usesDateInFilename: false,
  };
}

function inferFrontmatterSchema(
  framework: FrameworkId,
  posts: BlogPost[]
): FrontmatterSchemaHint {
  const base = defaultFrontmatterSchema(framework);
  const fms = posts.map((p) => p.rawFrontmatter).filter((f): f is Record<string, any> => Boolean(f));
  if (fms.length === 0) return base;

  const hasKey = (k: string) => fms.some((f) => Object.prototype.hasOwnProperty.call(f, k));

  const titleKey: FrontmatterSchemaHint['titleKey'] = hasKey('tieu_de') ? 'tieu_de' : 'title';
  const dateKey: FrontmatterSchemaHint['dateKey'] = hasKey('ngay')
    ? 'ngay'
    : hasKey('pubDate')
    ? 'pubDate'
    : 'date';
  const excerptKey: FrontmatterSchemaHint['excerptKey'] = hasKey('mo_ta')
    ? 'mo_ta'
    : hasKey('description')
    ? 'description'
    : hasKey('summary')
    ? 'summary'
    : hasKey('excerpt')
    ? 'excerpt'
    : base.excerptKey;
  const coverKey: FrontmatterSchemaHint['coverKey'] = hasKey('anh_bia')
    ? 'anh_bia'
    : hasKey('heroImage')
    ? 'heroImage'
    : hasKey('image')
    ? 'image'
    : hasKey('cover')
    ? 'cover'
    : base.coverKey;
  const draftKey: FrontmatterSchemaHint['draftKey'] = hasKey('nhap') ? 'nhap' : 'draft';
  const categoryKey: FrontmatterSchemaHint['categoryKey'] = hasKey('danh_muc')
    ? 'danh_muc'
    : hasKey('categories')
    ? 'categories'
    : hasKey('category')
    ? 'category'
    : base.categoryKey;

  return {
    titleKey,
    dateKey,
    excerptKey,
    coverKey,
    draftKey,
    categoryKey,
    usesDateInFilename: framework === 'jekyll',
  };
}

function serializePostMarkdown(
  input: {
    collection: BlogCollection;
    title: string;
    date: string;
    slug: string;
    category: string;
    tags: string[];
    excerpt: string;
    cover?: string;
    draft: boolean;
    markdownBody: string;
    authorName?: string;
    price?: string;
    originalPrice?: string;
    inStock?: boolean;
    linkDemo?: string;
    linkGithub?: string;
    linkBuy?: string;
    formats?: string[];
    publishYear?: number;
    featured?: boolean;
    seoTitle?: string;
    seoDescription?: string;
    canonicalUrl?: string;
    noindex?: boolean;
  },
  options: {
    framework: FrameworkId;
    schema?: FrontmatterSchemaHint;
    existingFrontmatter?: Record<string, any>;
    isAstroVnPath: boolean;
  }
): string {
  const { framework, existingFrontmatter, isAstroVnPath } = options;
  const schema = options.schema || defaultFrontmatterSchema(framework);
  const safeDesc = input.excerpt || input.title;

  // 1. Huyền Không / Vietnamese Astro collections schema
  if (isAstroVnPath) {
    let fm: Record<string, any>;
    const safeCover = input.cover || '/tainguyen/hinhanh/og-default.svg';

    if (input.collection === 'du_an') {
      fm = {
        ...(existingFrontmatter || {}),
        tieu_de: input.title,
        mo_ta_ngan: safeDesc,
        anh_dai_dien: safeCover,
        cong_nghe: input.tags,
        link_demo: input.linkDemo || '',
        link_github: input.linkGithub || '',
        slug: input.slug,
      };
    } else if (input.collection === 'sach') {
      fm = {
        ...(existingFrontmatter || {}),
        tieu_de: input.title,
        tac_gia: input.authorName || 'Bùi Trung Tín',
        mo_ta_ngan: safeDesc,
        anh_bia: safeCover,
        the_loai: input.tags,
        ...(input.publishYear ? { nam_xuat_ban: Number(input.publishYear) } : {}),
        dinh_dang: input.formats && input.formats.length > 0 ? input.formats : ['PDF', 'EPUB'],
        gia: input.price || 'Miễn phí',
        link_mua: input.linkBuy || '#',
        noi_bat: Boolean(input.featured),
      };
    } else if (input.collection === 'cua_hang') {
      fm = {
        ...(existingFrontmatter || {}),
        ten_san_pham: input.title,
        mo_ta_ngan: safeDesc,
        anh_san_pham: safeCover,
        danh_muc: input.tags.length > 0 ? input.tags : [input.category || 'Sản phẩm số'],
        gia: input.price || '99.000₫',
        gia_goc: input.originalPrice || '',
        con_hang: input.inStock !== false,
        link_mua: input.linkBuy || '#',
      };
    } else {
      fm = {
        ...(existingFrontmatter || {}),
        tieu_de: input.title,
        danh_muc: input.category || 'Kỹ thuật',
        chuyen_muc: slugify(input.category || 'ky-thuat'),
        slug: input.slug,
        tags: input.tags,
        mo_ta: safeDesc,
        ngay: input.date,
        anh_bia: safeCover,
        nhap: Boolean(input.draft),
      };
    }
    if (input.seoTitle?.trim()) fm.seo_title = input.seoTitle.trim();
    if (input.seoDescription?.trim()) fm.seo_description = input.seoDescription.trim();
    if (input.canonicalUrl?.trim()) fm.canonical_url = input.canonicalUrl.trim();
    if (input.noindex) fm.noindex = true;
    return `---\n${dumpYaml(fm, { lineWidth: -1 }).trim()}\n---\n\n${input.markdownBody.trim()}\n`;
  }

  // 2. Auto-adapted frontmatter for Standard Astro, Jekyll, Hugo, Hexo, or Static Markdown
  const fm: Record<string, any> = {
    ...(existingFrontmatter || {}),
  };

  if (framework === 'jekyll' && !fm.layout) {
    fm.layout = 'post';
  }

  fm[schema.titleKey] = input.title;
  fm[schema.dateKey] = input.date;

  if (schema.categoryKey === 'categories') {
    fm.categories = [input.category || 'Ghi chép'];
  } else {
    fm[schema.categoryKey] = input.category || 'Ghi chép';
  }

  fm.tags = input.tags;
  fm[schema.excerptKey] = safeDesc;

  if (framework === 'astro' || framework === 'hugo' || existingFrontmatter?.[schema.draftKey] !== undefined || input.draft) {
    fm[schema.draftKey] = Boolean(input.draft);
  }

  if (framework !== 'jekyll' && framework !== 'hugo') {
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

  return `---\n${dumpYaml(fm, { lineWidth: -1 }).trim()}\n---\n\n${input.markdownBody.trim()}\n`;
}

function parseAstroTrangWebTs(source: string): Partial<BlogConfig> {
  const extract = (key: string): string | undefined => {
    const regex = new RegExp(`${key}:\\s*["'\`]([^"'\`]+)["'\`]`, 'm');
    const match = source.match(regex);
    return match?.[1]?.trim();
  };
  const extractMultiline = (key: string): string | undefined => {
    const regex = new RegExp(`${key}:\\s*\\n?\\s*["'\`]([^"'\`]+)["'\`]`, 'm');
    const match = source.match(regex);
    return match?.[1]?.trim();
  };

  return {
    siteTitle: extract('ten_trangweb'),
    tagline: extractMultiline('mo_ta') || extract('khau_hieu'),
    authorName: extract('tac_gia'),
  };
}

function getBaseAppUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

async function upsertRepoFile(params: {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  content: string;
  message: string;
  token: string;
  sha?: string;
}) {
  let currentSha = params.sha;
  if (!currentSha) {
    const existing = await githubRequest<any>(
      `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.filePath).replace(/%2F/g, '/')}?ref=${encodeURIComponent(params.branch)}`,
      {},
      params.token
    );
    if (existing.ok && existing.data?.sha) {
      currentSha = existing.data.sha;
    }
  }

  const body: Record<string, any> = {
    message: params.message,
    content: Buffer.from(params.content, 'utf8').toString('base64'),
    branch: params.branch,
  };
  if (currentSha) {
    body.sha = currentSha;
  }

  return githubRequest<any>(
    `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.filePath).replace(/%2F/g, '/')}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    params.token
  );
}

async function commitMultipleFilesAtomic(params: {
  owner: string;
  repo: string;
  branch: string;
  files: Array<{ path: string; content: string; isBase64?: boolean }>;
  message: string;
  token: string;
  replaceAllFiles?: boolean;
  preservedTreeEntries?: Array<{ path: string; sha: string; mode?: string }>;
}): Promise<{ ok: boolean; status: number; commitSha?: string; commitHtmlUrl?: string; error?: string }> {
  let refResp = await githubRequest<any>(
    `/repos/${params.owner}/${params.repo}/git/ref/heads/${encodeURIComponent(params.branch)}`,
    {},
    params.token
  );

  // Bootstrap empty repository if needed
  if (!refResp.ok || !refResp.data?.object?.sha) {
    if (refResp.status === 404 || refResp.status === 409) {
      await githubRequest<any>(
        `/repos/${params.owner}/${params.repo}/contents/.blogvn-init`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Initialize repository',
            content: Buffer.from('Đạo Ký\n', 'utf8').toString('base64'),
            branch: params.branch,
          }),
        },
        params.token
      );
      await new Promise((r) => setTimeout(r, 600));
      refResp = await githubRequest<any>(
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
      error: refResp.error || `Không tìm thấy nhánh "${params.branch}" trên GitHub.`,
    };
  }

  const headCommitSha = refResp.data.object.sha;
  const commitResp = await githubRequest<any>(
    `/repos/${params.owner}/${params.repo}/git/commits/${headCommitSha}`,
    {},
    params.token
  );
  if (!commitResp.ok || !commitResp.data?.tree?.sha) {
    return {
      ok: false,
      status: commitResp.status || 400,
      error: commitResp.error || 'Không đọc được commit hiện tại trên GitHub.',
    };
  }

  const baseTreeSha = commitResp.data.tree.sha;

  const blobResults = await Promise.all(
    params.files.map(async (f) => {
      const contentB64 = f.isBase64
        ? f.content.replace(/^data:[^;]+;base64,/, '')
        : Buffer.from(f.content, 'utf8').toString('base64');
      const blobResp = await githubRequest<any>(
        `/repos/${params.owner}/${params.repo}/git/blobs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: contentB64, encoding: 'base64' }),
        },
        params.token
      );
      return { path: f.path.replace(/^\/+/, ''), blobResp };
    })
  );

  const failedBlob = blobResults.find((b) => !b.blobResp.ok || !b.blobResp.data?.sha);
  if (failedBlob) {
    return {
      ok: false,
      status: failedBlob.blobResp.status || 400,
      error: failedBlob.blobResp.error || `Không thể tạo blob cho ${failedBlob.path}.`,
    };
  }

  const writtenPaths = new Set(blobResults.map((b) => b.path));
  const preservedNodes = (params.preservedTreeEntries || [])
    .map((entry) => ({
      path: entry.path.replace(/^\/+/, ''),
      mode: entry.mode || '100644',
      type: 'blob',
      sha: entry.sha,
    }))
    .filter((entry) => entry.path && entry.sha && !writtenPaths.has(entry.path));

  const treePayload: Record<string, any> = {
    tree: [
      ...blobResults.map((b) => ({
        path: b.path,
        mode: '100644',
        type: 'blob',
        sha: b.blobResp.data.sha,
      })),
      ...preservedNodes,
    ],
  };
  if (!params.replaceAllFiles) {
    treePayload.base_tree = baseTreeSha;
  }

  const treeResp = await githubRequest<any>(
    `/repos/${params.owner}/${params.repo}/git/trees`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(treePayload),
    },
    params.token
  );

  if (!treeResp.ok || !treeResp.data?.sha) {
    return {
      ok: false,
      status: treeResp.status || 400,
      error: treeResp.error || 'Không thể tạo Git tree trên GitHub.',
    };
  }

  const newCommitResp = await githubRequest<any>(
    `/repos/${params.owner}/${params.repo}/git/commits`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: params.message,
        tree: treeResp.data.sha,
        parents: [headCommitSha],
      }),
    },
    params.token
  );

  if (!newCommitResp.ok || !newCommitResp.data?.sha) {
    return {
      ok: false,
      status: newCommitResp.status || 400,
      error: newCommitResp.error || 'Không thể tạo Git commit mới.',
    };
  }

  const updateRefResp = await githubRequest<any>(
    `/repos/${params.owner}/${params.repo}/git/refs/heads/${encodeURIComponent(params.branch)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommitResp.data.sha }),
    },
    params.token
  );

  if (!updateRefResp.ok) {
    return {
      ok: false,
      status: updateRefResp.status || 400,
      error: updateRefResp.error || 'Không thể cập nhật nhánh trên GitHub.',
    };
  }

  return {
    ok: true,
    status: 200,
    commitSha: newCommitResp.data.sha,
    commitHtmlUrl: `https://github.com/${params.owner}/${params.repo}/commit/${newCommitResp.data.sha}`,
  };
}

// Scheduled Publish & Auto-Delete Persistence Engine
const SCHEDULES_DIR = path.resolve(process.cwd(), 'data');
const SCHEDULES_FILE = path.join(SCHEDULES_DIR, 'schedules.json');

function loadSchedulesFromDisk(): ScheduledTask[] {
  try {
    if (!fs.existsSync(SCHEDULES_FILE)) return [];
    const raw = fs.readFileSync(SCHEDULES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSchedulesToDisk(tasks: ScheduledTask[]) {
  try {
    if (!fs.existsSync(SCHEDULES_DIR)) {
      fs.mkdirSync(SCHEDULES_DIR, { recursive: true });
    }
    fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(tasks, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist schedules:', err);
  }
}

function buildSerializedPayload(payload: ScheduledPostPayload): string {
  const framework = (payload.framework || 'jekyll') as FrameworkId;
  const isAstroVnPath =
    framework === 'astro-vn' ||
    String(payload.filePath).startsWith('src/content/bai_viet/') ||
    String(payload.filePath).startsWith('src/content/du_an/') ||
    String(payload.filePath).startsWith('src/content/sach/') ||
    String(payload.filePath).startsWith('src/content/cua_hang/');

  const normalizedSlug = payload.slug ? slugify(payload.slug) : slugify(payload.title);

  return serializePostMarkdown(
    {
      collection: payload.collection || 'bai_viet',
      title: payload.title,
      date: payload.date || new Date().toISOString().slice(0, 10),
      slug: normalizedSlug,
      category: payload.category || 'Kỹ thuật',
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      excerpt: payload.excerpt || '',
      cover: payload.cover,
      draft: Boolean(payload.draft),
      markdownBody: payload.markdownBody || '',
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
      noindex: Boolean(payload.noindex),
    },
    {
      framework,
      schema: payload.frontmatterSchema,
      existingFrontmatter: payload.existingFrontmatter,
      isAstroVnPath,
    }
  );
}

// Per-Repo Website Identity Persistence
const SITE_CONFIGS_FILE = path.join(SCHEDULES_DIR, 'site-configs.json');

function ensureDataDir() {
  if (!fs.existsSync(SCHEDULES_DIR)) {
    fs.mkdirSync(SCHEDULES_DIR, { recursive: true });
  }
}

function repoConfigKey(owner: string, repo: string): string {
  return `${String(owner || DEFAULT_OWNER).toLowerCase()}/${String(repo || DEFAULT_REPO).toLowerCase()}`;
}

function loadSiteConfigsFromDisk(): Record<string, Partial<BlogConfig>> {
  try {
    if (!fs.existsSync(SITE_CONFIGS_FILE)) return {};
    const raw = fs.readFileSync(SITE_CONFIGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveSiteConfigsToDisk(configs: Record<string, Partial<BlogConfig>>) {
  try {
    ensureDataDir();
    fs.writeFileSync(SITE_CONFIGS_FILE, JSON.stringify(configs, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist site configs:', err);
  }
}

function escapeHtmlAttr(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readDefaultDaoKyPngBase64(): string | undefined {
  try {
    const p = path.join(process.cwd(), 'public', 'pwa-192x192.png');
    if (fs.existsSync(p)) {
      return fs.readFileSync(p).toString('base64');
    }
  } catch {
    // ignore
  }
  return undefined;
}

function isBundledDefaultSiteIcon(siteIcon?: string): boolean {
  const clean = (siteIcon || '').trim();
  return (
    !clean ||
    clean === './icon.svg' ||
    clean === '/icon.svg' ||
    clean.includes('1794978557793_3b5d5cb0.png') ||
    clean === './pwa-192x192.png' ||
    clean === '/pwa-192x192.png'
  );
}

function buildStandaloneWebAppFiles(params: {
  owner: string;
  repo: string;
  siteConfig: Partial<BlogConfig>;
  posts: BlogPost[];
}): Array<{ path: string; content: string; isBase64?: boolean }> {
  const { owner, repo, siteConfig, posts } = params;
  const title = siteConfig.siteTitle || repo || 'Đạo Ký';
  const headerBrand = siteConfig.headerTitle || title;
  const tagline = siteConfig.tagline || `Trang blog cá nhân ${title}`;
  const footerText =
    siteConfig.footerText || `© ${new Date().getFullYear()} ${title} · Xuất bản từ Đạo Ký.`;
  const defaultPngB64 = isBundledDefaultSiteIcon(siteConfig.siteIcon)
    ? readDefaultDaoKyPngBase64()
    : undefined;
  const usePng = Boolean(siteConfig.siteIcon?.startsWith('data:image/') || defaultPngB64);
  const iconHref = usePng ? './favicon.png' : siteConfig.siteIcon || './favicon.png';
  const headerLinks = Array.isArray(siteConfig.headerNavLinks) ? siteConfig.headerNavLinks : [];
  const footerLinks = Array.isArray(siteConfig.footerLinks) ? siteConfig.footerLinks : [];
  const lightTheme = resolveBlogTheme({ ...siteConfig, themeMode: 'light' }, 'light');
  const darkTheme = resolveBlogTheme({ ...siteConfig, themeMode: 'dark' }, 'dark');
  const activeTheme = resolveBlogTheme(siteConfig);
  const defaultStandaloneMode = activeTheme.isDark ? 'dark' : 'light';
  const defaultThemeSig = JSON.stringify({
    t: siteConfig.astroTemplate || 'newyorker-light',
    m: defaultStandaloneMode,
    c: siteConfig.themeColors || null,
  });

  const cleanPosts = posts
    .filter((p) => !p.draft)
    .map((p) => ({
      id: p.id,
      path: p.path,
      slug: p.slug,
      title: p.title,
      date: p.date,
      category: p.category,
      tags: p.tags,
      excerpt: p.excerpt,
      cover: p.cover,
      markdownBody: p.markdownBody,
    }));

  const manifest = {
    id: './',
    name: title,
    short_name: headerBrand.slice(0, 24),
    description: tagline,
    start_url: './',
    display: 'standalone',
    background_color: activeTheme.palette.canvas,
    theme_color: activeTheme.palette.canvas,
    icons: [
      {
        src: iconHref,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
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
<html lang="vi"${activeTheme.isDark ? ' class="dark"' : ''}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" id="dk-theme-color" content="${escapeHtmlAttr(activeTheme.palette.canvas)}" />
  <meta name="color-scheme" content="light dark" />
  <title>${escapeHtmlAttr(title)}</title>
  <meta name="description" content="${escapeHtmlAttr(tagline)}" />
  <meta property="og:title" content="${escapeHtmlAttr(title)}" />
  <meta property="og:description" content="${escapeHtmlAttr(tagline)}" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="${escapeHtmlAttr(headerBrand)}" />
  <link rel="manifest" href="./manifest.webmanifest?v=${encodeURIComponent(activeTheme.palette.canvas)}" />
  <link rel="icon" href="${escapeHtmlAttr(iconHref)}" />
  <link rel="apple-touch-icon" href="${escapeHtmlAttr(iconHref)}" />
  <link rel="alternate" type="application/rss+xml" title="${escapeHtmlAttr(title)} RSS" href="./rss.xml" />
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    :root { --bg:${lightTheme.palette.canvas}; --surface:${lightTheme.palette.surface}; --card:${lightTheme.palette.surfaceElevated}; --border:${lightTheme.palette.border}; --text:${lightTheme.palette.textPrimary}; --muted:${lightTheme.palette.textMuted}; --link:${lightTheme.palette.link}; --accent:${lightTheme.palette.accent}; --accent-text:${lightTheme.palette.accentText}; }
    html.dark { --bg:${darkTheme.palette.canvas}; --surface:${darkTheme.palette.surface}; --card:${darkTheme.palette.surfaceElevated}; --border:${darkTheme.palette.border}; --text:${darkTheme.palette.textPrimary}; --muted:${darkTheme.palette.textMuted}; --link:${darkTheme.palette.link}; --accent:${darkTheme.palette.accent}; --accent-text:${darkTheme.palette.accentText}; }
    * { box-sizing:border-box; }
    html, body { margin:0; min-height:100dvh; font-family: ${activeTheme.fonts.body}; background:var(--bg); color:var(--text); line-height:1.65; }
    a { color:var(--link); text-decoration:none; } a:hover { text-decoration:underline; }
    header { position:sticky; top:0; z-index:20; background:var(--bg); border-bottom:1px solid var(--border); }
    .wrap { max-width:960px; margin:0 auto; padding:0 18px; }
    .nav { display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:60px; }
    .brand { display:flex; align-items:center; gap:10px; font-weight:700; font-size:18px; color:var(--text); }
    .brand img { width:28px; height:28px; border-radius:8px; object-fit:cover; }
    .links { display:flex; align-items:center; gap:16px; flex-wrap:wrap; font-size:14px; }
    .btn { background:var(--surface); color:var(--text); border:1px solid var(--border); border-radius:10px; padding:8px 12px; font-size:13px; cursor:pointer; }
    .hero { padding:42px 0 28px; border-bottom:1px solid var(--border); }
    .hero h1 { font-size:clamp(28px, 4vw, 42px); line-height:1.15; margin:0 0 10px; font-family: ${activeTheme.fonts.display}; }
    .hero p { color:var(--muted); margin:0; max-width:65ch; }
    .search { margin:24px 0 10px; width:100%; padding:11px 14px; border-radius:12px; border:1px solid var(--border); background:var(--card); color:var(--text); font-size:14px; }
    .post { padding:26px 0; border-bottom:1px solid var(--border); cursor:pointer; }
    .meta { font-size:12px; color:var(--muted); margin-bottom:6px; font-family:ui-monospace, monospace; }
    .post h2 { margin:0 0 6px; font-size:22px; font-family: ${activeTheme.fonts.display}; }
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
        ${headerLinks.map((l) => `<a href="${escapeHtmlAttr(l.url)}">${escapeHtmlAttr(l.label)}</a>`).join('')}
        <a href="./rss.xml">RSS</a>
        <button class="btn" id="themeBtn" type="button">Đổi Sáng/Tối</button>
      </div>
    </div>
  </header>
  <main class="wrap" id="app"></main>
  <footer>
    <div class="wrap foot-flex">
      <span>${escapeHtmlAttr(footerText)}</span>
      <div class="links">
        ${footerLinks.map((l) => `<a href="${escapeHtmlAttr(l.url)}">${escapeHtmlAttr(l.label)}</a>`).join('')}
      </div>
    </div>
  </footer>
  <script>
    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }
    const DEFAULT_THEME_MODE = ${JSON.stringify(defaultStandaloneMode)};
    const DEFAULT_THEME_SIG = ${JSON.stringify(defaultThemeSig)};
    const prevSig = localStorage.getItem('blogvn_site_theme_sig');
    if (prevSig !== DEFAULT_THEME_SIG) {
      localStorage.setItem('blogvn_site_theme', DEFAULT_THEME_MODE);
      localStorage.setItem('blogvn_site_theme_sig', DEFAULT_THEME_SIG);
    }
    const savedTheme = localStorage.getItem('blogvn_site_theme') || DEFAULT_THEME_MODE;
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    const LIGHT_BG = ${JSON.stringify(lightTheme.palette.canvas)};
    const DARK_BG = ${JSON.stringify(darkTheme.palette.canvas)};
    const updateMetaColor = (isDark) => {
      const bg = isDark ? DARK_BG : LIGHT_BG;
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
      document.documentElement.style.backgroundColor = bg;
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute('content', bg);
    };
    updateMetaColor(savedTheme === 'dark');
    document.getElementById('themeBtn').onclick = () => {
      const dark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('blogvn_site_theme', dark ? 'dark' : 'light');
      updateMetaColor(dark);
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
          '<button class="btn" onclick="activeSlug=null;location.hash=\'#/\';render()">← Quay lại danh sách</button>' +
          '<div class="meta" style="margin-top:20px">' + esc(post.date) + ' · ' + esc(post.category) + '</div>' +
          '<h1 style="font-size:34px;line-height:1.2;margin:6px 0 18px">' + esc(post.title) + '</h1>' +
          (post.cover ? '<img src="' + esc(post.cover) + '" alt="' + esc(post.title) + '" style="width:100%;max-height:420px;object-fit:cover;border-radius:14px;margin-bottom:24px" />' : '') +
          '<div class="prose">' + htmlBody + '</div>' +
          '</div>';
        return;
      }
      const filtered = POSTS.filter(p => !query || (p.title + ' ' + p.excerpt + ' ' + p.category).toLowerCase().includes(query.toLowerCase()));
      root.innerHTML = '<section class="hero"><h1>' + esc(SITE_META.title) + '</h1><p>' + esc(SITE_META.tagline) + '</p>' +
        '<input class="search" placeholder="Tìm bài viết..." value="' + esc(query) + '" oninput="query=this.value;render()" /></section>' +
        '<div>' + (filtered.length ? filtered.map(p => '<article class="post" onclick="activeSlug=\'' + esc(p.slug) + '\';location.hash=\'#/post/' + encodeURIComponent(p.slug) + '\';render()">' +
        '<div class="meta">' + esc(p.date) + ' · ' + esc(p.category) + '</div>' +
        '<h2>' + esc(p.title) + '</h2><p>' + esc(p.excerpt) + '</p></article>').join('') : '<p style="padding:36px 0;color:var(--muted)">Không có bài viết nào phù hợp.</p>') + '</div>';
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

  const files: Array<{ path: string; content: string; isBase64?: boolean }> = [
    { path: '.nojekyll', content: '', isBase64: false },
    { path: '.blogvn/site-config.json', content: JSON.stringify(siteConfig, null, 2) + '\n', isBase64: false },
    {
      path: 'posts-manifest.json',
      content: JSON.stringify({ owner, repo, updatedAt: new Date().toISOString(), posts: cleanPosts }, null, 2) + '\n',
      isBase64: false,
    },
    { path: 'manifest.webmanifest', content: JSON.stringify(manifest, null, 2) + '\n', isBase64: false },
    { path: 'sw.js', content: swJs, isBase64: false },
    { path: 'index.html', content: indexHtml, isBase64: false },
  ];

  // If siteIcon is a data URL image uploaded from device, or default Đạo Ký logo, store favicon.png inside repo
  if (siteConfig.siteIcon && siteConfig.siteIcon.startsWith('data:image/')) {
    const cleanB64 = siteConfig.siteIcon.replace(/^data:[^;]+;base64,/, '');
    files.push({ path: 'favicon.png', content: cleanB64, isBase64: true });
  } else if (defaultPngB64) {
    files.push({ path: 'favicon.png', content: defaultPngB64, isBase64: true });
  }

  return files;
}

async function executeScheduledPublish(
  payload: ScheduledPostPayload,
  token: string
): Promise<{ ok: boolean; status: number; post?: BlogPost; commitUrl?: string; error?: string }> {
  const owner = payload.owner || DEFAULT_OWNER;
  const repo = payload.repo || DEFAULT_REPO;
  const branch = payload.branch || 'main';
  const rawContent = buildSerializedPayload({ ...payload, draft: false });
  const message =
    payload.commitMessage || `Scheduled publish (${payload.collection}): ${payload.title}`;

  const result = await upsertRepoFile({
    owner,
    repo,
    branch,
    filePath: payload.filePath,
    content: rawContent,
    message,
    token,
    sha: payload.sha,
  });

  if (!result.ok || !result.data) {
    return {
      ok: false,
      status: result.status || 400,
      error: result.error || 'Không thể đăng bài lên GitHub.',
    };
  }

  const savedPost = parseMarkdownFile(
    rawContent,
    payload.filePath,
    result.data.content?.sha || '',
    owner,
    repo,
    result.data.content?.html_url
  );

  return {
    ok: true,
    status: 200,
    post: savedPost,
    commitUrl: result.data.commit?.html_url,
  };
}

async function executeScheduledDelete(
  params: {
    owner: string;
    repo: string;
    branch: string;
    filePath: string;
    sha?: string;
    message?: string;
  },
  token: string
): Promise<{ ok: boolean; status: number; commitUrl?: string; error?: string }> {
  let targetSha = params.sha;

  // Always resolve current SHA from GitHub if missing or verify existence before deleting
  const existing = await githubRequest<any>(
    `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.filePath).replace(
      /%2F/g,
      '/'
    )}?ref=${encodeURIComponent(params.branch || 'main')}`,
    {},
    token
  );

  if (existing.status === 404) {
    // Already deleted remotely
    return { ok: true, status: 200 };
  }

  if (existing.ok && existing.data?.sha) {
    targetSha = existing.data.sha;
  }

  if (!targetSha) {
    return {
      ok: false,
      status: 400,
      error: 'Không xác định được SHA hiện tại của tệp cần xoá.',
    };
  }

  const delRes = await githubRequest<any>(
    `/repos/${params.owner}/${params.repo}/contents/${encodeURIComponent(params.filePath).replace(
      /%2F/g,
      '/'
    )}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: params.message || `Auto-delete scheduled post: ${params.filePath}`,
        sha: targetSha,
        branch: params.branch || 'main',
      }),
    },
    token
  );

  if (!delRes.ok) {
    return {
      ok: false,
      status: delRes.status || 400,
      error: delRes.error || 'Không thể xoá tệp khỏi GitHub.',
    };
  }

  return {
    ok: true,
    status: 200,
    commitUrl: delRes.data?.commit?.html_url,
  };
}

let isProcessingSchedules = false;

async function runSingleScheduleTask(
  task: ScheduledTask,
  token: string
): Promise<{ updated: ScheduledTask; spawnedDelete?: ScheduledTask }> {
  const nowIso = new Date().toISOString();

  if (task.type === 'publish') {
    if (!task.postPayload) {
      return {
        updated: {
          ...task,
          status: 'failed',
          executedAt: nowIso,
          error: 'Thiếu dữ liệu bài viết để đăng tự động.',
        },
      };
    }

    const res = await executeScheduledPublish(task.postPayload, token);
    if (!res.ok) {
      return {
        updated: {
          ...task,
          status: 'failed',
          executedAt: nowIso,
          error: res.error,
        },
      };
    }

    let spawnedDelete: ScheduledTask | undefined;
    if (task.autoDeleteAt && !Number.isNaN(Date.parse(task.autoDeleteAt))) {
      spawnedDelete = {
        id: `del-${crypto.randomBytes(4).toString('hex')}`,
        type: 'delete',
        status: 'pending',
        owner: task.owner,
        repo: task.repo,
        branch: task.branch,
        filePath: task.filePath,
        title: task.title,
        scheduledAt: task.autoDeleteAt,
        createdAt: nowIso,
      };
    }

    return {
      updated: {
        ...task,
        status: 'completed',
        executedAt: nowIso,
        commitUrl: res.commitUrl,
        error: undefined,
      },
      spawnedDelete,
    };
  }

  // Delete task
  const delRes = await executeScheduledDelete(
    {
      owner: task.owner,
      repo: task.repo,
      branch: task.branch,
      filePath: task.filePath,
    },
    token
  );

  if (!delRes.ok) {
    return {
      updated: {
        ...task,
        status: 'failed',
        executedAt: nowIso,
        error: delRes.error,
      },
    };
  }

  return {
    updated: {
      ...task,
      status: 'completed',
      executedAt: nowIso,
      commitUrl: delRes.commitUrl,
      error: undefined,
    },
  };
}

async function processDueSchedules(
  token: string,
  ownerFilter?: string,
  repoFilter?: string
): Promise<{ executedCount: number; tasks: ScheduledTask[] }> {
  if (isProcessingSchedules) {
    return { executedCount: 0, tasks: loadSchedulesFromDisk() };
  }
  isProcessingSchedules = true;
  let executedCount = 0;

  try {
    const tasks = loadSchedulesFromDisk();
    const now = Date.now();
    let changed = false;
    const spawned: ScheduledTask[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (t.status !== 'pending') continue;
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

function buildGitHubSchedulerWorkflowYaml(): string {
  return `name: Đạo Ký Scheduled Publish & Auto-Delete

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
          git config user.name "Đạo Ký Scheduler"
          git config user.email "actions@users.noreply.github.com"
          git add -A
          if ! git diff --staged --quiet; then
            git commit -m "Đạo Ký: Execute scheduled post publish / auto-delete"
            git push
          else
            echo "No due scheduled jobs."
          fi
`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // 1. Auth Status
  app.get('/api/auth/status', async (req: Request, res: Response) => {
    const oauthConfigured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    const session = getSessionRecord(req);
    const envToken = process.env.GITHUB_TOKEN;

    const defaultPagesUrl =
      DEFAULT_OWNER && DEFAULT_REPO
        ? DEFAULT_REPO.toLowerCase() === `${DEFAULT_OWNER.toLowerCase()}.github.io`
          ? `https://${DEFAULT_REPO}`
          : `https://${DEFAULT_OWNER}.github.io/${DEFAULT_REPO}`
        : '';

    let status: AuthStatus = {
      authenticated: false,
      mode: 'readonly',
      oauthConfigured,
      user: null,
      targetRepo: {
        owner: DEFAULT_OWNER,
        repo: DEFAULT_REPO,
        pagesUrl: defaultPagesUrl,
      },
    };

    if (session) {
      status = {
        ...status,
        authenticated: true,
        mode: 'oauth',
        user: session.user,
      };
    } else if (envToken) {
      const userResp = await githubRequest<GitHubUser>('/user', {}, envToken);
      status = {
        ...status,
        authenticated: true,
        mode: 'env_token',
        user: userResp.ok ? userResp.data : null,
      };
    }

    res.json(status);
  });

  // 2. OAuth URL
  app.get('/api/auth/github/url', (req: Request, res: Response) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
      res.status(400).json({
        error: 'GitHub OAuth chưa được cấu hình (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET).',
      });
      return;
    }

    const baseUrl = getBaseAppUrl(req);
    const redirectUri = `${baseUrl}/auth/callback`;
    const state = crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo workflow read:user',
      state,
    });

    res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
  });

  // 3. OAuth Callback
  const handleOAuthCallback = async (req: Request, res: Response) => {
    const code = req.query.code ? String(req.query.code) : '';
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!code || !clientId || !clientSecret) {
      res.status(400).send('Thiếu mã xác thực OAuth hoặc cấu hình OAuth.');
      return;
    }

    try {
      const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const tokenJson: any = await tokenResp.json();
      if (!tokenJson.access_token) {
        res
          .status(400)
          .send(`Xác thực GitHub thất bại: ${tokenJson.error_description || 'Không nhận được token'}`);
        return;
      }

      const userResp = await githubRequest<GitHubUser>('/user', {}, tokenJson.access_token);
      if (!userResp.ok || !userResp.data) {
        res.status(400).send('Không thể lấy thông tin người dùng GitHub.');
        return;
      }

      const sid = crypto.randomUUID();
      const record: SessionRecord = {
        accessToken: tokenJson.access_token,
        user: userResp.data,
        createdAt: Date.now(),
      };
      sessions.set(sid, record);

      const cookieOpts = {
        httpOnly: true,
        sameSite: 'none' as const,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      };
      res.cookie('gh_session', sid, cookieOpts);
      res.cookie('gh_session_data', sealSession(record), cookieOpts);

      res.send(`
        <!doctype html>
        <html lang="vi">
          <body style="font-family:sans-serif;padding:32px;text-align:center;">
            <p>Kết nối GitHub thành công. Cửa sổ sẽ tự động đóng...</p>
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
      console.error('OAuth callback error:', error);
      res.status(500).send('Lỗi xử lý xác thực GitHub.');
    }
  };

  app.get(['/auth/callback', '/auth/callback/'], handleOAuthCallback);

  // 4. Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const sid = req.cookies?.gh_session;
    if (sid) sessions.delete(sid);
    res.clearCookie('gh_session', { httpOnly: true, sameSite: 'none', secure: true });
    res.clearCookie('gh_session_data', { httpOnly: true, sameSite: 'none', secure: true });
    res.json({ ok: true });
  });

  // 4b. List Authenticated User Repositories (Multi-user App Store flow)
  app.get('/api/github/user-repos', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({ repos: [] });
      return;
    }

    try {
      const reposResp = await githubRequest<any[]>(
        '/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator',
        {},
        token
      );
      if (!reposResp.ok || !Array.isArray(reposResp.data)) {
        res.status(reposResp.status || 400).json({ repos: [], error: reposResp.error });
        return;
      }

      const mapped = reposResp.data
        .map((r) => {
          const ownerLogin = r.owner?.login || '';
          const isUserSite =
            r.name.toLowerCase() === `${ownerLogin.toLowerCase()}.github.io` ||
            r.name.toLowerCase().endsWith('.github.io');
          const pagesUrl = isUserSite
            ? `https://${r.name}`
            : `https://${ownerLogin}.github.io/${r.name}`;
          return {
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            owner: ownerLogin,
            description: r.description || null,
            isPrivate: Boolean(r.private),
            hasPages: Boolean(r.has_pages || isUserSite),
            isUserSite,
            defaultBranch: r.default_branch || 'main',
            pagesUrl,
            updatedAt: r.updated_at || '',
          };
        })
        .sort((a, b) => {
          if (a.isUserSite !== b.isUserSite) return a.isUserSite ? -1 : 1;
          if (a.hasPages !== b.hasPages) return a.hasPages ? -1 : 1;
          return b.updatedAt.localeCompare(a.updatedAt);
        });

      res.json({ repos: mapped });
    } catch (error) {
      console.error('List user repos error:', error);
      res.status(500).json({ repos: [], error: 'Không thể lấy danh sách repository của người dùng.' });
    }
  });

  // 5. Fetch GitHub Repo & Owner Profile & Commits
  app.get('/api/github/repo', async (req: Request, res: Response) => {
    const owner = String(req.query.owner || DEFAULT_OWNER).trim();
    const repo = String(req.query.repo || DEFAULT_REPO).trim();
    const token = getSessionToken(req);

    if (!owner || !repo) {
      res.status(400).json({ error: 'Chưa chọn repository GitHub.' });
      return;
    }

    try {
      const [repoResp, userResp, commitsResp] = await Promise.all([
        githubRequest<any>(`/repos/${owner}/${repo}`, {}, token),
        githubRequest<any>(`/users/${owner}`, {}, token),
        githubRequest<any[]>(`/repos/${owner}/${repo}/commits?per_page=8`, {}, token),
      ]);

      if (!repoResp.ok || !repoResp.data) {
        res.status(repoResp.status || 404).json({
          error: repoResp.error || `Không tìm thấy repository ${owner}/${repo}`,
        });
        return;
      }

      const r = repoResp.data;
      const u = userResp.ok ? userResp.data : null;
      const commits =
        commitsResp.ok && Array.isArray(commitsResp.data)
          ? commitsResp.data.map((c: any) => ({
              sha: c.sha,
              message: c.commit?.message || '',
              authorName: c.commit?.author?.name || owner,
              date: c.commit?.author?.date || '',
              htmlUrl: c.html_url,
            }))
          : [];

      const payload: GitHubRepoInfo = {
        owner,
        repo,
        fullName: r.full_name,
        description: r.description,
        defaultBranch: r.default_branch || 'main',
        htmlUrl: r.html_url,
        pagesUrl: r.homepage || `https://${owner}.github.io`,
        updatedAt: r.pushed_at || r.updated_at,
        stargazersCount: r.stargazers_count || 0,
        isPrivate: Boolean(r.private),
        hasPagesSite: Boolean(r.has_pages),
        ownerProfile: u
          ? {
              login: u.login,
              name: u.name,
              avatarUrl: u.avatar_url,
              bio: u.bio,
              htmlUrl: u.html_url,
              publicRepos: u.public_repos || 0,
              followers: u.followers || 0,
            }
          : null,
        commits,
      };

      res.json(payload);
    } catch (error) {
      console.error('Repo fetch error:', error);
      res.status(500).json({ error: 'Không thể kết nối tới GitHub API.' });
    }
  });

  // 6. Fetch Markdown Content Collections from GitHub Repo (Paginated)
  app.get('/api/github/posts', async (req: Request, res: Response) => {
    const owner = String(req.query.owner || DEFAULT_OWNER).trim();
    const repo = String(req.query.repo || DEFAULT_REPO).trim();
    const branch = String(req.query.branch || 'main');
    const offset = Math.max(0, Number.parseInt(String(req.query.offset || '0'), 10) || 0);
    const limit = Math.min(200, Math.max(1, Number.parseInt(String(req.query.limit || '30'), 10) || 30));
    const token = getSessionToken(req);

    if (!owner || !repo) {
      res.json({
        posts: [],
        config: null,
        structure: null,
        totalCount: 0,
        loadedCount: 0,
        offset: 0,
        limit,
        hasMore: false,
      });
      return;
    }

    try {
      const treeResp = await githubRequest<any>(
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
              framework: 'jekyll',
              frameworkLabel: 'Jekyll',
              postsDir: '_posts',
              assetsPrefix: '',
              uploadDir: 'assets/uploads',
              publicUploadPrefix: '/assets/uploads',
              hasPostsDir: false,
              hasJekyllPosts: false,
              hasAstroEngine: false,
              hasStaticEngine: false,
              hasConfigFile: false,
              detectedPostsDir: '_posts',
              totalFiles: 0,
              markdownFilesCount: 0,
              frontmatterSchema: defaultFrontmatterSchema('jekyll'),
            } satisfies RepoStructureInfo,
          });
          return;
        }
        res.status(treeResp.status).json({ error: treeResp.error });
        return;
      }

      const tree: Array<{ path: string; type: string; sha: string }> = treeResp.data.tree || [];
      const blobs = tree.filter((item) => item.type === 'blob');

      const hasAstroTrangWeb = blobs.some((b) => b.path === 'src/cau_hinh/trang_web.ts');
      const hasAstroVnContent = blobs.some((b) => b.path.startsWith('src/content/bai_viet/'));
      const hasAstroContentDir = blobs.some((b) => b.path.startsWith('src/content/'));
      const hasAstroConfig = blobs.some((b) => b.path.startsWith('astro.config.'));
      const hasHexoPosts = blobs.some((b) => b.path.startsWith('source/_posts/'));
      const hasHexoScaffolds = blobs.some((b) => b.path.startsWith('scaffolds/'));
      const hasHugoConfig = blobs.some((b) =>
        ['hugo.toml', 'hugo.yaml', 'hugo.json', 'config.toml'].includes(b.path)
      );
      const hasHugoPosts = blobs.some(
        (b) => b.path.startsWith('content/posts/') || b.path.startsWith('content/blog/')
      );
      const hasJekyllPosts = blobs.some((b) => b.path.startsWith('_posts/'));
      const hasJekyllConfig = blobs.some((b) => b.path === '_config.yml');
      const hasPostsDir = blobs.some((b) => b.path.startsWith('posts/'));

      const isAstroEngine = hasAstroContentDir || hasAstroConfig;
      const isAstroVn = hasAstroTrangWeb || hasAstroVnContent;

      let framework: FrameworkId = 'static';
      let frameworkLabel = 'Markdown tĩnh';
      let postsDir = 'posts';
      let assetsPrefix = '';
      let uploadDir = 'assets/uploads';
      let publicUploadPrefix = '/assets/uploads';

      if (isAstroVn) {
        framework = 'astro-vn';
        frameworkLabel = 'Astro (Huyền Không)';
        postsDir = 'src/content/bai_viet';
        assetsPrefix = 'public';
        uploadDir = 'public/tainguyen/hinhanh/uploads';
        publicUploadPrefix = '/tainguyen/hinhanh/uploads';
      } else if (isAstroEngine) {
        framework = 'astro';
        frameworkLabel = 'Astro';
        const hasBlogDir = blobs.some((b) => b.path.startsWith('src/content/blog/'));
        const hasAstroPostsDir = blobs.some((b) => b.path.startsWith('src/content/posts/'));
        postsDir = hasBlogDir
          ? 'src/content/blog'
          : hasAstroPostsDir
          ? 'src/content/posts'
          : 'src/content/blog';
        assetsPrefix = 'public';
        uploadDir = 'public/images/uploads';
        publicUploadPrefix = '/images/uploads';
      } else if (hasHexoPosts || (hasJekyllConfig && hasHexoScaffolds)) {
        framework = 'hexo';
        frameworkLabel = 'Hexo';
        postsDir = 'source/_posts';
        assetsPrefix = 'source';
        uploadDir = 'source/images/uploads';
        publicUploadPrefix = '/images/uploads';
      } else if (hasHugoConfig || hasHugoPosts) {
        framework = 'hugo';
        frameworkLabel = 'Hugo';
        postsDir = blobs.some((b) => b.path.startsWith('content/blog/'))
          ? 'content/blog'
          : 'content/posts';
        assetsPrefix = 'static';
        uploadDir = 'static/images/uploads';
        publicUploadPrefix = '/images/uploads';
      } else if (hasJekyllPosts || hasJekyllConfig || blobs.some((b) => b.path.startsWith('_layouts/'))) {
        framework = 'jekyll';
        frameworkLabel = 'Jekyll';
        postsDir = '_posts';
        assetsPrefix = '';
        uploadDir = 'assets/uploads';
        publicUploadPrefix = '/assets/uploads';
      } else if (hasPostsDir) {
        framework = 'static';
        frameworkLabel = 'Markdown tĩnh';
        postsDir = 'posts';
      }

      const mdFiles = blobs.filter((item) => {
        const lower = item.path.toLowerCase();
        if (!lower.endsWith('.md') && !lower.endsWith('.markdown') && !lower.endsWith('.mdx')) {
          return false;
        }
        if (lower.startsWith('readme') || lower === 'license.md' || lower === 'index.md') return false;
        if (lower.endsWith('/_index.md')) return false;
        return (
          lower.startsWith('src/content/') ||
          lower.startsWith('_posts/') ||
          lower.startsWith('source/_posts/') ||
          lower.startsWith('posts/') ||
          lower.startsWith('content/') ||
          !lower.includes('/')
        );
      });

      const hasConfigFile = blobs.some((b) => b.path === 'blog-config.json');
      const hasStaticEngine =
        blobs.some((b) => b.path === 'posts-manifest.json') && blobs.some((b) => b.path === 'index.html');

      let remoteConfig: Partial<BlogConfig> | null = null;
      if (hasAstroTrangWeb) {
        const astroCfgResp = await githubRequest<any>(
          `/repos/${owner}/${repo}/contents/src/cau_hinh/trang_web.ts?ref=${encodeURIComponent(branch)}`,
          {},
          token
        );
        if (astroCfgResp.ok && astroCfgResp.data?.content) {
          const decoded = Buffer.from(astroCfgResp.data.content, 'base64').toString('utf8');
          remoteConfig = {
            ...parseAstroTrangWebTs(decoded),
            postsDirectory: postsDir,
          };
        }
      } else if (hasJekyllConfig) {
        const jekyllCfgResp = await githubRequest<any>(
          `/repos/${owner}/${repo}/contents/_config.yml?ref=${encodeURIComponent(branch)}`,
          {},
          token
        );
        if (jekyllCfgResp.ok && jekyllCfgResp.data?.content) {
          try {
            const decoded = Buffer.from(jekyllCfgResp.data.content, 'base64').toString('utf8');
            const parsedYml = loadYaml(decoded);
            if (parsedYml && typeof parsedYml === 'object') {
              const cfg = parsedYml as Record<string, any>;
              remoteConfig = {
                siteTitle: cfg.title ? String(cfg.title) : undefined,
                tagline: cfg.description ? String(cfg.description) : undefined,
                authorName: cfg.author ? String(cfg.author) : undefined,
                postsDirectory: postsDir,
              };
            }
          } catch {
            // ignore YAML parse errors in _config.yml
          }
        }
      } else if (hasHugoConfig) {
        const hugoCfgFile = blobs.find((b) =>
          ['hugo.toml', 'hugo.yaml', 'config.toml', 'hugo.json'].includes(b.path)
        );
        if (hugoCfgFile) {
          const hugoCfgResp = await githubRequest<any>(
            `/repos/${owner}/${repo}/contents/${hugoCfgFile.path}?ref=${encodeURIComponent(branch)}`,
            {},
            token
          );
          if (hugoCfgResp.ok && hugoCfgResp.data?.content) {
            const decoded = Buffer.from(hugoCfgResp.data.content, 'base64').toString('utf8');
            if (hugoCfgFile.path.endsWith('.toml')) {
              const titleMatch = decoded.match(/^\s*title\s*=\s*["']([^"']+)["']/m);
              const descMatch = decoded.match(/^\s*description\s*=\s*["']([^"']+)["']/m);
              remoteConfig = {
                siteTitle: titleMatch?.[1],
                tagline: descMatch?.[1],
                postsDirectory: postsDir,
              };
            } else if (hugoCfgFile.path.endsWith('.yaml')) {
              try {
                const parsed = loadYaml(decoded) as Record<string, any>;
                remoteConfig = {
                  siteTitle: parsed?.title ? String(parsed.title) : undefined,
                  tagline: parsed?.params?.description
                    ? String(parsed.params.description)
                    : undefined,
                  postsDirectory: postsDir,
                };
              } catch {
                // ignore
              }
            }
          }
        }
      }

      const sortedMdFiles = [...mdFiles].sort((a, b) => b.path.localeCompare(a.path));
      const targetFiles = sortedMdFiles.slice(offset, offset + limit);
      const fetchedPosts = await Promise.all(
        targetFiles.map(async (file) => {
          const fileResp = await githubRequest<any>(
            `/repos/${owner}/${repo}/contents/${encodeURIComponent(file.path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`,
            {},
            token
          );
          if (!fileResp.ok || !fileResp.data?.content) return null;
          const decoded = Buffer.from(fileResp.data.content, 'base64').toString('utf8');
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

      const posts = fetchedPosts
        .filter((p): p is BlogPost => p !== null)
        .sort((a, b) => b.date.localeCompare(a.date));

      const frontmatterSchema = inferFrontmatterSchema(framework, posts);

      // Merge .blogvn/site-config.json from repository if present
      const blogvnCfgBlob = blobs.find((b) => b.path === '.blogvn/site-config.json');
      if (blogvnCfgBlob) {
        const cfgResp = await githubRequest<any>(
          `/repos/${owner}/${repo}/contents/.blogvn/site-config.json?ref=${encodeURIComponent(branch)}`,
          {},
          token
        );
        if (cfgResp.ok && cfgResp.data?.content) {
          try {
            const parsedJson = JSON.parse(Buffer.from(cfgResp.data.content, 'base64').toString('utf8'));
            if (parsedJson && typeof parsedJson === 'object') {
              remoteConfig = {
                ...(remoteConfig || {}),
                ...parsedJson,
                postsDirectory: postsDir,
              };
            }
          } catch {
            // ignore malformed JSON
          }
        }
      }

      // Also overlay local server saved config overrides for this repo
      const localSiteConfigs = loadSiteConfigsFromDisk();
      const savedRepoCfg = localSiteConfigs[repoConfigKey(owner, repo)];
      if (savedRepoCfg) {
        remoteConfig = {
          ...(remoteConfig || {}),
          ...savedRepoCfg,
          postsDirectory: postsDir,
        };
      }

      const structure: RepoStructureInfo = {
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
        frontmatterSchema,
      };

      const totalCount = sortedMdFiles.length;
      const loadedCount = Math.min(totalCount, offset + targetFiles.length);

      res.json({
        posts,
        config: remoteConfig,
        structure,
        totalCount,
        loadedCount,
        offset,
        limit,
        hasMore: loadedCount < totalCount,
      });
    } catch (error) {
      console.error('Fetch posts error:', error);
      res.status(500).json({ error: 'Không thể đọc danh sách bài viết từ GitHub.' });
    }
  });

  // 6b. Fetch Live GitHub Actions / Pages Build Status
  app.get('/api/github/build-status', async (req: Request, res: Response) => {
    const owner = String(req.query.owner || DEFAULT_OWNER);
    const repo = String(req.query.repo || DEFAULT_REPO);
    const token = getSessionToken(req);

    try {
      const runsResp = await githubRequest<any>(
        `/repos/${owner}/${repo}/actions/runs?per_page=1`,
        {},
        token
      );
      const latestRun = runsResp.ok ? runsResp.data?.workflow_runs?.[0] : null;

      if (latestRun) {
        const payload: BuildStatusInfo = {
          status:
            latestRun.status === 'queued' || latestRun.status === 'in_progress'
              ? latestRun.status
              : 'completed',
          conclusion:
            latestRun.conclusion === 'success' ||
            latestRun.conclusion === 'failure' ||
            latestRun.conclusion === 'cancelled'
              ? latestRun.conclusion
              : null,
          workflowName: latestRun.name || 'GitHub Pages Build',
          updatedAt: latestRun.updated_at || latestRun.created_at || '',
          htmlUrl: latestRun.html_url,
        };
        res.json(payload);
        return;
      }

      if (token) {
        const pagesBuildResp = await githubRequest<any>(
          `/repos/${owner}/${repo}/pages/builds/latest`,
          {},
          token
        );
        if (pagesBuildResp.ok && pagesBuildResp.data) {
          const b = pagesBuildResp.data;
          const payload: BuildStatusInfo = {
            status: b.status === 'building' ? 'in_progress' : 'completed',
            conclusion:
              b.status === 'built' ? 'success' : b.status === 'errored' ? 'failure' : null,
            workflowName: 'GitHub Pages',
            updatedAt: b.updated_at || b.created_at || '',
          };
          res.json(payload);
          return;
        }
      }

      res.json({
        status: 'unknown',
        conclusion: null,
        workflowName: 'GitHub Pages',
        updatedAt: '',
      } satisfies BuildStatusInfo);
    } catch {
      res.json({
        status: 'unknown',
        conclusion: null,
        workflowName: 'GitHub Pages',
        updatedAt: '',
      } satisfies BuildStatusInfo);
    }
  });

  // 6c. One-Click Starter Blog Creation for New Users
  app.post('/api/github/create-pages-site', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: 'Vui lòng đăng nhập GitHub trước khi tạo blog mới.',
      });
      return;
    }

    const { siteTitle, tagline, repoName } = req.body || {};

    try {
      const userResp = await githubRequest<GitHubUser>('/user', {}, token);
      if (!userResp.ok || !userResp.data?.login) {
        res.status(401).json({ error: 'Không thể xác định tài khoản GitHub hiện tại.' });
        return;
      }

      const owner = userResp.data.login;
      const cleanRepoName =
        String(repoName || '')
          .trim()
          .replace(/[^a-zA-Z0-9._-]/g, '-') || `${owner}.github.io`;
      const finalTitle = String(siteTitle || '').trim() || `Blog của ${userResp.data.name || owner}`;
      const finalTagline =
        String(tagline || '').trim() || 'Ghi chép cá nhân, chia sẻ kiến thức được tạo từ Đạo Ký.';

      // 1. Create repository (or check if already created)
      let defaultBranch = 'main';
      const createRepoResp = await githubRequest<any>(
        '/user/repos',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanRepoName,
            description: finalTagline,
            private: false,
            auto_init: true,
          }),
        },
        token
      );

      if (createRepoResp.ok && createRepoResp.data) {
        defaultBranch = createRepoResp.data.default_branch || 'main';
      } else if (createRepoResp.status === 422) {
        // Repo may already exist — verify ownership & get defaultBranch
        const existingRepoResp = await githubRequest<any>(
          `/repos/${owner}/${cleanRepoName}`,
          {},
          token
        );
        if (!existingRepoResp.ok || !existingRepoResp.data) {
          res.status(400).json({
            error: createRepoResp.error || `Không thể tạo repository ${owner}/${cleanRepoName}.`,
          });
          return;
        }
        defaultBranch = existingRepoResp.data.default_branch || 'main';
      } else {
        res.status(createRepoResp.status || 400).json({
          error: createRepoResp.error || 'Không thể khởi tạo repository trên GitHub.',
        });
        return;
      }

      // Brief pause if repo was just initialized with auto_init
      await new Promise((r) => setTimeout(r, 900));

      const today = new Date().toISOString().slice(0, 10);
      const configYml = [
        `title: "${finalTitle.replace(/"/g, '\\"')}"`,
        `description: "${finalTagline.replace(/"/g, '\\"')}"`,
        `author: "${(userResp.data.name || owner).replace(/"/g, '\\"')}"`,
        `theme: minima`,
        `markdown: kramdown`,
        `plugins:`,
        `  - jekyll-feed`,
      ].join('\n');

      const indexMd = [
        `---`,
        `layout: home`,
        `title: "${finalTitle.replace(/"/g, '\\"')}"`,
        `---`,
        ``,
        `Chào mừng đến với **${finalTitle}** — trang blog được tạo và quản lý bằng **Đạo Ký**.`,
      ].join('\n');

      const welcomePost = [
        `---`,
        `layout: post`,
        `title: "Chào mừng đến với ${finalTitle.replace(/"/g, '\\"')}"`,
        `date: ${today}`,
        `categories: [Ghi chép]`,
        `tags: [dao-ky, github-pages]`,
        `excerpt: "Bài viết đầu tiên được khởi tạo tự động từ ứng dụng Đạo Ký."`,
        `---`,
        ``,
        `Xin chào! Đây là bài viết đầu tiên trên trang GitHub Pages mới của bạn.`,
        ``,
        `Từ nay bạn có thể viết bài Markdown, tải ảnh trực tiếp từ điện thoại và bấm **Đăng lên GitHub** ngay trong ứng dụng **Đạo Ký**.`,
      ].join('\n');

      await upsertRepoFile({
        owner,
        repo: cleanRepoName,
        branch: defaultBranch,
        filePath: '_config.yml',
        content: configYml + '\n',
        message: 'Khởi tạo cấu hình Đạo Ký (_config.yml)',
        token,
      });

      await upsertRepoFile({
        owner,
        repo: cleanRepoName,
        branch: defaultBranch,
        filePath: 'index.md',
        content: indexMd + '\n',
        message: 'Khởi tạo trang chủ Đạo Ký',
        token,
      });

      await upsertRepoFile({
        owner,
        repo: cleanRepoName,
        branch: defaultBranch,
        filePath: `_posts/${today}-chao-mung-den-voi-dao-ky.md`,
        content: welcomePost + '\n',
        message: 'Thêm bài viết chào mừng từ Đạo Ký',
        token,
      });

      // Enable GitHub Pages (safe if already enabled -> 409)
      await githubRequest<any>(
        `/repos/${owner}/${cleanRepoName}/pages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: { branch: defaultBranch, path: '/' },
          }),
        },
        token
      );

      const isUserSite = cleanRepoName.toLowerCase() === `${owner.toLowerCase()}.github.io`;
      const pagesUrl = isUserSite
        ? `https://${cleanRepoName}`
        : `https://${owner}.github.io/${cleanRepoName}`;

      res.json({
        ok: true,
        owner,
        repo: cleanRepoName,
        defaultBranch,
        pagesUrl,
      });
    } catch (error) {
      console.error('Create pages site error:', error);
      res.status(500).json({ error: 'Lỗi máy chủ khi khởi tạo blog GitHub Pages.' });
    }
  });

  // 7. Create or Update Markdown Content on GitHub
  app.put('/api/github/posts', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: 'Cần xác thực GitHub (OAuth hoặc GITHUB_TOKEN) để ghi bài viết lên repository.',
      });
      return;
    }

    const {
      owner = DEFAULT_OWNER,
      repo = DEFAULT_REPO,
      branch = 'main',
      collection = 'bai_viet',
      filePath,
      title,
      date,
      slug,
      category = 'Kỹ thuật',
      tags = [],
      excerpt = '',
      cover,
      draft = false,
      markdownBody = '',
      sha,
      commitMessage,
      framework = 'jekyll',
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
      noindex,
    } = req.body || {};

    if (!title || !filePath) {
      res.status(400).json({ error: 'Thiếu tiêu đề hoặc đường dẫn tệp Markdown.' });
      return;
    }

    try {
      const normalizedSlug = slug ? slugify(slug) : slugify(title);
      const isAstroVnPath =
        framework === 'astro-vn' ||
        String(filePath).startsWith('src/content/bai_viet/') ||
        String(filePath).startsWith('src/content/du_an/') ||
        String(filePath).startsWith('src/content/sach/') ||
        String(filePath).startsWith('src/content/cua_hang/');

      const rawContent = serializePostMarkdown(
        {
          collection: collection as BlogCollection,
          title,
          date: date || new Date().toISOString().slice(0, 10),
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
          noindex: Boolean(noindex),
        },
        {
          framework: framework as FrameworkId,
          schema: frontmatterSchema,
          existingFrontmatter,
          isAstroVnPath,
        }
      );

      const message = commitMessage || `${sha ? 'Update' : 'Publish'} ${collection}: ${title}`;
      const result = await upsertRepoFile({
        owner,
        repo,
        branch,
        filePath,
        content: rawContent,
        message,
        token,
        sha,
      });

      if (!result.ok || !result.data) {
        res.status(result.status || 400).json({
          error: result.error || 'Không thể commit nội dung lên GitHub.',
        });
        return;
      }

      const savedPost = parseMarkdownFile(
        rawContent,
        filePath,
        result.data.content?.sha || '',
        owner,
        repo,
        result.data.content?.html_url
      );

      res.json({
        post: savedPost,
        commit: result.data.commit,
      });
    } catch (error) {
      console.error('Publish post error:', error);
      res.status(500).json({ error: 'Lỗi máy chủ khi xuất bản lên GitHub.' });
    }
  });

  // 8. Delete Markdown File on GitHub
  app.delete('/api/github/posts', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: 'Cần xác thực GitHub để xoá tệp trên repository.',
      });
      return;
    }

    const { owner = DEFAULT_OWNER, repo = DEFAULT_REPO, branch = 'main', filePath, sha } = req.body || {};
    if (!filePath || !sha) {
      res.status(400).json({ error: 'Thiếu đường dẫn file hoặc SHA để xoá.' });
      return;
    }

    try {
      const result = await githubRequest<any>(
        `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Delete ${filePath}`,
            sha,
            branch,
          }),
        },
        token
      );

      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({ error: 'Không thể xoá tệp trên GitHub.' });
    }
  });

  // 9. Upload Image from Device directly to GitHub Repo
  app.post('/api/github/upload-image', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: 'Cần xác thực GitHub để tải ảnh lên repository.',
      });
      return;
    }

    const {
      owner = DEFAULT_OWNER,
      repo = DEFAULT_REPO,
      branch = 'main',
      filename = 'image.jpg',
      base64Data = '',
      isAstroRepo = true,
      uploadDir,
      publicUploadPrefix,
    } = req.body || {};

    if (!base64Data) {
      res.status(400).json({ error: 'Không nhận được dữ liệu hình ảnh.' });
      return;
    }

    try {
      const cleanBase64 = String(base64Data).replace(/^data:[^;]+;base64,/, '');
      const extMatch = String(filename).match(/\.([a-zA-Z0-9]+)$/);
      const ext = (extMatch?.[1] || 'jpg').toLowerCase();
      const baseName = slugify(String(filename).replace(/\.[^.]+$/, '')) || 'image';
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const uniqueSuffix = crypto.randomBytes(3).toString('hex');
      const finalFileName = `${stamp}-${baseName}-${uniqueSuffix}.${ext}`;

      const cleanUploadDir = uploadDir
        ? String(uploadDir).replace(/^\/+|\/+$/g, '')
        : isAstroRepo
        ? 'public/tainguyen/hinhanh/uploads'
        : 'assets/uploads';

      const cleanPublicPrefix = publicUploadPrefix
        ? '/' + String(publicUploadPrefix).replace(/^\/+|\/+$/g, '')
        : isAstroRepo
        ? '/tainguyen/hinhanh/uploads'
        : '/assets/uploads';

      const repoPath = `${cleanUploadDir}/${finalFileName}`;
      const publicPath = `${cleanPublicPrefix}/${finalFileName}`;

      const putRes = await githubRequest<any>(
        `/repos/${owner}/${repo}/contents/${encodeURIComponent(repoPath).replace(/%2F/g, '/')}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Upload image: ${finalFileName}`,
            content: cleanBase64,
            branch,
          }),
        },
        token
      );

      if (!putRes.ok || !putRes.data) {
        res.status(putRes.status || 400).json({
          error: putRes.error || 'Không thể tải ảnh lên GitHub.',
        });
        return;
      }

      const previewUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${repoPath}`;

      res.json({
        ok: true,
        repoPath,
        publicPath,
        previewUrl,
        sha: putRes.data.content?.sha,
      });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({ error: 'Lỗi máy chủ khi tải ảnh lên GitHub.' });
    }
  });

  // 9b. Batch Upload Multiple Images in One Single Atomic Git Commit
  app.post('/api/github/upload-images-batch', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: 'Cần xác thực GitHub để tải loạt ảnh lên repository.',
      });
      return;
    }

    const {
      owner = DEFAULT_OWNER,
      repo = DEFAULT_REPO,
      branch = 'main',
      isAstroRepo = true,
      uploadDir,
      publicUploadPrefix,
      commitMessage,
      images = [],
    } = req.body || {};

    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: 'Danh sách hình ảnh trống.' });
      return;
    }

    if (images.length > 20) {
      res.status(400).json({ error: 'Mỗi lần tải hàng loạt tối đa 20 ảnh.' });
      return;
    }

    try {
      const cleanUploadDir = uploadDir
        ? String(uploadDir).replace(/^\/+|\/+$/g, '')
        : isAstroRepo
        ? 'public/tainguyen/hinhanh/uploads'
        : 'assets/uploads';

      const cleanPublicPrefix = publicUploadPrefix
        ? '/' + String(publicUploadPrefix).replace(/^\/+|\/+$/g, '')
        : isAstroRepo
        ? '/tainguyen/hinhanh/uploads'
        : '/assets/uploads';

      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const prepared = images.map((img: any) => {
        const rawName = String(img?.filename || 'photo.webp');
        const extMatch = rawName.match(/\.([a-zA-Z0-9]+)$/);
        const ext = (extMatch?.[1] || 'webp').toLowerCase();
        const baseName = slugify(rawName.replace(/\.[^.]+$/, '')) || 'image';
        const uniqueSuffix = crypto.randomBytes(3).toString('hex');
        const finalFileName = `${stamp}-${baseName}-${uniqueSuffix}.${ext}`;
        const repoPath = `${cleanUploadDir}/${finalFileName}`;
        const publicPath = `${cleanPublicPrefix}/${finalFileName}`;
        const previewUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${repoPath}`;
        return {
          repoPath,
          publicPath,
          previewUrl,
          base64Data: String(img?.base64Data || ''),
        };
      });

      const commitRes = await commitMultipleFilesAtomic({
        owner,
        repo,
        branch,
        files: prepared.map((p) => ({
          path: p.repoPath,
          content: p.base64Data,
          isBase64: true,
        })),
        message: commitMessage || `Upload ${prepared.length} images via Đạo Ký Image Batch`,
        token,
      });

      if (!commitRes.ok) {
        res.status(commitRes.status || 400).json({
          error: commitRes.error || 'Không thể commit loạt ảnh lên GitHub.',
        });
        return;
      }

      res.json({
        ok: true,
        commit: {
          sha: commitRes.commitSha,
          htmlUrl: commitRes.commitHtmlUrl,
        },
        results: prepared.map(({ repoPath, publicPath, previewUrl }) => ({
          repoPath,
          publicPath,
          previewUrl,
        })),
      });
    } catch (error) {
      console.error('Batch upload images error:', error);
      res.status(500).json({ error: 'Lỗi máy chủ khi tải loạt ảnh lên GitHub.' });
    }
  });

  // 9c. Repository Media Library (List & Delete Images)
  app.get('/api/github/media', async (req: Request, res: Response) => {
    const owner = String(req.query.owner || DEFAULT_OWNER).trim();
    const repo = String(req.query.repo || DEFAULT_REPO).trim();
    const branch = String(req.query.branch || 'main');
    const token = getSessionToken(req);

    if (!owner || !repo) {
      res.json({ items: [] });
      return;
    }

    try {
      const treeResp = await githubRequest<any>(
        `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
        {},
        token
      );
      if (!treeResp.ok || !Array.isArray(treeResp.data?.tree)) {
        res.json({ items: [] });
        return;
      }

      const imageExtRe = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
      const items: MediaAssetItem[] = (treeResp.data.tree as any[])
        .filter((item) => {
          if (item.type !== 'blob' || !item.path) return false;
          const p = String(item.path);
          if (!imageExtRe.test(p)) return false;
          return (
            p.startsWith('public/tainguyen/hinhanh/') ||
            p.startsWith('public/images/') ||
            p.startsWith('assets/') ||
            p.startsWith('static/images/') ||
            p.startsWith('source/images/')
          );
        })
        .map((item) => {
          const p = String(item.path);
          const publicPath = p.startsWith('public/')
            ? '/' + p.slice('public/'.length)
            : p.startsWith('static/')
            ? '/' + p.slice('static/'.length)
            : p.startsWith('source/')
            ? '/' + p.slice('source/'.length)
            : '/' + p;
          return {
            path: p,
            publicPath,
            previewUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${p}`,
            sha: String(item.sha || ''),
            size: Number(item.size || 0),
            name: path.basename(p),
          };
        })
        .sort((a, b) => b.name.localeCompare(a.name));

      res.json({ items });
    } catch (error) {
      console.error('List media assets error:', error);
      res.status(500).json({ items: [], error: 'Không thể tải thư viện ảnh từ GitHub.' });
    }
  });

  app.delete('/api/github/media', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: 'Cần xác thực GitHub để xoá ảnh trên repository.',
      });
      return;
    }

    const { owner = DEFAULT_OWNER, repo = DEFAULT_REPO, branch = 'main', filePath, sha } = req.body || {};
    if (!owner || !repo || !filePath || !sha) {
      res.status(400).json({ error: 'Thiếu thông tin tệp ảnh hoặc SHA để xoá.' });
      return;
    }

    try {
      const result = await githubRequest<any>(
        `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Delete media: ${path.basename(String(filePath))}`,
            sha,
            branch,
          }),
        },
        token
      );
      if (!result.ok) {
        res.status(result.status || 400).json({ error: result.error || 'Không thể xoá ảnh trên GitHub.' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      console.error('Delete media asset error:', error);
      res.status(500).json({ error: 'Lỗi máy chủ khi xoá ảnh.' });
    }
  });

  // 9d. Server-Side Gemini Auto-SEO Optimizer
  app.post('/api/seo/optimize', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        code: 'NO_GEMINI_KEY',
        error: 'GEMINI_API_KEY chưa được cấu hình trên máy chủ.',
      });
      return;
    }

    const { title = '', category = '', markdownBody = '', tags = [] } = req.body || {};
    if (!title && !markdownBody) {
      res.status(400).json({ error: 'Cần ít nhất tiêu đề hoặc nội dung bài viết để tối ưu SEO.' });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const truncatedBody = String(markdownBody).slice(0, 6000);
      const imageMatches = [...String(markdownBody).matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)].map(
        (m, idx) => `#${idx + 1}: alt="${m[1]}" url="${m[2]}"`
      );

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          `Tiêu đề gốc: ${String(title)}`,
          `Danh mục: ${String(category)}`,
          `Tags hiện có: ${Array.isArray(tags) ? tags.join(', ') : ''}`,
          imageMatches.length > 0 ? `Ảnh trong bài:\n${imageMatches.join('\n')}` : '',
          `Nội dung Markdown:\n${truncatedBody}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'Bạn là chuyên gia SEO tiếng Việt cho blog kỹ thuật & tri thức cá nhân. Hãy phân tích bài viết và trả về JSON tối ưu chuẩn Google SEO: seoTitle (50-60 ký tự, hấp dẫn, chứa từ khóa chính), seoDescription (140-158 ký tự, tự nhiên, mời nhấp chuột), slug (không dấu, chữ thường, gạch nối, ngắn gọn), excerpt (120-160 ký tự tóm tắt bài viết), tags (4-5 từ khóa ngắn gọn liên quan nhất), và imageAltSuggestions (mảng mô tả alt tiếng Việt giàu ngữ cảnh theo đúng thứ tự các ảnh thiếu alt trong bài).',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              seoTitle: { type: Type.STRING },
              seoDescription: { type: Type.STRING },
              slug: { type: Type.STRING },
              excerpt: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              imageAltSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['seoTitle', 'seoDescription', 'slug', 'excerpt', 'tags'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      res.json({ ok: true, mode: 'ai', result: parsed });
    } catch (error: any) {
      console.error('Gemini SEO optimize error:', error);
      res.status(error?.status || 500).json({
        error: error?.message || 'Không thể tối ưu SEO bằng Gemini AI lúc này.',
      });
    }
  });

  // 10. Inspect & Publish Site Essentials (RSS, Sitemap, Robots.txt, JSON Feed, 404, .nojekyll)
  app.get('/api/github/site-essentials', async (req: Request, res: Response) => {
    const owner = String(req.query.owner || DEFAULT_OWNER);
    const repo = String(req.query.repo || DEFAULT_REPO);
    const branch = String(req.query.branch || 'main');
    const framework = (String(req.query.framework || 'jekyll') as FrameworkId) || 'jekyll';
    const token = getSessionToken(req);

    try {
      const treeResp = await githubRequest<any>(
        `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
        {},
        token
      );

      const blobs: Array<{ path: string; type: string }> =
        treeResp.ok && treeResp.data?.tree
          ? (treeResp.data.tree as any[]).filter((i) => i.type === 'blob')
          : [];

      const staticRoot =
        framework === 'astro-vn' || framework === 'astro'
          ? 'public'
          : framework === 'hugo'
          ? 'static'
          : framework === 'hexo'
          ? 'source'
          : '';

      const joinStatic = (file: string) => (staticRoot ? `${staticRoot}/${file}` : file);
      const paths = blobs.map((b) => b.path);
      const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
      const basePagesUrl = isUserSite ? `https://${repo}` : `https://${owner}.github.io/${repo}`;

      const rssMatches = paths.filter((p) =>
        /(^|\/)(rss\.xml|feed\.xml|atom\.xml|index\.xml|rss\.xml\.ts|rss\.xml\.js)$/i.test(p)
      );
      const sitemapMatches = paths.filter((p) =>
        /(^|\/)(sitemap\.xml|sitemap-index\.xml|sitemap-0\.xml)$/i.test(p) ||
        p.includes('astro-sitemap')
      );
      const robotsMatches = paths.filter((p) => /(^|\/)robots\.txt$/i.test(p));
      const feedJsonMatches = paths.filter((p) => /(^|\/)feed\.json$/i.test(p));
      const nojekyllMatches = paths.filter((p) => p === '.nojekyll');
      const notFoundMatches = paths.filter((p) => /(^|\/)404\.(html|astro|md)$/i.test(p));

      const files: SiteEssentialFileStatus[] = [
        {
          key: 'rss',
          label: 'RSS 2.0 Feed (rss.xml)',
          description: 'Cho phép độc giả theo dõi bài viết mới qua trình đọc RSS / Feedly.',
          targetPath: joinStatic('rss.xml'),
          exists: rssMatches.length > 0,
          detectedPaths: rssMatches,
          publicUrl: `${basePagesUrl}/rss.xml`,
        },
        {
          key: 'sitemap',
          label: 'Sitemap XML (sitemap.xml)',
          description: 'Bản đồ website giúp Google Search & Bing lập chỉ mục toàn bộ bài viết.',
          targetPath: joinStatic('sitemap.xml'),
          exists: sitemapMatches.length > 0,
          detectedPaths: sitemapMatches,
          publicUrl: `${basePagesUrl}/sitemap.xml`,
        },
        {
          key: 'robots',
          label: 'Robots.txt (robots.txt)',
          description: 'Khai báo quyền thu thập dữ liệu của Bot tìm kiếm và trỏ tới Sitemap.',
          targetPath: joinStatic('robots.txt'),
          exists: robotsMatches.length > 0,
          detectedPaths: robotsMatches,
          publicUrl: `${basePagesUrl}/robots.txt`,
        },
        {
          key: 'feedJson',
          label: 'JSON Feed 1.1 (feed.json)',
          description: 'Chuẩn Feed JSON hiện đại dành cho ứng dụng di động & tích hợp API.',
          targetPath: joinStatic('feed.json'),
          exists: feedJsonMatches.length > 0,
          detectedPaths: feedJsonMatches,
          publicUrl: `${basePagesUrl}/feed.json`,
        },
        {
          key: 'notFound',
          label: 'Trang lỗi 404 tuỳ chỉnh (404.html)',
          description: 'Hiển thị trang dẫn hướng đẹp mắt khi người đọc truy cập link sai.',
          targetPath: joinStatic('404.html'),
          exists: notFoundMatches.length > 0,
          detectedPaths: notFoundMatches,
          publicUrl: `${basePagesUrl}/404.html`,
        },
        {
          key: 'nojekyll',
          label: 'Tệp .nojekyll (Tuỳ chọn)',
          description: 'Tắt bộ xử lý Jekyll mặc định khi repo dùng HTML tĩnh hoặc bản build sẵn.',
          targetPath: '.nojekyll',
          exists: nojekyllMatches.length > 0,
          detectedPaths: nojekyllMatches,
        },
      ];

      const report: SiteEssentialsReport = {
        framework,
        staticRoot,
        files,
      };
      res.json(report);
    } catch (error) {
      console.error('Inspect site essentials error:', error);
      res.status(500).json({ error: 'Không thể kiểm tra tệp SEO/RSS trên repository.' });
    }
  });

  app.post('/api/github/site-essentials/publish', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: 'Cần xác thực GitHub để đồng bộ RSS/Sitemap lên repository.',
      });
      return;
    }

    const {
      owner = DEFAULT_OWNER,
      repo = DEFAULT_REPO,
      branch = 'main',
      commitMessage,
      files = [],
    } = req.body || {};

    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'Chưa có tệp nào được chọn để đồng bộ.' });
      return;
    }

    try {
      const cleanFiles = files
        .filter((f: any) => f?.path && typeof f?.content === 'string')
        .map((f: any) => ({
          path: String(f.path).replace(/^\/+/, ''),
          content: String(f.content),
          isBase64: false,
        }));

      const result = await commitMultipleFilesAtomic({
        owner,
        repo,
        branch,
        files: cleanFiles,
        message:
          commitMessage ||
          `Update SEO & Feed essentials (${cleanFiles.map((f) => path.basename(f.path)).join(', ')})`,
        token,
      });

      if (!result.ok) {
        res.status(result.status || 400).json({
          error: result.error || 'Không thể commit tệp RSS/SEO lên GitHub.',
        });
        return;
      }

      res.json({
        ok: true,
        commit: {
          sha: result.commitSha,
          htmlUrl: result.commitHtmlUrl,
        },
      });
    } catch (error) {
      console.error('Publish site essentials error:', error);
      res.status(500).json({ error: 'Lỗi máy chủ khi xuất bản RSS/Sitemap lên GitHub.' });
    }
  });

  // 10b. Repository Traffic Statistics & Visitor Engagement Metrics (GitHub API)
  app.get('/api/github/insights', async (req: Request, res: Response) => {
    const owner = String(req.query.owner || DEFAULT_OWNER);
    const repo = String(req.query.repo || DEFAULT_REPO);
    const token = getSessionToken(req);

    const mapEventLabel = (ev: any): string => {
      switch (ev?.type) {
        case 'WatchEvent':
          return 'Đã gắn sao (Star) repository';
        case 'ForkEvent':
          return 'Đã Fork repository';
        case 'PushEvent': {
          const commitsCount = ev.payload?.size || ev.payload?.commits?.length || 1;
          return `Đã đẩy ${commitsCount} commit cập nhật`;
        }
        case 'CreateEvent':
          return `Đã tạo ${ev.payload?.ref_type || 'tệp'}${ev.payload?.ref ? ` (${ev.payload.ref})` : ''}`;
        case 'IssuesEvent':
          return `${ev.payload?.action === 'closed' ? 'Đã đóng' : 'Đã mở'} Issue`;
        case 'IssueCommentEvent':
          return 'Đã bình luận trên Issue';
        case 'PullRequestEvent':
          return `Pull Request (${ev.payload?.action || 'updated'})`;
        case 'ReleaseEvent':
          return `Đã phát hành phiên bản ${ev.payload?.release?.tag_name || ''}`.trim();
        default:
          return String(ev?.type || 'Activity').replace(/Event$/, '');
      }
    };

    try {
      const [repoResp, eventsResp, viewsResp, clonesResp, referrersResp, pathsResp] =
        await Promise.all([
          githubRequest<any>(`/repos/${owner}/${repo}`, {}, token),
          githubRequest<any[]>(`/repos/${owner}/${repo}/events?per_page=15`, {}, token),
          token
            ? githubRequest<any>(`/repos/${owner}/${repo}/traffic/views`, {}, token)
            : Promise.resolve({ ok: false, status: 401, data: null, error: 'Unauthorized' }),
          token
            ? githubRequest<any>(`/repos/${owner}/${repo}/traffic/clones`, {}, token)
            : Promise.resolve({ ok: false, status: 401, data: null, error: 'Unauthorized' }),
          token
            ? githubRequest<any[]>(`/repos/${owner}/${repo}/traffic/popular/referrers`, {}, token)
            : Promise.resolve({ ok: false, status: 401, data: null, error: 'Unauthorized' }),
          token
            ? githubRequest<any[]>(`/repos/${owner}/${repo}/traffic/popular/paths`, {}, token)
            : Promise.resolve({ ok: false, status: 401, data: null, error: 'Unauthorized' }),
        ]);

      if (!repoResp.ok || !repoResp.data) {
        res.status(repoResp.status || 404).json({
          error: repoResp.error || `Không thể tải thống kê cho ${owner}/${repo}.`,
        });
        return;
      }

      const r = repoResp.data;
      const trafficAvailable = viewsResp.ok && Boolean(viewsResp.data);
      let trafficNotice: string | undefined;
      if (!token) {
        trafficNotice =
          'Đăng nhập GitHub OAuth với tài khoản chủ sở hữu kho lưu trữ để xem dữ liệu lưu lượng 14 ngày (Traffic Views / Clones).';
      } else if (!viewsResp.ok) {
        trafficNotice =
          viewsResp.status === 403
            ? 'GitHub API chỉ cho phép xem dữ liệu Traffic 14 ngày nếu tài khoản đang đăng nhập có quyền Push/Admin trên repository này.'
            : viewsResp.error || 'Chưa lấy được dữ liệu Traffic từ GitHub API.';
      }

      const recentEvents: EngagementEvent[] =
        eventsResp.ok && Array.isArray(eventsResp.data)
          ? eventsResp.data.slice(0, 12).map((ev: any) => ({
              id: String(ev.id),
              type: String(ev.type || ''),
              actorLogin: ev.actor?.login || owner,
              actorAvatar: ev.actor?.avatar_url,
              actionLabel: mapEventLabel(ev),
              createdAt: ev.created_at || '',
            }))
          : [];

      const payload: RepoInsightsData = {
        owner,
        repo,
        trafficAvailable,
        trafficNotice,
        views:
          viewsResp.ok && viewsResp.data
            ? {
                count: Number(viewsResp.data.count || 0),
                uniques: Number(viewsResp.data.uniques || 0),
                daily: Array.isArray(viewsResp.data.views)
                  ? viewsResp.data.views.map((v: any) => ({
                      timestamp: String(v.timestamp || '').slice(0, 10),
                      count: Number(v.count || 0),
                      uniques: Number(v.uniques || 0),
                    }))
                  : [],
              }
            : null,
        clones:
          clonesResp.ok && clonesResp.data
            ? {
                count: Number(clonesResp.data.count || 0),
                uniques: Number(clonesResp.data.uniques || 0),
                daily: Array.isArray(clonesResp.data.clones)
                  ? clonesResp.data.clones.map((c: any) => ({
                      timestamp: String(c.timestamp || '').slice(0, 10),
                      count: Number(c.count || 0),
                      uniques: Number(c.uniques || 0),
                    }))
                  : [],
              }
            : null,
        referrers:
          referrersResp.ok && Array.isArray(referrersResp.data)
            ? referrersResp.data.map((ref: any) => ({
                referrer: String(ref.referrer || 'Direct'),
                count: Number(ref.count || 0),
                uniques: Number(ref.uniques || 0),
              }))
            : [],
        popularPaths:
          pathsResp.ok && Array.isArray(pathsResp.data)
            ? pathsResp.data.map((p: any) => ({
                path: String(p.path || ''),
                title: String(p.title || p.path || ''),
                count: Number(p.count || 0),
                uniques: Number(p.uniques || 0),
              }))
            : [],
        engagement: {
          stars: Number(r.stargazers_count || 0),
          forks: Number(r.forks_count || 0),
          subscribers: Number(r.subscribers_count ?? r.watchers_count ?? 0),
          openIssues: Number(r.open_issues_count || 0),
          pushedAt: r.pushed_at || r.updated_at || '',
        },
        recentEvents,
        fetchedAt: new Date().toISOString(),
      };

      res.json(payload);
    } catch (error) {
      console.error('Fetch insights error:', error);
      res.status(500).json({ error: 'Không thể tải dữ liệu Site Insights từ GitHub API.' });
    }
  });

  // 10c. Scheduled Post Publishing & Automatic Deletion Endpoints
  app.get('/api/schedules', (req: Request, res: Response) => {
    const owner = req.query.owner ? String(req.query.owner).toLowerCase() : '';
    const repo = req.query.repo ? String(req.query.repo).toLowerCase() : '';
    const all = loadSchedulesFromDisk();
    const filtered =
      owner && repo
        ? all.filter((t) => t.owner.toLowerCase() === owner && t.repo.toLowerCase() === repo)
        : all;
    filtered.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    res.json({ tasks: filtered });
  });

  app.post('/api/schedules', (req: Request, res: Response) => {
    const body = req.body || {};
    const type = body.type === 'delete' ? 'delete' : 'publish';
    const owner = String(body.owner || DEFAULT_OWNER);
    const repo = String(body.repo || DEFAULT_REPO);
    const branch = String(body.branch || 'main');
    const filePath = String(body.filePath || '').trim();
    const title = String(body.title || filePath || 'Bài viết');
    const scheduledAt = String(body.scheduledAt || '');
    const autoDeleteAt = body.autoDeleteAt ? String(body.autoDeleteAt) : undefined;

    if (!filePath || !scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
      res.status(400).json({ error: 'Thiếu đường dẫn tệp hoặc thời gian hẹn giờ không hợp lệ.' });
      return;
    }

    if (type === 'publish' && !body.postPayload) {
      res.status(400).json({ error: 'Thiếu nội dung bài viết cho lịch đăng tự động.' });
      return;
    }

    const newTask: ScheduledTask = {
      id: `${type}-${crypto.randomBytes(4).toString('hex')}`,
      type,
      status: 'pending',
      owner,
      repo,
      branch,
      filePath,
      title,
      scheduledAt: new Date(scheduledAt).toISOString(),
      autoDeleteAt:
        autoDeleteAt && !Number.isNaN(Date.parse(autoDeleteAt))
          ? new Date(autoDeleteAt).toISOString()
          : undefined,
      createdAt: new Date().toISOString(),
      postPayload: body.postPayload,
    };

    const existing = loadSchedulesFromDisk();
    // Avoid duplicate pending delete schedule on same filePath; replace cleanly
    const deduped =
      type === 'delete'
        ? existing.filter(
            (t) =>
              !(
                t.status === 'pending' &&
                t.type === 'delete' &&
                t.owner.toLowerCase() === owner.toLowerCase() &&
                t.repo.toLowerCase() === repo.toLowerCase() &&
                t.filePath === filePath
              )
          )
        : existing;

    const updated = [newTask, ...deduped];
    saveSchedulesToDisk(updated);
    res.json({ ok: true, task: newTask });
  });

  app.patch('/api/schedules/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { scheduledAt, autoDeleteAt } = req.body || {};
    if (!scheduledAt || Number.isNaN(Date.parse(String(scheduledAt)))) {
      res.status(400).json({ error: 'Thời gian hẹn giờ mới không hợp lệ.' });
      return;
    }

    const tasks = loadSchedulesFromDisk();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy lịch trình này.' });
      return;
    }

    tasks[idx] = {
      ...tasks[idx],
      scheduledAt: new Date(String(scheduledAt)).toISOString(),
      ...(autoDeleteAt !== undefined
        ? {
            autoDeleteAt:
              autoDeleteAt && !Number.isNaN(Date.parse(String(autoDeleteAt)))
                ? new Date(String(autoDeleteAt)).toISOString()
                : undefined,
          }
        : {}),
      status: 'pending',
      error: undefined,
    };
    saveSchedulesToDisk(tasks);
    res.json({ ok: true, task: tasks[idx] });
  });

  app.post('/api/schedules/run-due', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: 'Cần xác thực GitHub để thực thi lịch đăng/xoá bài.',
      });
      return;
    }
    const owner = req.body?.owner ? String(req.body.owner) : undefined;
    const repo = req.body?.repo ? String(req.body.repo) : undefined;
    const result = await processDueSchedules(token, owner, repo);
    res.json({ ok: true, ...result });
  });

  app.post('/api/schedules/:id/run', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: 'Cần xác thực GitHub để thực thi ngay tác vụ này.',
      });
      return;
    }

    const { id } = req.params;
    const tasks = loadSchedulesFromDisk();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy tác vụ cần chạy.' });
      return;
    }

    const { updated, spawnedDelete } = await runSingleScheduleTask(tasks[idx], token);
    tasks[idx] = updated;
    const nextTasks = spawnedDelete ? [spawnedDelete, ...tasks] : tasks;
    saveSchedulesToDisk(nextTasks);

    if (updated.status === 'failed') {
      res.status(400).json({ error: updated.error || 'Thực thi tác vụ thất bại.', task: updated });
      return;
    }

    res.json({ ok: true, task: updated, spawnedDelete });
  });

  app.delete('/api/schedules/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const tasks = loadSchedulesFromDisk();
    const next = tasks.filter((t) => t.id !== id);
    saveSchedulesToDisk(next);
    res.json({ ok: true });
  });

  app.get('/api/schedules/github-workflow-status', async (req: Request, res: Response) => {
    const owner = String(req.query.owner || DEFAULT_OWNER);
    const repo = String(req.query.repo || DEFAULT_REPO);
    const branch = String(req.query.branch || 'main');
    const token = getSessionToken(req);

    try {
      const wfResp = await githubRequest<any>(
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

  app.post('/api/schedules/sync-github-workflow', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: 'Cần xác thực GitHub để cài đặt Workflow tự động lên repository.',
      });
      return;
    }

    const { owner = DEFAULT_OWNER, repo = DEFAULT_REPO, branch = 'main' } = req.body || {};

    try {
      const pendingRepoTasks = loadSchedulesFromDisk()
        .filter(
          (t) =>
            t.status === 'pending' &&
            t.owner.toLowerCase() === String(owner).toLowerCase() &&
            t.repo.toLowerCase() === String(repo).toLowerCase()
        )
        .map((t) => ({
          id: t.id,
          type: t.type,
          status: t.status,
          filePath: t.filePath,
          title: t.title,
          scheduledAt: t.scheduledAt,
          autoDeleteAt: t.autoDeleteAt,
          ...(t.type === 'publish' && t.postPayload
            ? { rawContent: buildSerializedPayload({ ...t.postPayload, draft: false }) }
            : {}),
        }));

      const result = await commitMultipleFilesAtomic({
        owner,
        repo,
        branch,
        files: [
          {
            path: '.github/workflows/blogvn-scheduler.yml',
            content: buildGitHubSchedulerWorkflowYaml(),
            isBase64: false,
          },
          {
            path: '.blogvn/schedules.json',
            content: JSON.stringify(pendingRepoTasks, null, 2) + '\n',
            isBase64: false,
          },
        ],
        message: `Đạo Ký: Sync ${pendingRepoTasks.length} scheduled jobs & 24/7 GitHub Actions workflow`,
        token,
      });

      if (!result.ok) {
        res.status(result.status || 400).json({
          error: result.error || 'Không thể cài đặt GitHub Actions Scheduler.',
        });
        return;
      }

      res.json({
        ok: true,
        syncedCount: pendingRepoTasks.length,
        commit: {
          sha: result.commitSha,
          htmlUrl: result.commitHtmlUrl,
        },
      });
    } catch (error) {
      console.error('Sync workflow error:', error);
      res.status(500).json({ error: 'Lỗi máy chủ khi đồng bộ GitHub Actions Scheduler.' });
    }
  });

  // 10d. Per-Repo Website Identity & Deploy Standalone GitHub Pages PWA
  app.get('/api/site-config', (req: Request, res: Response) => {
    const owner = String(req.query.owner || DEFAULT_OWNER);
    const repo = String(req.query.repo || DEFAULT_REPO);
    const all = loadSiteConfigsFromDisk();
    res.json({ config: all[repoConfigKey(owner, repo)] || null });
  });

  app.put('/api/site-config', async (req: Request, res: Response) => {
    const {
      owner = DEFAULT_OWNER,
      repo = DEFAULT_REPO,
      branch = 'main',
      config: incomingCfg = {},
      syncToGitHub = false,
      publishWebApp = false,
      posts = [],
    } = req.body || {};

    const cleanCfg: Partial<BlogConfig> = {
      siteTitle: String(incomingCfg.siteTitle || '').trim() || undefined,
      tagline: String(incomingCfg.tagline || '').trim() || undefined,
      siteIcon: incomingCfg.siteIcon ? String(incomingCfg.siteIcon).trim() : undefined,
      headerTitle: String(incomingCfg.headerTitle || '').trim() || undefined,
      headerNavLinks: Array.isArray(incomingCfg.headerNavLinks)
        ? incomingCfg.headerNavLinks
            .filter((l: any) => l?.label && l?.url)
            .map((l: any) => ({ label: String(l.label).trim(), url: String(l.url).trim() }))
        : [],
      footerText: String(incomingCfg.footerText || '').trim() || undefined,
      footerLinks: Array.isArray(incomingCfg.footerLinks)
        ? incomingCfg.footerLinks
            .filter((l: any) => l?.label && l?.url)
            .map((l: any) => ({ label: String(l.label).trim(), url: String(l.url).trim() }))
        : [],
      authorName: String(incomingCfg.authorName || '').trim() || undefined,
      authorBio: String(incomingCfg.authorBio || '').trim() || undefined,
      authorAvatar: incomingCfg.authorAvatar ? String(incomingCfg.authorAvatar).trim() : undefined,
      themeMode: incomingCfg.themeMode === 'dark' ? 'dark' : 'light',
      astroTemplate: incomingCfg.astroTemplate
        ? normalizeAstroTemplateId(
            String(incomingCfg.astroTemplate),
            incomingCfg.themeMode === 'dark' ? 'dark' : 'light'
          )
        : undefined,
      themeColors: sanitizeThemeCustomColors(incomingCfg.themeColors),
      liveChat:
        incomingCfg.liveChat && typeof incomingCfg.liveChat === 'object'
          ? {
              enabled: Boolean(incomingCfg.liveChat.enabled),
              title: incomingCfg.liveChat.title ? String(incomingCfg.liveChat.title).trim() : undefined,
              welcomeText: incomingCfg.liveChat.welcomeText
                ? String(incomingCfg.liveChat.welcomeText).trim()
                : undefined,
              channels: Array.isArray(incomingCfg.liveChat.channels)
                ? incomingCfg.liveChat.channels.map((ch: any) => ({
                    id: ch.id,
                    enabled: Boolean(ch.enabled),
                    value: String(ch.value || '').trim(),
                    label: ch.label ? String(ch.label).trim() : undefined,
                  }))
                : [],
            }
          : undefined,
      customDomain: incomingCfg.customDomain
        ? String(incomingCfg.customDomain).trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
        : undefined,
      analyticsProvider: ['ga4', 'cloudflare', 'plausible', 'umami'].includes(
        String(incomingCfg.analyticsProvider || '')
      )
        ? incomingCfg.analyticsProvider
        : 'none',
      analyticsId: incomingCfg.analyticsId ? String(incomingCfg.analyticsId).trim() : undefined,
      giscus:
        incomingCfg.giscus && typeof incomingCfg.giscus === 'object'
          ? {
              enabled: Boolean(incomingCfg.giscus.enabled),
              repo: String(incomingCfg.giscus.repo || '').trim(),
              repoId: String(incomingCfg.giscus.repoId || '').trim(),
              category: String(incomingCfg.giscus.category || '').trim(),
              categoryId: String(incomingCfg.giscus.categoryId || '').trim(),
            }
          : undefined,
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
        error: 'Cần xác thực GitHub để đẩy cấu hình lên repository.',
        config: cleanCfg,
      });
      return;
    }

    try {
      const filesToCommit: Array<{ path: string; content: string; isBase64?: boolean }> = publishWebApp
        ? buildStandaloneWebAppFiles({
            owner,
            repo,
            siteConfig: cleanCfg,
            posts: Array.isArray(posts) ? posts : [],
          })
        : [
            {
              path: '.blogvn/site-config.json',
              content: JSON.stringify(cleanCfg, null, 2) + '\n',
              isBase64: false,
            },
          ];

      let astroSynced = false;
      if (!publishWebApp) {
        const astroCfgCheck = await githubRequest<any>(
          `/repos/${owner}/${repo}/contents/src/cau_hinh/trang_web.ts?ref=${encodeURIComponent(branch)}`,
          {},
          token
        );
        if (astroCfgCheck.ok) {
          astroSynced = true;
          const defaultPngB64 = isBundledDefaultSiteIcon(cleanCfg.siteIcon)
            ? readDefaultDaoKyPngBase64()
            : undefined;
          const hasBundledPngFavicon = Boolean(
            cleanCfg.siteIcon?.startsWith('data:image/') || defaultPngB64
          );
          filesToCommit.push(
            {
              path: 'src/cau_hinh/trang_web.ts',
              content: buildAstroSiteConfigModule({
                owner,
                repo,
                config: cleanCfg,
                hasBundledPngFavicon,
              }),
              isBase64: false,
            },
            {
              path: 'src/layouts/BaseLayout.astro',
              content: buildAstroBaseLayoutModule({
                config: cleanCfg,
              }),
              isBase64: false,
            },
            {
              path: 'public/manifest.webmanifest',
              content: buildAstroManifestJson({
                owner,
                repo,
                config: cleanCfg,
                hasBundledPngFavicon,
              }),
              isBase64: false,
            },
            {
              path: 'public/tainguyen/hinhanh/og-default.svg',
              content: buildAstroOgDefaultSvg({
                owner,
                repo,
                config: cleanCfg,
              }),
              isBase64: false,
            }
          );
          if (cleanCfg.customDomain) {
            filesToCommit.push({
              path: 'public/CNAME',
              content: `${cleanCfg.customDomain}\n`,
              isBase64: false,
            });
          }
          if (cleanCfg.siteIcon?.startsWith('data:image/')) {
            filesToCommit.push({
              path: 'public/favicon.png',
              content: cleanCfg.siteIcon.replace(/^data:[^;]+;base64,/, ''),
              isBase64: true,
            });
          } else if (defaultPngB64) {
            filesToCommit.push({
              path: 'public/favicon.png',
              content: defaultPngB64,
              isBase64: true,
            });
          }
        } else if (cleanCfg.customDomain) {
          filesToCommit.push({
            path: 'CNAME',
            content: `${cleanCfg.customDomain}\n`,
            isBase64: false,
          });
        }
      } else if (cleanCfg.customDomain) {
        filesToCommit.push({
          path: 'CNAME',
          content: `${cleanCfg.customDomain}\n`,
          isBase64: false,
        });
      }

      const commitRes = await commitMultipleFilesAtomic({
        owner,
        repo,
        branch,
        files: filesToCommit,
        message: publishWebApp
          ? `Đạo Ký: Xuất bản Web App GitHub Pages & cấu hình nhận dạng (${cleanCfg.siteTitle || repo})`
          : `Đạo Ký: Cập nhật giao diện & cấu hình web (${cleanCfg.siteTitle || repo})`,
        token,
      });

      if (!commitRes.ok) {
        res.status(commitRes.status || 400).json({
          error: commitRes.error || 'Không thể đẩy cấu hình lên GitHub.',
          config: cleanCfg,
        });
        return;
      }

      res.json({
        ok: true,
        astroSynced,
        config: cleanCfg,
        commit: {
          sha: commitRes.commitSha,
          htmlUrl: commitRes.commitHtmlUrl,
        },
      });
    } catch (error) {
      console.error('Save site config error:', error);
      res.status(500).json({ error: 'Lỗi máy chủ khi đẩy cấu hình web lên GitHub.' });
    }
  });

  // 10b. Deploy Clean Vietnamese Astro Blog Template (wipe old files & combine with Site Identity)
  app.post('/api/github/deploy-astro-template', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({
        requiresAuth: true,
        error: 'Vui lòng kết nối GitHub trước khi triển khai template Astro.',
      });
      return;
    }

    const {
      owner = DEFAULT_OWNER,
      repo = DEFAULT_REPO,
      branch,
      config = {},
      templateId,
      preservePosts = false,
    } = req.body || {};

    try {
      let targetBranch = branch ? String(branch) : '';
      if (!targetBranch) {
        const repoResp = await githubRequest<any>(`/repos/${owner}/${repo}`, {}, token);
        targetBranch = repoResp.ok && repoResp.data?.default_branch ? repoResp.data.default_branch : 'main';
      }

      const preservedTreeEntries: Array<{ path: string; sha: string; mode?: string }> = [];
      let preservedPostsCount = 0;

      if (preservePosts === true) {
        const existingTreeResp = await githubRequest<any>(
          `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`,
          {},
          token
        );
        if (existingTreeResp.ok && Array.isArray(existingTreeResp.data?.tree)) {
          const blobs = existingTreeResp.data.tree.filter((i: any) => i.type === 'blob' && i.path && i.sha);
          for (const blob of blobs) {
            const p = String(blob.path);
            const isPost =
              (p.startsWith('src/content/bai_viet/') ||
                p.startsWith('src/content/du_an/') ||
                p.startsWith('src/content/sach/') ||
                p.startsWith('src/content/cua_hang/')) &&
              (p.endsWith('.md') || p.endsWith('.mdx') || p.endsWith('.markdown'));
            const isAsset =
              p.startsWith('public/tainguyen/hinhanh/uploads/') || p.startsWith('public/images/');
            const isBlogvnMeta = p.startsWith('.blogvn/') && p !== '.blogvn/site-config.json';
            if (isPost || isAsset || isBlogvnMeta) {
              preservedTreeEntries.push({ path: p, sha: blob.sha, mode: blob.mode || '100644' });
              if (isPost) preservedPostsCount++;
            }
          }
        }
      }

      const defaultFaviconPngBase64 = isBundledDefaultSiteIcon(config?.siteIcon)
        ? readDefaultDaoKyPngBase64()
        : undefined;

      const files = buildVietnameseAstroTemplateFiles({
        owner,
        repo,
        config,
        templateId: templateId || config?.astroTemplate,
        includeStarterPosts: preservePosts !== true || preservedPostsCount === 0,
        defaultFaviconPngBase64,
      });

      const commitRes = await commitMultipleFilesAtomic({
        owner,
        repo,
        branch: targetBranch,
        files,
        message:
          preservePosts === true && preservedPostsCount > 0
            ? `Đạo Ký: Cập nhật giao diện Astro 5 (giữ nguyên ${preservedPostsCount} bài viết) (${config.siteTitle || repo})`
            : `Đạo Ký: Triển khai Template Astro Đạo Ký sạch & nhận dạng web (${config.siteTitle || repo})`,
        token,
        replaceAllFiles: true,
        preservedTreeEntries,
      });

      if (!commitRes.ok) {
        const rawErr = commitRes.error || '';
        const friendlyErr = rawErr.toLowerCase().includes('workflow')
          ? 'Token GitHub chưa có quyền "workflow" để tạo file GitHub Actions (.github/workflows/deploy-astro.yml). Hãy cấp lại token với quyền repo + workflow.'
          : rawErr || 'Không thể đẩy template Astro lên GitHub.';
        res.status(commitRes.status || 400).json({ error: friendlyErr });
        return;
      }

      // Switch GitHub Pages source to GitHub Actions workflow build_type
      const pagesGet = await githubRequest<any>(`/repos/${owner}/${repo}/pages`, {}, token);
      if (pagesGet.ok) {
        if (pagesGet.data?.build_type !== 'workflow') {
          await githubRequest<any>(
            `/repos/${owner}/${repo}/pages`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ build_type: 'workflow' }),
            },
            token
          );
        }
      } else {
        await githubRequest<any>(
          `/repos/${owner}/${repo}/pages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ build_type: 'workflow' }),
          },
          token
        );
      }

      const isUserSite = String(repo).toLowerCase() === `${String(owner).toLowerCase()}.github.io`;
      const pagesUrl =
        config.pagesUrl ||
        (isUserSite ? `https://${repo}` : `https://${owner}.github.io/${repo}`);

      res.json({
        ok: true,
        pagesUrl,
        preservedCount: preservedPostsCount,
        actionsUrl: `https://github.com/${owner}/${repo}/actions`,
        commit: {
          sha: commitRes.commitSha,
          htmlUrl: commitRes.commitHtmlUrl,
        },
      });
    } catch (error) {
      console.error('Deploy Astro template error:', error);
      res.status(500).json({ error: 'Lỗi máy chủ khi triển khai template Astro Việt.' });
    }
  });

  // 11. Built-in Đạo Ký App SEO endpoints (robots.txt, sitemap.xml, rss.xml)
  app.get('/robots.txt', (req: Request, res: Response) => {
    res.type('text/plain').send(generateRobotsTxt(getBaseAppUrl(req)));
  });

  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const base = getBaseAppUrl(req);
    const xml = generateSitemapXml({
      config: {
        siteTitle: 'Đạo Ký',
        tagline: 'Không gian viết Blog & Quản lý Markdown chuyên sâu',
        authorName: 'Đạo Ký',
        authorBio: '',
        githubOwner: DEFAULT_OWNER,
        githubRepo: DEFAULT_REPO,
        pagesUrl: base,
        themeMode: 'light',
        postsDirectory: '_posts',
      },
      posts: [],
      framework: 'static',
    });
    res.type('application/xml').send(xml);
  });

  app.get('/rss.xml', (req: Request, res: Response) => {
    const base = getBaseAppUrl(req);
    const xml = generateRssXml({
      config: {
        siteTitle: 'Đạo Ký — Không gian viết Blog & Quản lý Markdown',
        tagline:
          'Khởi tạo blog GitHub Pages trong 1 chạm, biên soạn Markdown, nén tải ảnh hàng loạt và xuất bản trực tiếp.',
        authorName: 'Đạo Ký',
        authorBio: '',
        githubOwner: DEFAULT_OWNER,
        githubRepo: DEFAULT_REPO,
        pagesUrl: base,
        themeMode: 'light',
        postsDirectory: '_posts',
      },
      posts: [],
      framework: 'static',
    });
    res.type('application/rss+xml').send(xml);
  });

  // 10c. Official Social API Server-Side Proxy (X API v2 & LinkedIn REST API require server proxy due to browser CORS)
  app.post('/api/social/publish', async (req: Request, res: Response) => {
    const { platform, credentials = {}, payload = {} } = req.body || {};
    const title = String(payload.title || '').trim();
    const excerpt = String(payload.excerpt || '').trim();
    const caption = String(payload.caption || title).trim();
    const url = String(payload.url || '').trim();

    if (!platform || !url) {
      res.status(400).json({ ok: false, message: 'Thiếu thông tin nền tảng hoặc URL bài viết.' });
      return;
    }

    try {
      if (platform === 'x') {
        const accessToken = String(credentials.accessToken || '').trim();
        if (!accessToken) {
          res.status(400).json({ ok: false, message: 'Thiếu X OAuth 2.0 User Access Token.' });
          return;
        }
        const rawText = caption.includes(url) ? caption : `${caption}\n${url}`;
        const tweetText = rawText.length > 275 ? `${rawText.slice(0, 240).trim()}…\n${url}` : rawText;

        const apiRes = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: tweetText }),
        });
        const json: any = await apiRes.json().catch(() => ({}));
        if (!apiRes.ok || !json?.data?.id) {
          res.status(apiRes.status || 400).json({
            ok: false,
            message: json?.detail || json?.title || 'Không thể đăng lên X API v2.',
          });
          return;
        }
        res.json({
          ok: true,
          message: 'Đã đăng bài lên X (Twitter) qua X API v2.',
          postUrl: `https://x.com/i/web/status/${json.data.id}`,
        });
        return;
      }

      if (platform === 'linkedin') {
        const accessToken = String(credentials.accessToken || '').trim();
        const authorUrn = String(credentials.authorUrn || '').trim();
        if (!accessToken || !authorUrn) {
          res.status(400).json({ ok: false, message: 'Thiếu LinkedIn Access Token hoặc Author URN.' });
          return;
        }

        const commentary = caption.includes(url) ? caption : `${caption}\n\n${url}`;
        const apiRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author: authorUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: commentary },
                shareMediaCategory: 'ARTICLE',
                media: [
                  {
                    status: 'READY',
                    originalUrl: url,
                    title: { text: title || 'Bài viết mới' },
                    description: { text: excerpt || caption.slice(0, 180) },
                  },
                ],
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
          }),
        });
        const json: any = await apiRes.json().catch(() => ({}));
        if (!apiRes.ok) {
          res.status(apiRes.status || 400).json({
            ok: false,
            message: json?.message || 'Không thể chia sẻ qua LinkedIn UGC API.',
          });
          return;
        }
        const postId = json?.id || apiRes.headers.get('x-restli-id') || '';
        res.json({
          ok: true,
          message: 'Đã đăng bài lên LinkedIn qua REST API.',
          postUrl: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined,
        });
        return;
      }

      res.status(400).json({ ok: false, message: `Nền tảng "${platform}" hỗ trợ gọi trực tiếp từ trình duyệt.` });
    } catch (err: any) {
      console.error('Social publish proxy error:', err);
      res.status(500).json({ ok: false, message: err?.message || 'Lỗi kết nối API mạng xã hội.' });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: disableHmr ? true : { server: httpServer },
        hmr: !disableHmr,
        ws: disableHmr ? false : { server: httpServer },
      },
      appType: 'spa',
    });

    if (disableHmr) {
      app.get('/@vite/client', async (_req: Request, res: Response, next) => {
        try {
          const transformed = await vite.transformRequest('/@vite/client');
          if (!transformed?.code) return next();
          const safeCode = transformed.code
            .replace('await wsTransport.connect(handlers);', 'return;')
            .replace('await wsTransport.disconnect();', 'return;')
            .replace('wsTransport.send(data);', 'return;');
          res.setHeader('Content-Type', 'application/javascript');
          res.send(safeCode);
        } catch {
          next();
        }
      });
    }

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start background scheduler ticker when server GITHUB_TOKEN is available
  setInterval(() => {
    const serverToken = process.env.GITHUB_TOKEN;
    if (serverToken) {
      processDueSchedules(serverToken).catch((err) => {
        console.error('Background schedule ticker error:', err);
      });
    }
  }, 20000);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Dao Ky Studio listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
