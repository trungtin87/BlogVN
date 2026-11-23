import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cloud,
  Download,
  Edit3,
  ExternalLink,
  FileCode2,
  FolderGit2,
  FolderOpen,
  GitBranch,
  GitCommitHorizontal,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  Palette,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  AuthStatus,
  BlogCollection,
  BlogConfig,
  BlogPost,
  BlogTheme,
  BuildStatusInfo,
  GitHubRepoInfo,
  GitHubRepoSummary,
  RepoStructureInfo,
  ScheduledTask,
} from '../types/blog';
import {
  COLLECTION_LABELS,
  EDITORIAL_THEMES,
  normalizeAstroTemplateId,
  sanitizeThemeCustomColors,
} from '../data/themes';
import { formatDisplayDate } from '../utils/markdown';
import { ghCreateStarterPagesSite, ghDeployAstroTemplate } from '../utils/githubClient';
import {
  exportSiteBackupZip,
  importBackupZip,
  importWordPressXml,
} from '../utils/backupZip';
import { MediaLibraryModal } from './MediaLibraryModal';
import { ResilientImage } from './ResilientImage';
import { PWAInstallButton } from './PWAInstallButton';
import { SiteEssentialsCard } from './SiteEssentialsCard';
import { SiteIdentityCard } from './SiteIdentityCard';
import { ScheduleManagerCard } from './ScheduleManagerCard';
import type { CloudBackupMeta } from '../utils/firestoreSync';

export type SettingsSubTab = 'connect' | 'appearance' | 'site' | 'content';

interface GitHubSyncPanelProps {
  theme: BlogTheme;
  config: BlogConfig;
  firebaseUser: User | null;
  hasPersonalPat: boolean;
  cloudBackupMeta?: CloudBackupMeta;
  isCloudBusy?: boolean;
  authStatus: AuthStatus | null;
  repoInfo: GitHubRepoInfo | null;
  repoStructure: RepoStructureInfo | null;
  buildStatus: BuildStatusInfo | null;
  userRepos: GitHubRepoSummary[];
  posts: BlogPost[];
  postsTotalCount?: number;
  hasMorePosts?: boolean;
  isLoadingMorePosts?: boolean;
  scheduledTasks: ScheduledTask[];
  isLoading: boolean;
  repoError: string | null;
  onRefresh: () => void;
  onLoadMorePosts?: () => void;
  onRefreshSchedules: () => Promise<void>;
  onUpdateConfig: (next: BlogConfig | ((prev: BlogConfig) => BlogConfig)) => void;
  onBackupToCloud?: () => Promise<void>;
  onRestoreFromCloud?: () => Promise<void>;
  onImportPosts?: (posts: BlogPost[]) => void;
  onImportConfig?: (config: Partial<BlogConfig>) => void;
  onDeployedToGitHub?: (message: string, commitUrl?: string) => void;
  onScheduleDeletePost: (post: BlogPost, scheduledAtIso: string) => Promise<void>;
  onEditPost: (post: BlogPost) => void;
  onDeletePost: (post: BlogPost) => Promise<void>;
  onConnectOAuth: () => Promise<void>;
  onLogoutOAuth: () => Promise<void>;
  onSavePersonalPat: (token: string) => Promise<void>;
  onSignOutGoogle: () => Promise<void>;
  onUpdateTargetRepo: (owner: string, repo: string) => void;
  onSiteCreated: (owner: string, repo: string, pagesUrl: string, postsDirectory?: string) => void;
  onClearLocalData: () => Promise<void>;
  focusSectionRequest?: { tab: SettingsSubTab; elementId?: string; nonce: number } | null;
}

const FILTER_TABS: Array<{ id: 'all' | BlogCollection; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'bai_viet', label: 'Bài viết' },
  { id: 'du_an', label: 'Dự án' },
  { id: 'sach', label: 'Sách' },
  { id: 'cua_hang', label: 'Cửa hàng' },
];

