import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  Rocket,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type {
  AnalyticsProviderId,
  AstroTemplateId,
  AuthStatus,
  BlogConfig,
  BlogPost,
  BlogTheme,
  GiscusConfig,
  GitHubRepoInfo,
  LiveChatChannelConfig,
  LiveChatConfig,
  LiveChatPlatformId,
  RepoStructureInfo,
  SiteNavLink,
  ThemeCustomColors,
} from '../types/blog';
import {
  DEFAULT_LIVE_CHAT_CONFIG,
  EDITORIAL_THEMES,
  normalizeAstroTemplateId,
  sanitizeThemeCustomColors,
} from '../data/themes';
import { ghDeployAstroTemplate, ghSaveSiteConfig } from '../utils/githubClient';
import { ThemeVisualSelector } from './ThemeVisualSelector';

const LIVE_CHAT_CHANNEL_META: Record<
  LiveChatPlatformId,
  { name: string; placeholder: string; hint: string }
> = {
  zalo: {
    name: 'Zalo OA / Cá nhân',
    placeholder: 'Số điện thoại hoặc https://zalo.me/...',
    hint: 'Nhập SĐT Zalo (VD: 0909123456) hoặc link zalo.me/id',
  },
  messenger: {
    name: 'Facebook Messenger',
    placeholder: 'Username Fanpage hoặc https://m.me/...',
    hint: 'Nhập username trang (VD: mypage) hoặc m.me/...',
  },
  telegram: {
    name: 'Telegram',
    placeholder: '@username hoặc https://t.me/...',
    hint: 'Nhập @username Telegram của bạn',
  },
  whatsapp: {
    name: 'WhatsApp',
    placeholder: '84909123456',
    hint: 'Số điện thoại kèm mã quốc gia (VD: 84...)',
  },
  email: {
    name: 'Email liên hệ',
    placeholder: 'lienhe@tenmien.com',
    hint: 'Địa chỉ email nhận tin nhắn từ độc giả',
  },
  tawkto: {
    name: 'Tawk.to Widget',
    placeholder: 'propertyId/widgetId',
    hint: 'Dán cặp ID từ embed.tawk.to/<propertyId>/<widgetId>',
  },
  crisp: {
    name: 'Crisp Chat',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    hint: 'Website ID lấy từ cài đặt Crisp Chat',
  },
};

function mergeLiveChatConfig(raw?: LiveChatConfig): LiveChatConfig {
  const incoming = raw?.channels || [];
  const mergedChannels: LiveChatChannelConfig[] = DEFAULT_LIVE_CHAT_CONFIG.channels.map(
    (def) => {
      const match = incoming.find((c) => c.id === def.id);
      return match ? { ...def, ...match } : { ...def };
    }
  );
  return {
    enabled: Boolean(raw?.enabled),
    title: raw?.title || DEFAULT_LIVE_CHAT_CONFIG.title,
    welcomeText: raw?.welcomeText || DEFAULT_LIVE_CHAT_CONFIG.welcomeText,
    channels: mergedChannels,
  };
}

interface SiteIdentityCardProps {
  theme: BlogTheme;
  config: BlogConfig;
  posts: BlogPost[];
  authStatus: AuthStatus | null;
  repoInfo: GitHubRepoInfo | null;
  repoStructure?: RepoStructureInfo | null;
  onUpdateConfig: (next: BlogConfig) => void;
  onDeployedToGitHub?: (message: string, commitUrl?: string) => void;
  onRefreshRepo?: () => void;
}

function resizeImageToFaviconDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Tệp ảnh không hợp lệ.'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        // Center-crop square
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png', 0.92));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export function SiteIdentityCard({
  theme,
  config,
  posts,
  authStatus,
  repoInfo,
  repoStructure = null,
  onUpdateConfig,
  onDeployedToGitHub,
  onRefreshRepo,
}: SiteIdentityCardProps) {
  const { palette, fonts } = theme;
  const iconFileRef = useRef<HTMLInputElement | null>(null);

  const isAstroRepo = Boolean(
    repoStructure?.hasAstroEngine || repoStructure?.framework === 'astro-vn'
  );
  const existingRepoPostCount = posts.filter((p) => p.source === 'github').length;

  const [siteTitle, setSiteTitle] = useState(config.siteTitle || '');
  const [tagline, setTagline] = useState(config.tagline || '');
  const [siteIcon, setSiteIcon] = useState(
    config.siteIcon || './assets/aistudio/1794978557793_3b5d5cb0.png'
  );
  const [headerTitle, setHeaderTitle] = useState(config.headerTitle || 'Đạo Ký');
  const [headerNavLinks, setHeaderNavLinks] = useState<SiteNavLink[]>(
    config.headerNavLinks || []
  );
  const [footerText, setFooterText] = useState(config.footerText || '');
  const [footerLinks, setFooterLinks] = useState<SiteNavLink[]>(config.footerLinks || []);
  const [authorName, setAuthorName] = useState(config.authorName || '');
  const [authorBio, setAuthorBio] = useState(config.authorBio || '');
  const [astroTemplate, setAstroTemplate] = useState<AstroTemplateId>(() =>
    normalizeAstroTemplateId(config.astroTemplate, config.themeMode)
  );
  const [themeColors, setThemeColors] = useState<ThemeCustomColors | undefined>(() =>
    sanitizeThemeCustomColors(config.themeColors)
  );
  const [liveChat, setLiveChat] = useState<LiveChatConfig>(() =>
    mergeLiveChatConfig(config.liveChat)
  );
  const [customDomain, setCustomDomain] = useState(config.customDomain || '');
  const [analyticsProvider, setAnalyticsProvider] = useState<AnalyticsProviderId>(
    config.analyticsProvider || 'none'
  );
  const [analyticsId, setAnalyticsId] = useState(config.analyticsId || '');
  const [giscus, setGiscus] = useState<GiscusConfig>(() => ({
    enabled: Boolean(config.giscus?.enabled),
    repo: config.giscus?.repo || '',
    repoId: config.giscus?.repoId || '',
    category: config.giscus?.category || 'Announcements',
    categoryId: config.giscus?.categoryId || '',
  }));
  const [preservePostsOnDeploy, setPreservePostsOnDeploy] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeployingApp, setIsDeployingApp] = useState(false);
  const [isDeployingAstro, setIsDeployingAstro] = useState(false);
  const [confirmWipeAstro, setConfirmWipeAstro] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; url?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const repoDisplay =
    config.githubOwner && config.githubRepo
      ? `${config.githubOwner}/${config.githubRepo}`
      : 'Chưa chọn repository';

  useEffect(() => {
    setSiteTitle(config.siteTitle || '');
    setTagline(config.tagline || '');
    setSiteIcon(config.siteIcon || './assets/aistudio/1794978557793_3b5d5cb0.png');
    setHeaderTitle(config.headerTitle || 'Đạo Ký');
    setHeaderNavLinks(config.headerNavLinks || []);
    setFooterText(config.footerText || '');
    setFooterLinks(config.footerLinks || []);
    setAuthorName(config.authorName || '');
    setAuthorBio(config.authorBio || '');
    setAstroTemplate(normalizeAstroTemplateId(config.astroTemplate, config.themeMode));
    setThemeColors(sanitizeThemeCustomColors(config.themeColors));
    setCustomDomain(config.customDomain || '');
    setAnalyticsProvider(config.analyticsProvider || 'none');
    setAnalyticsId(config.analyticsId || '');
    setGiscus({
      enabled: Boolean(config.giscus?.enabled),
      repo: config.giscus?.repo || '',
      repoId: config.giscus?.repoId || '',
      category: config.giscus?.category || 'Announcements',
      categoryId: config.giscus?.categoryId || '',
    });
  }, [
    config.githubOwner,
    config.githubRepo,
    config.siteTitle,
    config.tagline,
    config.siteIcon,
    config.headerTitle,
    config.headerNavLinks,
    config.footerText,
    config.footerLinks,
    config.authorName,
    config.authorBio,
    config.astroTemplate,
    config.themeMode,
    config.themeColors,
    config.customDomain,
    config.analyticsProvider,
    config.analyticsId,
    config.giscus,
  ]);

  useEffect(() => {
    setLiveChat(mergeLiveChatConfig(config.liveChat));
  }, [config.liveChat]);

  const updateLiveChatImmediate = (nextChat: LiveChatConfig) => {
    setLiveChat(nextChat);
    onUpdateConfig({
      ...config,
      liveChat: nextChat,
    });
  };

  const buildDraftConfig = (
    overrideTemplate?: AstroTemplateId,
    overrideLiveChat?: LiveChatConfig
  ): BlogConfig => {
    const chosenTpl = overrideTemplate || astroTemplate;
    const chosenPreset = EDITORIAL_THEMES[chosenTpl];
    const chosenChat = overrideLiveChat || liveChat;
    const cleanedDomain = customDomain
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');
    return {
      ...config,
      siteTitle: siteTitle.trim() || config.siteTitle,
      tagline: tagline.trim(),
      siteIcon: siteIcon.trim() || './assets/aistudio/1794978557793_3b5d5cb0.png',
      headerTitle: headerTitle.trim() || 'Đạo Ký',
      headerNavLinks: headerNavLinks.filter((l) => l.label.trim() && l.url.trim()),
      footerText: footerText.trim(),
      footerLinks: footerLinks.filter((l) => l.label.trim() && l.url.trim()),
      authorName: authorName.trim() || config.authorName,
      authorBio: authorBio.trim(),
      themeMode:
        overrideTemplate && chosenPreset
          ? chosenPreset.isDark
            ? 'dark'
            : 'light'
          : config.themeMode || (chosenPreset?.isDark ? 'dark' : 'light'),
      astroTemplate: chosenTpl,
      themeColors: sanitizeThemeCustomColors(themeColors),
      customDomain: cleanedDomain || undefined,
      analyticsProvider,
      analyticsId: analyticsId.trim() || undefined,
      giscus: {
        enabled: Boolean(giscus.enabled),
        repo: giscus.repo.trim(),
        repoId: giscus.repoId.trim(),
        category: giscus.category.trim() || 'Announcements',
        categoryId: giscus.categoryId.trim(),
      },
      liveChat: {
        enabled: chosenChat.enabled,
        title: (chosenChat.title || '').trim(),
        welcomeText: (chosenChat.welcomeText || '').trim(),
        channels: chosenChat.channels.map((ch) => ({
          ...ch,
          value: ch.value.trim(),
          label: (ch.label || '').trim() || undefined,
        })),
      },
    };
  };

  const handleIconFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const dataUrl = await resizeImageToFaviconDataUrl(file);
      setSiteIcon(dataUrl);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể xử lý ảnh biểu tượng.');
    }
  };

  const persistConfig = async (options: { syncToGitHub: boolean; publishWebApp: boolean }) => {
    const nextCfg = buildDraftConfig();
    onUpdateConfig(nextCfg);
    setErrorMessage(null);
    setStatusMessage(null);

    if (options.publishWebApp) {
      setIsDeployingApp(true);
    } else {
      setIsSaving(true);
    }

    try {
      const result = await ghSaveSiteConfig({
        owner: config.githubOwner,
        repo: config.githubRepo,
        branch: repoInfo?.defaultBranch || 'main',
        config: nextCfg,
        syncToGitHub: options.syncToGitHub,
        publishWebApp: options.publishWebApp,
        posts: options.publishWebApp ? posts.filter((p) => p.source !== 'sample') : [],
      });
      if (!result.ok) {
        setErrorMessage(result.error || 'Không thể lưu cấu hình nhận dạng web.');
        return;
      }

      if (options.publishWebApp) {
        const msg = `Đã xuất bản Web App độc lập & nhận dạng mới lên ${config.pagesUrl}`;
        setStatusMessage({ text: msg, url: result.commitUrl || config.pagesUrl });
        onDeployedToGitHub?.(msg, result.commitUrl);
      } else if (options.syncToGitHub) {
        const msg = isAstroRepo
          ? `Đã đồng bộ Nhận dạng, Theme & Live Chat lên Astro (${config.githubOwner}/${config.githubRepo}) và kích hoạt build lại.`
          : `Đã lưu & đồng bộ cấu hình nhận dạng lên Git (.blogvn/site-config.json).`;
        setStatusMessage({ text: msg, url: result.commitUrl || config.pagesUrl });
        onDeployedToGitHub?.(msg, result.commitUrl);
      } else {
        setStatusMessage({
          text: 'Đã lưu nhận dạng web vào thiết bị & áp dụng ngay trên giao diện.',
        });
      }
    } catch {
      setErrorMessage('Lỗi kết nối khi lưu cấu hình nhận dạng web.');
    } finally {
      setIsSaving(false);
      setIsDeployingApp(false);
    }
  };

  const handleDeployCleanAstroTemplate = async () => {
    const nextCfg: BlogConfig = {
      ...buildDraftConfig(),
      postsDirectory: 'src/content/bai_viet',
    };
    onUpdateConfig(nextCfg);
    setErrorMessage(null);
    setStatusMessage(null);
    setIsDeployingAstro(true);

    try {
      const result = await ghDeployAstroTemplate({
        owner: config.githubOwner,
        repo: config.githubRepo,
        branch: repoInfo?.defaultBranch || 'main',
        config: nextCfg,
        templateId: astroTemplate,
        preservePosts: preservePostsOnDeploy,
      });

      if (!result.ok) {
        setErrorMessage(result.error || 'Không thể triển khai Template Astro Việt.');
        return;
      }

      setConfirmWipeAstro(false);
      const preservedNote =
        preservePostsOnDeploy && (result.preservedCount || 0) > 0
          ? ` (đã giữ nguyên ${result.preservedCount} bài viết & ảnh cũ)`
          : '';
      const msg = `Đã triển khai Template Astro Blog Việt${preservedNote} lên ${config.githubOwner}/${config.githubRepo}! GitHub Actions đang build trang web.`;
      setStatusMessage({
        text: msg,
        url: result.actionsUrl || result.commitUrl || config.pagesUrl,
      });
      onDeployedToGitHub?.(msg, result.actionsUrl || result.commitUrl);
      onRefreshRepo?.();
    } catch {
      setErrorMessage('Lỗi kết nối khi triển khai Template Astro Việt.');
    } finally {
      setIsDeployingAstro(false);
    }
  };

  const addHeaderLink = () => {
    setHeaderNavLinks((prev) => [...prev, { label: '', url: 'https://' }]);
  };

  const addFooterLink = () => {
    setFooterLinks((prev) => [...prev, { label: '', url: 'https://' }]);
  };

  return (
    <section
      id="site-identity-settings"
      style={{
        borderColor: palette.border,
        backgroundColor: palette.surface,
      }}
      className="rounded-2xl border p-5 sm:p-6 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            style={{
              backgroundColor: palette.canvas,
              borderColor: palette.border,
            }}
            className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden"
          >
            {siteIcon ? (
              <img
                src={siteIcon}
                alt="Site Icon Preview"
                className="w-6 h-6 object-contain rounded"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Globe className="w-5 h-5" style={{ color: palette.link }} />
            )}
          </div>
          <div>
            <h2 style={{ fontFamily: fonts.display }} className="text-lg font-bold">
              4. Nhận dạng Web cá nhân, Header/Footer &amp; Xuất bản Web App GitHub Pages
            </h2>
            <p style={{ color: palette.textSecondary }} className="text-xs sm:text-sm mt-1">
              Tuỳ chỉnh Icon, Tiêu đề web, Header, Footer và Mô tả riêng cho{' '}
              <code>{repoDisplay}</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Browser Tab Live Preview */}
      <div
        style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
        className="p-3.5 rounded-xl border flex items-center gap-3"
      >
        <img
          src={siteIcon || './assets/aistudio/1794978557793_3b5d5cb0.png'}
          alt="Icon"
          className="w-6 h-6 rounded-full object-cover shrink-0 border"
          style={{ borderColor: palette.border }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold truncate">{siteTitle || 'Tiêu đề trang web'}</div>
          <div style={{ color: palette.textMuted }} className="text-[11px] truncate">
            {config.pagesUrl} · {tagline || 'Mô tả trang web'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {/* Icon & Header Brand */}
        <div className="space-y-1.5">
          <label style={{ color: palette.textMuted }} className="block text-xs font-medium">
            Biểu tượng Web (Favicon / App Icon)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={siteIcon}
              onChange={(e) => setSiteIcon(e.target.value)}
              placeholder="./assets/aistudio/1794978557793_3b5d5cb0.png hoặc URL"
              style={{
                backgroundColor: palette.canvas,
                borderColor: palette.border,
                color: palette.textPrimary,
                fontFamily: fonts.mono,
              }}
              className="flex-1 min-w-0 px-3 min-h-[44px] text-xs rounded-xl border"
            />
            <input
              ref={iconFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIconFileSelected}
            />
            <button
              type="button"
              onClick={() => iconFileRef.current?.click()}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.canvas,
                color: palette.textPrimary,
              }}
              className="inline-flex items-center gap-1.5 px-3 min-h-[44px] text-xs font-medium rounded-xl border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
            >
              <ImagePlus className="w-4 h-4" />
              Chọn ảnh
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label style={{ color: palette.textMuted }} className="block text-xs font-medium">
            Tên hiển thị trên Header (Brand)
          </label>
          <input
            type="text"
            value={headerTitle}
            onChange={(e) => setHeaderTitle(e.target.value)}
            placeholder="VD: Đạo Ký hoặc tên cá nhân"
            style={{
              backgroundColor: palette.canvas,
              borderColor: palette.border,
              color: palette.textPrimary,
            }}
            className="w-full px-3.5 min-h-[44px] text-sm rounded-xl border"
          />
        </div>

        {/* Web Title & Tagline */}
        <div className="space-y-1.5">
          <label style={{ color: palette.textMuted }} className="block text-xs font-medium">
            Tiêu đề Trang web (Title &amp; SEO)
          </label>
          <input
            type="text"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            placeholder="VD: Nhật Ký Viết Lách"
            style={{
              backgroundColor: palette.canvas,
              borderColor: palette.border,
              color: palette.textPrimary,
            }}
            className="w-full px-3.5 min-h-[44px] text-sm rounded-xl border"
          />
        </div>

        <div className="space-y-1.5">
          <label style={{ color: palette.textMuted }} className="block text-xs font-medium">
            Tác giả chính
          </label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Tên tác giả"
            style={{
              backgroundColor: palette.canvas,
              borderColor: palette.border,
              color: palette.textPrimary,
            }}
            className="w-full px-3.5 min-h-[44px] text-sm rounded-xl border"
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label style={{ color: palette.textMuted }} className="block text-xs font-medium">
            Mô tả trang web (Tagline / Meta Description)
          </label>
          <textarea
            rows={2}
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Giới thiệu ngắn gọn về nội dung website của bạn..."
            style={{
              backgroundColor: palette.canvas,
              borderColor: palette.border,
              color: palette.textPrimary,
            }}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border"
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label style={{ color: palette.textMuted }} className="block text-xs font-medium">
            Tiểu sử tác giả (Hiển thị cuối bài viết)
          </label>
          <input
            type="text"
            value={authorBio}
            onChange={(e) => setAuthorBio(e.target.value)}
            placeholder="Giới thiệu vài dòng về bạn..."
            style={{
              backgroundColor: palette.canvas,
              borderColor: palette.border,
              color: palette.textPrimary,
            }}
            className="w-full px-3.5 min-h-[44px] text-sm rounded-xl border"
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label style={{ color: palette.textMuted }} className="block text-xs font-medium">
            Nội dung Chân trang (Footer Text)
          </label>
          <input
            type="text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="VD: © 2026 Tên Blog · Chia sẻ kiến thức & ghi chép cá nhân."
            style={{
              backgroundColor: palette.canvas,
              borderColor: palette.border,
              color: palette.textPrimary,
            }}
            className="w-full px-3.5 min-h-[44px] text-sm rounded-xl border"
          />
        </div>
      </div>

      {/* Custom Header Links & Footer Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
          className="p-4 rounded-xl border space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">Liên kết thêm trên Header</span>
            <button
              type="button"
              onClick={addHeaderLink}
              style={{ borderColor: palette.border, color: palette.link }}
              className="inline-flex items-center gap-1 px-2.5 min-h-[34px] text-xs font-medium rounded-lg border cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm link
            </button>
          </div>
          {headerNavLinks.length === 0 ? (
            <p style={{ color: palette.textMuted }} className="text-xs">
              Chưa có liên kết tuỳ chỉnh trên Header (VD: Giới thiệu, Liên hệ, YouTube).
            </p>
          ) : (
            <div className="space-y-2">
              {headerNavLinks.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tên link"
                    value={item.label}
                    onChange={(e) => {
                      const next = [...headerNavLinks];
                      next[idx] = { ...next[idx], label: e.target.value };
                      setHeaderNavLinks(next);
                    }}
                    style={{
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="w-full sm:w-1/3 px-2.5 min-h-[38px] text-xs rounded-lg border"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="https://..."
                    value={item.url}
                    onChange={(e) => {
                      const next = [...headerNavLinks];
                      next[idx] = { ...next[idx], url: e.target.value };
                      setHeaderNavLinks(next);
                    }}
                    style={{
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                      fontFamily: fonts.mono,
                    }}
                    className="flex-1 min-w-0 px-2.5 min-h-[38px] text-xs rounded-lg border"
                  />
                  <button
                    type="button"
                    aria-label="Xoá liên kết header"
                    onClick={() =>
                      setHeaderNavLinks((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
          className="p-4 rounded-xl border space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">Liên kết ở Chân trang (Footer)</span>
            <button
              type="button"
              onClick={addFooterLink}
              style={{ borderColor: palette.border, color: palette.link }}
              className="inline-flex items-center gap-1 px-2.5 min-h-[34px] text-xs font-medium rounded-lg border cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm link
            </button>
          </div>
          {footerLinks.length === 0 ? (
            <p style={{ color: palette.textMuted }} className="text-xs">
              Chưa có liên kết chân trang (VD: GitHub, Facebook, Email, RSS).
            </p>
          ) : (
            <div className="space-y-2">
              {footerLinks.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tên link"
                    value={item.label}
                    onChange={(e) => {
                      const next = [...footerLinks];
                      next[idx] = { ...next[idx], label: e.target.value };
                      setFooterLinks(next);
                    }}
                    style={{
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="w-full sm:w-1/3 px-2.5 min-h-[38px] text-xs rounded-lg border"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="https://..."
                    value={item.url}
                    onChange={(e) => {
                      const next = [...footerLinks];
                      next[idx] = { ...next[idx], url: e.target.value };
                      setFooterLinks(next);
                    }}
                    style={{
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                      fontFamily: fonts.mono,
                    }}
                    className="flex-1 min-w-0 px-2.5 min-h-[38px] text-xs rounded-lg border"
                  />
                  <button
                    type="button"
                    aria-label="Xoá liên kết footer"
                    onClick={() => setFooterLinks((prev) => prev.filter((_, i) => i !== idx))}
                    className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Domain (CNAME), Web Analytics & Giscus Comments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
          className="p-4 rounded-xl border space-y-3"
        >
          <div className="text-xs sm:text-sm font-semibold">
            Tên miền riêng (Custom Domain / CNAME)
          </div>
          <input
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            placeholder="VD: blog.tenmiencuaban.com"
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.textPrimary,
              fontFamily: fonts.mono,
            }}
            className="w-full px-3 min-h-[44px] text-xs rounded-lg border"
          />
          <p style={{ color: palette.textMuted }} className="text-[11px] leading-relaxed">
            Đạo Ký sẽ tự tạo tệp <code>public/CNAME</code> khi đồng bộ Astro. Hãy trỏ bản ghi DNS{' '}
            <code>CNAME</code> tại nhà cung cấp tên miền về{' '}
            <code>{config.githubOwner ? `${config.githubOwner}.github.io` : 'username.github.io'}</code>.
          </p>
        </div>

        <div
          style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
          className="p-4 rounded-xl border space-y-3"
        >
          <div className="text-xs sm:text-sm font-semibold">
            Phân tích lưu lượng truy cập (Web Analytics)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <select
              value={analyticsProvider}
              onChange={(e) => setAnalyticsProvider(e.target.value as AnalyticsProviderId)}
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.textPrimary,
              }}
              className="w-full px-3 min-h-[44px] text-xs rounded-lg border"
            >
              <option value="none">Không sử dụng</option>
              <option value="ga4">Google Analytics 4 (GA4)</option>
              <option value="cloudflare">Cloudflare Web Analytics</option>
              <option value="plausible">Plausible Analytics</option>
              <option value="umami">Umami Analytics</option>
            </select>
            {analyticsProvider !== 'none' && (
              <input
                type="text"
                value={analyticsId}
                onChange={(e) => setAnalyticsId(e.target.value)}
                placeholder={
                  analyticsProvider === 'ga4'
                    ? 'G-XXXXXXXXXX'
                    : analyticsProvider === 'plausible'
                    ? 'blog.tenmien.com'
                    : analyticsProvider === 'umami'
                    ? 'website-id-uuid'
                    : 'Cloudflare Beacon Token'
                }
                style={{
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                  fontFamily: fonts.mono,
                }}
                className="w-full px-3 min-h-[44px] text-xs rounded-lg border"
              />
            )}
          </div>
          <p style={{ color: palette.textMuted }} className="text-[11px] leading-relaxed">
            Mã đo lường được nhúng tự động vào thẻ <code>&lt;head&gt;</code> khi xuất bản Astro Blog.
          </p>
        </div>
      </div>

      <div
        style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
        className="p-4 rounded-xl border space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs sm:text-sm font-semibold">
              Bình luận độc giả bằng GitHub Discussions (Giscus)
            </div>
            <p style={{ color: palette.textMuted }} className="text-[11px] mt-0.5">
              Cho phép độc giả bình luận dưới mỗi bài viết Astro không cần cơ sở dữ liệu riêng, tự đồng bộ giao diện Sáng / Tối.
            </p>
          </div>
          <label
            className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer select-none min-h-[44px] px-3 rounded-lg border"
            style={{ borderColor: palette.border, backgroundColor: palette.surface }}
          >
            <input
              type="checkbox"
              checked={giscus.enabled}
              onChange={(e) => setGiscus((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span>{giscus.enabled ? 'Đang bật bình luận' : 'Đang tắt'}</span>
          </label>
        </div>

        {giscus.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <input
              type="text"
              value={giscus.repo}
              onChange={(e) => setGiscus((prev) => ({ ...prev, repo: e.target.value }))}
              placeholder="Repo (VD: user/user.github.io)"
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.textPrimary,
                fontFamily: fonts.mono,
              }}
              className="w-full px-3 min-h-[44px] text-xs rounded-lg border"
            />
            <input
              type="text"
              value={giscus.repoId}
              onChange={(e) => setGiscus((prev) => ({ ...prev, repoId: e.target.value }))}
              placeholder="Repo ID (từ giscus.app)"
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.textPrimary,
                fontFamily: fonts.mono,
              }}
              className="w-full px-3 min-h-[44px] text-xs rounded-lg border"
            />
            <input
              type="text"
              value={giscus.category}
              onChange={(e) => setGiscus((prev) => ({ ...prev, category: e.target.value }))}
              placeholder="Category (Announcements)"
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.textPrimary,
              }}
              className="w-full px-3 min-h-[44px] text-xs rounded-lg border"
            />
            <input
              type="text"
              value={giscus.categoryId}
              onChange={(e) => setGiscus((prev) => ({ ...prev, categoryId: e.target.value }))}
              placeholder="Category ID (DIC_...)"
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.textPrimary,
                fontFamily: fonts.mono,
              }}
              className="w-full px-3 min-h-[44px] text-xs rounded-lg border"
            />
          </div>
        )}
      </div>

      {/* Live Chat Widget Controls (Bottom-Right Toggle & Selectable Platforms) */}
      <div
        id="live-chat-settings"
        style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
        className="p-4 rounded-xl border space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <MessageCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: palette.link }} />
            <div>
              <div className="text-xs sm:text-sm font-semibold">
                Live Chat góc phải màn hình (Bật / Tắt chủ động &amp; Nhúng lên Astro Pages)
              </div>
              <p style={{ color: palette.textMuted }} className="text-[11px] mt-0.5">
                Độc giả có thể bấm nút Chat ở góc dưới bên phải để liên hệ qua các nền tảng bạn chọn.
              </p>
            </div>
          </div>

          <label
            className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer select-none min-h-[36px] px-3 rounded-lg border"
            style={{ borderColor: palette.border, backgroundColor: palette.surface }}
          >
            <input
              type="checkbox"
              checked={liveChat.enabled}
              onChange={(e) => {
                updateLiveChatImmediate({ ...liveChat, enabled: e.target.checked });
              }}
              className="w-4 h-4 rounded"
            />
            <span>{liveChat.enabled ? 'Đang bật Live Chat' : 'Đang tắt'}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label style={{ color: palette.textMuted }} className="block mb-1 font-medium">
              Tiêu đề khung chat
            </label>
            <input
              type="text"
              value={liveChat.title || ''}
              onChange={(e) => updateLiveChatImmediate({ ...liveChat, title: e.target.value })}
              placeholder="Trò chuyện với tác giả"
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.textPrimary,
              }}
              className="w-full px-3 min-h-[38px] text-xs rounded-lg border"
            />
          </div>
          <div>
            <label style={{ color: palette.textMuted }} className="block mb-1 font-medium">
              Lời chào mở đầu
            </label>
            <input
              type="text"
              value={liveChat.welcomeText || ''}
              onChange={(e) =>
                updateLiveChatImmediate({ ...liveChat, welcomeText: e.target.value })
              }
              placeholder="Chọn kênh liên hệ nhanh bên dưới..."
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.textPrimary,
              }}
              className="w-full px-3 min-h-[38px] text-xs rounded-lg border"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {liveChat.channels.map((ch) => {
            const meta = LIVE_CHAT_CHANNEL_META[ch.id];
            return (
              <div
                key={ch.id}
                style={{
                  borderColor: ch.enabled ? palette.link : palette.border,
                  backgroundColor: palette.surface,
                }}
                className="p-3 rounded-xl border space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={ch.enabled}
                      onChange={(e) => {
                        const nextChannels = liveChat.channels.map((item) =>
                          item.id === ch.id ? { ...item, enabled: e.target.checked } : item
                        );
                        updateLiveChatImmediate({ ...liveChat, channels: nextChannels });
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <span>{meta.name}</span>
                  </label>
                </div>

                {ch.enabled && (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={ch.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        const nextChannels = liveChat.channels.map((item) =>
                          item.id === ch.id ? { ...item, value: val } : item
                        );
                        updateLiveChatImmediate({ ...liveChat, channels: nextChannels });
                      }}
                      placeholder={meta.placeholder}
                      style={{
                        backgroundColor: palette.canvas,
                        borderColor: palette.border,
                        color: palette.textPrimary,
                        fontFamily: fonts.mono,
                      }}
                      className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                    />
                    <div style={{ color: palette.textMuted }} className="text-[10px]">
                      {meta.hint}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
          {errorMessage}
        </div>
      )}

      {statusMessage && (
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
          className="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <span className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {statusMessage.text}
          </span>
          {statusMessage.url && (
            <a
              href={statusMessage.url}
              target="_blank"
              rel="noreferrer"
              style={{ color: palette.link }}
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"
            >
              Xem kết quả <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Action Buttons + GitHub Pages Web App Deployment Info */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => persistConfig({ syncToGitHub: false, publishWebApp: false })}
            disabled={isSaving || isDeployingApp || isDeployingAstro}
            style={{
              borderColor: palette.border,
              backgroundColor: palette.canvas,
              color: palette.textPrimary,
            }}
            className="inline-flex items-center gap-2 px-4 min-h-[44px] text-xs sm:text-sm font-medium rounded-xl border cursor-pointer hover:opacity-85 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu cấu hình cá nhân
          </button>

          <button
            type="button"
            onClick={() => persistConfig({ syncToGitHub: true, publishWebApp: false })}
            disabled={isSaving || isDeployingApp || isDeployingAstro || !authStatus?.authenticated}
            style={{
              borderColor: palette.border,
              backgroundColor: palette.canvas,
              color: palette.textPrimary,
            }}
            className="inline-flex items-center gap-2 px-4 min-h-[44px] text-xs sm:text-sm font-medium rounded-xl border cursor-pointer hover:opacity-85 disabled:opacity-45"
          >
            <UploadCloud className="w-4 h-4" />
            {isAstroRepo ? 'Đồng bộ Nhận dạng & Build lại Astro' : 'Lưu lên Git (.blogvn/site-config.json)'}
          </button>

          {!isAstroRepo && (
            <button
              type="button"
              onClick={() => persistConfig({ syncToGitHub: true, publishWebApp: true })}
              disabled={isSaving || isDeployingApp || isDeployingAstro || !authStatus?.authenticated}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.canvas,
                color: palette.textPrimary,
              }}
              className="inline-flex items-center gap-2 px-4 min-h-[44px] text-xs sm:text-sm font-medium rounded-xl border cursor-pointer hover:opacity-85 disabled:opacity-45"
            >
              {isDeployingApp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              Xuất bản Web tĩnh nhanh
            </button>
          )}
        </div>

        {/* Dedicated Vietnamese Astro Template Clean Wipe & Deploy Box */}
        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.canvas,
          }}
          className="p-4 rounded-xl border space-y-3"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" style={{ color: palette.link }} />
                  Giao diện Blog &amp; Template Astro 5 chuẩn tiếng Việt
                </div>
                <p style={{ color: palette.textSecondary }} className="text-xs leading-relaxed">
                  Mẫu thuần túy phục vụ viết &amp; đọc blog: ẩn khung mục lục rườm rà trên giao diện, giữ nguyên SEO ngầm (<code>sitemap.xml</code>, <code>robots.txt</code>, <code>BlogPosting</code> JSON-LD, RSS) và đẩy sạch lên{' '}
                  <code>{repoDisplay}</code> kèm nhận dạng cá nhân.
                </p>
              </div>

              {!confirmWipeAstro && (
                <button
                  type="button"
                  onClick={() => setConfirmWipeAstro(true)}
                  disabled={isSaving || isDeployingApp || isDeployingAstro || !authStatus?.authenticated}
                  style={{
                    backgroundColor: palette.accent,
                    color: palette.accentText,
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-45 whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  Triển khai Template Astro Blog
                </button>
              )}
            </div>

            <ThemeVisualSelector
              theme={theme}
              selectedTemplate={astroTemplate}
              onSelectTemplate={(tplId) => {
                setAstroTemplate(tplId);
                onUpdateConfig(buildDraftConfig(tplId));
              }}
              previewMode={config.themeMode}
              onToggleThemeMode={(mode) =>
                onUpdateConfig({ ...buildDraftConfig(), themeMode: mode })
              }
              themeColors={themeColors}
              onChangeColors={(nextColors) => {
                setThemeColors(nextColors);
                onUpdateConfig({ ...buildDraftConfig(), themeColors: nextColors });
              }}
              previewSiteTitle={siteTitle}
              previewHeaderTitle={headerTitle}
              previewTagline={tagline}
              previewAuthorName={authorName}
              previewSiteIcon={siteIcon}
            />
          </div>

          {confirmWipeAstro && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/35 space-y-3">
              <div className="flex items-start gap-2.5 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1.5">
                  <div>
                    <strong>Chọn chế độ triển khai Template Astro 5:</strong>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="astroDeployMode"
                      checked={!preservePostsOnDeploy}
                      onChange={() => setPreservePostsOnDeploy(false)}
                      className="mt-0.5"
                    />
                    <span>
                      <strong>Xoá sạch hết &amp; Tải đầy đủ bài viết mẫu mới (Mặc định):</strong> Xoá toàn bộ tệp cũ trên nhánh mặc định của{' '}
                      <code>{repoDisplay}</code> và nạp mới trọn bộ template + các bài viết mẫu đầy đủ.
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="astroDeployMode"
                      checked={preservePostsOnDeploy}
                      onChange={() => setPreservePostsOnDeploy(true)}
                      className="mt-0.5"
                    />
                    <span>
                      <strong>Chỉ cập nhật giao diện (Giữ bài viết cũ):</strong> Xoá code thừa xung đột nhưng{' '}
                      <strong>giữ nguyên {existingRepoPostCount > 0 ? `${existingRepoPostCount} bài viết` : 'bài viết'} &amp; ảnh tải lên</strong> trong{' '}
                      <code>src/content/bai_viet/</code> và <code>public/tainguyen/hinhanh/uploads/</code>.
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeployCleanAstroTemplate}
                  disabled={isDeployingAstro}
                  className="inline-flex items-center gap-2 px-4 min-h-[40px] text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 cursor-pointer disabled:opacity-50"
                >
                  {isDeployingAstro ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xoá sạch &amp; đẩy Template Astro 5...
                    </>
                  ) : !preservePostsOnDeploy ? (
                    'Xác nhận xoá sạch & Tải template + bài mẫu mới'
                  ) : (
                    'Cập nhật Astro (Giữ nguyên bài viết)'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmWipeAstro(false)}
                  disabled={isDeployingAstro}
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.surface,
                    color: palette.textPrimary,
                  }}
                  className="px-3.5 min-h-[40px] text-xs font-medium rounded-lg border cursor-pointer"
                >
                  Huỷ bỏ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
