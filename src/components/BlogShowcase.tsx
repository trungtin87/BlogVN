import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Edit3,
  FilePlus2,
  Moon,
  RefreshCw,
  Rss,
  Sun,
} from 'lucide-react';
import type {
  AuthStatus,
  BlogCollection,
  BlogConfig,
  BlogPost,
  BlogTheme,
  BuildStatusInfo,
  ThemeMode,
} from '../types/blog';
import { COLLECTION_LABELS } from '../data/themes';
import { EDITORIAL_ASSETS } from '../data/assets';
import {
  estimateReadingStats,
  formatDisplayDate,
  renderMarkdownToSafeHtml,
} from '../utils/markdown';
import { resolveGitHubAssetPreviewUrl } from '../utils/imageUpload';
import { ResilientImage } from './ResilientImage';
import { PWAInstallButton } from './PWAInstallButton';
import { SiteInsightsView } from './SiteInsightsView';

interface BlogShowcaseProps {
  theme: BlogTheme;
  config: BlogConfig;
  posts: BlogPost[];
  isLoading: boolean;
  repoConnected: boolean;
  isAstroRepo?: boolean;
  assetsPrefix?: string;
  frameworkLabel?: string;
  buildStatus?: BuildStatusInfo | null;
  authStatus?: AuthStatus | null;
  postsTotalCount?: number;
  hasMorePosts?: boolean;
  isLoadingMorePosts?: boolean;
  onLoadMorePosts?: () => void;
  onToggleThemeMode: (mode: ThemeMode) => void;
  onEditPost: (post: BlogPost) => void;
  onCreateNewPost: (collection?: BlogCollection) => void;
  onRefreshGitHub: () => void;
  onOpenGitHubTab: () => void;
}

const COLLECTION_TABS: Array<{ id: 'all' | BlogCollection; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'bai_viet', label: 'Bài viết' },
  { id: 'du_an', label: 'Dự án' },
  { id: 'sach', label: 'Sách' },
  { id: 'cua_hang', label: 'Cửa hàng' },
];