export function GitHubSyncPanel({
  theme,
  config,
  firebaseUser,
  hasPersonalPat,
  cloudBackupMeta = { exists: false },
  isCloudBusy = false,
  authStatus,
  repoInfo,
  repoStructure,
  buildStatus,
  userRepos,
  posts,
  postsTotalCount = 0,
  hasMorePosts = false,
  isLoadingMorePosts = false,
  scheduledTasks,
  isLoading,
  repoError,
  onRefresh,
  onLoadMorePosts,
  onRefreshSchedules,
  onUpdateConfig,
  onBackupToCloud,
  onRestoreFromCloud,
  onImportPosts,
  onImportConfig,
  onDeployedToGitHub,
  onScheduleDeletePost,
  onEditPost,
  onDeletePost,
  onConnectOAuth,
  onLogoutOAuth,
  onSavePersonalPat,
  onSignOutGoogle,
  onUpdateTargetRepo,
  onSiteCreated,
  onClearLocalData,
  focusSectionRequest = null,
}: GitHubSyncPanelProps) {
  const { palette, fonts, isDark } = theme;
  const [settingsTab, setSettingsTab] = useState<SettingsSubTab>('connect');
  const [showCommitHistory, setShowCommitHistory] = useState(false);
  const [ownerInput, setOwnerInput] = useState(config.githubOwner);
  const [repoInput, setRepoInput] = useState(config.githubRepo);
  const [patInput, setPatInput] = useState('');
  const [isSavingPat, setIsSavingPat] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [confirmDeletePath, setConfirmDeletePath] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<'all' | BlogCollection>('all');
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  const zipImportRef = useRef<HTMLInputElement | null>(null);
  const wpImportRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingBackup, setIsProcessingBackup] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [cloudActionStatus, setCloudActionStatus] = useState<string | null>(null);
  const [cloudActionError, setCloudActionError] = useState<string | null>(null);
  const [confirmCloudRestore, setConfirmCloudRestore] = useState(false);

  // Auto-delete scheduling modal state for an existing post
  const [scheduleDeleteTarget, setScheduleDeleteTarget] = useState<BlogPost | null>(null);
  const [deleteAtInput, setDeleteAtInput] = useState('');
  const [isSavingDeleteSchedule, setIsSavingDeleteSchedule] = useState(false);

  // One-click new blog state (uses unified Theme settings from config)
  const [newSiteTitle, setNewSiteTitle] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [useAstroVnTemplate, setUseAstroVnTemplate] = useState(true);
  const [isCreatingSite, setIsCreatingSite] = useState(false);
  const [createSiteError, setCreateSiteError] = useState<string | null>(null);

  const activeTemplateId = normalizeAstroTemplateId(config.astroTemplate, config.themeMode);
  const activeTemplateName = EDITORIAL_THEMES[activeTemplateId]?.name || activeTemplateId;

  useEffect(() => {
    setOwnerInput(config.githubOwner);
    setRepoInput(config.githubRepo);
  }, [config.githubOwner, config.githubRepo]);

  useEffect(() => {
    if (!focusSectionRequest) return;
    setSettingsTab(focusSectionRequest.tab);
    if (focusSectionRequest.elementId) {
      const targetId = focusSectionRequest.elementId;
      window.setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [focusSectionRequest]);

  useEffect(() => {
    if (authStatus?.user?.login && !newRepoName) {
      setNewRepoName(`${authStatus.user.login}.github.io`);
      if (!newSiteTitle) {
        setNewSiteTitle(`Blog của ${authStatus.user.name || authStatus.user.login}`);
      }
    }
  }, [authStatus?.user?.login, authStatus?.user?.name]);

  const githubPosts = posts.filter((p) => p.source === 'github');
  const localPosts = posts.filter((p) => p.source === 'local');
  const hasTargetRepo = Boolean(config.githubOwner?.trim() && config.githubRepo?.trim());
  const repoDisplay = hasTargetRepo
    ? `${config.githubOwner}/${config.githubRepo}`
    : 'Chưa chọn repository';

  const filteredGithubPosts = useMemo(() => {
    if (collectionFilter === 'all') return githubPosts;
    return githubPosts.filter((p) => p.collection === collectionFilter);
  }, [githubPosts, collectionFilter]);

  const handleExportZip = async () => {
    setBackupError(null);
    setBackupStatus(null);
    setIsProcessingBackup(true);
    try {
      const res = await exportSiteBackupZip(posts, config);
      setBackupStatus(`Đã xuất tệp sao lưu "${res.fileName}" (${res.count} mục nội dung).`);
    } catch (err: any) {
      setBackupError(err?.message || 'Không thể tạo tệp sao lưu .zip.');
    } finally {
      setIsProcessingBackup(false);
    }
  };

  const handleImportZipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBackupError(null);
    setBackupStatus(null);
    setIsProcessingBackup(true);
    try {
      const result = await importBackupZip(file);
      if (result.config) {
        onImportConfig?.(result.config);
      }
      if (result.posts.length > 0) {
        onImportPosts?.(result.posts);
      }
      setBackupStatus(
        `Đã khôi phục ${result.posts.length} bài viết${
          result.config ? ' và cấu hình website' : ''
        } từ tệp ZIP.`
      );
    } catch (err: any) {
      setBackupError(err?.message || 'Tệp .zip không hợp lệ hoặc bị hỏng.');
    } finally {
      setIsProcessingBackup(false);
    }
  };

  const handleImportWordPressFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBackupError(null);
    setBackupStatus(null);
    setIsProcessingBackup(true);
    try {
      const imported = await importWordPressXml(file);
      if (imported.length === 0) {
        setBackupError('Không tìm thấy bài viết (post/page) hợp lệ trong tệp WordPress XML.');
        return;
      }
      onImportPosts?.(imported);
      setBackupStatus(
        `Đã chuyển đổi ${imported.length} bài viết từ WordPress XML sang Markdown (Bản nháp).`
      );
    } catch (err: any) {
      setBackupError(err?.message || 'Không thể phân tích tệp WordPress .xml.');
    } finally {
      setIsProcessingBackup(false);
    }
  };

  const handleApplyRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerInput.trim() || !repoInput.trim()) return;
    onUpdateTargetRepo(ownerInput.trim(), repoInput.trim());
  };

  const handleCreateStarterSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSiteError(null);
    setIsCreatingSite(true);
    try {
      const data = await ghCreateStarterPagesSite({
        siteTitle: newSiteTitle.trim(),
        repoName: newRepoName.trim(),
        tagline: newTagline.trim(),
      });
      if (!data.ok || !data.owner || !data.repo || !data.pagesUrl) {
        setCreateSiteError(data.error || 'Không thể khởi tạo blog mới trên GitHub.');
        return;
      }

      let postsDir = '_posts';
      if (useAstroVnTemplate) {
        const chosenTheme = EDITORIAL_THEMES[activeTemplateId];
        const nextCfg: BlogConfig = {
          ...config,
          siteTitle: newSiteTitle.trim() || config.siteTitle,
          tagline: newTagline.trim() || config.tagline,
          githubOwner: data.owner,
          githubRepo: data.repo,
          pagesUrl: data.pagesUrl,
          postsDirectory: 'src/content/bai_viet',
          themeMode:
            config.themeMode ||
            (chosenTheme ? (chosenTheme.isDark ? 'dark' : 'light') : 'light'),
          astroTemplate: activeTemplateId,
          themeColors: sanitizeThemeCustomColors(config.themeColors),
        };
        const astroRes = await ghDeployAstroTemplate({
          owner: data.owner,
          repo: data.repo,
          config: nextCfg,
          templateId: activeTemplateId,
          preservePosts: false,
        });
        if (!astroRes.ok) {
          setCreateSiteError(
            astroRes.error ||
              'Đã tạo repo nhưng chưa đẩy được Template Astro Việt. Bạn có thể bấm Cài lại Astro ở tab Giao diện.'
          );
          return;
        }
        onUpdateConfig(nextCfg);
        postsDir = 'src/content/bai_viet';
      }

      onSiteCreated(data.owner, data.repo, data.pagesUrl, postsDir);
    } catch {
      setCreateSiteError('Lỗi mạng khi tạo repository GitHub Pages.');
    } finally {
      setIsCreatingSite(false);
    }
  };

  const handleDelete = async (post: BlogPost) => {
    setDeletingPath(post.path);
    try {
      await onDeletePost(post);
      setConfirmDeletePath(null);
    } finally {
      setDeletingPath(null);
    }
  };

  const renderBuildStatusText = () => {
    if (!buildStatus || buildStatus.status === 'unknown') return 'Chưa có dữ liệu build';
    if (buildStatus.status === 'queued' || buildStatus.status === 'in_progress') {
      return 'Đang build lên web...';
    }
    if (buildStatus.conclusion === 'success') return 'Thành công';
    if (buildStatus.conclusion === 'failure') return 'Lỗi build';
    return 'Đã hoàn tất';
  };

  return (
    <div
      style={{
        backgroundColor: palette.canvas,
        color: palette.textPrimary,
        fontFamily: fonts.body,
      }}
      className="min-h-[calc(100vh-4rem)] pt-8 pb-24 md:py-14"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-6 sm:space-y-8">
        {/* Header + Clean Sub-Navigation */}
        <div
          style={{ borderColor: palette.border }}
          className="pb-5 border-b space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div style={{ color: palette.textMuted, fontFamily: fonts.mono }} className="text-xs mb-1.5">
                Đạo Ký Workspace · {repoDisplay}
              </div>
              <h1 style={{ fontFamily: fonts.display }} className="text-2xl sm:text-3xl font-bold tracking-tight">
                Cài đặt &amp; Cấu hình
              </h1>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.surface,
                color: palette.textPrimary,
              }}
              className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] sm:min-h-[40px] text-sm font-medium rounded-xl border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Đồng bộ GitHub
            </button>
          </div>

          {/* Spacious Category Sub-Tabs */}
          <div
            style={{ borderColor: palette.border, backgroundColor: palette.surface }}
            className="grid grid-cols-2 sm:grid-cols-4 p-1.5 rounded-2xl border gap-1.5"
            role="tablist"
            aria-label="Danh mục cài đặt"
          >
            {(
              [
                { id: 'connect', label: 'Kết nối & Repo', icon: FolderGit2 },
                { id: 'appearance', label: 'Giao diện & Màu', icon: Palette },
                { id: 'site', label: 'Nhận dạng & Chat', icon: Globe },
                { id: 'content', label: 'Bài viết & Sao lưu', icon: Archive },
              ] as const
            ).map((tab) => {
              const active = settingsTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSettingsTab(tab.id)}
                  style={{
                    backgroundColor: active ? palette.accent : 'transparent',
                    color: active ? palette.accentText : palette.textSecondary,
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl cursor-pointer transition-colors whitespace-nowrap"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: CONNECT & REPOSITORY */}
        {settingsTab === 'connect' && (
        <div className="space-y-6">
        {/* Auth & Target Repository Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Authentication Status & Repo Picker Card */}
          <div
            style={{
              borderColor: palette.border,
              backgroundColor: palette.surface,
            }}
            className="lg:col-span-7 rounded-2xl border p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 style={{ fontFamily: fonts.display }} className="text-lg sm:text-xl font-bold">
                  Tài khoản Google &amp; Kết nối GitHub
                </h2>
                <p style={{ color: palette.textSecondary }} className="text-xs sm:text-sm mt-1">
                  Dữ liệu ứng dụng tách biệt theo tài khoản Google và lưu cục bộ trên thiết bị.
                </p>
              </div>
              {authStatus?.authenticated ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
              )}
            </div>

            {/* Active Google Account Session Box */}
            {firebaseUser && (
              <div
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.canvas,
                }}
                className="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {firebaseUser.photoURL ? (
                    <img
                      src={firebaseUser.photoURL}
                      alt={firebaseUser.displayName || 'Google'}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                      className="w-9 h-9 rounded-full border flex items-center justify-center shrink-0"
                    >
                      <UserCheck className="w-4 h-4" style={{ color: palette.link }} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold truncate flex items-center gap-2">
                      <span>{firebaseUser.displayName || 'Người dùng Google'}</span>
                      {cloudBackupMeta?.exists && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <Cloud className="w-3.5 h-3.5" />
                          Có bản sao lưu Cloud
                        </span>
                      )}
                    </div>
                    <div
                      style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                      className="text-[11px] truncate"
                    >
                      {firebaseUser.email || firebaseUser.uid}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onSignOutGoogle}
                  style={{
                    borderColor: palette.border,
                    color: palette.textSecondary,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer hover:text-red-500 whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đổi / Đăng xuất Google
                </button>
              </div>
            )}

            {authStatus?.authenticated ? (
              <div
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.canvas,
                }}
                className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ResilientImage
                    src={authStatus.user?.avatar_url || repoInfo?.ownerProfile?.avatarUrl}
                    alt={authStatus.user?.login || config.githubOwner}
                    fallbackTitle={authStatus.user?.login || config.githubOwner}
                    isDark={isDark}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {authStatus.user?.name || authStatus.user?.login || config.githubOwner}
                    </div>
                    <div
                      style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                      className="text-xs truncate"
                    >
                      @{authStatus.user?.login || config.githubOwner} ·{' '}
                      {authStatus.mode === 'pat'
                        ? 'GitHub Token cá nhân'
                        : authStatus.mode === 'oauth'
                        ? 'Phiên OAuth'
                        : 'Server Token'}
                    </div>
                  </div>
                </div>

                {authStatus.mode === 'pat' ? (
                  <button
                    type="button"
                    onClick={() => onSavePersonalPat('')}
                    style={{
                      borderColor: palette.border,
                      color: palette.textSecondary,
                    }}
                    className="inline-flex items-center gap-1.5 px-3 min-h-[40px] text-xs font-medium rounded-lg border cursor-pointer hover:text-red-500"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Gỡ GitHub Token
                  </button>
                ) : authStatus.mode === 'oauth' ? (
                  <button
                    type="button"
                    onClick={onLogoutOAuth}
                    style={{
                      borderColor: palette.border,
                      color: palette.textSecondary,
                    }}
                    className="inline-flex items-center gap-1.5 px-3 min-h-[40px] text-xs font-medium rounded-lg border cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Đăng xuất OAuth
                  </button>
                ) : (
                  authStatus.oauthConfigured && (
                    <button
                      type="button"
                      onClick={onConnectOAuth}
                      style={{
                        backgroundColor: palette.accent,
                        color: palette.accentText,
                      }}
                      className="px-3.5 min-h-[40px] text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      Đổi tài khoản qua OAuth
                    </button>
                  )
                )}
              </div>
            ) : (
              authStatus?.oauthConfigured && (
                <div
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.canvas,
                  }}
                  className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="text-xs sm:text-sm" style={{ color: palette.textSecondary }}>
                    Nhấn để đăng nhập GitHub qua OAuth — hoặc nhập Token cá nhân bên dưới.
                  </div>
                  <button
                    type="button"
                    onClick={onConnectOAuth}
                    style={{
                      backgroundColor: palette.accent,
                      color: palette.accentText,
                    }}
                    className="px-4 min-h-[44px] text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    Đăng nhập bằng GitHub OAuth
                  </button>
                </div>
              )
            )}

            {/* Personal GitHub Token Box (Works directly on static GitHub Pages without server) */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!patInput.trim()) return;
                setIsSavingPat(true);
                try {
                  await onSavePersonalPat(patInput.trim());
                  setPatInput('');
                } finally {
                  setIsSavingPat(false);
                }
              }}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.canvas,
              }}
              className="p-4 rounded-xl border space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" style={{ color: palette.link }} />
                  GitHub Personal Access Token (Lưu riêng trên máy theo Google UID)
                </span>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=DaoKyBlog"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: palette.link }}
                  className="text-[11px] font-medium underline underline-offset-4 whitespace-nowrap"
                >
                  Tạo Token (repo + workflow)
                </a>
              </div>
              <p style={{ color: palette.textMuted }} className="text-[11px] leading-relaxed">
                Khi chạy trên <strong>GitHub Pages</strong> (không có backend), trình duyệt gọi thẳng GitHub API bằng Token lưu cục bộ của riêng bạn để đăng bài &amp; tải ảnh.
                {hasPersonalPat ? ' (Đang lưu Token cá nhân trên thiết bị này.)' : ''}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={patInput}
                  onChange={(e) => setPatInput(e.target.value)}
                  placeholder="github_pat_... hoặc ghp_..."
                  style={{
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                    fontFamily: fonts.mono,
                  }}
                  className="flex-1 min-w-0 px-3 min-h-[40px] text-xs rounded-lg border"
                />
                <button
                  type="submit"
                  disabled={isSavingPat || !patInput.trim()}
                  style={{
                    backgroundColor: palette.accent,
                    color: palette.accentText,
                  }}
                  className="px-3.5 min-h-[40px] text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-45 whitespace-nowrap"
                >
                  {isSavingPat ? 'Đang kiểm tra...' : 'Lưu & Kết nối'}
                </button>
              </div>
            </form>

            {/* Quick Repo Picker for Authenticated User */}
            {userRepos.length > 0 && (
              <div className="space-y-2 pt-1">
                <span style={{ color: palette.textMuted }} className="text-xs font-medium flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5" />
                  Chọn nhanh Repository của bạn ({userRepos.length})
                </span>
                <div
                  style={{ borderColor: palette.border }}
                  className="max-h-48 overflow-y-auto rounded-xl border divide-y"
                >
                  {userRepos.slice(0, 12).map((repoItem) => {
                    const isSelected =
                      Boolean(config.githubOwner) &&
                      Boolean(config.githubRepo) &&
                      repoItem.owner.toLowerCase() === config.githubOwner.toLowerCase() &&
                      repoItem.name.toLowerCase() === config.githubRepo.toLowerCase();
                    return (
                      <button
                        key={repoItem.id}
                        type="button"
                        onClick={() => onUpdateTargetRepo(repoItem.owner, repoItem.name)}
                        style={{
                          borderColor: palette.border,
                          backgroundColor: isSelected ? palette.canvas : 'transparent',
                        }}
                        className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {repoItem.fullName}
                          </div>
                          <div
                            style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                            className="text-[11px] truncate mt-0.5"
                          >
                            {repoItem.isUserSite
                              ? 'Trang cá nhân (.github.io)'
                              : repoItem.hasPages
                              ? 'GitHub Pages'
                              : 'Repository'}{' '}
                            · {repoItem.isPrivate ? 'Riêng tư' : 'Công khai'}
                          </div>
                        </div>
                        {isSelected && (
                          <span
                            style={{ color: palette.link }}
                            className="text-xs font-semibold shrink-0"
                          >
                            Đang chọn
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Target Repo Manual Switcher & Live Build Status */}
          <div
            style={{
              borderColor: palette.border,
              backgroundColor: palette.surface,
            }}
            className="lg:col-span-5 rounded-2xl border p-5 sm:p-6 space-y-4"
          >
            <h2 style={{ fontFamily: fonts.display }} className="text-lg font-bold">
              Kho lưu trữ &amp; Trạng thái Build
            </h2>

            <form onSubmit={handleApplyRepo} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label style={{ color: palette.textMuted }} className="block text-xs mb-1">
                    Chủ sở hữu (Owner)
                  </label>
                  <input
                    type="text"
                    value={ownerInput}
                    onChange={(e) => setOwnerInput(e.target.value)}
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                      fontFamily: fonts.mono,
                    }}
                    className="w-full px-3 min-h-[44px] sm:min-h-[38px] text-xs rounded-lg border"
                  />
                </div>
                <div>
                  <label style={{ color: palette.textMuted }} className="block text-xs mb-1">
                    Tên Repository
                  </label>
                  <input
                    type="text"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                      fontFamily: fonts.mono,
                    }}
                    className="w-full px-3 min-h-[44px] sm:min-h-[38px] text-xs rounded-lg border"
                  />
                </div>
              </div>
              <button
                type="submit"
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.canvas,
                  color: palette.textPrimary,
                }}
                className="w-full min-h-[44px] sm:min-h-[38px] text-xs font-semibold rounded-xl border cursor-pointer hover:opacity-85"
              >
                Kết nối kho lưu trữ này
              </button>
            </form>

            {repoError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
                {repoError}
              </div>
            )}

            {repoInfo && (
              <div
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.canvas,
                  fontFamily: fonts.mono,
                }}
                className="p-3.5 rounded-xl border text-xs tabular-nums space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: palette.textMuted }}>Nhánh mặc định</span>
                  <span className="inline-flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5" />
                    {repoInfo.defaultBranch}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: palette.textMuted }}>Framework</span>
                  <span className="text-right truncate">
                    {repoStructure?.frameworkLabel ||
                      (repoStructure?.hasAstroEngine
                        ? 'Astro'
                        : repoStructure?.detectedPostsDir === 'content/posts'
                        ? 'Hugo'
                        : repoStructure?.hasJekyllPosts
                        ? 'Jekyll (_posts)'
                        : 'Markdown tĩnh')}
                  </span>
                </div>
                {repoStructure?.postsDir && (
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: palette.textMuted }}>Thư mục bài viết</span>
                    <span className="text-right truncate">{repoStructure.postsDir}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: palette.textMuted }}>Triển khai web</span>
                  <span className="flex items-center gap-1.5">
                    {buildStatus?.htmlUrl ? (
                      <a
                        href={buildStatus.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: palette.link }}
                        className="underline underline-offset-4"
                      >
                        {renderBuildStatusText()}
                      </a>
                    ) : (
                      <span>{renderBuildStatusText()}</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: palette.textMuted }}>Trang GitHub Pages</span>
                  <a
                    href={repoInfo.pagesUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: palette.link }}
                    className="inline-flex items-center gap-1 underline underline-offset-4"
                  >
                    Mở trang <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* One-Click New Blog Creation Card (For New Users) */}
        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
          className="rounded-2xl border p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-start gap-3">
            <div
              style={{
                backgroundColor: palette.canvas,
                borderColor: palette.border,
              }}
              className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
            >
              <PlusCircle className="w-5 h-5" style={{ color: palette.link }} />
            </div>
            <div>
              <h2 style={{ fontFamily: fonts.display }} className="text-lg sm:text-xl font-bold">
                Tạo Blog GitHub Pages mới trong 1 chạm
              </h2>
              <p style={{ color: palette.textSecondary }} className="text-xs sm:text-sm mt-0.5">
                Tự tạo repository, nạp Template Blog Astro 5 tiếng Việt và bật GitHub Pages cho người mới.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateStarterSite} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label style={{ color: palette.textMuted }} className="block text-xs mb-1 font-medium">
                Tên blog của bạn
              </label>
              <input
                type="text"
                value={newSiteTitle}
                onChange={(e) => setNewSiteTitle(e.target.value)}
                placeholder="Nhật ký viết lách"
                style={{
                  backgroundColor: palette.canvas,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                }}
                className="w-full px-3 min-h-[46px] text-sm rounded-xl border"
              />
            </div>

            <div className="md:col-span-3">
              <label style={{ color: palette.textMuted }} className="block text-xs mb-1 font-medium">
                Tên repository GitHub
              </label>
              <input
                type="text"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="ten-ban.github.io"
                style={{
                  backgroundColor: palette.canvas,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                  fontFamily: fonts.mono,
                }}
                className="w-full px-3 min-h-[46px] text-xs sm:text-sm rounded-xl border"
              />
            </div>

            <div className="md:col-span-3">
              <label style={{ color: palette.textMuted }} className="block text-xs mb-1 font-medium">
                Mô tả ngắn (tuỳ chọn)
              </label>
              <input
                type="text"
                value={newTagline}
                onChange={(e) => setNewTagline(e.target.value)}
                placeholder="Chia sẻ ghi chép hằng ngày"
                style={{
                  backgroundColor: palette.canvas,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                }}
                className="w-full px-3 min-h-[46px] text-sm rounded-xl border"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isCreatingSite || !authStatus?.authenticated}
                style={{
                  backgroundColor: palette.accent,
                  color: palette.accentText,
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 min-h-[46px] text-sm font-semibold rounded-xl cursor-pointer disabled:opacity-45 whitespace-nowrap"
              >
                {isCreatingSite ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  'Tạo Blog ngay'
                )}
              </button>
            </div>
          </form>

          <div
            style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
            className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <label className="inline-flex items-center gap-2.5 text-xs sm:text-sm cursor-pointer select-none min-h-[36px]">
              <input
                type="checkbox"
                checked={useAstroVnTemplate}
                onChange={(e) => setUseAstroVnTemplate(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span style={{ color: palette.textSecondary }}>
                Dùng mẫu Astro 5:{' '}
                <strong style={{ color: palette.textPrimary }}>{activeTemplateName}</strong> (
                {config.themeMode === 'dark' ? 'Tối' : 'Sáng'})
              </span>
            </label>

            {useAstroVnTemplate && (
              <button
                type="button"
                onClick={() => setSettingsTab('appearance')}
                style={{ color: palette.link }}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold hover:underline cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <Palette className="w-4 h-4" />
                Chọn mẫu &amp; màu giao diện →
              </button>
            )}
          </div>

          {createSiteError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
              {createSiteError}
            </div>
          )}
        </div>
        </div>
        )}

        {/* TAB 2 & 3 SHARED MOUNTED STATE: APPEARANCE & SITE IDENTITY */}
        <SiteIdentityCard
          theme={theme}
          config={config}
          posts={posts}
          authStatus={authStatus}
          repoInfo={repoInfo}
          repoStructure={repoStructure}
          sectionMode={
            settingsTab === 'appearance'
              ? 'appearance'
              : settingsTab === 'site'
              ? 'site'
              : 'none'
          }
          onUpdateConfig={onUpdateConfig}
          onDeployedToGitHub={onDeployedToGitHub}
          onRefreshRepo={onRefresh}
        />

        {/* TAB 3 ADDITION: SITE SEO ESSENTIALS */}
        {settingsTab === 'site' && (
          <SiteEssentialsCard
            theme={theme}
            config={config}
            posts={posts}
            authStatus={authStatus}
            repoInfo={repoInfo}
            repoStructure={repoStructure}
            onPublished={() => onRefresh()}
          />
        )}

        {/* TAB 4: POSTS, SCHEDULE, CLOUD BACKUP & ARCHIVE */}
        {settingsTab === 'content' && (
        <div className="space-y-6">
        {/* Scheduled Post Publishing & Auto-Delete Queue */}
        <ScheduleManagerCard
          theme={theme}
          config={config}
          authStatus={authStatus}
          repoInfo={repoInfo}
          tasks={scheduledTasks}
          onRefreshTasks={onRefreshSchedules}
          onTasksExecuted={onRefresh}
        />

        {/* Web App Install (PWA) & Local Privacy Control Card */}
        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
          className="rounded-2xl border p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                style={{
                  backgroundColor: palette.canvas,
                  borderColor: palette.border,
                }}
                className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
              >
                <Smartphone className="w-5 h-5" style={{ color: palette.link }} />
              </div>
              <div>
                <h2 style={{ fontFamily: fonts.display }} className="text-lg font-bold">
                  Cài đặt Đạo Ký như Web App (PWA) &amp; Quyền riêng tư
                </h2>
                <p style={{ color: palette.textSecondary }} className="text-xs sm:text-sm mt-1">
                  Chạy trực tiếp trên trình duyệt hoặc ghim thành ứng dụng web (PWA) trên điện thoại và máy tính mà không cần cài gói ứng dụng.
                </p>
              </div>
            </div>
            <PWAInstallButton theme={theme} />
          </div>

          <div
            style={{
              borderColor: palette.border,
              backgroundColor: palette.canvas,
            }}
            className="p-4 sm:p-5 rounded-xl border space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sao lưu Cloud Firestore thủ công từ máy (Local-first)</span>
                </div>
                <p style={{ color: palette.textSecondary }} className="text-xs leading-relaxed">
                  Mọi cấu hình giao diện và bản nháp được lưu trực tiếp trên máy bạn (Local). Cloud Firestore chỉ đóng vai trò <strong>bản sao lưu dự phòng theo tài khoản Google UID</strong> — hệ thống không tự ý đẩy lên Cloud hay tự tải đè xuống máy. GitHub PAT luôn chỉ lưu cục bộ trên trình duyệt.
                </p>
                <div
                  style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                  className="text-[11px] pt-0.5"
                >
                  {cloudBackupMeta?.exists
                    ? cloudBackupMeta.updatedAt
                      ? `Bản sao lưu Cloud gần nhất: ${new Date(
                          cloudBackupMeta.updatedAt
                        ).toLocaleString('vi-VN')}`
                      : 'Đã có bản sao lưu trên Cloud Firestore.'
                    : 'Chưa có bản sao lưu nào trên Cloud cho tài khoản Google này.'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {onBackupToCloud && (
                <button
                  type="button"
                  disabled={isCloudBusy}
                  onClick={async () => {
                    setCloudActionStatus(null);
                    setCloudActionError(null);
                    setConfirmCloudRestore(false);
                    try {
                      await onBackupToCloud();
                      setCloudActionStatus(
                        `Đã sao lưu cấu hình & ${localPosts.length} bản nháp từ máy lên Cloud Firestore.`
                      );
                    } catch (err: any) {
                      setCloudActionError(
                        err?.message || 'Không thể sao lưu dữ liệu lên Cloud Firestore.'
                      );
                    }
                  }}
                  style={{
                    backgroundColor: palette.accent,
                    color: palette.accentText,
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] sm:min-h-[40px] text-xs font-semibold rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                >
                  {isCloudBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Sao lưu Local → Cloud
                </button>
              )}

              {onRestoreFromCloud && !confirmCloudRestore && (
                <button
                  type="button"
                  disabled={isCloudBusy || !cloudBackupMeta?.exists}
                  onClick={() => {
                    setCloudActionStatus(null);
                    setCloudActionError(null);
                    setConfirmCloudRestore(true);
                  }}
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.surface,
                    color: palette.textPrimary,
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] sm:min-h-[40px] text-xs font-semibold rounded-xl border cursor-pointer hover:opacity-85 disabled:opacity-45 whitespace-nowrap"
                >
                  <Download className="w-4 h-4" style={{ color: palette.link }} />
                  Khôi phục Cloud → Máy
                </button>
              )}

              <button
                type="button"
                onClick={onClearLocalData}
                style={{
                  borderColor: palette.border,
                  color: palette.textSecondary,
                }}
                className="inline-flex items-center justify-center px-3.5 min-h-[44px] sm:min-h-[40px] text-xs font-medium rounded-xl border cursor-pointer hover:text-red-500 whitespace-nowrap sm:ml-auto"
              >
                Đăng xuất &amp; Xoá toàn bộ dữ liệu cục bộ
              </button>
            </div>

            {confirmCloudRestore && onRestoreFromCloud && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <span className="text-amber-800 dark:text-amber-200 leading-relaxed">
                  Tải bản sao lưu từ Cloud về sẽ ghi đè cấu hình &amp; bản nháp đang có trên máy này. Bạn chắc chắn muốn khôi phục?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isCloudBusy}
                    onClick={async () => {
                      setCloudActionError(null);
                      try {
                        await onRestoreFromCloud();
                        setConfirmCloudRestore(false);
                        setCloudActionStatus(
                          'Đã khôi phục cấu hình & bản nháp từ Cloud Firestore về máy.'
                        );
                      } catch (err: any) {
                        setCloudActionError(
                          err?.message || 'Không thể khôi phục bản sao lưu từ Cloud Firestore.'
                        );
                      }
                    }}
                    className="px-3.5 min-h-[38px] text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {isCloudBusy ? 'Đang khôi phục...' : 'Xác nhận khôi phục'}
                  </button>
                  <button
                    type="button"
                    disabled={isCloudBusy}
                    onClick={() => setConfirmCloudRestore(false)}
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.surface,
                      color: palette.textPrimary,
                    }}
                    className="px-3 min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer whitespace-nowrap"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            )}

            {cloudActionStatus && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs break-words [overflow-wrap:anywhere]">
                {cloudActionStatus}
              </div>
            )}

            {cloudActionError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs break-words [overflow-wrap:anywhere]">
                {cloudActionError}
              </div>
            )}
          </div>
        </div>

        {/* Media Library, Backup Export/Import (.zip) & WordPress Migration (.xml) */}
        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
          className="rounded-2xl border p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                style={{
                  backgroundColor: palette.canvas,
                  borderColor: palette.border,
                }}
                className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
              >
                <Archive className="w-5 h-5" style={{ color: palette.link }} />
              </div>
              <div>
                <h2 style={{ fontFamily: fonts.display }} className="text-lg sm:text-xl font-bold">
                  Thư viện Media, Sao lưu (.zip) &amp; WordPress (.xml)
                </h2>
                <p style={{ color: palette.textSecondary }} className="text-xs sm:text-sm mt-1">
                  Duyệt ảnh đã tải lên repo, xuất bản sao lưu ZIP hoặc nhập dữ liệu từ WordPress.
                </p>
              </div>
            </div>
          </div>

          <input
            ref={zipImportRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => void handleImportZipFile(e)}
          />
          <input
            ref={wpImportRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            onChange={(e) => void handleImportWordPressFile(e)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setShowMediaLibrary(true)}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.canvas,
                color: palette.textPrimary,
              }}
              className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl border cursor-pointer hover:opacity-85 whitespace-nowrap"
            >
              <FolderOpen className="w-4 h-4" style={{ color: palette.link }} />
              Thư viện Media Repo
            </button>

            <button
              type="button"
              onClick={() => void handleExportZip()}
              disabled={isProcessingBackup}
              style={{
                backgroundColor: palette.accent,
                color: palette.accentText,
              }}
              className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            >
              {isProcessingBackup ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Xuất sao lưu (.zip)
            </button>

            <button
              type="button"
              onClick={() => zipImportRef.current?.click()}
              disabled={isProcessingBackup}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.canvas,
                color: palette.textPrimary,
              }}
              className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl border cursor-pointer hover:opacity-85 disabled:opacity-50 whitespace-nowrap"
            >
              <Upload className="w-4 h-4" />
              Nhập sao lưu (.zip)
            </button>

            <button
              type="button"
              onClick={() => wpImportRef.current?.click()}
              disabled={isProcessingBackup}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.canvas,
                color: palette.textPrimary,
              }}
              className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl border cursor-pointer hover:opacity-85 disabled:opacity-50 whitespace-nowrap"
            >
              <FileCode2 className="w-4 h-4" />
              Nhập WordPress (.xml)
            </button>
          </div>

          {backupStatus && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs">
              {backupStatus}
            </div>
          )}
          {backupError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
              {backupError}
            </div>
          )}
        </div>

        {/* Markdown Files in Repository */}
        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surfaceElevated,
          }}
          className="rounded-2xl border overflow-hidden"
        >
          <div
            style={{ borderColor: palette.border, backgroundColor: palette.surface }}
            className="px-5 sm:px-6 py-4 border-b space-y-3"
          >
            <div>
              <h2 style={{ fontFamily: fonts.display }} className="text-lg font-bold">
                Nội dung Markdown trên GitHub (
                {postsTotalCount > filteredGithubPosts.length && collectionFilter === 'all'
                  ? `${filteredGithubPosts.length}/${postsTotalCount}`
                  : filteredGithubPosts.length}
                )
              </h2>
              <p style={{ color: palette.textMuted }} className="text-xs mt-0.5">
                Chọn bất kỳ tệp nào để chỉnh sửa và commit trực tiếp
              </p>
            </div>

            {githubPosts.some((p) => p.collection !== 'bai_viet') && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {FILTER_TABS.map((tab) => {
                  const active = collectionFilter === tab.id;
                  const count =
                    tab.id === 'all'
                      ? githubPosts.length
                      : githubPosts.filter((p) => p.collection === tab.id).length;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCollectionFilter(tab.id)}
                      style={{
                        backgroundColor: active ? palette.accent : palette.canvas,
                        color: active ? palette.accentText : palette.textSecondary,
                        borderColor: active ? palette.accent : palette.border,
                      }}
                      className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>{tab.label}</span>
                      <span className="tabular-nums opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {filteredGithubPosts.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: palette.textMuted }}>
              Không tìm thấy tệp Markdown nào trong mục đã chọn.
            </div>
          ) : (
            <div style={{ borderColor: palette.border }} className="divide-y">
              {filteredGithubPosts.map((post) => {
                const pendingDelete = scheduledTasks.find(
                  (t) =>
                    t.status === 'pending' &&
                    t.type === 'delete' &&
                    t.filePath === post.path
                );
                return (
                  <div
                    key={post.path}
                    style={{ borderColor: palette.border }}
                    className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm sm:text-base truncate">{post.title}</div>
                      <div
                        style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                        className="text-xs tabular-nums mt-1 flex flex-wrap items-center gap-2"
                      >
                        <span>{COLLECTION_LABELS[post.collection]?.label || 'Bài viết'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-full">{post.path}</span>
                        {post.date && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{formatDisplayDate(post.date)}</span>
                          </>
                        )}
                        {post.draft && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Bản nháp</span>
                          </>
                        )}
                        {pendingDelete && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-600 dark:text-amber-400">
                              Tự xoá:{' '}
                              {new Date(pendingDelete.scheduledAt).toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditPost(post)}
                        style={{
                          borderColor: palette.border,
                          backgroundColor: palette.surface,
                          color: palette.textPrimary,
                        }}
                        className="inline-flex items-center gap-1.5 px-3 min-h-[40px] text-xs font-medium rounded-lg border cursor-pointer hover:opacity-85 whitespace-nowrap"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Biên soạn
                      </button>

                      {authStatus?.authenticated && (
                        <button
                          type="button"
                          onClick={() => {
                            const baseDate = pendingDelete
                              ? new Date(pendingDelete.scheduledAt)
                              : new Date(Date.now() + 24 * 60 * 60 * 1000);
                            const pad = (n: number) => String(n).padStart(2, '0');
                            setDeleteAtInput(
                              `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(
                                baseDate.getDate()
                              )}T${pad(baseDate.getHours())}:${pad(baseDate.getMinutes())}`
                            );
                            setScheduleDeleteTarget(post);
                          }}
                          style={{
                            borderColor: pendingDelete ? palette.link : palette.border,
                            color: pendingDelete ? palette.link : palette.textSecondary,
                          }}
                          className="inline-flex items-center gap-1.5 px-3 min-h-[40px] text-xs font-medium rounded-lg border hover:opacity-85 cursor-pointer whitespace-nowrap"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {pendingDelete ? 'Đổi giờ xoá' : 'Hẹn xoá'}
                        </button>
                      )}

                      {post.htmlUrl && (
                        <a
                          href={post.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            borderColor: palette.border,
                            color: palette.textSecondary,
                          }}
                          className="inline-flex items-center gap-1 px-3 min-h-[40px] text-xs font-medium rounded-lg border hover:opacity-85 whitespace-nowrap"
                        >
                          GitHub <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {authStatus?.authenticated && post.sha && (
                        confirmDeletePath === post.path ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(post)}
                            disabled={deletingPath === post.path}
                            className="px-3 min-h-[40px] text-xs font-semibold rounded-lg bg-red-600 text-white cursor-pointer whitespace-nowrap"
                          >
                            {deletingPath === post.path ? 'Đang xoá...' : 'Xác nhận xoá'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePath(post.path)}
                            aria-label={`Xoá ${post.title}`}
                            style={{ borderColor: palette.border, color: palette.textMuted }}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasMorePosts && onLoadMorePosts && (
            <div
              style={{ borderColor: palette.border, backgroundColor: palette.surface }}
              className="px-5 sm:px-6 py-4 border-t flex items-center justify-between gap-3"
            >
              <span style={{ color: palette.textMuted }} className="text-xs tabular-nums">
                Đang hiển thị {githubPosts.length} / {postsTotalCount} tệp bài viết
              </span>
              <button
                type="button"
                onClick={onLoadMorePosts}
                disabled={isLoadingMorePosts}
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.canvas,
                  color: palette.textPrimary,
                }}
                className="inline-flex items-center gap-2 px-4 min-h-[40px] text-xs font-semibold rounded-xl border cursor-pointer hover:opacity-85 disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMorePosts ? 'animate-spin' : ''}`} />
                {isLoadingMorePosts ? 'Đang tải thêm...' : 'Tải thêm bài viết'}
              </button>
            </div>
          )}
        </div>

        {/* Local Drafts Section (if any) */}
        {localPosts.length > 0 && (
          <div
            style={{
              borderColor: palette.border,
              backgroundColor: palette.surfaceElevated,
            }}
            className="rounded-2xl border overflow-hidden"
          >
            <div
              style={{ borderColor: palette.border, backgroundColor: palette.surface }}
              className="px-5 sm:px-6 py-4 border-b"
            >
              <h2 style={{ fontFamily: fonts.display }} className="text-lg font-bold">
                Bản nháp lưu cục bộ ({localPosts.length})
              </h2>
            </div>
            <div style={{ borderColor: palette.border }} className="divide-y">
              {localPosts.map((post) => (
                <div
                  key={post.id}
                  style={{ borderColor: palette.border }}
                  className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{post.title}</div>
                    <div style={{ color: palette.textMuted, fontFamily: fonts.mono }} className="text-xs mt-1">
                      {COLLECTION_LABELS[post.collection]?.label} · {post.path}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditPost(post)}
                    style={{
                      backgroundColor: palette.accent,
                      color: palette.accentText,
                    }}
                    className="px-3 min-h-[40px] text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Tiếp tục viết
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Commits History (Collapsible) */}
        {repoInfo && repoInfo.commits.length > 0 && (
          <div
            style={{
              borderColor: palette.border,
              backgroundColor: palette.surfaceElevated,
            }}
            className="rounded-2xl border overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setShowCommitHistory((v) => !v)}
              style={{ borderColor: palette.border, backgroundColor: palette.surface }}
              className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:opacity-85 min-h-[52px]"
            >
              <div className="flex items-center gap-2">
                <GitCommitHorizontal className="w-5 h-5" style={{ color: palette.accent }} />
                <h2 style={{ fontFamily: fonts.display }} className="text-base sm:text-lg font-bold">
                  Lịch sử Commit gần đây ({repoInfo.commits.length})
                </h2>
              </div>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform ${showCommitHistory ? 'rotate-180' : ''}`}
              />
            </button>

            {showCommitHistory && (
              <div style={{ borderColor: palette.border }} className="divide-y border-t">
                {repoInfo.commits.map((c) => (
                  <a
                    key={c.sha}
                    href={c.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ borderColor: palette.border }}
                    className="px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  >
                    <div className="text-sm font-medium truncate">{c.message}</div>
                    <div
                      style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                      className="text-xs tabular-nums shrink-0 flex items-center gap-2"
                    >
                      <span>{c.authorName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{c.sha.slice(0, 7)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{c.date.slice(0, 10)}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
        )}
      </div>

      {/* Auto-Delete Schedule Modal */}
      {scheduleDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
          <div
            style={{
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
              color: palette.textPrimary,
            }}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border p-5 sm:p-6 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 style={{ fontFamily: fonts.display }} className="text-lg font-bold">
                  Đặt lịch xoá bài tự động
                </h3>
                <p style={{ color: palette.textMuted }} className="text-xs mt-1 truncate max-w-[300px]">
                  {scheduleDeleteTarget.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleDeleteTarget(null)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-black/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '+1 giờ', hours: 1 },
                  { label: '+24 giờ', hours: 24 },
                  { label: '+7 ngày', hours: 24 * 7 },
                  { label: '+30 ngày', hours: 24 * 30 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() + preset.hours * 3600 * 1000);
                      const pad = (n: number) => String(n).padStart(2, '0');
                      setDeleteAtInput(
                        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
                          d.getHours()
                        )}:${pad(d.getMinutes())}`
                      );
                    }}
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.canvas,
                      color: palette.textPrimary,
                    }}
                    className="px-3 min-h-[36px] text-xs font-medium rounded-lg border cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div>
                <label style={{ color: palette.textMuted }} className="block text-xs mb-1">
                  Thời điểm tự động xoá khỏi GitHub
                </label>
                <input
                  type="datetime-local"
                  value={deleteAtInput}
                  onChange={(e) => setDeleteAtInput(e.target.value)}
                  style={{
                    backgroundColor: palette.canvas,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                    fontFamily: fonts.mono,
                  }}
                  className="w-full px-3 min-h-[44px] text-xs rounded-xl border"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setScheduleDeleteTarget(null)}
                style={{ borderColor: palette.border, color: palette.textSecondary }}
                className="px-4 min-h-[42px] text-xs font-medium rounded-xl border cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={!deleteAtInput || isSavingDeleteSchedule}
                onClick={async () => {
                  if (!deleteAtInput || !scheduleDeleteTarget) return;
                  setIsSavingDeleteSchedule(true);
                  try {
                    await onScheduleDeletePost(
                      scheduleDeleteTarget,
                      new Date(deleteAtInput).toISOString()
                    );
                    setScheduleDeleteTarget(null);
                  } finally {
                    setIsSavingDeleteSchedule(false);
                  }
                }}
                style={{
                  backgroundColor: palette.accent,
                  color: palette.accentText,
                }}
                className="px-4 min-h-[42px] text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-45"
              >
                {isSavingDeleteSchedule ? 'Đang lưu...' : 'Xác nhận hẹn xoá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repository Media Library Modal */}
      <MediaLibraryModal
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        owner={config.githubOwner}
        repo={config.githubRepo}
        branch={repoInfo?.defaultBranch || 'main'}
        isDark={isDark}
      />
    </div>
  );
}
