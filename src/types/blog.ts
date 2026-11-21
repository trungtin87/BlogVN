export type ThemeMode = 'light' | 'dark';

export type WorkspaceTab = 'blog' | 'editor' | 'github';

export type BlogCollection = 'bai_viet' | 'du_an' | 'sach' | 'cua_hang';

export type FrameworkId = 'astro-vn' | 'astro' | 'jekyll' | 'hugo' | 'hexo' | 'static';

export interface FrontmatterSchemaHint {
  titleKey: 'tieu_de' | 'title';
  dateKey: 'ngay' | 'pubDate' | 'date';
  excerptKey: 'mo_ta' | 'description' | 'summary' | 'excerpt';
  coverKey: 'anh_bia' | 'heroImage' | 'image' | 'cover';
  draftKey: 'nhap' | 'draft';
  categoryKey: 'danh_muc' | 'categories' | 'category';
  usesDateInFilename: boolean;
}

export interface BlogTheme {
  id: ThemeMode;
  name: string;
  isDark: boolean;
  fonts: {
    display: string;
    body: string;
    mono: string;
  };
  palette: {
    canvas: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentText: string;
    link: string;
  };
}

export interface ThemeModeColorOverrides {
  canvas?: string;
  surface?: string;
  textPrimary?: string;
  accent?: string;
  link?: string;
}

export interface ThemeCustomColors {
  light?: ThemeModeColorOverrides;
  dark?: ThemeModeColorOverrides;
}

export interface SiteNavLink {
  label: string;
  url: string;
}

export interface BlogPost {
  id: string;
  collection: BlogCollection;
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  cover?: string;
  draft: boolean;
  markdownBody: string;
  rawContent: string;
  path: string;
  sha?: string;
  htmlUrl?: string;
  source: 'github' | 'local' | 'sample';
  updatedAt?: string;
  rawFrontmatter?: Record<string, any>;
  // Optional SEO overrides
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  // Collection-specific optional fields matching src/content/config.ts
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
}

export type AstroTemplateId =
  | 'newyorker-light'
  | 'nytimes-light'
  | 'bbc-dark'
  | 'obsidian-broadsheet'
  | 'espresso-salon'
  | 'monocle-magazine'
  | 'guardian-portal'
  | 'kyoto-folio'
  | 'economist-digest'
  | 'nordic-atlas';

export type LiveChatPlatformId =
  | 'messenger'
  | 'zalo'
  | 'telegram'
  | 'whatsapp'
  | 'tawkto'
  | 'crisp'
  | 'email';

export interface LiveChatChannelConfig {
  id: LiveChatPlatformId;
  enabled: boolean;
  value: string;
  label?: string;
}

export interface LiveChatConfig {
  enabled: boolean;
  title?: string;
  welcomeText?: string;
  channels: LiveChatChannelConfig[];
}

export type SocialPlatformId =
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'threads'
  | 'mastodon'
  | 'bluesky'
  | 'telegram'
  | 'discord';

export interface SocialPlatformCredentials {
  facebook?: {
    enabled: boolean;
    pageId: string;
    pageAccessToken: string;
  };
  linkedin?: {
    enabled: boolean;
    accessToken: string;
    authorUrn: string;
  };
  x?: {
    enabled: boolean;
    accessToken: string;
  };
  threads?: {
    enabled: boolean;
    userId: string;
    accessToken: string;
  };
  mastodon?: {
    enabled: boolean;
    instanceUrl: string;
    accessToken: string;
  };
  bluesky?: {
    enabled: boolean;
    handle: string;
    appPassword: string;
  };
  telegram?: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };
  discord?: {
    enabled: boolean;
    webhookUrl: string;
  };
}

export interface SocialPublishResult {
  platform: SocialPlatformId;
  platformName: string;
  ok: boolean;
  postUrl?: string;
  message: string;
  fallbackShareUrl?: string;
}

export type AnalyticsProviderId = 'none' | 'ga4' | 'cloudflare' | 'plausible' | 'umami';

export interface GiscusConfig {
  enabled: boolean;
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
}

export interface MediaAssetItem {
  path: string;
  publicPath: string;
  previewUrl: string;
  sha: string;
  size: number;
  name: string;
}

export interface BlogConfig {
  siteTitle: string;
  tagline: string;
  siteIcon?: string;
  headerTitle?: string;
  headerNavLinks?: SiteNavLink[];
  footerText?: string;
  footerLinks?: SiteNavLink[];
  authorName: string;
  authorBio: string;
  authorAvatar?: string;
  githubOwner: string;
  githubRepo: string;
  pagesUrl: string;
  themeMode: ThemeMode;
  postsDirectory: string;
  astroTemplate?: AstroTemplateId;
  themeColors?: ThemeCustomColors;
  liveChat?: LiveChatConfig;
  customDomain?: string;
  analyticsProvider?: AnalyticsProviderId;
  analyticsId?: string;
  giscus?: GiscusConfig;
}

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
}