export function BlogShowcase({
  theme,
  config,
  posts,
  isLoading,
  repoConnected,
  isAstroRepo = true,
  assetsPrefix = 'public',
  frameworkLabel,
  buildStatus,
  authStatus,
  postsTotalCount = 0,
  hasMorePosts = false,
  isLoadingMorePosts = false,
  onLoadMorePosts,
  onToggleThemeMode,
  onEditPost,
  onCreateNewPost,
  onRefreshGitHub,
  onOpenGitHubTab,
}: BlogShowcaseProps) {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [activeCollection, setActiveCollection] = useState<'all' | BlogCollection | 'insights'>('all');

  const { palette, fonts, isDark } = theme;
  const hasMultipleCollections = posts.some((p) => p.collection !== 'bai_viet');
  const hasTargetRepo = Boolean(config.githubOwner?.trim() && config.githubRepo?.trim());
  const repoDisplay = hasTargetRepo
    ? `${config.githubOwner}/${config.githubRepo}`
    : 'Chưa kết nối kho GitHub';

  const filteredPosts = useMemo(() => {
    if (activeCollection === 'all' || activeCollection === 'insights') return posts;
    return posts.filter((p) => p.collection === activeCollection);
  }, [posts, activeCollection]);

  const activePost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) || null,
    [posts, selectedPostId]
  );

  // Article / Item Reader View
  if (activePost) {
    const stats = estimateReadingStats(activePost.markdownBody);
    const renderedHtml = renderMarkdownToSafeHtml(activePost.markdownBody, {
      owner: config.githubOwner,
      repo: config.githubRepo,
      isAstroRepo,
      assetsPrefix,
    });
    const collectionLabel = COLLECTION_LABELS[activePost.collection]?.label || activePost.category;

    return (
      <div
        style={{
          backgroundColor: palette.canvas,
          color: palette.textPrimary,
          fontFamily: fonts.body,
        }}
        className="min-h-[calc(100vh-4rem)] pb-24 md:pb-12 transition-colors duration-200"
      >
        <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-6 sm:py-10 md:py-14">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
            <button
              type="button"
              onClick={() => setSelectedPostId(null)}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.surface,
                color: palette.textPrimary,
              }}
              className="inline-flex items-center gap-2 px-4 min-h-[44px] text-sm font-medium rounded-xl border cursor-pointer transition-opacity hover:opacity-85 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>

            <button
              type="button"
              onClick={() => onEditPost(activePost)}
              style={{
                backgroundColor: palette.accent,
                color: palette.accentText,
              }}
              className="inline-flex items-center gap-2 px-4 min-h-[44px] text-sm font-semibold rounded-xl cursor-pointer transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-4 h-4" />
              Chỉnh sửa nội dung
            </button>
          </div>

          <div
            style={{ color: palette.textMuted, fontFamily: fonts.mono }}
            className="flex flex-wrap items-center gap-2 text-xs tabular-nums mb-4"
          >
            <span>{collectionLabel}</span>
            {activePost.collection === 'bai_viet' && (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatDisplayDate(activePost.date)}</span>
                <span aria-hidden="true">·</span>
                <span>{activePost.category}</span>
              </>
            )}
            {activePost.authorName && (
              <>
                <span aria-hidden="true">·</span>
                <span>Tác giả: {activePost.authorName}</span>
              </>
            )}
            {activePost.price && (
              <>
                <span aria-hidden="true">·</span>
                <span>{activePost.price}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{stats.minutes} phút đọc</span>
            {activePost.source === 'local' && (
              <>
                <span aria-hidden="true">·</span>
                <span>Bản nháp cục bộ</span>
              </>
            )}
          </div>

          <h1
            style={{ fontFamily: fonts.display, color: palette.textPrimary }}
            className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.14] text-balance mb-5"
          >
            {activePost.title}
          </h1>

          {activePost.excerpt && (
            <p
              style={{ color: palette.textSecondary }}
              className="text-base sm:text-lg leading-relaxed mb-8"
            >
              {activePost.excerpt}
            </p>
          )}

          {activePost.cover && (
            <div className="mb-10 overflow-hidden rounded-xl">
              <ResilientImage
                src={activePost.cover}
                fallbackSrc={resolveGitHubAssetPreviewUrl(
                  activePost.cover,
                  config.githubOwner,
                  config.githubRepo,
                  assetsPrefix
                )}
                alt={activePost.title}
                fallbackTitle={activePost.title}
                isDark={isDark}
                className="w-full max-h-[460px] object-cover rounded-xl"
              />
            </div>
          )}

          <div
            style={
              {
                color: palette.textSecondary,
                '--prose-border': palette.border,
                '--prose-surface': palette.surface,
                '--prose-code-bg': palette.surface,
                '--prose-link': palette.link,
              } as React.CSSProperties
            }
            className={`blog-prose ${isDark ? 'tracking-[0.01em]' : ''}`}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />

          {activePost.tags.length > 0 && (
            <div
              style={{ borderColor: palette.border, color: palette.textMuted }}
              className="mt-12 pt-6 border-t text-sm flex flex-wrap items-center gap-2"
            >
              <span>Thẻ / Công nghệ:</span>
              <span>{activePost.tags.join(' · ')}</span>
            </div>
          )}

          {/* Author Bio Footer */}
          <div
            style={{
              borderColor: palette.border,
              backgroundColor: palette.surface,
            }}
            className="mt-12 p-6 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-5"
          >
            <ResilientImage
              src={config.authorAvatar || EDITORIAL_ASSETS.authorAvatarTrungTin}
              alt={config.authorName}
              fallbackTitle={config.authorName}
              isDark={isDark}
              className="w-16 h-16 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0">
              <div
                style={{ fontFamily: fonts.display, color: palette.textPrimary }}
                className="text-lg font-semibold"
              >
                {config.authorName}
              </div>
              <p style={{ color: palette.textSecondary }} className="text-sm mt-1">
                {config.authorBio}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Multi-Collection View matching Huyền Không Thư Quán
  return (
    <div
      style={{
        backgroundColor: palette.canvas,
        color: palette.textPrimary,
        fontFamily: fonts.body,
      }}
      className="min-h-[calc(100vh-4rem)] pb-24 md:pb-10 transition-colors duration-200"
    >
      {/* Workspace Context & Âm/Dương Switcher Bar */}
      <div
        style={{
          borderColor: palette.border,
          backgroundColor: palette.surface,
        }}
        className="border-b"
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <div
            style={{ color: palette.textSecondary }}
            className="flex flex-wrap items-center gap-2 text-xs sm:text-sm"
          >
            <span className="font-medium" style={{ color: palette.textPrimary }}>
              {repoDisplay}
            </span>
            {config.pagesUrl && (
              <>
                <span aria-hidden="true">·</span>
                <a
                  href={config.pagesUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: palette.link }}
                  className="inline-flex items-center gap-1 hover:underline underline-offset-4"
                >
                  {config.pagesUrl.replace('https://', '')}
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
                <span aria-hidden="true">·</span>
                <a
                  href={`${config.pagesUrl.replace(/\/+$/, '')}/rss.xml`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: palette.textMuted }}
                  className="inline-flex items-center gap-1 hover:underline underline-offset-4"
                  title="RSS Feed của trang blog"
                >
                  <Rss className="w-3.5 h-3.5" />
                  RSS
                </a>
              </>
            )}
            {config.headerNavLinks &&
              config.headerNavLinks.map((navLink, idx) => (
                <span key={`${navLink.url}-${idx}`} className="inline-flex items-center gap-2">
                  <span aria-hidden="true">·</span>
                  <a
                    href={navLink.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: palette.textPrimary }}
                    className="font-medium hover:underline underline-offset-4"
                  >
                    {navLink.label}
                  </a>
                </span>
              ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <PWAInstallButton theme={theme} compact />

            {/* Light / Dark Mode Switch */}
            <button
              type="button"
              onClick={() => onToggleThemeMode(isDark ? 'light' : 'dark')}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.canvas,
                color: palette.textPrimary,
              }}
              className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
              title="Đổi chế độ Sáng (Mặt trời) / Tối (Mặt trăng)"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDark ? 'Sáng' : 'Tối'}</span>
            </button>

            <button
              type="button"
              onClick={onRefreshGitHub}
              disabled={isLoading}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.canvas,
                color: palette.textPrimary,
              }}
              className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
              title="Làm mới dữ liệu từ GitHub"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Đồng bộ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Site Header Summary */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-8">
        <div
          style={{ borderColor: palette.border }}
          className="pb-8 border-b flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div className="space-y-3">
            <div
              style={{ color: palette.textMuted, fontFamily: fonts.mono }}
              className="text-xs tabular-nums flex flex-wrap items-center gap-2"
            >
              <span>{repoConnected ? 'Đã kết nối GitHub' : 'Chưa kết nối kho'}</span>
              {frameworkLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{frameworkLabel}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{posts.length} mục nội dung</span>
              {buildStatus && buildStatus.status !== 'unknown' && (
                <>
                  <span aria-hidden="true">·</span>
                  {buildStatus.htmlUrl ? (
                    <a
                      href={buildStatus.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color:
                          buildStatus.conclusion === 'failure'
                            ? '#ef4444'
                            : buildStatus.status === 'in_progress' || buildStatus.status === 'queued'
                            ? palette.link
                            : palette.textMuted,
                      }}
                      className="hover:underline underline-offset-4"
                    >
                      {buildStatus.status === 'in_progress' || buildStatus.status === 'queued'
                        ? 'Đang build lên web...'
                        : buildStatus.conclusion === 'success'
                        ? 'Build thành công'
                        : buildStatus.conclusion === 'failure'
                        ? 'Lỗi build (Xem log)'
                        : 'Đã hoàn tất'}
                    </a>
                  ) : (
                    <span>
                      {buildStatus.status === 'in_progress' || buildStatus.status === 'queued'
                        ? 'Đang build lên web...'
                        : buildStatus.conclusion === 'success'
                        ? 'Build thành công'
                        : buildStatus.conclusion === 'failure'
                        ? 'Lỗi build'
                        : 'Sẵn sàng'}
                    </span>
                  )}
                </>
              )}
            </div>

            <h1
              style={{ fontFamily: fonts.display, color: palette.textPrimary }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance"
            >
              {config.siteTitle}
            </h1>

            <p
              style={{ color: palette.textSecondary }}
              className="text-sm sm:text-base leading-relaxed max-w-[64ch]"
            >
              {config.tagline}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onCreateNewPost(
                activeCollection === 'all' || activeCollection === 'insights'
                  ? 'bai_viet'
                  : activeCollection
              )
            }
            style={{
              backgroundColor: palette.accent,
              color: palette.accentText,
            }}
            className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] text-sm font-semibold rounded-xl cursor-pointer transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-4 h-4" />
            Thêm{' '}
            {activeCollection === 'all' || activeCollection === 'insights'
              ? 'bài viết'
              : COLLECTION_LABELS[activeCollection].label.toLowerCase()}{' '}
            mới
          </button>
        </div>
      </section>

      {/* Collection & Site Insights Filter Bar */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-4">
          {(hasMultipleCollections
            ? COLLECTION_TABS
            : [{ id: 'all' as const, label: 'Bài viết' }]
          ).map((tab) => {
            const active = activeCollection === tab.id;
            const count =
              tab.id === 'all'
                ? posts.length
                : posts.filter((p) => p.collection === tab.id).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCollection(tab.id)}
                style={{
                  backgroundColor: active ? palette.accent : palette.surface,
                  color: active ? palette.accentText : palette.textSecondary,
                  borderColor: active ? palette.accent : palette.border,
                }}
                className="px-3.5 min-h-[44px] sm:min-h-[38px] text-xs sm:text-sm font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
              >
                {tab.label} ({count})
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setActiveCollection('insights')}
            style={{
              backgroundColor: activeCollection === 'insights' ? palette.accent : palette.surface,
              color: activeCollection === 'insights' ? palette.accentText : palette.textSecondary,
              borderColor: activeCollection === 'insights' ? palette.accent : palette.border,
            }}
            className="inline-flex items-center gap-1.5 px-3.5 min-h-[44px] sm:min-h-[38px] text-xs sm:text-sm font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <BarChart3 className="w-4 h-4" />
            Site Insights
          </button>
        </div>

        {/* Insights Tab OR Content Stream */}
        {activeCollection === 'insights' ? (
          <SiteInsightsView
            theme={theme}
            config={config}
            posts={posts}
            authStatus={authStatus}
            onOpenGitHubTab={onOpenGitHubTab}
          />
        ) : filteredPosts.length === 0 ? (
          <div
            style={{
              borderColor: palette.border,
              backgroundColor: palette.surface,
            }}
            className="p-8 sm:p-10 rounded-2xl border text-center max-w-xl mx-auto my-6 space-y-4"
          >
            <h2
              style={{ fontFamily: fonts.display, color: palette.textPrimary }}
              className="text-xl font-semibold"
            >
              {repoConnected ? 'Chưa có bài viết nào' : 'Chào mừng đến với Đạo Ký'}
            </h2>
            <p style={{ color: palette.textSecondary }} className="text-sm">
              {repoConnected && hasTargetRepo
                ? `Nhấn nút bên dưới để viết bài Markdown và đẩy thẳng lên ${repoDisplay}.`
                : 'Kết nối kho GitHub Pages sẵn có hoặc tạo blog GitHub Pages mới chỉ với 1 chạm.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() =>
                  onCreateNewPost(activeCollection === 'all' ? 'bai_viet' : activeCollection)
                }
                style={{
                  backgroundColor: palette.accent,
                  color: palette.accentText,
                }}
                className="inline-flex items-center gap-2 px-5 min-h-[44px] text-sm font-semibold rounded-xl cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4" />
                Tạo nội dung mới
              </button>
              <button
                type="button"
                onClick={onOpenGitHubTab}
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.canvas,
                  color: palette.textPrimary,
                }}
                className="inline-flex items-center gap-2 px-5 min-h-[44px] text-sm font-medium rounded-xl border cursor-pointer"
              >
                Tạo / Kết nối Blog GitHub
              </button>
            </div>
          </div>
        ) : (
          <div style={{ borderColor: palette.border }} className="divide-y">
            {filteredPosts.map((post) => {
              const stats = estimateReadingStats(post.markdownBody);
              const colLabel = COLLECTION_LABELS[post.collection]?.label || post.category;

              return (
                <article
                  key={post.id}
                  onClick={() => setSelectedPostId(post.id)}
                  style={{ borderColor: palette.border }}
                  className="py-5 sm:py-7 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start md:items-center cursor-pointer group"
                >
                  <div className={post.cover ? 'md:col-span-8' : 'md:col-span-12'}>
                    <div
                      style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                      className="text-xs tabular-nums mb-2 flex flex-wrap items-center gap-2"
                    >
                      <span style={{ color: palette.link }} className="font-medium">
                        {colLabel}
                      </span>
                      {post.collection === 'bai_viet' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{formatDisplayDate(post.date)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{post.category}</span>
                        </>
                      )}
                      {post.authorName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{post.authorName}</span>
                        </>
                      )}
                      {post.price && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{post.price}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{stats.minutes} phút đọc</span>
                      {post.source === 'local' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Nháp cục bộ</span>
                        </>
                      )}
                    </div>

                    <h2
                      style={{ fontFamily: fonts.display, color: palette.textPrimary }}
                      className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug mb-2 group-hover:underline underline-offset-4"
                    >
                      {post.title}
                    </h2>

                    <p
                      style={{ color: palette.textSecondary }}
                      className="text-sm sm:text-base leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-[65ch]"
                    >
                      {post.excerpt}
                    </p>
                  </div>

                  {post.cover && (
                    <div className="md:col-span-4 aspect-[16/10] sm:aspect-[4/3] overflow-hidden rounded-xl">
                      <ResilientImage
                        src={post.cover}
                        fallbackSrc={resolveGitHubAssetPreviewUrl(
                          post.cover,
                          config.githubOwner,
                          config.githubRepo,
                          assetsPrefix
                        )}
                        alt={post.title}
                        fallbackTitle={post.title}
                        isDark={isDark}
                        className="w-full h-full object-cover rounded-xl transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    </div>
                  )}
                </article>
              );
            })}

            {hasMorePosts && onLoadMorePosts && (
              <div className="pt-6 pb-2 flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMorePosts}
                  disabled={isLoadingMorePosts}
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.surface,
                    color: palette.textPrimary,
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] text-sm font-semibold rounded-xl border cursor-pointer hover:opacity-85 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingMorePosts ? 'animate-spin' : ''}`} />
                  {isLoadingMorePosts
                    ? 'Đang tải thêm bài viết...'
                    : `Tải thêm bài viết (đã tải ${posts.filter((p) => p.source === 'github').length}/${postsTotalCount})`}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
