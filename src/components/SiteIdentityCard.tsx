import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  ImagePlus,
  Loader2,
  Plus,
  Rocket,
  Save,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type {
  AuthStatus,
  BlogConfig,
  BlogPost,
  BlogTheme,
  GitHubRepoInfo,
  SiteNavLink,
} from '../types/blog';
import { ghSaveSiteConfig } from '../utils/githubClient';

interface SiteIdentityCardProps {
  theme: BlogTheme;
  config: BlogConfig;
  posts: BlogPost[];
  authStatus: AuthStatus | null;
  repoInfo: GitHubRepoInfo | null;
  onUpdateConfig: (next: BlogConfig) => void;
  onDeployedToGitHub?: (message: string, commitUrl?: string) => void;
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
  onUpdateConfig,
  onDeployedToGitHub,
}: SiteIdentityCardProps) {
  const { palette, fonts } = theme;
  const iconFileRef = useRef<HTMLInputElement | null>(null);

  const [siteTitle, setSiteTitle] = useState(config.siteTitle || '');
  const [tagline, setTagline] = useState(config.tagline || '');
  const [siteIcon, setSiteIcon] = useState(config.siteIcon || './icon.svg');
  const [headerTitle, setHeaderTitle] = useState(config.headerTitle || 'BlogVN');
  const [headerNavLinks, setHeaderNavLinks] = useState<SiteNavLink[]>(
    config.headerNavLinks || []
  );
  const [footerText, setFooterText] = useState(config.footerText || '');
  const [footerLinks, setFooterLinks] = useState<SiteNavLink[]>(config.footerLinks || []);
  const [authorName, setAuthorName] = useState(config.authorName || '');
  const [authorBio, setAuthorBio] = useState(config.authorBio || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeployingApp, setIsDeployingApp] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; url?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSiteTitle(config.siteTitle || '');
    setTagline(config.tagline || '');
    setSiteIcon(config.siteIcon || './icon.svg');
    setHeaderTitle(config.headerTitle || 'BlogVN');
    setHeaderNavLinks(config.headerNavLinks || []);
    setFooterText(config.footerText || '');
    setFooterLinks(config.footerLinks || []);
    setAuthorName(config.authorName || '');
    setAuthorBio(config.authorBio || '');
  }, [config]);

  const buildDraftConfig = (): BlogConfig => ({
    ...config,
    siteTitle: siteTitle.trim() || config.siteTitle,
    tagline: tagline.trim(),
    siteIcon: siteIcon.trim() || './icon.svg',
    headerTitle: headerTitle.trim() || 'BlogVN',
    headerNavLinks: headerNavLinks.filter((l) => l.label.trim() && l.url.trim()),
    footerText: footerText.trim(),
    footerLinks: footerLinks.filter((l) => l.label.trim() && l.url.trim()),
    authorName: authorName.trim() || config.authorName,
    authorBio: authorBio.trim(),
  });

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
        const msg = `Đã lưu & đồng bộ cấu hình nhận dạng lên Git (.blogvn/site-config.json).`;
        setStatusMessage({ text: msg, url: result.commitUrl });
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
              <code>
                {config.githubOwner}/{config.githubRepo}
              </code>
              .
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
          src={siteIcon || './icon.svg'}
          alt="Icon"
          className="w-5 h-5 rounded object-cover shrink-0"
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
              placeholder="/icon.svg hoặc URL / tải từ máy"
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
            placeholder="VD: BlogVN hoặc Bùi Trung Tín"
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
            placeholder="VD: Huyền Không Thư Quán"
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
                <div key={idx} className="flex items-center gap-2">
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
                    className="w-1/3 px-2.5 min-h-[38px] text-xs rounded-lg border"
                  />
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
                <div key={idx} className="flex items-center gap-2">
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
                    className="w-1/3 px-2.5 min-h-[38px] text-xs rounded-lg border"
                  />
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
              ))}
            </div>
          )}
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
      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => persistConfig({ syncToGitHub: false, publishWebApp: false })}
            disabled={isSaving || isDeployingApp}
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
            disabled={isSaving || isDeployingApp || !authStatus?.authenticated}
            style={{
              borderColor: palette.border,
              backgroundColor: palette.canvas,
              color: palette.textPrimary,
            }}
            className="inline-flex items-center gap-2 px-4 min-h-[44px] text-xs sm:text-sm font-medium rounded-xl border cursor-pointer hover:opacity-85 disabled:opacity-45"
          >
            <UploadCloud className="w-4 h-4" />
            Lưu lên Git (.blogvn/site-config.json)
          </button>

          <button
            type="button"
            onClick={() => persistConfig({ syncToGitHub: true, publishWebApp: true })}
            disabled={isSaving || isDeployingApp || !authStatus?.authenticated}
            style={{
              backgroundColor: palette.accent,
              color: palette.accentText,
            }}
            className="inline-flex items-center gap-2 px-4 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-45"
          >
            {isDeployingApp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Rocket className="w-4 h-4" />
            )}
            Xuất bản Web App lên GitHub Pages
          </button>
        </div>

        <p style={{ color: palette.textMuted }} className="text-xs leading-relaxed">
          Lưu ý lưu trữ &amp; GitHub Pages: Toàn bộ bài viết và cấu hình nhận dạng (<code>.blogvn/site-config.json</code>) được lưu riêng trên thiết bị theo tài khoản Google và đồng bộ trực tiếp lên Git repository của bạn. Nút <strong>Xuất bản Web App</strong> đẩy bộ giao diện PWA đọc blog tĩnh (<code>index.html</code> + <code>manifest.webmanifest</code> + <code>posts-manifest.json</code>) lên GitHub Pages.
        </p>
      </div>
    </section>
  );
}
