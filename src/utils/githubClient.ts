import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import type {
  AstroTemplateId,
  AuthStatus,
  BlogCollection,
  BlogConfig,
  BlogPost,
  BuildStatusInfo,
  EngagementEvent,
  FrameworkId,
  FrontmatterSchemaHint,
  GitHubRepoInfo,
  GitHubRepoSummary,
  GitHubUser,
  RepoInsightsData,
  RepoStructureInfo,
  ScheduledPostPayload,
  ScheduledTask,
  SiteEssentialFileStatus,
  SiteEssentialsReport,
} from '../types/blog';
import { slugifyVietnamese } from './markdown';
import {
  buildAstroSiteConfigModule,
  buildVietnameseAstroTemplateFiles,
} from './astroTemplate';

// Strictly isolated per Firebase Google UID in browser localStorage
export function getUserStorageKey(uid: string, suffix: string): string {
  return `blogvn_u_${uid}_${suffix}`;
}

let activeUid = '';

export function setActiveSessionUid(uid: string): void {
  activeUid = uid || '';
}

export function getActiveSessionUid(): string {
  return activeUid;
}

export function getStoredGitHubPat(uid = activeUid): string {
  if (!uid || typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(getUserStorageKey(uid, 'gh_pat')) || '';
  } catch {
    return '';
  }
}

export function setStoredGitHubPat(uid: string, token: string): void {
  if (!uid || typeof window === 'undefined') return;
  try {
    const clean = token.trim();
    if (clean) {
      localStorage.setItem(getUserStorageKey(uid, 'gh_pat'), clean);
    } else {
      localStorage.removeItem(getUserStorageKey(uid, 'gh_pat'));
    }
  } catch {
    // ignore storage errors
  }
}

let backendProbePromise: Promise<boolean> | null = null;
let backendAvailableCache: boolean | null = null;

export async function isBackendAvailable(): Promise<boolean> {
  if (backendAvailableCache !== null) return backendAvailableCache;
  if (!backendProbePromise) {
    backendProbePromise = (async () => {
      try {
        const res = await fetch('./api/health', { method: 'GET' }).catch(() => null);
        // Probe /api/auth/status directly as authoritative Express check
        const authRes = await fetch('/api/auth/status', {
          headers: { Accept: 'application/json' },
        });
        const ct = authRes.headers.get('content-type') || '';
        const ok = authRes.ok && ct.includes('application/json');
        backendAvailableCache = ok;
        void res;
        return ok;
      } catch {
        backendAvailableCache = false;
        return false;
      }
    })();
  }
  return backendProbePromise;
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  const clean = b64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

async function ghApiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
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

function detectCollectionFromPath(filePath: string): BlogCollection {
  const lower = filePath.toLowerCase();
  if (lower.startsWith('src/content/du_an/')) return 'du_an';
  if (lower.startsWith('src/content/sach/')) return 'sach';
  if (lower.startsWith('src/content/cua_hang/')) return 'cua_hang';
  return 'bai_viet';
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

function parseMarkdownFileClient(
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
  const fileNameWithExt = filePath.split('/').pop() || filePath;
  const fileName = fileNameWithExt.replace(/\.[^.]+$/, '');
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
    : jekyllDateMatch?.[2] || slugifyVietnamese(fileName || title);

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
    draft: Boolean(frontmatter.nhap ?? frontmatter.draft),
    markdownBody: markdownBody.trim(),
    rawContent,
    path: filePath,
    sha,
    htmlUrl,
    source: 'github',
    rawFrontmatter: frontmatter,
    seoTitle: frontmatter.seo_title ? String(frontmatter.seo_title) : undefined,
    seoDescription: frontmatter.seo_description ? String(frontmatter.seo_description) : undefined,
    canonicalUrl: frontmatter.canonical_url ? String(frontmatter.canonical_url) : undefined,
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
    publishYear: frontmatter.nam_xuat_ban !== undefined ? Number(frontmatter.nam_xuat_ban) : undefined,
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

function serializePostMarkdownClient(
  input: ScheduledPostPayload,
  options: { framework: FrameworkId; isAstroVnPath: boolean }
): string {
  const { framework, isAstroVnPath } = options;
  const schema = input.frontmatterSchema || defaultFrontmatterSchema(framework);
  const safeDesc = input.excerpt || input.title;
  const existing = input.existingFrontmatter || {};

  if (isAstroVnPath) {
    let fm: Record<string, any>;
    const safeCover = input.cover || '/tainguyen/hinhanh/og-default.svg';
    if (input.collection === 'du_an') {
      fm = {
        ...existing,
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
        ...existing,
        tieu_de: input.title,
        tac_gia: input.authorName || 'Tác giả',
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
        ...existing,
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
        ...existing,
        tieu_de: input.title,
        danh_muc: input.category || 'Kỹ thuật',
        chuyen_muc: slugifyVietnamese(input.category || 'ky-thuat'),
        slug: input.slug,
        tags: input.tags,
        mo_ta: safeDesc,
        ngay: input.date,
        anh_bia: safeCover,
        nhap: Boolean(input.draft),
      };
    }
    return `---\n${dumpYaml(fm, { lineWidth: -1 }).trim()}\n---\n\n${input.markdownBody.trim()}\n`;
  }

  const fm: Record<string, any> = { ...existing };
  if (framework === 'jekyll' && !fm.layout) fm.layout = 'post';
  fm[schema.titleKey] = input.title;
  fm[schema.dateKey] = input.date;
  if (schema.categoryKey === 'categories') {
    fm.categories = [input.category || 'Ghi chép'];
  } else {
    fm[schema.categoryKey] = input.category || 'Ghi chép';
  }
  fm.tags = input.tags;
  fm[schema.excerptKey] = safeDesc;
  if (framework === 'astro' || framework === 'hugo' || existing[schema.draftKey] !== undefined || input.draft) {
    fm[schema.draftKey] = Boolean(input.draft);
  }
  if (framework !== 'jekyll' && framework !== 'hugo') {
    fm.slug = input.slug;
  }
  if (input.cover) fm[schema.coverKey] = input.cover;
  else delete fm[schema.coverKey];
  if (input.seoTitle?.trim()) fm.seo_title = input.seoTitle.trim();
  if (input.seoDescription?.trim()) fm.seo_description = input.seoDescription.trim();
  if (input.canonicalUrl?.trim()) fm.canonical_url = input.canonicalUrl.trim();
  if (input.noindex) fm.noindex = true;
  else delete fm.noindex;

  return `---\n${dumpYaml(fm, { lineWidth: -1 }).trim()}\n---\n\n${input.markdownBody.trim()}\n`;
}

async function upsertRepoFileClient(params: {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  content: string;
  isBase64?: boolean;
  message: string;
  token: string;
  sha?: string;
}) {
  let currentSha = params.sha;
  const encodedPath = encodeURIComponent(params.filePath).replace(/%2F/g, '/');
  if (!currentSha) {
    const existing = await ghApiRequest<any>(
      `/repos/${params.owner}/${params.repo}/contents/${encodedPath}?ref=${encodeURIComponent(params.branch)}`,
      {},
      params.token
    );
    if (existing.ok && existing.data?.sha) {
      currentSha = existing.data.sha;
    }
  }

  const body: Record<string, any> = {
    message: params.message,
    content: params.isBase64
      ? params.content.replace(/^data:[^;]+;base64,/, '')
      : utf8ToBase64(params.content),
    branch: params.branch,
  };
  if (currentSha) body.sha = currentSha;

  return ghApiRequest<any>(
    `/repos/${params.owner}/${params.repo}/contents/${encodedPath}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    params.token
  );
}

async function commitMultipleFilesClient(params: {
  owner: string;
  repo: string;
  branch: string;
  files: Array<{ path: string; content: string; isBase64?: boolean }>;
  message: string;
  token: string;
  replaceAllFiles?: boolean;
  preservedTreeEntries?: Array<{ path: string; sha: string; mode?: string }>;
}): Promise<{ ok: boolean; status: number; commitSha?: string; commitHtmlUrl?: string; error?: string }> {
  let refResp = await ghApiRequest<any>(
    `/repos/${params.owner}/${params.repo}/git/ref/heads/${encodeURIComponent(params.branch)}`,
    {},
    params.token
  );

  // If repository is completely empty (no commits yet), bootstrap initial commit first
  if (!refResp.ok || !refResp.data?.object?.sha) {
    if (refResp.status === 404 || refResp.status === 409) {
      await ghApiRequest<any>(
        `/repos/${params.owner}/${params.repo}/contents/.blogvn-init`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Initialize repository',
            content: utf8ToBase64('BlogVN\n'),
            branch: params.branch,
          }),
        },
        params.token
      );
      await new Promise((r) => setTimeout(r, 600));
      refResp = await ghApiRequest<any>(
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
      error: refResp.error || `Không tìm thấy nhánh "${params.branch}".`,
    };
  }
  const headCommitSha = refResp.data.object.sha;
  const commitResp = await ghApiRequest<any>(
    `/repos/${params.owner}/${params.repo}/git/commits/${headCommitSha}`,
    {},
    params.token
  );
  if (!commitResp.ok || !commitResp.data?.tree?.sha) {
    return { ok: false, status: 400, error: 'Không đọc được commit hiện tại.' };
  }

  const blobResults = await Promise.all(
    params.files.map(async (f) => {
      const contentB64 = f.isBase64
        ? f.content.replace(/^data:[^;]+;base64,/, '')
        : utf8ToBase64(f.content);
      const blobResp = await ghApiRequest<any>(
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
      error: failedBlob.blobResp.error || `Lỗi tạo blob cho ${failedBlob.path}`,
    };
  }

  // Omitting base_tree replaces the entire branch tree atomically (wiping all old files except preservedTreeEntries)
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
    treePayload.base_tree = commitResp.data.tree.sha;
  }

  const treeResp = await ghApiRequest<any>(
    `/repos/${params.owner}/${params.repo}/git/trees`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(treePayload),
    },
    params.token
  );
  if (!treeResp.ok || !treeResp.data?.sha) {
    return { ok: false, status: treeResp.status || 400, error: treeResp.error || 'Lỗi tạo Git tree.' };
  }

  const newCommitResp = await ghApiRequest<any>(
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
    return { ok: false, status: newCommitResp.status || 400, error: newCommitResp.error || 'Lỗi tạo Git commit.' };
  }

  const updateRefResp = await ghApiRequest<any>(
    `/repos/${params.owner}/${params.repo}/git/refs/heads/${encodeURIComponent(params.branch)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommitResp.data.sha }),
    },
    params.token
  );
  if (!updateRefResp.ok) {
    return { ok: false, status: updateRefResp.status || 400, error: updateRefResp.error || 'Lỗi cập nhật nhánh.' };
  }

  return {
    ok: true,
    status: 200,
    commitSha: newCommitResp.data.sha,
    commitHtmlUrl: `https://github.com/${params.owner}/${params.repo}/commit/${newCommitResp.data.sha}`,
  };
}

export async function ghGetAuthStatus(uid = activeUid): Promise<AuthStatus> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();

  if (hasBackend) {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data: AuthStatus = await res.json();
        if (data.authenticated) {
          return { ...data, backendAvailable: true };
        }
        // If user also stored a local PAT for direct writes on their device, reflect it
        if (pat) {
          const userResp = await ghApiRequest<GitHubUser>('/user', {}, pat);
          if (userResp.ok && userResp.data) {
            return {
              ...data,
              authenticated: true,
              mode: 'pat',
              backendAvailable: true,
              user: userResp.data,
            };
          }
        }
        return { ...data, backendAvailable: true };
      }
    } catch {
      // fall back to static direct mode
    }
  }

  if (pat) {
    const userResp = await ghApiRequest<GitHubUser>('/user', {}, pat);
    if (userResp.ok && userResp.data) {
      return {
        authenticated: true,
        mode: 'pat',
        oauthConfigured: false,
        backendAvailable: false,
        user: userResp.data,
        targetRepo: {
          owner: userResp.data.login,
          repo: `${userResp.data.login}.github.io`,
          pagesUrl: `https://${userResp.data.login}.github.io`,
        },
      };
    }
  }

  return {
    authenticated: false,
    mode: 'readonly',
    oauthConfigured: false,
    backendAvailable: false,
    user: null,
    targetRepo: {
      owner: 'trungtin87',
      repo: 'trungtin87.github.io',
      pagesUrl: 'https://trungtin87.github.io',
    },
  };
}

