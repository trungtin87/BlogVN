import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, X } from 'lucide-react';
import type {
  AuthStatus,
  BlogCollection,
  BlogConfig,
  BlogPost,
  BuildStatusInfo,
  GitHubRepoInfo,
  GitHubRepoSummary,
  PostComment,
  RepoStructureInfo,
  ScheduledTask,
  ThemeMode,
  WorkspaceTab,
} from './types/blog';
import { AM_DUONG_THEMES, DEFAULT_BLOG_CONFIG } from './data/themes';
import { TopBar } from './components/TopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { BlogShowcase } from './components/BlogShowcase';
import { MarkdownEditor } from './components/MarkdownEditor';
import { GitHubSyncPanel } from './components/GitHubSyncPanel';
import { OfflineIndicator } from './components/PWAInstallButton';

const STORAGE_CONFIG_KEY = 'blogvn_config_v1';
const STORAGE_DRAFTS_KEY = 'blogvn_drafts_v1';

interface ToastBanner {
  message: string;
  linkUrl?: string;
  linkLabel?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('blog');
  const [config, setConfig] = useState<BlogConfig>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_CONFIG_KEY) ||
        localStorage.getItem('trungtin87_blog_config_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_BLOG_CONFIG,
          ...parsed,
          themeMode: parsed?.themeMode === 'dark' ? 'dark' : 'light',
        };
      }
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      return {
        ...DEFAULT_BLOG_CONFIG,
        themeMode: prefersDark ? 'dark' : 'light',
      };
    } catch {
      // ignore storage errors
    }
    return DEFAULT_BLOG_CONFIG;
  });

  const [localDrafts, setLocalDrafts] = useState<BlogPost[]>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_DRAFTS_KEY) ||
        localStorage.getItem('trungtin87_blog_drafts_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [githubPosts, setGithubPosts] = useState<BlogPost[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [userRepos, setUserRepos] = useState<GitHubRepoSummary[]>([]);
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null);
  const [repoStructure, setRepoStructure] = useState<RepoStructureInfo | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editorDefaultCollection, setEditorDefaultCollection] =
    useState<BlogCollection>('bai_viet');
  const [toast, setToast] = useState<ToastBanner | null>(null);
  const isRunningDueRef = useRef(false);

  const activeTheme = AM_DUONG_THEMES[config.themeMode] || AM_DUONG_THEMES.light;

  // Synchronize <html> .dark class, color-scheme, body bg, and mobile theme-color meta tag
  useEffect(() => {
    document.documentElement.classList.toggle('dark', activeTheme.isDark);
    document.documentElement.style.colorScheme = activeTheme.isDark ? 'dark' : 'light';
    document.body.style.backgroundColor = activeTheme.palette.canvas;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', activeTheme.palette.canvas);
    }
  }, [activeTheme]);

  // Synchronize Website Identity (document.title, description, favicon, apple-touch-icon) with config
  useEffect(() => {
    const title = (config.siteTitle || 'BlogVN').trim();
    const desc = (config.tagline || '').trim();
    const icon = (config.siteIcon || '/icon.svg').trim();
    const appTitle = (config.headerTitle || title || 'BlogVN').trim();

    document.title = title;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta && desc) descMeta.setAttribute('content', desc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && desc) ogDesc.setAttribute('content', desc);
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', appTitle);

    const iconLink = document.querySelector('link[rel="icon"]');
    if (iconLink && icon) iconLink.setAttribute('href', icon);
    const touchLink = document.querySelector('link[rel="apple-touch-icon"]');
    if (touchLink && icon) touchLink.setAttribute('href', icon);
  }, [config.siteTitle, config.tagline, config.siteIcon, config.headerTitle]);

  // Persist config locally
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  // Persist local drafts
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DRAFTS_KEY, JSON.stringify(localDrafts));
    } catch {
      // ignore
    }
  }, [localDrafts]);

  const showBanner = (banner: ToastBanner) => {
    setToast(banner);
    setTimeout(() => {
      setToast((prev) => (prev?.message === banner.message ? null : prev));
    }, 6000);
  };

  const fetchBuildStatus = useCallback(async (owner: string, repo: string) => {
    try {
      const res = await fetch(
        `/api/github/build-status?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
      );
      if (res.ok) {
        const data: BuildStatusInfo = await res.json();
        setBuildStatus(data);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchUserRepos = useCallback(async (): Promise<GitHubRepoSummary[]> => {
    try {
      const res = await fetch('/api/github/user-repos');
      if (res.ok) {
        const data = await res.json();
        const repos: GitHubRepoSummary[] = data.repos || [];
        setUserRepos(repos);
        return repos;
      }
    } catch {
      // ignore
    }
    return [];
  }, []);

  const fetchAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data: AuthStatus = await res.json();
        setAuthStatus(data);
        if (data.authenticated) {
          fetchUserRepos();
        } else {
          setUserRepos([]);
        }
        return data;
      }
    } catch {
      // ignore
    }
    return null;
  }, [fetchUserRepos]);

  const fetchSchedules = useCallback(
    async (ownerOverride?: string, repoOverride?: string) => {
      const targetOwner = ownerOverride || config.githubOwner;
      const targetRepo = repoOverride || config.githubRepo;
      try {
        const res = await fetch(
          `/api/schedules?owner=${encodeURIComponent(targetOwner)}&repo=${encodeURIComponent(targetRepo)}`
        );
        if (res.ok) {
          const data = await res.json();
          setScheduledTasks(data.tasks || []);
        }
      } catch {
        // ignore
      }
    },
    [config.githubOwner, config.githubRepo]
  );

  const fetchComments = useCallback(
    async (ownerOverride?: string, repoOverride?: string) => {
      const targetOwner = ownerOverride || config.githubOwner;
      const targetRepo = repoOverride || config.githubRepo;
      try {
        const res = await fetch(
          `/api/comments?owner=${encodeURIComponent(targetOwner)}&repo=${encodeURIComponent(
            targetRepo
          )}&includePending=true`
        );
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch {
        // ignore
      }
    },
    [config.githubOwner, config.githubRepo]
  );

  const syncFromGitHub = useCallback(
    async (ownerOverride?: string, repoOverride?: string) => {
      const targetOwner = ownerOverride || config.githubOwner;
      const targetRepo = repoOverride || config.githubRepo;
      setIsLoading(true);
      setRepoError(null);

      try {
        const repoRes = await fetch(
          `/api/github/repo?owner=${encodeURIComponent(targetOwner)}&repo=${encodeURIComponent(targetRepo)}`
        );
        const repoJson = await repoRes.json();

        if (!repoRes.ok) {
          setRepoError(repoJson.error || `Không thể truy cập ${targetOwner}/${targetRepo}`);
          setRepoInfo(null);
          setGithubPosts([]);
          setBuildStatus(null);
          return;
        }

        setRepoInfo(repoJson);
        fetchBuildStatus(targetOwner, targetRepo);
        fetchSchedules(targetOwner, targetRepo);
        fetchComments(targetOwner, targetRepo);
        const branch = repoJson.defaultBranch || 'main';

        const postsRes = await fetch(
          `/api/github/posts?owner=${encodeURIComponent(targetOwner)}&repo=${encodeURIComponent(targetRepo)}&branch=${encodeURIComponent(branch)}`
        );
        const postsJson = await postsRes.json();

        if (postsRes.ok) {
          const loadedPosts: BlogPost[] = postsJson.posts || [];
          setGithubPosts(loadedPosts);
          setRepoStructure(postsJson.structure || null);

          setConfig((prev) => ({
            ...prev,
            ...(postsJson.config && typeof postsJson.config === 'object' ? postsJson.config : {}),
            githubOwner: targetOwner,
            githubRepo: targetRepo,
            siteTitle:
              postsJson.config?.siteTitle ||
              (targetOwner === DEFAULT_BLOG_CONFIG.githubOwner ? prev.siteTitle : targetRepo),
            postsDirectory:
              postsJson.structure?.postsDir ||
              postsJson.structure?.detectedPostsDir ||
              prev.postsDirectory ||
              '_posts',
            authorAvatar: repoJson.ownerProfile?.avatarUrl || prev.authorAvatar,
          }));
        }
      } catch {
        setRepoError('Không thể kết nối tới dịch vụ đồng bộ GitHub.');
      } finally {
        setIsLoading(false);
      }
    },
    [config.githubOwner, config.githubRepo, fetchBuildStatus, fetchSchedules, fetchComments]
  );

  // Initial load
  useEffect(() => {
    fetchAuthStatus();
    syncFromGitHub();
    fetchSchedules();
    fetchComments();
  }, [fetchAuthStatus, syncFromGitHub, fetchSchedules, fetchComments]);

  // Background 20s ticker executing due scheduled publish/auto-delete tasks while signed in
  useEffect(() => {
    if (!authStatus?.authenticated) return;

    const runDueIfNeeded = async () => {
      if (isRunningDueRef.current) return;
      const now = Date.now();
      const hasDuePending = scheduledTasks.some(
        (t) =>
          t.status === 'pending' &&
          !Number.isNaN(Date.parse(t.scheduledAt)) &&
          Date.parse(t.scheduledAt) <= now
      );
      if (!hasDuePending) return;

      isRunningDueRef.current = true;
      try {
        const res = await fetch('/api/schedules/run-due', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.executedCount > 0) {
            await fetchSchedules();
            syncFromGitHub();
            showBanner({
              message: `Đã tự động thực thi ${data.executedCount} lịch trình đến hạn trên GitHub.`,
            });
          }
        }
      } catch {
        // ignore network errors during background poll
      } finally {
        isRunningDueRef.current = false;
      }
    };

    runDueIfNeeded();
    const timer = window.setInterval(runDueIfNeeded, 20000);
    return () => window.clearInterval(timer);
  }, [authStatus?.authenticated, scheduledTasks, fetchSchedules, syncFromGitHub]);

  // Listen for OAuth popup completion and auto-select user's <login>.github.io repo if present
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      const origin = event.origin || '';
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const status = await fetchAuthStatus();
        const repos = await fetchUserRepos();
        const userLogin = status?.user?.login;
        const userSiteRepo = repos.find(
          (r) =>
            r.isUserSite &&
            (!userLogin || r.owner.toLowerCase() === userLogin.toLowerCase())
        );

        if (userSiteRepo) {
          setConfig((prev) => ({
            ...prev,
            githubOwner: userSiteRepo.owner,
            githubRepo: userSiteRepo.name,
            pagesUrl: userSiteRepo.pagesUrl,
          }));
          syncFromGitHub(userSiteRepo.owner, userSiteRepo.name);
        } else {
          syncFromGitHub();
        }
        showBanner({
          message: userLogin
            ? `Đã đăng nhập BlogVN với tài khoản @${userLogin}.`
            : 'Đã kết nối tài khoản GitHub thành công.',
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [fetchAuthStatus, fetchUserRepos, syncFromGitHub]);

  const handleConnectOAuth = async () => {
    try {
      const res = await fetch('/api/auth/github/url');
      const data = await res.json();
      if (!res.ok || !data.url) {
        showBanner({ message: data.error || 'Chưa cấu hình GitHub OAuth.' });
        return;
      }
      const popup = window.open(data.url, 'github_oauth_popup', 'width=640,height=740');
      if (!popup) {
        showBanner({
          message: 'Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép popup để kết nối GitHub.',
        });
      }
    } catch {
      showBanner({ message: 'Không thể khởi tạo phiên đăng nhập GitHub.' });
    }
  };

  const handleLogoutOAuth = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    await fetchAuthStatus();
    showBanner({ message: 'Đã đăng xuất phiên GitHub OAuth.' });
  };

  const handleClearLocalData = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem(STORAGE_CONFIG_KEY);
    localStorage.removeItem(STORAGE_DRAFTS_KEY);
    localStorage.removeItem('trungtin87_blog_config_v2');
    localStorage.removeItem('trungtin87_blog_drafts_v1');
    setLocalDrafts([]);
    await fetchAuthStatus();
    showBanner({ message: 'Đã đăng xuất và xoá toàn bộ dữ liệu cục bộ trên thiết bị.' });
  };

  const handleToggleThemeMode = (themeMode: ThemeMode) => {
    setConfig((prev) => ({ ...prev, themeMode }));
  };

  const handleSaveLocalDraft = (draftPost: BlogPost) => {
    setLocalDrafts((prev) => {
      const others = prev.filter((p) => p.slug !== draftPost.slug && p.id !== draftPost.id);
      return [draftPost, ...others];
    });
  };

  const handlePublishSuccess = (publishedPost: BlogPost, commitUrl?: string) => {
    setGithubPosts((prev) => {
      const others = prev.filter((p) => p.path !== publishedPost.path);
      return [publishedPost, ...others].sort((a, b) => b.date.localeCompare(a.date));
    });
    setLocalDrafts((prev) =>
      prev.filter((p) => p.slug !== publishedPost.slug && p.path !== publishedPost.path)
    );
    setActiveTab('blog');
    showBanner({
      message: `Đã đăng "${publishedPost.title}" lên ${config.githubOwner}/${config.githubRepo}`,
      linkUrl: commitUrl || config.pagesUrl,
      linkLabel: commitUrl ? 'Xem Commit' : 'Mở GitHub Pages',
    });

    // Poll GitHub Actions/Pages build status after publishing
    setTimeout(() => fetchBuildStatus(config.githubOwner, config.githubRepo), 4000);
    setTimeout(() => fetchBuildStatus(config.githubOwner, config.githubRepo), 15000);
  };

  const handleDeletePost = async (post: BlogPost) => {
    if (!post.sha) return;
    const res = await fetch('/api/github/posts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner: config.githubOwner,
        repo: config.githubRepo,
        branch: repoInfo?.defaultBranch || 'main',
        filePath: post.path,
        sha: post.sha,
      }),
    });
    if (res.ok) {
      setGithubPosts((prev) => prev.filter((p) => p.path !== post.path));
      showBanner({ message: `Đã xoá tệp ${post.path} khỏi GitHub.` });
    } else {
      const err = await res.json();
      showBanner({ message: err.error || 'Không thể xoá mục này.' });
    }
  };

  const handleScheduleDeletePost = async (post: BlogPost, scheduledAtIso: string) => {
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'delete',
        owner: config.githubOwner,
        repo: config.githubRepo,
        branch: repoInfo?.defaultBranch || 'main',
        filePath: post.path,
        title: post.title,
        scheduledAt: scheduledAtIso,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Không thể đặt lịch xoá bài.');
    }
    await fetchSchedules();
    const formatted = new Date(scheduledAtIso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    showBanner({
      message: `Đã đặt lịch tự động xoá "${post.title}" vào lúc ${formatted}.`,
    });
  };

  const handleScheduledSuccess = (task: ScheduledTask, focusGitHubTab = true) => {
    fetchSchedules();
    const formatted = new Date(task.scheduledAt).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    if (focusGitHubTab) {
      setActiveTab('github');
      showBanner({
        message: `Đã lên lịch tự động đăng "${task.title}" vào lúc ${formatted}.`,
      });
    } else {
      showBanner({
        message: `Đã đăng bài và hẹn tự động xoá "${task.title}" lúc ${formatted}.`,
      });
    }
  };

  const handleCreateNewPost = (collection?: BlogCollection) => {
    setEditingPost(null);
    setEditorDefaultCollection(collection || 'bai_viet');
    setActiveTab('editor');
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setEditorDefaultCollection(post.collection || 'bai_viet');
    setActiveTab('editor');
  };

  const handleUpdateTargetRepo = (owner: string, repo: string) => {
    const pagesUrl = repo.endsWith('.github.io')
      ? `https://${repo}`
      : `https://${owner}.github.io/${repo}`;
    setConfig((prev) => ({
      ...prev,
      githubOwner: owner,
      githubRepo: repo,
      pagesUrl,
    }));
    syncFromGitHub(owner, repo);
  };

  const handleSiteCreated = (owner: string, repo: string, pagesUrl: string) => {
    setConfig((prev) => ({
      ...prev,
      githubOwner: owner,
      githubRepo: repo,
      pagesUrl,
      postsDirectory: '_posts',
    }));
    fetchUserRepos();
    syncFromGitHub(owner, repo);
    setActiveTab('blog');
    showBanner({
      message: `Đã khởi tạo Blog GitHub Pages "${owner}/${repo}" thành công!`,
      linkUrl: pagesUrl,
      linkLabel: 'Mở trang vừa tạo',
    });
  };

  const combinedPosts = useMemo(() => {
    return [...localDrafts, ...githubPosts].sort((a, b) => b.date.localeCompare(a.date));
  }, [localDrafts, githubPosts]);

  return (
    <div
      style={{
        backgroundColor: activeTheme.palette.canvas,
        color: activeTheme.palette.textPrimary,
      }}
      className="min-h-screen flex flex-col transition-colors duration-200"
    >
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onCreateNewPost={() => handleCreateNewPost('bai_viet')}
        onToggleThemeMode={handleToggleThemeMode}
        theme={activeTheme}
        siteTitle={config.siteTitle}
        headerTitle={config.headerTitle}
        siteIcon={config.siteIcon}
      />

      <OfflineIndicator theme={activeTheme} />

      {toast && (
        <div className="fixed bottom-20 md:bottom-5 right-4 left-4 sm:left-auto z-50 sm:max-w-md">
          <div
            style={{
              backgroundColor: activeTheme.palette.surfaceElevated,
              borderColor: activeTheme.palette.border,
              color: activeTheme.palette.textPrimary,
            }}
            className="rounded-xl border shadow-lg px-4 py-3 flex items-center gap-3 text-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium leading-snug">{toast.message}</div>
              {toast.linkUrl && (
                <a
                  href={toast.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: activeTheme.palette.link }}
                  className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4 mt-1"
                >
                  {toast.linkLabel || 'Xem chi tiết'} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Đóng thông báo"
              className="p-2 rounded hover:bg-black/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        {activeTab === 'blog' && (
          <BlogShowcase
            theme={activeTheme}
            config={config}
            posts={combinedPosts}
            isLoading={isLoading}
            repoConnected={Boolean(repoInfo)}
            isAstroRepo={Boolean(repoStructure?.hasAstroEngine)}
            assetsPrefix={repoStructure?.assetsPrefix}
            frameworkLabel={repoStructure?.frameworkLabel}
            buildStatus={buildStatus}
            authStatus={authStatus}
            onToggleThemeMode={handleToggleThemeMode}
            onEditPost={handleEditPost}
            onCreateNewPost={handleCreateNewPost}
            onRefreshGitHub={() => syncFromGitHub()}
            onOpenGitHubTab={() => setActiveTab('github')}
            onCommentsUpdated={() => fetchComments()}
          />
        )}

        {activeTab === 'editor' && (
          <MarkdownEditor
            theme={activeTheme}
            config={config}
            authStatus={authStatus}
            initialPost={editingPost}
            defaultCollection={editorDefaultCollection}
            defaultBranch={repoInfo?.defaultBranch}
            isAstroRepo={Boolean(repoStructure?.hasAstroEngine)}
            repoStructure={repoStructure}
            onSaveLocalDraft={handleSaveLocalDraft}
            onPublishSuccess={handlePublishSuccess}
            onScheduledSuccess={handleScheduledSuccess}
            onOpenGitHubTab={() => setActiveTab('github')}
          />
        )}

        {activeTab === 'github' && (
          <GitHubSyncPanel
            theme={activeTheme}
            config={config}
            authStatus={authStatus}
            repoInfo={repoInfo}
            repoStructure={repoStructure}
            buildStatus={buildStatus}
            userRepos={userRepos}
            posts={[...localDrafts, ...githubPosts]}
            scheduledTasks={scheduledTasks}
            comments={comments}
            isLoading={isLoading}
            repoError={repoError}
            onRefresh={() => syncFromGitHub()}
            onRefreshSchedules={() => fetchSchedules()}
            onRefreshComments={() => fetchComments()}
            onUpdateConfig={(next) => setConfig(next)}
            onDeployedToGitHub={(message, commitUrl) => {
              showBanner({
                message,
                linkUrl: commitUrl || config.pagesUrl,
                linkLabel: commitUrl ? 'Xem Commit' : 'Mở trang web',
              });
              syncFromGitHub();
            }}
            onScheduleDeletePost={handleScheduleDeletePost}
            onEditPost={handleEditPost}
            onDeletePost={handleDeletePost}
            onConnectOAuth={handleConnectOAuth}
            onLogoutOAuth={handleLogoutOAuth}
            onUpdateTargetRepo={handleUpdateTargetRepo}
            onSiteCreated={handleSiteCreated}
            onClearLocalData={handleClearLocalData}
          />
        )}
      </main>

      <footer
        style={{
          borderColor: activeTheme.palette.border,
          backgroundColor: activeTheme.palette.canvas,
          color: activeTheme.palette.textMuted,
        }}
        className="hidden md:block border-t py-6 px-6 text-xs"
      >
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>
            {config.footerText?.trim() ||
              `${config.headerTitle || 'BlogVN'} · ${config.githubOwner}/${config.githubRepo}`}
          </span>
          <div className="flex flex-wrap items-center gap-4">
            {config.footerLinks?.map((item, idx) => (
              <a
                key={`${item.url}-${idx}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="hover:underline underline-offset-4"
              >
                {item.label}
              </a>
            ))}
            <a
              href={config.pagesUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:underline underline-offset-4"
            >
              {config.pagesUrl}
            </a>
          </div>
        </div>
      </footer>

      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        theme={activeTheme}
      />
    </div>
  );
}