export interface AuthStatus {
  authenticated: boolean;
  mode: 'oauth' | 'pat' | 'env_token' | 'readonly';
  oauthConfigured: boolean;
  backendAvailable?: boolean;
  user: GitHubUser | null;
  targetRepo: {
    owner: string;
    repo: string;
    pagesUrl: string;
  };
}

export interface GitHubCommitInfo {
  sha: string;
  message: string;
  authorName: string;
  date: string;
  htmlUrl: string;
}

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  htmlUrl: string;
  pagesUrl: string;
  updatedAt: string;
  stargazersCount: number;
  isPrivate: boolean;
  ownerProfile: {
    login: string;
    name: string | null;
    avatarUrl: string;
    bio: string | null;
    htmlUrl: string;
    publicRepos: number;
    followers: number;
  } | null;
  commits: GitHubCommitInfo[];
  hasPagesSite: boolean;
}

export interface RepoStructureInfo {
  framework: FrameworkId;
  frameworkLabel: string;
  postsDir: string;
  assetsPrefix: string;
  uploadDir: string;
  publicUploadPrefix: string;
  hasPostsDir: boolean;
  hasJekyllPosts: boolean;
  hasAstroEngine: boolean;
  hasStaticEngine: boolean;
  hasConfigFile: boolean;
  detectedPostsDir: string;
  totalFiles: number;
  markdownFilesCount: number;
  frontmatterSchema: FrontmatterSchemaHint;
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  isPrivate: boolean;
  hasPages: boolean;
  isUserSite: boolean;
  defaultBranch: string;
  pagesUrl: string;
  updatedAt: string;
}

export interface BuildStatusInfo {
  status: 'queued' | 'in_progress' | 'completed' | 'unknown';
  conclusion: 'success' | 'failure' | 'cancelled' | null;
  workflowName: string;
  updatedAt: string;
  htmlUrl?: string;
}

export type SiteEssentialKey =
  | 'rss'
  | 'sitemap'
  | 'robots'
  | 'feedJson'
  | 'nojekyll'
  | 'notFound';

export interface SiteEssentialFileStatus {
  key: SiteEssentialKey;
  label: string;
  description: string;
  targetPath: string;
  exists: boolean;
  detectedPaths: string[];
  publicUrl?: string;
}

export interface SiteEssentialsReport {
  framework: FrameworkId;
  staticRoot: string;
  files: SiteEssentialFileStatus[];
}

export interface TrafficPoint {
  timestamp: string;
  count: number;
  uniques: number;
}

export interface PopularReferrer {
  referrer: string;
  count: number;
  uniques: number;
}

export interface PopularPath {
  path: string;
  title: string;
  count: number;
  uniques: number;
}

export interface EngagementEvent {
  id: string;
  type: string;
  actorLogin: string;
  actorAvatar?: string;
  actionLabel: string;
  createdAt: string;
}

export interface RepoInsightsData {
  owner: string;
  repo: string;
  trafficAvailable: boolean;
  trafficNotice?: string;
  views: {
    count: number;
    uniques: number;
    daily: TrafficPoint[];
  } | null;
  clones: {
    count: number;
    uniques: number;
    daily: TrafficPoint[];
  } | null;
  referrers: PopularReferrer[];
  popularPaths: PopularPath[];
  engagement: {
    stars: number;
    forks: number;
    subscribers: number;
    openIssues: number;
    pushedAt: string;
  };
  recentEvents: EngagementEvent[];
  fetchedAt: string;
}

export type ScheduledTaskType = 'publish' | 'delete';

export type ScheduledTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ScheduledPostPayload {
  owner: string;
  repo: string;
  branch: string;
  collection: BlogCollection;
  filePath: string;
  title: string;
  date: string;
  slug: string;
  category: string;
  tags: string[];
  excerpt: string;
  cover?: string;
  draft: boolean;
  markdownBody: string;
  sha?: string;
  commitMessage?: string;
  framework?: FrameworkId;
  frontmatterSchema?: FrontmatterSchemaHint;
  existingFrontmatter?: Record<string, any>;
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
}

export interface ScheduledTask {
  id: string;
  type: ScheduledTaskType;
  status: ScheduledTaskStatus;
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  title: string;
  scheduledAt: string; // ISO datetime string
  autoDeleteAt?: string; // Optional auto-delete after publish
  createdAt: string;
  executedAt?: string;
  commitUrl?: string;
  error?: string;
  postPayload?: ScheduledPostPayload;
}
