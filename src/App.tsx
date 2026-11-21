import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { CheckCircle2, ExternalLink, Loader2, X } from 'lucide-react';
import type {
  AuthStatus,
  BlogCollection,
  BlogConfig,
  BlogPost,
  BuildStatusInfo,
  GitHubRepoInfo,
  GitHubRepoSummary,
  RepoStructureInfo,
  ScheduledTask,
  ThemeMode,
  WorkspaceTab,
} from './types/blog';
import {
  AM_DUONG_THEMES,
  DEFAULT_BLOG_CONFIG,
  DEFAULT_LIVE_CHAT_CONFIG,
  normalizeAstroTemplateId,
  resolveBlogTheme,
} from './data/themes';
import { auth, signOutGoogle } from './firebase';
import {
  getStoredGitHubPat,
  getUserStorageKey,
  ghCreateSchedule,
  ghDeletePost,
  ghGetAuthStatus,
  ghGetBuildStatus,
  ghGetRepoInfo,
  ghGetRepoPosts,
  ghGetSchedules,
  ghGetUserRepos,
  ghRunDueSchedules,
  isBackendAvailable,
  setActiveSessionUid,
  setStoredGitHubPat,
} from './utils/githubClient';
import {
  batchSeedUserDraftsToFirestore,
  deleteUserDraftFromFirestore,
  saveUserConfigToFirestore,
  subscribeUserConfig,
  subscribeUserDrafts,
  upsertUserDraftToFirestore,
} from './utils/firestoreSync';
import { TopBar } from './components/TopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { BlogShowcase } from './components/BlogShowcase';
import { MarkdownEditor } from './components/MarkdownEditor';
import { GitHubSyncPanel } from './components/GitHubSyncPanel';
import { GoogleAuthGate } from './components/GoogleAuthGate';
import { OfflineIndicator } from './components/PWAInstallButton';
import { UserGuideModal } from './components/UserGuideModal';
import { FloatingLiveChat } from './components/FloatingLiveChat';
import { clearSocialCredentials } from './utils/socialPublisher';

const GATE_THEME_KEY = 'blogvn_gate_theme_mode';

interface ToastBanner {
  message: string;
  linkUrl?: string;
  linkLabel?: string;
}

function getPreferredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(GATE_THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // ignore
  }
  return 'light';
}