export async function ghGetUserRepos(uid = activeUid): Promise<GitHubRepoSummary[]> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch('/api/github/user-repos');
    if (res.ok) {
      const data = await res.json();
      return data.repos || [];
    }
  }
  if (!pat) return [];
  const resp = await ghApiRequest<any[]>(
    '/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator',
    {},
    pat
  );
  if (!resp.ok || !Array.isArray(resp.data)) return [];
  return resp.data
    .map((r) => {
      const ownerLogin = r.owner?.login || '';
      const isUserSite =
        r.name.toLowerCase() === `${ownerLogin.toLowerCase()}.github.io` ||
        r.name.toLowerCase().endsWith('.github.io');
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
        pagesUrl: isUserSite ? `https://${r.name}` : `https://${ownerLogin}.github.io/${r.name}`,
        updatedAt: r.updated_at || '',
      };
    })
    .sort((a, b) => {
      if (a.isUserSite !== b.isUserSite) return a.isUserSite ? -1 : 1;
      if (a.hasPages !== b.hasPages) return a.hasPages ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

export async function ghGetRepoInfo(
  owner: string,
  repo: string,
  uid = activeUid
): Promise<{ ok: boolean; data?: GitHubRepoInfo; error?: string }> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch(
      `/api/github/repo?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
    );
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    return { ok: true, data: json };
  }

  const [repoResp, userResp, commitsResp] = await Promise.all([
    ghApiRequest<any>(`/repos/${owner}/${repo}`, {}, pat || undefined),
    ghApiRequest<any>(`/users/${owner}`, {}, pat || undefined),
    ghApiRequest<any[]>(`/repos/${owner}/${repo}/commits?per_page=8`, {}, pat || undefined),
  ]);
  if (!repoResp.ok || !repoResp.data) {
    return { ok: false, error: repoResp.error || `Không tìm thấy ${owner}/${repo}` };
  }
  const r = repoResp.data;
  const u = userResp.ok ? userResp.data : null;
  const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  return {
    ok: true,
    data: {
      owner,
      repo,
      fullName: r.full_name,
      description: r.description,
      defaultBranch: r.default_branch || 'main',
      htmlUrl: r.html_url,
      pagesUrl: r.homepage || (isUserSite ? `https://${repo}` : `https://${owner}.github.io/${repo}`),
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
      commits:
        commitsResp.ok && Array.isArray(commitsResp.data)
          ? commitsResp.data.map((c: any) => ({
              sha: c.sha,
              message: c.commit?.message || '',
              authorName: c.commit?.author?.name || owner,
              date: c.commit?.author?.date || '',
              htmlUrl: c.html_url,
            }))
          : [],
    },
  };
}

