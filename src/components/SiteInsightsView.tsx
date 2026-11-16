import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Eye,
  GitFork,
  Globe,
  Info,
  RefreshCw,
  Star,
  Users,
} from 'lucide-react';
import type {
  AuthStatus,
  BlogConfig,
  BlogPost,
  BlogTheme,
  RepoInsightsData,
} from '../types/blog';
import { estimateReadingStats, formatDisplayDate } from '../utils/markdown';
import { ghGetInsights } from '../utils/githubClient';
import { ResilientImage } from './ResilientImage';

interface SiteInsightsViewProps {
  theme: BlogTheme;
  config: BlogConfig;
  posts: BlogPost[];
  authStatus?: AuthStatus | null;
  onOpenGitHubTab: () => void;
}

export function SiteInsightsView({
  theme,
  config,
  posts,
  authStatus,
  onOpenGitHubTab,
}: SiteInsightsViewProps) {
  const { palette, fonts, isDark } = theme;
  const [insights, setInsights] = useState<RepoInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!config.githubOwner || !config.githubRepo) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await ghGetInsights(config.githubOwner, config.githubRepo);
      if (!res.ok || !res.data) {
        setError(res.error || 'Không thể tải dữ liệu Site Insights từ GitHub API.');
        setInsights(null);
        return;
      }
      setInsights(res.data);
    } catch {
      setError('Lỗi mạng khi kết nối tới GitHub API.');
    } finally {
      setIsLoading(false);
    }
  }, [config.githubOwner, config.githubRepo]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const contentSummary = useMemo(() => {
    const githubPosts = posts.filter((p) => p.source !== 'sample');
    const source = githubPosts.length > 0 ? githubPosts : posts;
    const published = source.filter((p) => !p.draft).length;
    const drafts = source.filter((p) => p.draft).length;
    const totalReadingMinutes = source.reduce(
      (sum, p) => sum + estimateReadingStats(p.markdownBody).minutes,
      0
    );
    return {
      total: source.length,
      published,
      drafts,
      totalReadingMinutes,
    };
  }, [posts]);

  const dailyViews = insights?.views?.daily || [];
  const maxDailyCount = useMemo(
    () => Math.max(1, ...dailyViews.map((d) => d.count)),
    [dailyViews]
  );

  const activePoint = useMemo(() => {
    if (dailyViews.length === 0) return null;
    if (selectedDay) {
      return dailyViews.find((d) => d.timestamp === selectedDay) || dailyViews[dailyViews.length - 1];
    }
    return dailyViews[dailyViews.length - 1];
  }, [dailyViews, selectedDay]);

  const maxReferrerCount = useMemo(
    () => Math.max(1, ...(insights?.referrers || []).map((r) => r.count)),
    [insights?.referrers]
  );

  const maxPathCount = useMemo(
    () => Math.max(1, ...(insights?.popularPaths || []).map((p) => p.count)),
    [insights?.popularPaths]
  );

  if (isLoading && !insights) {
    return (
      <div
        style={{
          borderColor: palette.border,
          backgroundColor: palette.surface,
        }}
        className="rounded-2xl border p-8 sm:p-12 text-center space-y-3"
      >
        <RefreshCw className="w-6 h-6 animate-spin mx-auto" style={{ color: palette.link }} />
        <div className="text-sm font-medium">
          Đang tải thống kê lưu lượng &amp; tương tác từ GitHub API...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header row inside tab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 style={{ fontFamily: fonts.display }} className="text-xl sm:text-2xl font-bold">
            Site Insights · {config.githubOwner}/{config.githubRepo}
          </h2>
          <p style={{ color: palette.textSecondary }} className="text-xs sm:text-sm mt-0.5">
            Số liệu lưu lượng 14 ngày gần nhất và mức độ tương tác từ GitHub REST API.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchInsights}
          disabled={isLoading}
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
            color: palette.textPrimary,
          }}
          className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] sm:min-h-[38px] text-xs font-medium rounded-xl border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới số liệu
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {insights?.trafficNotice && !insights.trafficAvailable && (
        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
          className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm"
        >
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: palette.link }} />
            <span style={{ color: palette.textSecondary }}>{insights.trafficNotice}</span>
          </div>
          {!authStatus?.authenticated && (
            <button
              type="button"
              onClick={onOpenGitHubTab}
              style={{
                backgroundColor: palette.accent,
                color: palette.accentText,
              }}
              className="px-3.5 min-h-[38px] text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              Đăng nhập GitHub
            </button>
          )}
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 14-day Views */}
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.surface }}
          className="p-4 sm:p-5 rounded-2xl border space-y-2"
        >
          <div className="flex items-center justify-between text-xs" style={{ color: palette.textMuted }}>
            <span>Lượt xem (14 ngày)</span>
            <Eye className="w-4 h-4" style={{ color: palette.link }} />
          </div>
          <div
            style={{ fontFamily: fonts.display }}
            className="text-2xl sm:text-3xl font-bold tabular-nums"
          >
            {insights?.trafficAvailable ? insights.views?.count.toLocaleString('vi-VN') : '—'}
          </div>
          <div style={{ color: palette.textSecondary, fontFamily: fonts.mono }} className="text-xs tabular-nums">
            {insights?.trafficAvailable
              ? `${insights.views?.uniques.toLocaleString('vi-VN')} khách truy cập duy nhất`
              : 'Yêu cầu quyền chủ kho'}
          </div>
        </div>

        {/* Card 2: 14-day Clones */}
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.surface }}
          className="p-4 sm:p-5 rounded-2xl border space-y-2"
        >
          <div className="flex items-center justify-between text-xs" style={{ color: palette.textMuted }}>
            <span>Git Clones (14 ngày)</span>
            <BarChart3 className="w-4 h-4" style={{ color: palette.link }} />
          </div>
          <div
            style={{ fontFamily: fonts.display }}
            className="text-2xl sm:text-3xl font-bold tabular-nums"
          >
            {insights?.trafficAvailable ? insights.clones?.count.toLocaleString('vi-VN') : '—'}
          </div>
          <div style={{ color: palette.textSecondary, fontFamily: fonts.mono }} className="text-xs tabular-nums">
            {insights?.trafficAvailable
              ? `${insights.clones?.uniques.toLocaleString('vi-VN')} thiết bị duy nhất`
              : 'Yêu cầu quyền chủ kho'}
          </div>
        </div>

        {/* Card 3: GitHub Engagement */}
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.surface }}
          className="p-4 sm:p-5 rounded-2xl border space-y-2"
        >
          <div className="flex items-center justify-between text-xs" style={{ color: palette.textMuted }}>
            <span>Tương tác cộng đồng</span>
            <Star className="w-4 h-4" style={{ color: palette.link }} />
          </div>
          <div
            style={{ fontFamily: fonts.display }}
            className="text-2xl sm:text-3xl font-bold tabular-nums"
          >
            {insights ? insights.engagement.stars.toLocaleString('vi-VN') : '0'} Stars
          </div>
          <div style={{ color: palette.textSecondary, fontFamily: fonts.mono }} className="text-xs tabular-nums">
            {insights ? `${insights.engagement.forks} Forks · ${insights.engagement.subscribers} Theo dõi` : ''}
          </div>
        </div>

        {/* Card 4: Content Footprint */}
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.surface }}
          className="p-4 sm:p-5 rounded-2xl border space-y-2"
        >
          <div className="flex items-center justify-between text-xs" style={{ color: palette.textMuted }}>
            <span>Nội dung &amp; Thời lượng đọc</span>
            <Users className="w-4 h-4" style={{ color: palette.link }} />
          </div>
          <div
            style={{ fontFamily: fonts.display }}
            className="text-2xl sm:text-3xl font-bold tabular-nums"
          >
            {contentSummary.published} bài viết
          </div>
          <div style={{ color: palette.textSecondary, fontFamily: fonts.mono }} className="text-xs tabular-nums">
            ~{contentSummary.totalReadingMinutes} phút đọc · {contentSummary.drafts} nháp
          </div>
        </div>
      </div>

      {/* 14-Day Daily Views Chart */}
      {insights?.trafficAvailable && (
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.surface }}
          className="p-5 sm:p-6 rounded-2xl border space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 style={{ fontFamily: fonts.display }} className="text-base sm:text-lg font-bold">
                Biểu đồ lưu lượng 14 ngày gần nhất
              </h3>
              <p style={{ color: palette.textMuted }} className="text-xs">
                Chạm hoặc di chuột vào từng cột ngày để xem chi tiết lượt xem &amp; khách duy nhất
              </p>
            </div>

            {activePoint && (
              <div
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.canvas,
                  fontFamily: fonts.mono,
                }}
                className="px-3 py-1.5 rounded-lg border text-xs tabular-nums whitespace-nowrap"
              >
                {formatDisplayDate(activePoint.timestamp)} · <strong>{activePoint.count}</strong> lượt xem ·{' '}
                <strong>{activePoint.uniques}</strong> khách duy nhất
              </div>
            )}
          </div>

          {dailyViews.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: palette.textMuted }}>
              Chưa ghi nhận lượt truy cập nào trong 14 ngày qua.
            </div>
          ) : (
            <div className="pt-2">
              <div className="h-44 flex items-end gap-1.5 sm:gap-2.5">
                {dailyViews.map((point) => {
                  const pct = Math.max(6, Math.round((point.count / maxDailyCount) * 100));
                  const uniquePct = Math.max(
                    3,
                    Math.round((point.uniques / maxDailyCount) * 100)
                  );
                  const isActive = activePoint?.timestamp === point.timestamp;
                  return (
                    <button
                      key={point.timestamp}
                      type="button"
                      onMouseEnter={() => setSelectedDay(point.timestamp)}
                      onClick={() => setSelectedDay(point.timestamp)}
                      className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 group cursor-pointer focus:outline-none"
                      title={`${formatDisplayDate(point.timestamp)}: ${point.count} lượt xem (${point.uniques} duy nhất)`}
                    >
                      <div className="w-full h-full flex items-end justify-center relative">
                        <div
                          style={{
                            height: `${pct}%`,
                            backgroundColor: isActive ? palette.link : palette.border,
                            opacity: isActive ? 1 : 0.75,
                          }}
                          className="w-full max-w-[32px] rounded-t-md transition-all relative overflow-hidden"
                        >
                          <div
                            style={{
                              height: `${Math.min(100, Math.round((uniquePct / pct) * 100))}%`,
                              backgroundColor: palette.accent,
                              opacity: isActive ? 0.85 : 0.45,
                            }}
                            className="absolute bottom-0 inset-x-0 rounded-t-xs"
                          />
                        </div>
                      </div>
                      <span
                        style={{
                          color: isActive ? palette.textPrimary : palette.textMuted,
                          fontFamily: fonts.mono,
                        }}
                        className="text-[10px] tabular-nums"
                      >
                        {point.timestamp.slice(5).replace('-', '/')}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div
                style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                className="flex items-center justify-end gap-4 text-[11px] pt-3"
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs inline-block"
                    style={{ backgroundColor: palette.link }}
                  />
                  Tổng lượt xem
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs inline-block"
                    style={{ backgroundColor: palette.accent }}
                  />
                  Khách duy nhất
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Referrers, Popular Paths & Visitor Engagement Events */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Referrers & Popular Paths */}
        <div className="lg:col-span-6 space-y-6">
          {/* Top Referrers */}
          <div
            style={{ borderColor: palette.border, backgroundColor: palette.surface }}
            className="p-5 rounded-2xl border space-y-3"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" style={{ color: palette.link }} />
              <h3 style={{ fontFamily: fonts.display }} className="text-base font-bold">
                Nguồn truy cập phổ biến (Top Referrers)
              </h3>
            </div>

            {!insights?.trafficAvailable ? (
              <p style={{ color: palette.textMuted }} className="text-xs py-2">
                Chỉ khả dụng cho chủ sở hữu repository qua GitHub Traffic API.
              </p>
            ) : insights.referrers.length === 0 ? (
              <p style={{ color: palette.textMuted }} className="text-xs py-2">
                Chưa ghi nhận nguồn giới thiệu ngoài trong 14 ngày qua.
              </p>
            ) : (
              <div className="space-y-2.5">
                {insights.referrers.slice(0, 6).map((ref) => {
                  const pct = Math.max(4, Math.round((ref.count / maxReferrerCount) * 100));
                  return (
                    <div key={ref.referrer} className="space-y-1">
                      <div
                        style={{ fontFamily: fonts.mono }}
                        className="flex items-center justify-between text-xs gap-2"
                      >
                        <span className="font-medium truncate">{ref.referrer}</span>
                        <span style={{ color: palette.textMuted }} className="tabular-nums shrink-0">
                          {ref.count} lượt · {ref.uniques} khách
                        </span>
                      </div>
                      <div
                        style={{ backgroundColor: palette.canvas }}
                        className="h-1.5 w-full rounded-full overflow-hidden"
                      >
                        <div
                          style={{ width: `${pct}%`, backgroundColor: palette.link }}
                          className="h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Popular Paths */}
          <div
            style={{ borderColor: palette.border, backgroundColor: palette.surface }}
            className="p-5 rounded-2xl border space-y-3"
          >
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4" style={{ color: palette.link }} />
              <h3 style={{ fontFamily: fonts.display }} className="text-base font-bold">
                Đường dẫn được xem nhiều (Popular Paths)
              </h3>
            </div>

            {!insights?.trafficAvailable ? (
              <p style={{ color: palette.textMuted }} className="text-xs py-2">
                Chỉ khả dụng cho chủ sở hữu repository qua GitHub Traffic API.
              </p>
            ) : insights.popularPaths.length === 0 ? (
              <p style={{ color: palette.textMuted }} className="text-xs py-2">
                Chưa có dữ liệu đường dẫn nổi bật trong 14 ngày qua.
              </p>
            ) : (
              <div className="space-y-2.5">
                {insights.popularPaths.slice(0, 6).map((item) => {
                  const pct = Math.max(4, Math.round((item.count / maxPathCount) * 100));
                  return (
                    <div key={item.path} className="space-y-1">
                      <div
                        style={{ fontFamily: fonts.mono }}
                        className="flex items-center justify-between text-xs gap-2"
                      >
                        <span className="truncate" title={item.title || item.path}>
                          {item.path}
                        </span>
                        <span style={{ color: palette.textMuted }} className="tabular-nums shrink-0">
                          {item.count} · {item.uniques}
                        </span>
                      </div>
                      <div
                        style={{ backgroundColor: palette.canvas }}
                        className="h-1.5 w-full rounded-full overflow-hidden"
                      >
                        <div
                          style={{ width: `${pct}%`, backgroundColor: palette.accent }}
                          className="h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Visitor Engagement Activity */}
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.surface }}
          className="lg:col-span-6 p-5 rounded-2xl border space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: palette.link }} />
              <h3 style={{ fontFamily: fonts.display }} className="text-base font-bold">
                Tương tác &amp; Hoạt động gần đây
              </h3>
            </div>
            {insights?.engagement && (
              <span
                style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                className="text-[11px] tabular-nums"
              >
                {insights.engagement.openIssues} Issues mở
              </span>
            )}
          </div>

          {!insights || insights.recentEvents.length === 0 ? (
            <p style={{ color: palette.textMuted }} className="text-xs py-6 text-center">
              Chưa ghi nhận sự kiện tương tác công khai nào gần đây trên GitHub.
            </p>
          ) : (
            <div style={{ borderColor: palette.border }} className="divide-y">
              {insights.recentEvents.map((ev) => (
                <div
                  key={ev.id}
                  style={{ borderColor: palette.border }}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ResilientImage
                      src={ev.actorAvatar}
                      alt={ev.actorLogin}
                      fallbackTitle={ev.actorLogin}
                      isDark={isDark}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium truncate">
                        @{ev.actorLogin}
                      </div>
                      <div style={{ color: palette.textSecondary }} className="text-xs truncate">
                        {ev.actionLabel}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                    className="text-[11px] tabular-nums shrink-0"
                  >
                    {ev.createdAt ? formatDisplayDate(ev.createdAt.slice(0, 10)) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