function loadConfigForUid(user: User): BlogConfig {
  try {
    const raw = localStorage.getItem(getUserStorageKey(user.uid, 'config_v1'));
    if (raw) {
      const parsed = JSON.parse(raw);
      const mode: ThemeMode = parsed?.themeMode === 'dark' ? 'dark' : 'light';
      const rawChat = parsed?.liveChat;
      const mergedChannels = DEFAULT_LIVE_CHAT_CONFIG.channels.map((def) => {
        const match = Array.isArray(rawChat?.channels)
          ? rawChat.channels.find((c: any) => c?.id === def.id)
          : null;
        return match ? { ...def, ...match } : { ...def };
      });
      const migratedIcon =
        !parsed?.siteIcon || parsed.siteIcon === './icon.svg' || parsed.siteIcon === '/icon.svg'
          ? DEFAULT_BLOG_CONFIG.siteIcon
          : parsed.siteIcon;
      const migratedHeader =
        !parsed?.headerTitle || parsed.headerTitle === 'BlogVN'
          ? DEFAULT_BLOG_CONFIG.headerTitle
          : parsed.headerTitle;
      const migratedTitle =
        !parsed?.siteTitle || parsed.siteTitle === 'Huyền Không Thư Quán' || parsed.siteTitle === 'BlogVN'
          ? DEFAULT_BLOG_CONFIG.siteTitle
          : parsed.siteTitle;
      return {
        ...DEFAULT_BLOG_CONFIG,
        ...parsed,
        siteIcon: migratedIcon,
        headerTitle: migratedHeader,
        siteTitle: migratedTitle,
        themeMode: mode,
        astroTemplate: normalizeAstroTemplateId(parsed?.astroTemplate, mode),
        liveChat: {
          enabled: Boolean(rawChat?.enabled),
          title: rawChat?.title || DEFAULT_LIVE_CHAT_CONFIG.title,
          welcomeText: rawChat?.welcomeText || DEFAULT_LIVE_CHAT_CONFIG.welcomeText,
          channels: mergedChannels,
        },
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    ...DEFAULT_BLOG_CONFIG,
    themeMode: getPreferredThemeMode(),
    authorName: user.displayName || DEFAULT_BLOG_CONFIG.authorName,
    authorAvatar: user.photoURL || DEFAULT_BLOG_CONFIG.authorAvatar,
  };
}

function loadDraftsForUid(uid: string): BlogPost[] {
  try {
    const raw = localStorage.getItem(getUserStorageKey(uid, 'drafts_v1'));
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [gateThemeMode, setGateThemeMode] = useState<ThemeMode>(getPreferredThemeMode);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('blog');
  const [config, setConfig] = useState<BlogConfig>(() => ({
    ...DEFAULT_BLOG_CONFIG,
    themeMode: getPreferredThemeMode(),
  }));
  const [localDrafts, setLocalDrafts] = useState<BlogPost[]>([]);
  const [hasPersonalPat, setHasPersonalPat] = useState(false);
  const [cloudSyncActive, setCloudSyncActive] = useState(false);

  const [githubPosts, setGithubPosts] = useState<BlogPost[]>([]);
  const [postsTotalCount, setPostsTotalCount] = useState(0);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [userRepos, setUserRepos] = useState<GitHubRepoSummary[]>([]);
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null);
  const [repoStructure, setRepoStructure] = useState<RepoStructureInfo | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editorDefaultCollection, setEditorDefaultCollection] =
    useState<BlogCollection>('bai_viet');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [toast, setToast] = useState<ToastBanner | null>(null);
  const [mobileEditorFocused, setMobileEditorFocused] = useState(false);
  const isRunningDueRef = useRef(false);
  const buildPollTimerRef = useRef<number | null>(null);
  const skipNextConfigCloudSaveRef = useRef(false);
  const seededInitialDraftsRef = useRef(false);
  const firestoreHydratedUidRef = useRef<string>('');

  useEffect(() => {
    if (activeTab !== 'editor') {
      setMobileEditorFocused(false);
    }
  }, [activeTab]);

  const activeUid = firebaseUser?.uid || '';
  const activeTheme = useMemo(
    () =>
      firebaseUser
        ? resolveBlogTheme(config, gateThemeMode)
        : AM_DUONG_THEMES[gateThemeMode] || AM_DUONG_THEMES.light,
    [firebaseUser, config, gateThemeMode]
  );

  // Listen to Firebase Google Sign-In state and isolate all device data per UID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setActiveSessionUid(user?.uid || '');

      // Clear transient state on account switch / sign-out
      setGithubPosts([]);
      setPostsTotalCount(0);
      setPostsHasMore(false);
      setScheduledTasks([]);
      setUserRepos([]);
      setRepoInfo(null);
      setRepoStructure(null);
      setBuildStatus(null);
      setEditingPost(null);
      setRepoError(null);
      setAuthStatus(null);
      setCloudSyncActive(false);
      seededInitialDraftsRef.current = false;
      firestoreHydratedUidRef.current = '';

      if (user) {
        skipNextConfigCloudSaveRef.current = true;
        const userCfg = loadConfigForUid(user);
        setConfig(userCfg);
        setLocalDrafts(loadDraftsForUid(user.uid));
        setHasPersonalPat(Boolean(getStoredGitHubPat(user.uid)));
        setActiveTab('blog');
      } else {
        setConfig({ ...DEFAULT_BLOG_CONFIG, themeMode: getPreferredThemeMode() });
        setLocalDrafts([]);
        setHasPersonalPat(false);
      }
      setAuthInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  // Cloud Firestore Realtime Sync for per-UID site config & drafts
  useEffect(() => {
    if (!activeUid || !firebaseUser) return;

    const unsubConfig = subscribeUserConfig(activeUid, (remoteCfg) => {
      setCloudSyncActive(true);
      if (!remoteCfg) {
        const localCfg = loadConfigForUid(firebaseUser);
        void saveUserConfigToFirestore(activeUid, localCfg);
        firestoreHydratedUidRef.current = activeUid;
        return;
      }

      firestoreHydratedUidRef.current = activeUid;
      setConfig((prev) => {
        const nextMode: ThemeMode = remoteCfg.themeMode === 'dark' ? 'dark' : 'light';
        const merged: BlogConfig = {
          ...prev,
          ...remoteCfg,
          themeMode: nextMode,
          astroTemplate: normalizeAstroTemplateId(
            remoteCfg.astroTemplate || prev.astroTemplate,
            nextMode
          ),
          liveChat: remoteCfg.liveChat || prev.liveChat,
          giscus: remoteCfg.giscus || prev.giscus,
        };
        if (JSON.stringify(prev) === JSON.stringify(merged)) {
          return prev;
        }
        skipNextConfigCloudSaveRef.current = true;
        return merged;
      });
    });

    const unsubDrafts = subscribeUserDrafts(activeUid, (remoteDrafts) => {
      setCloudSyncActive(true);
      if (!seededInitialDraftsRef.current) {
        seededInitialDraftsRef.current = true;
        const localInit = loadDraftsForUid(activeUid);
        if (remoteDrafts.length === 0 && localInit.length > 0) {
          void batchSeedUserDraftsToFirestore(activeUid, localInit);
          return;
        }
        if (localInit.length > 0 && remoteDrafts.length > 0) {
          const remoteKeys = new Set(remoteDrafts.map((d) => `${d.id}::${d.slug}`));
          const missingOnCloud = localInit.filter(
            (l) => !remoteKeys.has(`${l.id}::${l.slug}`)
          );
          if (missingOnCloud.length > 0) {
            void batchSeedUserDraftsToFirestore(activeUid, missingOnCloud);
            setLocalDrafts([...missingOnCloud, ...remoteDrafts]);
            return;
          }
        }
      }
      setLocalDrafts(remoteDrafts);
    });

    return () => {
      unsubConfig();
      unsubDrafts();
    };
  }, [activeUid, firebaseUser]);

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
    if (!firebaseUser) {
      document.title = 'Đạo Ký — Đăng nhập';
      return;
    }
    const title = (config.siteTitle || 'Đạo Ký').trim();
    const desc = (config.tagline || '').trim();
    const icon = (config.siteIcon || './assets/aistudio/1794978557793_3b5d5cb0.png').trim();
    const appTitle = (config.headerTitle || title || 'Đạo Ký').trim();

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
  }, [firebaseUser, config.siteTitle, config.tagline, config.siteIcon, config.headerTitle]);

  // Persist config isolated to the active Google account UID (localStorage + debounced Firestore)
  useEffect(() => {
    if (!activeUid) return;
    try {
      localStorage.setItem(getUserStorageKey(activeUid, 'config_v1'), JSON.stringify(config));
    } catch {
      // ignore
    }

    if (skipNextConfigCloudSaveRef.current) {
      skipNextConfigCloudSaveRef.current = false;
      return;
    }

    if (firestoreHydratedUidRef.current !== activeUid) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveUserConfigToFirestore(activeUid, config);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [activeUid, config]);

  // Persist drafts isolated to the active Google account UID
  useEffect(() => {
    if (!activeUid) return;
    try {
      localStorage.setItem(getUserStorageKey(activeUid, 'drafts_v1'), JSON.stringify(localDrafts));
    } catch {
      // ignore
    }
  }, [activeUid, localDrafts]);

  const showBanner = (banner: ToastBanner) => {
    setToast(banner);
    setTimeout(() => {
      setToast((prev) => (prev?.message === banner.message ? null : prev));
    }, 6000);
  };

  const fetchBuildStatus = useCallback(
    async (owner: string, repo: string) => {
      if (!activeUid || !owner?.trim() || !repo?.trim()) return null;
      try {
        const data = await ghGetBuildStatus(owner, repo, activeUid);
        setBuildStatus(data);
        return data;
      } catch {
        return null;
      }
    },
    [activeUid]
  );

  // B4: Poll GitHub Actions build progress every 10s up to ~2 minutes after deploy/publish
  const startBuildProgressPolling = useCallback(
    (owner: string, repo: string, pagesUrl: string) => {
      if (!owner?.trim() || !repo?.trim()) return;
      if (buildPollTimerRef.current) {
        window.clearInterval(buildPollTimerRef.current);
        buildPollTimerRef.current = null;
      }
      let attempts = 0;
      let sawActiveRun = false;

      const tick = async () => {
        attempts += 1;
        const data = await fetchBuildStatus(owner, repo);
        if (!data) return;

        if (data.status === 'queued' || data.status === 'in_progress') {
          sawActiveRun = true;
          return;
        }

        if (data.status === 'completed' && (sawActiveRun || attempts >= 2)) {
          if (buildPollTimerRef.current) {
            window.clearInterval(buildPollTimerRef.current);
            buildPollTimerRef.current = null;
          }
          if (data.conclusion === 'success') {
            showBanner({
              message: `GitHub Actions đã build thành công ${owner}/${repo}! Trang web đã sẵn sàng.`,
              linkUrl: pagesUrl,
              linkLabel: 'Mở website ngay',
            });
          } else if (data.conclusion === 'failure') {
            showBanner({
              message: `Quá trình build GitHub Actions gặp lỗi trên ${owner}/${repo}.`,
              linkUrl: data.htmlUrl,
              linkLabel: 'Xem log lỗi',
            });
          }
          return;
        }

        if (attempts >= 12 && buildPollTimerRef.current) {
          window.clearInterval(buildPollTimerRef.current);
          buildPollTimerRef.current = null;
        }
      };

      window.setTimeout(tick, 4500);
      buildPollTimerRef.current = window.setInterval(tick, 10000);
    },
    [fetchBuildStatus]
  );

  useEffect(() => {
    return () => {
      if (buildPollTimerRef.current) {
        window.clearInterval(buildPollTimerRef.current);
      }
    };
  }, []);

  const fetchUserRepos = useCallback(async (): Promise<GitHubRepoSummary[]> => {
    if (!activeUid) return [];
    try {
      const repos = await ghGetUserRepos(activeUid);
      setUserRepos(repos);
      return repos;
    } catch {
      return [];
    }
  }, [activeUid]);

  const fetchAuthStatus = useCallback(async (): Promise<AuthStatus | null> => {
    if (!activeUid) return null;
    try {
      const data = await ghGetAuthStatus(activeUid);
      setAuthStatus(data);
      setHasPersonalPat(Boolean(getStoredGitHubPat(activeUid)));
      if (data.authenticated) {
        fetchUserRepos();
      } else {
        setUserRepos([]);
      }
      return data;
    } catch {
      return null;
    }
  }, [activeUid, fetchUserRepos]);

  const fetchSchedules = useCallback(
    async (ownerOverride?: string, repoOverride?: string) => {
      if (!activeUid) return;
      const targetOwner = (ownerOverride ?? config.githubOwner).trim();
      const targetRepo = (repoOverride ?? config.githubRepo).trim();
      if (!targetOwner || !targetRepo) return;
      try {
        const tasks = await ghGetSchedules(targetOwner, targetRepo, activeUid);
        setScheduledTasks(tasks);
      } catch {
        // ignore
      }
    },
    [activeUid, config.githubOwner, config.githubRepo]
  );

  const syncFromGitHub = useCallback(
    async (ownerOverride?: string, repoOverride?: string) => {
      if (!activeUid) return;
      const targetOwner = (ownerOverride ?? config.githubOwner).trim();
      const targetRepo = (repoOverride ?? config.githubRepo).trim();

      if (!targetOwner || !targetRepo) {
        setRepoInfo(null);
        setGithubPosts([]);
        setPostsTotalCount(0);
        setPostsHasMore(false);
        setRepoStructure(null);
        setBuildStatus(null);
        setRepoError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setRepoError(null);

      try {
        const repoRes = await ghGetRepoInfo(targetOwner, targetRepo, activeUid);

        if (!repoRes.ok || !repoRes.data) {
          setRepoError(repoRes.error || `Không thể truy cập ${targetOwner}/${targetRepo}`);
          setRepoInfo(null);
          setGithubPosts([]);
          setPostsTotalCount(0);
          setPostsHasMore(false);
          setBuildStatus(null);
          return;
        }

        const repoJson = repoRes.data;
        setRepoInfo(repoJson);
        fetchBuildStatus(targetOwner, targetRepo);
        fetchSchedules(targetOwner, targetRepo);
        const branch = repoJson.defaultBranch || 'main';

        const postsJson = await ghGetRepoPosts(targetOwner, targetRepo, branch, {
          uid: activeUid,
          offset: 0,
          limit: 30,
        });
        if (postsJson.ok) {
          const loaded = postsJson.posts || [];
          setGithubPosts(loaded);
          setPostsTotalCount(postsJson.totalCount ?? loaded.length);
          setPostsHasMore(Boolean(postsJson.hasMore));
          setRepoStructure(postsJson.structure || null);

          setConfig((prev) => ({
            ...prev,
            ...(postsJson.config && typeof postsJson.config === 'object' ? postsJson.config : {}),
            githubOwner: targetOwner,
            githubRepo: targetRepo,
            siteTitle:
              postsJson.config?.siteTitle ||
              (!prev.siteTitle || prev.siteTitle === 'Đạo Ký' ? targetRepo : prev.siteTitle),
            postsDirectory:
              postsJson.structure?.postsDir ||
              postsJson.structure?.detectedPostsDir ||
              prev.postsDirectory ||
              'src/content/bai_viet',
            authorAvatar: repoJson.ownerProfile?.avatarUrl || prev.authorAvatar,
          }));
        }
      } catch {
        setRepoError('Không thể kết nối tới dịch vụ đồng bộ GitHub.');
      } finally {
        setIsLoading(false);
      }
    },
    [activeUid, config.githubOwner, config.githubRepo, fetchBuildStatus, fetchSchedules]
  );

  const handleLoadMorePosts = useCallback(async () => {
    if (!activeUid || loadingMorePosts || !postsHasMore) return;
    const targetOwner = config.githubOwner.trim();
    const targetRepo = config.githubRepo.trim();
    if (!targetOwner || !targetRepo) return;

    const branch = repoInfo?.defaultBranch || 'main';
    setLoadingMorePosts(true);
    try {
      const nextRes = await ghGetRepoPosts(targetOwner, targetRepo, branch, {
        uid: activeUid,
        offset: githubPosts.length,
        limit: 30,
      });
      if (nextRes.ok) {
        const incoming = nextRes.posts || [];
        setGithubPosts((prev) => {
          const seen = new Set(prev.map((p) => p.path));
          const appended = incoming.filter((p) => !seen.has(p.path));
          return [...prev, ...appended];
        });
        setPostsTotalCount(nextRes.totalCount ?? githubPosts.length + incoming.length);
        setPostsHasMore(Boolean(nextRes.hasMore));
      }
    } finally {
      setLoadingMorePosts(false);
    }
  }, [
    activeUid,
    loadingMorePosts,
    postsHasMore,
    config.githubOwner,
    config.githubRepo,
    repoInfo?.defaultBranch,
    githubPosts.length,
  ]);

  // Load workspace data whenever a verified Google user session becomes active
  useEffect(() => {
    if (!activeUid) return;
    fetchAuthStatus();
    syncFromGitHub();
    fetchSchedules();
  }, [activeUid, fetchAuthStatus, syncFromGitHub, fetchSchedules]);

  // Background 20s ticker executing due scheduled publish/auto-delete tasks while signed in
  useEffect(() => {
    if (!activeUid || !authStatus?.authenticated) return;
    if (!config.githubOwner?.trim() || !config.githubRepo?.trim()) return;

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
        const data = await ghRunDueSchedules(config.githubOwner, config.githubRepo, activeUid);
        if (data.executedCount > 0) {
          await fetchSchedules();
          syncFromGitHub();
          showBanner({
            message: `Đã tự động thực thi ${data.executedCount} lịch trình đến hạn trên GitHub.`,
          });
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
  }, [
    activeUid,
    authStatus?.authenticated,
    scheduledTasks,
    config.githubOwner,
    config.githubRepo,
    fetchSchedules,
    syncFromGitHub,
  ]);

  // Listen for OAuth popup completion and auto-select user's <login>.github.io repo if present
  useEffect(() => {
    if (!activeUid) return;
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
            ? `Đã đăng nhập GitHub với tài khoản @${userLogin}.`
            : 'Đã kết nối tài khoản GitHub thành công.',
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [activeUid, fetchAuthStatus, fetchUserRepos, syncFromGitHub]);

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
    const hasBackend = await isBackendAvailable();
    if (hasBackend) {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    }
    await fetchAuthStatus();
    showBanner({ message: 'Đã đăng xuất phiên GitHub OAuth.' });
  };

  const handleSavePersonalPat = async (token: string) => {
    if (!activeUid) return;
    setStoredGitHubPat(activeUid, token);
    setHasPersonalPat(Boolean(token.trim()));

    if (!token.trim()) {
      await fetchAuthStatus();
      showBanner({ message: 'Đã gỡ GitHub Token cá nhân khỏi thiết bị.' });
      return;
    }

    const status = await fetchAuthStatus();
    if (!status?.authenticated) {
      setStoredGitHubPat(activeUid, '');
      setHasPersonalPat(false);
      await fetchAuthStatus();
      showBanner({ message: 'GitHub Token không hợp lệ hoặc đã hết hạn.' });
      return;
    }

    const repos = await fetchUserRepos();
    const userLogin = status.user?.login;
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
        ? `Đã kết nối GitHub cá nhân (@${userLogin}) cho tài khoản Google này.`
        : 'Đã lưu GitHub Token cá nhân.',
    });
  };

  const handleSignOutGoogle = async () => {
    const hasBackend = await isBackendAvailable();
    if (hasBackend) {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    }
    await signOutGoogle();
  };

  const handleClearLocalData = async () => {
    if (activeUid) {
      localStorage.removeItem(getUserStorageKey(activeUid, 'config_v1'));
      localStorage.removeItem(getUserStorageKey(activeUid, 'drafts_v1'));
      localStorage.removeItem(getUserStorageKey(activeUid, 'gh_pat'));
      localStorage.removeItem(getUserStorageKey(activeUid, 'schedules_v1'));
      clearSocialCredentials(activeUid);
    }
    const hasBackend = await isBackendAvailable();
    if (hasBackend) {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    }
    setLocalDrafts([]);
    setHasPersonalPat(false);
    await signOutGoogle();
  };

  const handleToggleThemeMode = (themeMode: ThemeMode) => {
    setGateThemeMode(themeMode);
    try {
      localStorage.setItem(GATE_THEME_KEY, themeMode);
    } catch {
      // ignore
    }
    setConfig((prev) => ({
      ...prev,
      themeMode,
      astroTemplate: normalizeAstroTemplateId(prev.astroTemplate, themeMode),
    }));
  };

  const handleSaveLocalDraft = (draftPost: BlogPost) => {
    setLocalDrafts((prev) => {
      const others = prev.filter((p) => p.slug !== draftPost.slug && p.id !== draftPost.id);
      return [draftPost, ...others];
    });
    if (activeUid) {
      void upsertUserDraftToFirestore(activeUid, draftPost);
    }
  };

  const handleImportPosts = (importedPosts: BlogPost[]) => {
    if (importedPosts.length === 0) return;
    setLocalDrafts((prev) => {
      const incomingIds = new Set(importedPosts.map((p) => p.id));
      const incomingSlugs = new Set(importedPosts.map((p) => `${p.collection}:${p.slug}`));
      const kept = prev.filter(
        (p) => !incomingIds.has(p.id) && !incomingSlugs.has(`${p.collection}:${p.slug}`)
      );
      return [...importedPosts, ...kept];
    });
    if (activeUid) {
      void batchSeedUserDraftsToFirestore(activeUid, importedPosts);
    }
    showBanner({
      message: `Đã nhập ${importedPosts.length} bài viết vào Bản nháp cục bộ & đồng bộ Cloud.`,
    });
  };

  const handleImportConfig = (importedCfg: Partial<BlogConfig>) => {
    if (!importedCfg || typeof importedCfg !== 'object') return;
    setConfig((prev) => {
      const nextMode: ThemeMode = importedCfg.themeMode === 'dark' ? 'dark' : prev.themeMode;
      return {
        ...prev,
        siteTitle: importedCfg.siteTitle || prev.siteTitle,
        tagline: importedCfg.tagline ?? prev.tagline,
        siteIcon: importedCfg.siteIcon || prev.siteIcon,
        headerTitle: importedCfg.headerTitle || prev.headerTitle,
        headerNavLinks: Array.isArray(importedCfg.headerNavLinks)
          ? importedCfg.headerNavLinks
          : prev.headerNavLinks,
        footerText: importedCfg.footerText ?? prev.footerText,
        footerLinks: Array.isArray(importedCfg.footerLinks)
          ? importedCfg.footerLinks
          : prev.footerLinks,
        authorName: importedCfg.authorName || prev.authorName,
        authorBio: importedCfg.authorBio ?? prev.authorBio,
        themeMode: nextMode,
        astroTemplate: normalizeAstroTemplateId(
          importedCfg.astroTemplate || prev.astroTemplate,
          nextMode
        ),
        liveChat: importedCfg.liveChat || prev.liveChat,
        customDomain: importedCfg.customDomain ?? prev.customDomain,
        analyticsProvider: importedCfg.analyticsProvider ?? prev.analyticsProvider,
        analyticsId: importedCfg.analyticsId ?? prev.analyticsId,
        giscus: importedCfg.giscus || prev.giscus,
      };
    });
  };

  const handlePublishSuccess = (
    publishedPost: BlogPost,
    commitUrl?: string,
    socialNote?: string
  ) => {
    setGithubPosts((prev) => {
      const others = prev.filter((p) => p.path !== publishedPost.path);
      return [publishedPost, ...others].sort((a, b) => b.date.localeCompare(a.date));
    });
    const matchedDrafts = localDrafts.filter(
      (p) => p.slug === publishedPost.slug || p.path === publishedPost.path
    );
    if (matchedDrafts.length > 0) {
      setLocalDrafts((prev) =>
        prev.filter((p) => p.slug !== publishedPost.slug && p.path !== publishedPost.path)
      );
      if (activeUid) {
        matchedDrafts.forEach((d) => {
          void deleteUserDraftFromFirestore(activeUid, d.id);
        });
      }
    }
    setActiveTab('blog');
    showBanner({
      message: socialNote
        ? `Đã đăng "${publishedPost.title}" lên ${config.githubOwner}/${config.githubRepo}. ${socialNote}`
        : `Đã đăng "${publishedPost.title}" lên ${config.githubOwner}/${config.githubRepo}`,
      linkUrl: commitUrl || config.pagesUrl,
      linkLabel: commitUrl ? 'Xem Commit' : 'Mở GitHub Pages',
    });

    startBuildProgressPolling(config.githubOwner, config.githubRepo, config.pagesUrl);
  };

  const handleDeletePost = async (post: BlogPost) => {
    if (!post.sha) return;
    const res = await ghDeletePost(
      {
        owner: config.githubOwner,
        repo: config.githubRepo,
        branch: repoInfo?.defaultBranch || 'main',
        filePath: post.path,
        sha: post.sha,
      },
      activeUid
    );
    if (res.ok) {
      setGithubPosts((prev) => prev.filter((p) => p.path !== post.path));
      setPostsTotalCount((c) => Math.max(0, c - 1));
      showBanner({ message: `Đã xoá tệp ${post.path} khỏi GitHub.` });
    } else {
      showBanner({ message: res.error || 'Không thể xoá mục này.' });
    }
  };

  const handleScheduleDeletePost = async (post: BlogPost, scheduledAtIso: string) => {
    const res = await ghCreateSchedule(
      {
        type: 'delete',
        owner: config.githubOwner,
        repo: config.githubRepo,
        branch: repoInfo?.defaultBranch || 'main',
        filePath: post.path,
        title: post.title,
        scheduledAt: scheduledAtIso,
      },
      activeUid
    );
    if (!res.ok) {
      throw new Error(res.error || 'Không thể đặt lịch xoá bài.');
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

  const handleSiteCreated = (
    owner: string,
    repo: string,
    pagesUrl: string,
    postsDirectory = '_posts'
  ) => {
    setConfig((prev) => ({
      ...prev,
      githubOwner: owner,
      githubRepo: repo,
      pagesUrl,
      postsDirectory,
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

  if (authInitializing) {
    return (
      <div
        style={{
          backgroundColor: activeTheme.palette.canvas,
          color: activeTheme.palette.textPrimary,
          fontFamily: activeTheme.fonts.body,
        }}
        className="min-h-screen flex flex-col items-center justify-center gap-3 p-6"
      >
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: activeTheme.palette.link }} />
        <div className="text-sm font-medium">Đang kiểm tra phiên đăng nhập Google...</div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <GoogleAuthGate theme={activeTheme} onToggleTheme={handleToggleThemeMode} />;
  }

  const repoDisplayLabel =
    config.githubOwner && config.githubRepo
      ? `${config.githubOwner}/${config.githubRepo}`
      : 'Chưa kết nối kho GitHub';

  return (
    <div
      style={{
        backgroundColor: activeTheme.palette.canvas,
        color: activeTheme.palette.textPrimary,
      }}
      className="min-h-screen flex flex-col overflow-x-hidden transition-colors duration-200"
    >
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onCreateNewPost={() => handleCreateNewPost('bai_viet')}
        onToggleThemeMode={handleToggleThemeMode}
        onOpenGuide={() => setShowGuideModal(true)}
        theme={activeTheme}
        siteTitle={config.siteTitle}
        headerTitle={config.headerTitle}
        siteIcon={config.siteIcon}
      />

      <UserGuideModal
        open={showGuideModal}
        theme={activeTheme}
        onClose={() => setShowGuideModal(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
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
            postsTotalCount={postsTotalCount}
            hasMorePosts={postsHasMore}
            isLoadingMorePosts={loadingMorePosts}
            onLoadMorePosts={handleLoadMorePosts}
            onToggleThemeMode={handleToggleThemeMode}
            onEditPost={handleEditPost}
            onCreateNewPost={handleCreateNewPost}
            onRefreshGitHub={() => syncFromGitHub()}
            onOpenGitHubTab={() => setActiveTab('github')}
          />
        )}

        {activeTab === 'editor' && (
          <MarkdownEditor
            theme={activeTheme}
            config={config}
            uid={activeUid}
            authStatus={authStatus}
            initialPost={editingPost}
            existingPosts={githubPosts}
            defaultCollection={editorDefaultCollection}
            defaultBranch={repoInfo?.defaultBranch}
            isAstroRepo={Boolean(repoStructure?.hasAstroEngine)}
            repoStructure={repoStructure}
            onSaveLocalDraft={handleSaveLocalDraft}
            onPublishSuccess={handlePublishSuccess}
            onScheduledSuccess={handleScheduledSuccess}
            onOpenGitHubTab={() => setActiveTab('github')}
            onMobileFocusChange={setMobileEditorFocused}
          />
        )}

        {activeTab === 'github' && (
          <GitHubSyncPanel
            theme={activeTheme}
            config={config}
            firebaseUser={firebaseUser}
            hasPersonalPat={hasPersonalPat}
            cloudSyncActive={cloudSyncActive}
            authStatus={authStatus}
            repoInfo={repoInfo}
            repoStructure={repoStructure}
            buildStatus={buildStatus}
            userRepos={userRepos}
            posts={[...localDrafts, ...githubPosts]}
            postsTotalCount={postsTotalCount}
            hasMorePosts={postsHasMore}
            isLoadingMorePosts={loadingMorePosts}
            scheduledTasks={scheduledTasks}
            isLoading={isLoading}
            repoError={repoError}
            onRefresh={() => syncFromGitHub()}
            onLoadMorePosts={handleLoadMorePosts}
            onRefreshSchedules={() => fetchSchedules()}
            onUpdateConfig={(next) => setConfig(next)}
            onImportPosts={handleImportPosts}
            onImportConfig={handleImportConfig}
            onDeployedToGitHub={(message, commitUrl) => {
              showBanner({
                message,
                linkUrl: commitUrl || config.pagesUrl,
                linkLabel: commitUrl ? 'Xem Commit' : 'Mở trang web',
              });
              syncFromGitHub();
              startBuildProgressPolling(config.githubOwner, config.githubRepo, config.pagesUrl);
            }}
            onScheduleDeletePost={handleScheduleDeletePost}
            onEditPost={handleEditPost}
            onDeletePost={handleDeletePost}
            onConnectOAuth={handleConnectOAuth}
            onLogoutOAuth={handleLogoutOAuth}
            onSavePersonalPat={handleSavePersonalPat}
            onSignOutGoogle={handleSignOutGoogle}
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
        className="hidden md:block border-t py-6 px-4 sm:px-6 text-xs"
      >
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>
            {config.footerText?.trim() ||
              `${config.headerTitle || 'Đạo Ký'} · ${repoDisplayLabel}`}
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
            {config.pagesUrl && (
              <a
                href={config.pagesUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:underline underline-offset-4"
              >
                {config.pagesUrl}
              </a>
            )}
          </div>
        </div>
      </footer>

      <FloatingLiveChat
        theme={activeTheme}
        config={config}
        onUpdateConfig={setConfig}
        hideOnMobile={mobileEditorFocused && activeTab === 'editor'}
        onOpenSettings={() => {
          setActiveTab('github');
          window.setTimeout(() => {
            document.getElementById('live-chat-settings')?.scrollIntoView({ behavior: 'smooth' });
          }, 120);
        }}
      />

      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        theme={activeTheme}
        hidden={mobileEditorFocused && activeTab === 'editor'}
      />
    </div>
  );
}