export async function ghGetRepoPosts(
  owner: string,
  repo: string,
  branch: string,
  uid = activeUid
): Promise<{
  ok: boolean;
  posts: BlogPost[];
  config: Partial<BlogConfig> | null;
  structure: RepoStructureInfo | null;
}> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch(
      `/api/github/posts?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branch)}`
    );
    if (res.ok) {
      const json = await res.json();
      return {
        ok: true,
        posts: json.posts || [],
        config: json.config || null,
        structure: json.structure || null,
      };
    }
  }

  const treeResp = await ghApiRequest<any>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    {},
    pat || undefined
  );
  if (!treeResp.ok || !treeResp.data?.tree) {
    return { ok: true, posts: [], config: null, structure: null };
  }

  const blobs = (treeResp.data.tree as any[]).filter((item) => item.type === 'blob');
  const hasAstroTrangWeb = blobs.some((b) => b.path === 'src/cau_hinh/trang_web.ts');
  const hasAstroVnContent = blobs.some((b) => b.path.startsWith('src/content/bai_viet/'));
  const hasAstroContentDir = blobs.some((b) => b.path.startsWith('src/content/'));
  const hasAstroConfig = blobs.some((b) => b.path.startsWith('astro.config.'));
  const hasHexoPosts = blobs.some((b) => b.path.startsWith('source/_posts/'));
  const hasHugoConfig = blobs.some((b) => ['hugo.toml', 'hugo.yaml', 'config.toml'].includes(b.path));
  const hasHugoPosts = blobs.some((b) => b.path.startsWith('content/posts/') || b.path.startsWith('content/blog/'));
  const hasJekyllPosts = blobs.some((b) => b.path.startsWith('_posts/'));
  const hasJekyllConfig = blobs.some((b) => b.path === '_config.yml');
  const hasPostsDir = blobs.some((b) => b.path.startsWith('posts/'));

  const isAstroVn = hasAstroTrangWeb || hasAstroVnContent;
  const isAstro = hasAstroContentDir || hasAstroConfig;
  let framework: FrameworkId = 'static';
  let frameworkLabel = 'Markdown tĩnh';
  let postsDir = 'posts';
  let assetsPrefix = '';
  let uploadDir = 'assets/uploads';
  let publicUploadPrefix = '/assets/uploads';

  if (isAstroVn) {
    framework = 'astro-vn';
    frameworkLabel = 'Astro Blog Việt';
    postsDir = 'src/content/bai_viet';
    assetsPrefix = 'public';
    uploadDir = 'public/tainguyen/hinhanh/uploads';
    publicUploadPrefix = '/tainguyen/hinhanh/uploads';
  } else if (isAstro) {
    framework = 'astro';
    frameworkLabel = 'Astro';
    postsDir = blobs.some((b) => b.path.startsWith('src/content/posts/'))
      ? 'src/content/posts'
      : 'src/content/blog';
    assetsPrefix = 'public';
    uploadDir = 'public/images/uploads';
    publicUploadPrefix = '/images/uploads';
  } else if (hasHexoPosts) {
    framework = 'hexo';
    frameworkLabel = 'Hexo';
    postsDir = 'source/_posts';
    assetsPrefix = 'source';
    uploadDir = 'source/images/uploads';
    publicUploadPrefix = '/images/uploads';
  } else if (hasHugoConfig || hasHugoPosts) {
    framework = 'hugo';
    frameworkLabel = 'Hugo';
    postsDir = blobs.some((b) => b.path.startsWith('content/blog/')) ? 'content/blog' : 'content/posts';
    assetsPrefix = 'static';
    uploadDir = 'static/images/uploads';
    publicUploadPrefix = '/images/uploads';
  } else if (hasJekyllPosts || hasJekyllConfig) {
    framework = 'jekyll';
    frameworkLabel = 'Jekyll';
    postsDir = '_posts';
  }

  const mdFiles = blobs.filter((item) => {
    const lower = String(item.path).toLowerCase();
    if (!lower.endsWith('.md') && !lower.endsWith('.markdown') && !lower.endsWith('.mdx')) return false;
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

  const fetched = await Promise.all(
    mdFiles.slice(0, 40).map(async (f) => {
      const encoded = encodeURIComponent(f.path).replace(/%2F/g, '/');
      const resp = await ghApiRequest<any>(
        `/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`,
        {},
        pat || undefined
      );
      if (!resp.ok || !resp.data?.content) return null;
      return parseMarkdownFileClient(
        base64ToUtf8(resp.data.content),
        f.path,
        resp.data.sha,
        owner,
        repo,
        resp.data.html_url
      );
    })
  );

  const posts = fetched.filter((p): p is BlogPost => p !== null).sort((a, b) => b.date.localeCompare(a.date));

  let remoteConfig: Partial<BlogConfig> | null = null;
  if (blobs.some((b) => b.path === '.blogvn/site-config.json')) {
    const cfgResp = await ghApiRequest<any>(
      `/repos/${owner}/${repo}/contents/.blogvn/site-config.json?ref=${encodeURIComponent(branch)}`,
      {},
      pat || undefined
    );
    if (cfgResp.ok && cfgResp.data?.content) {
      try {
        remoteConfig = JSON.parse(base64ToUtf8(cfgResp.data.content));
      } catch {
        // ignore
      }
    }
  }

  return {
    ok: true,
    posts,
    config: remoteConfig,
    structure: {
      framework,
      frameworkLabel,
      postsDir,
      assetsPrefix,
      uploadDir,
      publicUploadPrefix,
      hasPostsDir,
      hasJekyllPosts,
      hasAstroEngine: isAstroVn,
      hasStaticEngine:
        blobs.some((b) => b.path === 'posts-manifest.json') && blobs.some((b) => b.path === 'index.html'),
      hasConfigFile: blobs.some((b) => b.path === 'blog-config.json'),
      detectedPostsDir: postsDir,
      totalFiles: blobs.length,
      markdownFilesCount: mdFiles.length,
      frontmatterSchema: defaultFrontmatterSchema(framework),
    },
  };
}

export async function ghGetBuildStatus(
  owner: string,
  repo: string,
  uid = activeUid
): Promise<BuildStatusInfo> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    try {
      const res = await fetch(
        `/api/github/build-status?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
      );
      if (res.ok) return await res.json();
    } catch {
      // ignore
    }
  }

  const runsResp = await ghApiRequest<any>(
    `/repos/${owner}/${repo}/actions/runs?per_page=1`,
    {},
    pat || undefined
  );
  const latestRun = runsResp.ok ? runsResp.data?.workflow_runs?.[0] : null;
  if (latestRun) {
    return {
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
  }
  return { status: 'unknown', conclusion: null, workflowName: 'GitHub Pages', updatedAt: '' };
}

export async function ghSavePost(
  payload: ScheduledPostPayload & { existingFrontmatter?: Record<string, any> },
  uid = activeUid
): Promise<{ ok: boolean; post?: BlogPost; commit?: { html_url?: string }; error?: string }> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch('/api/github/posts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error || 'Không thể đăng bài lên GitHub.' };
    return { ok: true, post: json.post, commit: json.commit };
  }

  if (!pat) return { ok: false, error: 'Chưa kết nối GitHub Token cá nhân.' };

  const isAstroVnPath =
    payload.framework === 'astro-vn' ||
    String(payload.filePath).startsWith('src/content/bai_viet/') ||
    String(payload.filePath).startsWith('src/content/du_an/') ||
    String(payload.filePath).startsWith('src/content/sach/') ||
    String(payload.filePath).startsWith('src/content/cua_hang/');

  const rawContent = serializePostMarkdownClient(payload, {
    framework: payload.framework || 'jekyll',
    isAstroVnPath,
  });

  const putRes = await upsertRepoFileClient({
    owner: payload.owner,
    repo: payload.repo,
    branch: payload.branch || 'main',
    filePath: payload.filePath,
    content: rawContent,
    message: payload.commitMessage || `Publish ${payload.title}`,
    token: pat,
    sha: payload.sha,
  });

  if (!putRes.ok || !putRes.data) {
    return { ok: false, error: putRes.error || 'Không thể commit bài viết lên GitHub.' };
  }

  return {
    ok: true,
    post: parseMarkdownFileClient(
      rawContent,
      payload.filePath,
      putRes.data.content?.sha || '',
      payload.owner,
      payload.repo,
      putRes.data.content?.html_url
    ),
    commit: { html_url: putRes.data.commit?.html_url },
  };
}

export async function ghDeletePost(
  params: { owner: string; repo: string; branch: string; filePath: string; sha: string },
  uid = activeUid
): Promise<{ ok: boolean; error?: string }> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch('/api/github/posts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: json.error };
  }

  if (!pat) return { ok: false, error: 'Chưa kết nối GitHub Token.' };
  const encoded = encodeURIComponent(params.filePath).replace(/%2F/g, '/');
  const res = await ghApiRequest<any>(
    `/repos/${params.owner}/${params.repo}/contents/${encoded}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Delete ${params.filePath}`,
        sha: params.sha,
        branch: params.branch,
      }),
    },
    pat
  );
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function ghUploadSingleImage(
  params: {
    owner: string;
    repo: string;
    branch?: string;
    filename: string;
    base64Data: string;
    isAstroRepo?: boolean;
    uploadDir?: string;
    publicUploadPrefix?: string;
  },
  uid = activeUid
): Promise<{ repoPath: string; publicPath: string; previewUrl: string }> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const response = await fetch('/api/github/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Tải ảnh lên GitHub thất bại.');
    return { repoPath: data.repoPath, publicPath: data.publicPath, previewUrl: data.previewUrl };
  }

  if (!pat) throw new Error('Vui lòng kết nối GitHub Token để tải ảnh lên repository.');

  const branch = params.branch || 'main';
  const cleanUploadDir = params.uploadDir
    ? params.uploadDir.replace(/^\/+|\/+$/g, '')
    : params.isAstroRepo
    ? 'public/tainguyen/hinhanh/uploads'
    : 'assets/uploads';
  const cleanPublicPrefix = params.publicUploadPrefix
    ? '/' + params.publicUploadPrefix.replace(/^\/+|\/+$/g, '')
    : params.isAstroRepo
    ? '/tainguyen/hinhanh/uploads'
    : '/assets/uploads';

  const ext = (params.filename.match(/\.([a-zA-Z0-9]+)$/)?.[1] || 'webp').toLowerCase();
  const baseName = slugifyVietnamese(params.filename.replace(/\.[^.]+$/, '')) || 'image';
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 8);
  const finalName = `${stamp}-${baseName}-${rand}.${ext}`;
  const repoPath = `${cleanUploadDir}/${finalName}`;
  const publicPath = `${cleanPublicPrefix}/${finalName}`;

  const putRes = await upsertRepoFileClient({
    owner: params.owner,
    repo: params.repo,
    branch,
    filePath: repoPath,
    content: params.base64Data,
    isBase64: true,
    message: `Upload image: ${finalName}`,
    token: pat,
  });

  if (!putRes.ok) throw new Error(putRes.error || 'Không thể tải ảnh lên GitHub.');
  return {
    repoPath,
    publicPath,
    previewUrl: `https://raw.githubusercontent.com/${params.owner}/${params.repo}/${branch}/${repoPath}`,
  };
}

export async function ghUploadImagesBatch(
  params: {
    owner: string;
    repo: string;
    branch?: string;
    isAstroRepo?: boolean;
    uploadDir?: string;
    publicUploadPrefix?: string;
    commitMessage?: string;
    images: Array<{ filename: string; base64Data: string }>;
  },
  uid = activeUid
): Promise<{ commitUrl?: string; results: Array<{ repoPath: string; publicPath: string; previewUrl: string }> }> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const response = await fetch('/api/github/upload-images-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Tải loạt ảnh lên GitHub thất bại.');
    return { commitUrl: data.commit?.htmlUrl, results: data.results || [] };
  }

  if (!pat) throw new Error('Vui lòng kết nối GitHub Token để tải loạt ảnh lên repository.');

  const branch = params.branch || 'main';
  const cleanUploadDir = params.uploadDir
    ? params.uploadDir.replace(/^\/+|\/+$/g, '')
    : params.isAstroRepo
    ? 'public/tainguyen/hinhanh/uploads'
    : 'assets/uploads';
  const cleanPublicPrefix = params.publicUploadPrefix
    ? '/' + params.publicUploadPrefix.replace(/^\/+|\/+$/g, '')
    : params.isAstroRepo
    ? '/tainguyen/hinhanh/uploads'
    : '/assets/uploads';

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prepared = params.images.map((img) => {
    const ext = (img.filename.match(/\.([a-zA-Z0-9]+)$/)?.[1] || 'webp').toLowerCase();
    const baseName = slugifyVietnamese(img.filename.replace(/\.[^.]+$/, '')) || 'image';
    const rand = Math.random().toString(36).slice(2, 8);
    const finalName = `${stamp}-${baseName}-${rand}.${ext}`;
    const repoPath = `${cleanUploadDir}/${finalName}`;
    return {
      repoPath,
      publicPath: `${cleanPublicPrefix}/${finalName}`,
      previewUrl: `https://raw.githubusercontent.com/${params.owner}/${params.repo}/${branch}/${repoPath}`,
      base64Data: img.base64Data,
    };
  });

  const commitRes = await commitMultipleFilesClient({
    owner: params.owner,
    repo: params.repo,
    branch,
    files: prepared.map((p) => ({ path: p.repoPath, content: p.base64Data, isBase64: true })),
    message: params.commitMessage || `Upload ${prepared.length} images via BlogVN`,
    token: pat,
  });

  if (!commitRes.ok) throw new Error(commitRes.error || 'Không thể commit loạt ảnh.');
  return {
    commitUrl: commitRes.commitHtmlUrl,
    results: prepared.map(({ repoPath, publicPath, previewUrl }) => ({ repoPath, publicPath, previewUrl })),
  };
}

export async function ghCreateStarterPagesSite(
  params: { siteTitle: string; repoName: string; tagline: string },
  uid = activeUid
): Promise<{ ok: boolean; owner?: string; repo?: string; pagesUrl?: string; error?: string }> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch('/api/github/create-pages-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    return { ok: true, owner: json.owner, repo: json.repo, pagesUrl: json.pagesUrl };
  }

  if (!pat) return { ok: false, error: 'Chưa kết nối GitHub Token cá nhân.' };
  const userResp = await ghApiRequest<GitHubUser>('/user', {}, pat);
  if (!userResp.ok || !userResp.data?.login) {
    return { ok: false, error: 'Token không hợp lệ hoặc không xác định được người dùng GitHub.' };
  }
  const owner = userResp.data.login;
  const cleanRepo = params.repoName.trim().replace(/[^a-zA-Z0-9._-]/g, '-') || `${owner}.github.io`;
  const finalTitle = params.siteTitle.trim() || `Blog của ${userResp.data.name || owner}`;
  const finalTagline = params.tagline.trim() || 'Ghi chép cá nhân tạo từ BlogVN.';

  let defaultBranch = 'main';
  const createResp = await ghApiRequest<any>(
    '/user/repos',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanRepo, description: finalTagline, private: false, auto_init: true }),
    },
    pat
  );
  if (createResp.ok && createResp.data) {
    defaultBranch = createResp.data.default_branch || 'main';
  } else if (createResp.status === 422) {
    const existing = await ghApiRequest<any>(`/repos/${owner}/${cleanRepo}`, {}, pat);
    if (!existing.ok) return { ok: false, error: createResp.error || 'Không tạo được repository.' };
    defaultBranch = existing.data.default_branch || 'main';
  } else {
    return { ok: false, error: createResp.error || 'Không thể khởi tạo repository.' };
  }

  await new Promise((r) => setTimeout(r, 900));
  const today = new Date().toISOString().slice(0, 10);

  await upsertRepoFileClient({
    owner,
    repo: cleanRepo,
    branch: defaultBranch,
    filePath: '_config.yml',
    content: `title: "${finalTitle.replace(/"/g, '\\"')}"\ndescription: "${finalTagline.replace(/"/g, '\\"')}"\ntheme: minima\n`,
    message: 'Khởi tạo BlogVN (_config.yml)',
    token: pat,
  });
  await upsertRepoFileClient({
    owner,
    repo: cleanRepo,
    branch: defaultBranch,
    filePath: `_posts/${today}-chao-mung-den-voi-blogvn.md`,
    content: `---\nlayout: post\ntitle: "Chào mừng đến với ${finalTitle.replace(/"/g, '\\"')}"\ndate: ${today}\n---\n\nXin chào! Đây là bài viết đầu tiên trên trang GitHub Pages của bạn.\n`,
    message: 'Thêm bài chào mừng',
    token: pat,
  });
  await ghApiRequest<any>(
    `/repos/${owner}/${cleanRepo}/pages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: { branch: defaultBranch, path: '/' } }),
    },
    pat
  );

  const isUserSite = cleanRepo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  return {
    ok: true,
    owner,
    repo: cleanRepo,
    pagesUrl: isUserSite ? `https://${cleanRepo}` : `https://${owner}.github.io/${cleanRepo}`,
  };
}

export async function ghGetSiteEssentials(
  owner: string,
  repo: string,
  branch: string,
  framework: FrameworkId,
  uid = activeUid
): Promise<SiteEssentialsReport | null> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch(
      `/api/github/site-essentials?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branch)}&framework=${encodeURIComponent(framework)}`
    );
    if (res.ok) return await res.json();
  }

  const treeResp = await ghApiRequest<any>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    {},
    pat || undefined
  );
  const paths: string[] =
    treeResp.ok && treeResp.data?.tree
      ? (treeResp.data.tree as any[]).filter((i) => i.type === 'blob').map((b) => b.path)
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
  const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  const basePagesUrl = isUserSite ? `https://${repo}` : `https://${owner}.github.io/${repo}`;

  const files: SiteEssentialFileStatus[] = [
    {
      key: 'rss',
      label: 'RSS 2.0 Feed (rss.xml)',
      description: 'Cho phép độc giả theo dõi bài viết mới qua trình đọc RSS.',
      targetPath: joinStatic('rss.xml'),
      exists: paths.some((p) => /(^|\/)(rss\.xml|feed\.xml|atom\.xml)$/i.test(p)),
      detectedPaths: paths.filter((p) => /(^|\/)(rss\.xml|feed\.xml|atom\.xml)$/i.test(p)),
      publicUrl: `${basePagesUrl}/rss.xml`,
    },
    {
      key: 'sitemap',
      label: 'Sitemap XML (sitemap.xml)',
      description: 'Bản đồ website giúp Google Search lập chỉ mục toàn bộ bài viết.',
      targetPath: joinStatic('sitemap.xml'),
      exists: paths.some((p) => /(^|\/)sitemap\.xml$/i.test(p)),
      detectedPaths: paths.filter((p) => /(^|\/)sitemap\.xml$/i.test(p)),
      publicUrl: `${basePagesUrl}/sitemap.xml`,
    },
    {
      key: 'robots',
      label: 'Robots.txt (robots.txt)',
      description: 'Khai báo quyền thu thập dữ liệu của Bot tìm kiếm.',
      targetPath: joinStatic('robots.txt'),
      exists: paths.some((p) => /(^|\/)robots\.txt$/i.test(p)),
      detectedPaths: paths.filter((p) => /(^|\/)robots\.txt$/i.test(p)),
      publicUrl: `${basePagesUrl}/robots.txt`,
    },
    {
      key: 'feedJson',
      label: 'JSON Feed 1.1 (feed.json)',
      description: 'Chuẩn Feed JSON hiện đại cho ứng dụng di động.',
      targetPath: joinStatic('feed.json'),
      exists: paths.some((p) => /(^|\/)feed\.json$/i.test(p)),
      detectedPaths: paths.filter((p) => /(^|\/)feed\.json$/i.test(p)),
      publicUrl: `${basePagesUrl}/feed.json`,
    },
    {
      key: 'notFound',
      label: 'Trang lỗi 404 tuỳ chỉnh (404.html)',
      description: 'Hiển thị trang dẫn hướng đẹp mắt khi link bị sai.',
      targetPath: joinStatic('404.html'),
      exists: paths.some((p) => /(^|\/)404\.(html|astro|md)$/i.test(p)),
      detectedPaths: paths.filter((p) => /(^|\/)404\.(html|astro|md)$/i.test(p)),
      publicUrl: `${basePagesUrl}/404.html`,
    },
    {
      key: 'nojekyll',
      label: 'Tệp .nojekyll (Tuỳ chọn)',
      description: 'Tắt bộ xử lý Jekyll mặc định khi repo dùng HTML tĩnh.',
      targetPath: '.nojekyll',
      exists: paths.includes('.nojekyll'),
      detectedPaths: paths.filter((p) => p === '.nojekyll'),
    },
  ];
  return { framework, staticRoot, files };
}

export async function ghPublishFiles(
  params: {
    owner: string;
    repo: string;
    branch: string;
    files: Array<{ path: string; content: string; isBase64?: boolean }>;
    message: string;
  },
  uid = activeUid
): Promise<{ ok: boolean; commit?: { sha?: string; htmlUrl?: string }; error?: string }> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch('/api/github/site-essentials/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner: params.owner,
        repo: params.repo,
        branch: params.branch,
        commitMessage: params.message,
        files: params.files,
      }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    return { ok: true, commit: json.commit };
  }

  if (!pat) return { ok: false, error: 'Chưa kết nối GitHub Token cá nhân.' };
  const commitRes = await commitMultipleFilesClient({
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
    files: params.files,
    message: params.message,
    token: pat,
  });
  if (!commitRes.ok) return { ok: false, error: commitRes.error };
  return {
    ok: true,
    commit: { sha: commitRes.commitSha, htmlUrl: commitRes.commitHtmlUrl },
  };
}

export async function ghGetInsights(
  owner: string,
  repo: string,
  uid = activeUid
): Promise<{ ok: boolean; data?: RepoInsightsData; error?: string }> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch(
      `/api/github/insights?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
    );
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error };
    return { ok: true, data: json };
  }

  const [repoResp, eventsResp, viewsResp, clonesResp, referrersResp, pathsResp] = await Promise.all([
    ghApiRequest<any>(`/repos/${owner}/${repo}`, {}, pat || undefined),
    ghApiRequest<any[]>(`/repos/${owner}/${repo}/events?per_page=15`, {}, pat || undefined),
    pat
      ? ghApiRequest<any>(`/repos/${owner}/${repo}/traffic/views`, {}, pat)
      : Promise.resolve({ ok: false, status: 401, data: null, error: 'Unauthorized' }),
    pat
      ? ghApiRequest<any>(`/repos/${owner}/${repo}/traffic/clones`, {}, pat)
      : Promise.resolve({ ok: false, status: 401, data: null, error: 'Unauthorized' }),
    pat
      ? ghApiRequest<any[]>(`/repos/${owner}/${repo}/traffic/popular/referrers`, {}, pat)
      : Promise.resolve({ ok: false, status: 401, data: null, error: 'Unauthorized' }),
    pat
      ? ghApiRequest<any[]>(`/repos/${owner}/${repo}/traffic/popular/paths`, {}, pat)
      : Promise.resolve({ ok: false, status: 401, data: null, error: 'Unauthorized' }),
  ]);

  if (!repoResp.ok || !repoResp.data) {
    return { ok: false, error: repoResp.error || `Không thể tải thống kê cho ${owner}/${repo}.` };
  }

  const r = repoResp.data;
  const recentEvents: EngagementEvent[] =
    eventsResp.ok && Array.isArray(eventsResp.data)
      ? eventsResp.data.slice(0, 12).map((ev: any) => ({
          id: String(ev.id),
          type: String(ev.type || ''),
          actorLogin: ev.actor?.login || owner,
          actorAvatar: ev.actor?.avatar_url,
          actionLabel: String(ev.type || 'Activity').replace(/Event$/, ''),
          createdAt: ev.created_at || '',
        }))
      : [];

  return {
    ok: true,
    data: {
      owner,
      repo,
      trafficAvailable: viewsResp.ok && Boolean(viewsResp.data),
      trafficNotice: !pat
        ? 'Nhập GitHub Token cá nhân ở tab GitHub & App để xem số liệu Traffic Views/Clones.'
        : !viewsResp.ok
        ? 'GitHub API chỉ hiển thị Traffic Views nếu Token thuộc chủ sở hữu kho lưu trữ.'
        : undefined,
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
    },
  };
}

// Per-UID Local Schedule Storage Fallback (used when static GitHub Pages host has no Node server)
function loadLocalSchedules(uid: string): ScheduledTask[] {
  if (!uid || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getUserStorageKey(uid, 'schedules_v1'));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalSchedules(uid: string, tasks: ScheduledTask[]): void {
  if (!uid || typeof window === 'undefined') return;
  try {
    localStorage.setItem(getUserStorageKey(uid, 'schedules_v1'), JSON.stringify(tasks));
  } catch {
    // ignore
  }
}

export async function ghGetSchedules(
  owner: string,
  repo: string,
  uid = activeUid
): Promise<ScheduledTask[]> {
  const hasBackend = await isBackendAvailable();
  if (hasBackend) {
    try {
      const res = await fetch(
        `/api/schedules?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
      );
      if (res.ok) {
        const data = await res.json();
        return data.tasks || [];
      }
    } catch {
      // ignore
    }
  }
  return loadLocalSchedules(uid)
    .filter(
      (t) =>
        t.owner.toLowerCase() === owner.toLowerCase() &&
        t.repo.toLowerCase() === repo.toLowerCase()
    )
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export async function ghCreateSchedule(
  body: any,
  uid = activeUid
): Promise<{ ok: boolean; task?: ScheduledTask; error?: string }> {
  const hasBackend = await isBackendAvailable();
  if (hasBackend) {
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true, task: data.task };
  }

  const newTask: ScheduledTask = {
    id: `${body.type || 'publish'}-${Math.random().toString(36).slice(2, 8)}`,
    type: body.type === 'delete' ? 'delete' : 'publish',
    status: 'pending',
    owner: body.owner,
    repo: body.repo,
    branch: body.branch || 'main',
    filePath: body.filePath,
    title: body.title || body.filePath,
    scheduledAt: new Date(body.scheduledAt).toISOString(),
    autoDeleteAt: body.autoDeleteAt ? new Date(body.autoDeleteAt).toISOString() : undefined,
    createdAt: new Date().toISOString(),
    postPayload: body.postPayload,
  };
  const all = loadLocalSchedules(uid);
  saveLocalSchedules(uid, [newTask, ...all]);
  return { ok: true, task: newTask };
}

export async function ghDeleteSchedule(id: string, uid = activeUid): Promise<void> {
  const hasBackend = await isBackendAvailable();
  if (hasBackend) {
    await fetch(`/api/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return;
  }
  const all = loadLocalSchedules(uid);
  saveLocalSchedules(uid, all.filter((t) => t.id !== id));
}

export async function ghUpdateSchedule(
  id: string,
  scheduledAt: string,
  uid = activeUid
): Promise<{ ok: boolean; error?: string }> {
  const hasBackend = await isBackendAvailable();
  if (hasBackend) {
    const res = await fetch(`/api/schedules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt }),
    });
    const data = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: data.error };
  }
  const all = loadLocalSchedules(uid);
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return { ok: false, error: 'Không tìm thấy lịch trình.' };
  all[idx] = { ...all[idx], scheduledAt, status: 'pending', error: undefined };
  saveLocalSchedules(uid, all);
  return { ok: true };
}

export async function ghRunScheduleNow(
  task: ScheduledTask,
  uid = activeUid
): Promise<{ ok: boolean; commitUrl?: string; error?: string }> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch(`/api/schedules/${encodeURIComponent(task.id)}/run`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true, commitUrl: data.task?.commitUrl };
  }

  if (!pat) return { ok: false, error: 'Chưa kết nối GitHub Token cá nhân.' };
  if (task.type === 'publish' && task.postPayload) {
    const res = await ghSavePost(
      { ...task.postPayload, draft: false, branch: task.branch, owner: task.owner, repo: task.repo },
      uid
    );
    if (!res.ok) return { ok: false, error: res.error };
    const all = loadLocalSchedules(uid).map((t) =>
      t.id === task.id
        ? {
            ...t,
            status: 'completed' as const,
            executedAt: new Date().toISOString(),
            commitUrl: res.commit?.html_url,
          }
        : t
    );
    saveLocalSchedules(uid, all);
    return { ok: true, commitUrl: res.commit?.html_url };
  } else {
    const getResp = await ghApiRequest<any>(
      `/repos/${task.owner}/${task.repo}/contents/${encodeURIComponent(task.filePath).replace(
        /%2F/g,
        '/'
      )}?ref=${encodeURIComponent(task.branch)}`,
      {},
      pat
    );
    if (getResp.ok && getResp.data?.sha) {
      const delRes = await ghDeletePost(
        {
          owner: task.owner,
          repo: task.repo,
          branch: task.branch,
          filePath: task.filePath,
          sha: getResp.data.sha,
        },
        uid
      );
      if (!delRes.ok) return { ok: false, error: delRes.error };
    }
    const all = loadLocalSchedules(uid).map((t) =>
      t.id === task.id
        ? { ...t, status: 'completed' as const, executedAt: new Date().toISOString() }
        : t
    );
    saveLocalSchedules(uid, all);
    return { ok: true };
  }
}

export async function ghRunDueSchedules(
  owner: string,
  repo: string,
  uid = activeUid
): Promise<{ executedCount: number }> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch('/api/schedules/run-due', { method: 'POST' });
    if (res.ok) return await res.json();
    return { executedCount: 0 };
  }
  if (!pat) return { executedCount: 0 };
  const now = Date.now();
  const tasks = loadLocalSchedules(uid);
  let executedCount = 0;
  for (const t of tasks) {
    if (
      t.status === 'pending' &&
      t.owner.toLowerCase() === owner.toLowerCase() &&
      t.repo.toLowerCase() === repo.toLowerCase() &&
      Date.parse(t.scheduledAt) <= now
    ) {
      const r = await ghRunScheduleNow(t, uid);
      if (r.ok) executedCount++;
    }
  }
  return { executedCount };
}

export async function ghCheckSchedulerWorkflow(
  owner: string,
  repo: string,
  branch: string,
  uid = activeUid
): Promise<boolean> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    try {
      const res = await fetch(
        `/api/schedules/github-workflow-status?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branch)}`
      );
      if (res.ok) {
        const data = await res.json();
        return Boolean(data.installed);
      }
    } catch {
      // ignore
    }
  }
  const resp = await ghApiRequest<any>(
    `/repos/${owner}/${repo}/contents/.github/workflows/blogvn-scheduler.yml?ref=${encodeURIComponent(branch)}`,
    {},
    pat || undefined
  );
  return resp.ok;
}

export async function ghSyncSchedulerWorkflow(
  params: { owner: string; repo: string; branch: string },
  uid = activeUid
): Promise<{ ok: boolean; syncedCount?: number; commitUrl?: string; error?: string }> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch('/api/schedules/sync-github-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true, syncedCount: data.syncedCount, commitUrl: data.commit?.htmlUrl };
  }
  if (!pat) return { ok: false, error: 'Chưa kết nối GitHub Token cá nhân.' };

  const pendingRepoTasks = loadLocalSchedules(uid).filter(
    (t) =>
      t.status === 'pending' &&
      t.owner.toLowerCase() === params.owner.toLowerCase() &&
      t.repo.toLowerCase() === params.repo.toLowerCase()
  );

  const workflowYml = `name: BlogVN Scheduled Publish & Auto-Delete\n\non:\n  schedule:\n    - cron: '*/30 * * * *'\n  workflow_dispatch:\n\npermissions:\n  contents: write\n\njobs:\n  run-schedules:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n      - run: |\n          node -e '\n          const fs = require("fs");\n          const path = require("path");\n          const p = ".blogvn/schedules.json";\n          if (!fs.existsSync(p)) process.exit(0);\n          const jobs = JSON.parse(fs.readFileSync(p, "utf8"));\n          let changed = false;\n          for (const j of jobs) {\n            if (j.status !== "pending" || Date.parse(j.scheduledAt) > Date.now()) continue;\n            if (j.type === "publish" && j.rawContent) {\n              fs.mkdirSync(path.dirname(j.filePath), { recursive: true });\n              fs.writeFileSync(j.filePath, j.rawContent, "utf8");\n              j.status = "completed"; j.executedAt = new Date().toISOString(); changed = true;\n            } else if (j.type === "delete" && fs.existsSync(j.filePath)) {\n              fs.unlinkSync(j.filePath);\n              j.status = "completed"; j.executedAt = new Date().toISOString(); changed = true;\n            }\n          }\n          if (changed) fs.writeFileSync(p, JSON.stringify(jobs, null, 2));\n          '\n      - run: |\n          git config user.name "BlogVN Scheduler"\n          git config user.email "actions@users.noreply.github.com"\n          git add -A\n          if ! git diff --staged --quiet; then git commit -m "BlogVN: Scheduled update" && git push; fi\n`;

  const serializedTasks = pendingRepoTasks.map((t) => ({
    id: t.id,
    type: t.type,
    status: t.status,
    filePath: t.filePath,
    title: t.title,
    scheduledAt: t.scheduledAt,
    autoDeleteAt: t.autoDeleteAt,
    ...(t.type === 'publish' && t.postPayload
      ? {
          rawContent: serializePostMarkdownClient(
            { ...t.postPayload, draft: false },
            {
              framework: t.postPayload.framework || 'jekyll',
              isAstroVnPath: String(t.filePath).startsWith('src/content/'),
            }
          ),
        }
      : {}),
  }));

  const res = await commitMultipleFilesClient({
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
    files: [
      { path: '.github/workflows/blogvn-scheduler.yml', content: workflowYml },
      { path: '.blogvn/schedules.json', content: JSON.stringify(serializedTasks, null, 2) + '\n' },
    ],
    message: `BlogVN: Sync ${serializedTasks.length} scheduled jobs`,
    token: pat,
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, syncedCount: serializedTasks.length, commitUrl: res.commitHtmlUrl };
}

export async function ghSaveSiteConfig(
  params: {
    owner: string;
    repo: string;
    branch: string;
    config: BlogConfig;
    syncToGitHub: boolean;
    publishWebApp: boolean;
    posts: BlogPost[];
  },
  uid = activeUid
): Promise<{ ok: boolean; commitUrl?: string; error?: string }> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch('/api/site-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true, commitUrl: data.commit?.htmlUrl };
  }

  if (!params.syncToGitHub && !params.publishWebApp) {
    return { ok: true };
  }
  if (!pat) return { ok: false, error: 'Chưa kết nối GitHub Token cá nhân.' };

  const files: Array<{ path: string; content: string; isBase64?: boolean }> = [
    {
      path: '.blogvn/site-config.json',
      content: JSON.stringify(params.config, null, 2) + '\n',
    },
  ];

  // If this repo uses the Vietnamese Astro template, keep src/cau_hinh/trang_web.ts synced too
  const existingAstroCfg = await ghApiRequest<any>(
    `/repos/${params.owner}/${params.repo}/contents/src/cau_hinh/trang_web.ts?ref=${encodeURIComponent(params.branch)}`,
    {},
    pat
  );
  if (existingAstroCfg.ok) {
    files.push({
      path: 'src/cau_hinh/trang_web.ts',
      content: buildAstroSiteConfigModule({
        owner: params.owner,
        repo: params.repo,
        config: params.config,
      }),
    });
    if (params.config.siteIcon?.startsWith('data:image/')) {
      files.push({
        path: 'public/favicon.png',
        content: params.config.siteIcon.replace(/^data:[^;]+;base64,/, ''),
        isBase64: true,
      });
    }
  }

  if (params.publishWebApp) {
    const title = params.config.siteTitle || params.repo;
    const tagline = params.config.tagline || `Blog ${title}`;
    const headerBrand = params.config.headerTitle || title;
    const footerText = params.config.footerText || `© ${new Date().getFullYear()} ${title}`;
    const iconHref = params.config.siteIcon || './icon.svg';
    const cleanPosts = params.posts.filter((p) => !p.draft).map((p) => ({
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

    files.push(
      { path: '.nojekyll', content: '' },
      {
        path: 'posts-manifest.json',
        content: JSON.stringify({ owner: params.owner, repo: params.repo, posts: cleanPosts }, null, 2) + '\n',
      },
      {
        path: 'manifest.webmanifest',
        content: JSON.stringify(
          {
            name: title,
            short_name: headerBrand.slice(0, 24),
            description: tagline,
            start_url: './',
            display: 'standalone',
            background_color: '#FAFAFA',
            theme_color: '#111827',
            icons: [{ src: iconHref.startsWith('data:') ? './favicon.png' : iconHref, sizes: '512x512', type: 'image/png' }],
          },
          null,
          2
        ) + '\n',
      },
      {
        path: 'index.html',
        content: `<!doctype html><html lang="vi"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title.replace(/</g, '&lt;')}</title><meta name="description" content="${tagline.replace(/"/g, '&quot;')}"/><link rel="manifest" href="./manifest.webmanifest"/><link rel="icon" href="${iconHref}"/><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script><style>body{margin:0;font-family:system-ui,sans-serif;background:#fafafa;color:#111827;line-height:1.65}.wrap{max-width:900px;margin:0 auto;padding:24px 18px}header{border-bottom:1px solid #e5e7eb;padding:14px 0}footer{border-top:1px solid #e5e7eb;padding:20px 0;margin-top:40px;font-size:13px;color:#6b7280}.post{padding:20px 0;border-bottom:1px solid #e5e7eb;cursor:pointer}img{max-width:100%;border-radius:10px}</style></head><body><header><div class="wrap"><strong>${headerBrand.replace(/</g, '&lt;')}</strong></div></header><main class="wrap" id="app"></main><footer><div class="wrap">${footerText.replace(/</g, '&lt;')}</div></footer><script>fetch('./posts-manifest.json').then(r=>r.json()).then(d=>{const app=document.getElementById('app');const posts=d.posts||[];app.innerHTML='<h1>'+${JSON.stringify(title)}+'</h1><p>'+${JSON.stringify(tagline)}+'</p>'+posts.map((p,i)=>'<article class="post" onclick="openP('+i+')"><h2>'+p.title+'</h2><p>'+p.excerpt+'</p></article>').join('');window.openP=i=>{const p=posts[i];app.innerHTML='<button onclick="location.reload()">← Quay lại</button><h1>'+p.title+'</h1>'+(window.marked?marked.parse(p.markdownBody||''):p.markdownBody);};});</script></body></html>`,
      }
    );
    if (params.config.siteIcon?.startsWith('data:image/')) {
      files.push({ path: 'favicon.png', content: params.config.siteIcon.replace(/^data:[^;]+;base64,/, ''), isBase64: true });
    }
  }

  const commitRes = await commitMultipleFilesClient({
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
    files,
    message: params.publishWebApp
      ? `BlogVN: Xuất bản Web App GitHub Pages (${params.config.siteTitle})`
      : `BlogVN: Cập nhật cấu hình nhận dạng (${params.config.siteTitle})`,
    token: pat,
  });
  if (!commitRes.ok) return { ok: false, error: commitRes.error };
  return { ok: true, commitUrl: commitRes.commitHtmlUrl };
}

export async function ghDeployAstroTemplate(
  params: {
    owner: string;
    repo: string;
    branch?: string;
    config: BlogConfig;
    templateId?: AstroTemplateId;
    preservePosts?: boolean;
  },
  uid = activeUid
): Promise<{
  ok: boolean;
  commitUrl?: string;
  actionsUrl?: string;
  pagesUrl?: string;
  preservedCount?: number;
  error?: string;
}> {
  const pat = getStoredGitHubPat(uid);
  const hasBackend = await isBackendAvailable();
  if (hasBackend && !pat) {
    const res = await fetch('/api/github/deploy-astro-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Không thể triển khai template Astro.' };
    return {
      ok: true,
      commitUrl: data.commit?.htmlUrl,
      actionsUrl: data.actionsUrl,
      pagesUrl: data.pagesUrl,
      preservedCount: data.preservedCount,
    };
  }

  if (!pat) return { ok: false, error: 'Chưa kết nối GitHub Token cá nhân.' };

  let targetBranch = params.branch || '';
  if (!targetBranch) {
    const repoResp = await ghApiRequest<any>(`/repos/${params.owner}/${params.repo}`, {}, pat);
    targetBranch = repoResp.ok && repoResp.data?.default_branch ? repoResp.data.default_branch : 'main';
  }

  const preservePosts = params.preservePosts !== false;
  let preservedTreeEntries: Array<{ path: string; sha: string; mode?: string }> = [];
  let preservedPostsCount = 0;

  if (preservePosts) {
    const existingTreeResp = await ghApiRequest<any>(
      `/repos/${params.owner}/${params.repo}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`,
      {},
      pat
    );
    if (existingTreeResp.ok && Array.isArray(existingTreeResp.data?.tree)) {
      const blobs = existingTreeResp.data.tree.filter((i: any) => i.type === 'blob' && i.path && i.sha);
      for (const blob of blobs) {
        const p = String(blob.path);
        const isPost =
          p.startsWith('src/content/bai_viet/') &&
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

  const files = buildVietnameseAstroTemplateFiles({
    owner: params.owner,
    repo: params.repo,
    config: params.config,
    templateId: params.templateId || params.config.astroTemplate,
    includeStarterPosts: !preservePosts || preservedPostsCount === 0,
  });

  const commitRes = await commitMultipleFilesClient({
    owner: params.owner,
    repo: params.repo,
    branch: targetBranch,
    files,
    message:
      preservePosts && preservedPostsCount > 0
        ? `BlogVN: Cập nhật giao diện Astro 5 (giữ nguyên ${preservedPostsCount} bài viết) (${params.config.siteTitle || params.repo})`
        : `BlogVN: Triển khai Template Astro Blog Việt sạch & nhận dạng web (${params.config.siteTitle || params.repo})`,
    token: pat,
    replaceAllFiles: true,
    preservedTreeEntries,
  });

  if (!commitRes.ok) {
    const rawErr = commitRes.error || '';
    if (rawErr.toLowerCase().includes('workflow')) {
      return {
        ok: false,
        error:
          'Token GitHub của bạn chưa có quyền "workflow" để tạo file GitHub Actions (.github/workflows/deploy-astro.yml). Hãy tạo Token mới có tick cả "repo" và "workflow" rồi kết nối lại.',
      };
    }
    return { ok: false, error: rawErr || 'Không thể đẩy template Astro lên GitHub.' };
  }

  // Ensure GitHub Pages uses GitHub Actions workflow build_type
  const pagesGet = await ghApiRequest<any>(`/repos/${params.owner}/${params.repo}/pages`, {}, pat);
  if (pagesGet.ok) {
    if (pagesGet.data?.build_type !== 'workflow') {
      await ghApiRequest<any>(
        `/repos/${params.owner}/${params.repo}/pages`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ build_type: 'workflow' }),
        },
        pat
      );
    }
  } else {
    await ghApiRequest<any>(
      `/repos/${params.owner}/${params.repo}/pages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ build_type: 'workflow' }),
      },
      pat
    );
  }

  const isUserSite = params.repo.toLowerCase() === `${params.owner.toLowerCase()}.github.io`;
  const pagesUrl =
    params.config.pagesUrl ||
    (isUserSite ? `https://${params.repo}` : `https://${params.owner}.github.io/${params.repo}`);

  return {
    ok: true,
    commitUrl: commitRes.commitHtmlUrl,
    actionsUrl: `https://github.com/${params.owner}/${params.repo}/actions`,
    pagesUrl,
    preservedCount: preservedPostsCount,
  };
}


