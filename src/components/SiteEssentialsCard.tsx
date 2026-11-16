import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  Loader2,
  RefreshCw,
  Rss,
  UploadCloud,
} from 'lucide-react';
import type {
  AuthStatus,
  BlogConfig,
  BlogPost,
  BlogTheme,
  GitHubRepoInfo,
  RepoStructureInfo,
  SiteEssentialKey,
  SiteEssentialsReport,
} from '../types/blog';
import {
  generate404Html,
  generateJsonFeed,
  generateRobotsTxt,
  generateRssXml,
  generateSitemapXml,
} from '../utils/siteGenerators';
import { ghGetSiteEssentials, ghPublishFiles } from '../utils/githubClient';

interface SiteEssentialsCardProps {
  theme: BlogTheme;
  config: BlogConfig;
  posts: BlogPost[];
  authStatus: AuthStatus | null;
  repoInfo: GitHubRepoInfo | null;
  repoStructure: RepoStructureInfo | null;
  onPublished?: (commitUrl?: string) => void;
}

export function SiteEssentialsCard({
  theme,
  config,
  posts,
  authStatus,
  repoInfo,
  repoStructure,
  onPublished,
}: SiteEssentialsCardProps) {
  const { palette, fonts } = theme;
  const [report, setReport] = useState<SiteEssentialsReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Record<SiteEssentialKey, boolean>>({
    rss: true,
    sitemap: true,
    robots: true,
    feedJson: true,
    notFound: false,
    nojekyll: false,
  });
  const [previewKey, setPreviewKey] = useState<SiteEssentialKey>('rss');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ message: string; url?: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  const framework = repoStructure?.framework || 'jekyll';
  const branch = repoInfo?.defaultBranch || 'main';

  const fetchReport = useCallback(async () => {
    if (!config.githubOwner || !config.githubRepo) return;
    setIsChecking(true);
    try {
      const data = await ghGetSiteEssentials(
        config.githubOwner,
        config.githubRepo,
        branch,
        framework
      );
      if (data) {
        setReport(data);
        setSelectedKeys({
          rss: !data.files.find((f) => f.key === 'rss')?.exists,
          sitemap: !data.files.find((f) => f.key === 'sitemap')?.exists,
          robots: !data.files.find((f) => f.key === 'robots')?.exists,
          feedJson: !data.files.find((f) => f.key === 'feedJson')?.exists,
          notFound: !data.files.find((f) => f.key === 'notFound')?.exists,
          nojekyll: false,
        });
      }
    } catch {
      // ignore inspection error
    } finally {
      setIsChecking(false);
    }
  }, [config.githubOwner, config.githubRepo, branch, framework]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const generatedContents = useMemo<Record<SiteEssentialKey, string>>(() => {
    const githubOnlyPosts = posts.filter((p) => p.source !== 'sample');
    const sourcePosts = githubOnlyPosts.length > 0 ? githubOnlyPosts : posts;
    return {
      rss: generateRssXml({ config, posts: sourcePosts, framework }),
      sitemap: generateSitemapXml({ config, posts: sourcePosts, framework }),
      robots: generateRobotsTxt(config.pagesUrl),
      feedJson: generateJsonFeed({ config, posts: sourcePosts, framework }),
      notFound: generate404Html(config),
      nojekyll: '',
    };
  }, [config, posts, framework]);

  const activeFileInfo = report?.files.find((f) => f.key === previewKey);
  const activePreviewContent = generatedContents[previewKey] || '';

  const selectedCount = Object.values(selectedKeys).filter(Boolean).length;

  const handleToggleKey = (key: SiteEssentialKey) => {
    setSelectedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyPreview = async () => {
    try {
      await navigator.clipboard.writeText(activePreviewContent);
      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleDownloadPreview = () => {
    const fileName = activeFileInfo?.targetPath.split('/').pop() || `${previewKey}.txt`;
    const blob = new Blob([activePreviewContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePublishSelected = async () => {
    if (!report || selectedCount === 0) return;
    setIsPublishing(true);
    setPublishError(null);
    setPublishResult(null);

    try {
      const filesToPublish = report.files
        .filter((f) => selectedKeys[f.key])
        .map((f) => ({
          path: f.targetPath,
          content: generatedContents[f.key] ?? '',
        }));

      const res = await ghPublishFiles({
        owner: config.githubOwner,
        repo: config.githubRepo,
        branch,
        files: filesToPublish,
        message: `BlogVN: Cập nhật ${filesToPublish.length} tệp SEO & RSS`,
      });
      if (!res.ok) {
        setPublishError(res.error || 'Không thể đồng bộ RSS/Sitemap lên GitHub.');
        return;
      }

      setPublishResult({
        message: `Đã đẩy ${filesToPublish.length} tệp SEO & RSS lên ${config.githubOwner}/${config.githubRepo} trong 1 commit.`,
        url: res.commit?.htmlUrl,
      });
      await fetchReport();
      onPublished?.(res.commit?.htmlUrl);
    } catch {
      setPublishError('Lỗi mạng khi xuất bản tệp SEO/RSS lên GitHub.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div
      style={{
        borderColor: palette.border,
        backgroundColor: palette.surface,
      }}
      className="rounded-2xl border p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            style={{
              backgroundColor: palette.canvas,
              borderColor: palette.border,
            }}
            className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
          >
            <Rss className="w-5 h-5" style={{ color: palette.link }} />
          </div>
          <div>
            <h2 style={{ fontFamily: fonts.display }} className="text-lg font-bold">
              3. RSS Feed, Sitemap XML, Robots.txt &amp; Tiện ích SEO Site
            </h2>
            <p style={{ color: palette.textSecondary }} className="text-xs sm:text-sm mt-1">
              Tự động tổng hợp từ {posts.filter((p) => !p.draft).length} bài viết đã xuất bản và đặt đúng thư mục tĩnh
              theo framework (<code>{report?.staticRoot || 'root'}</code>).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchReport}
          disabled={isChecking}
          style={{
            borderColor: palette.border,
            backgroundColor: palette.canvas,
            color: palette.textPrimary,
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[40px] text-xs font-medium rounded-xl border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          Kiểm tra lại repo
        </button>
      </div>

      {/* Essential Files Checklist & Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: File Checklist */}
        <div className="lg:col-span-6 space-y-2.5">
          {report?.files.map((file) => {
            const isChecked = selectedKeys[file.key];
            const isPreviewing = previewKey === file.key;
            return (
              <div
                key={file.key}
                style={{
                  borderColor: isPreviewing ? palette.link : palette.border,
                  backgroundColor: palette.canvas,
                }}
                className="p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-3"
              >
                <label className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleKey(file.key)}
                    className="mt-1 w-4 h-4 rounded shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold flex flex-wrap items-center gap-2">
                      <span>{file.label}</span>
                      {file.exists ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã có
                        </span>
                      ) : (
                        <span style={{ color: palette.textMuted }} className="text-[11px] font-normal">
                          Chưa có trên repo
                        </span>
                      )}
                    </div>
                    <p style={{ color: palette.textSecondary }} className="text-xs mt-0.5 leading-relaxed">
                      {file.description}
                    </p>
                    <div
                      style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                      className="text-[11px] mt-1 truncate"
                    >
                      Đích: {file.targetPath}
                      {file.exists && file.publicUrl && (
                        <>
                          {' · '}
                          <a
                            href={file.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: palette.link }}
                            className="underline underline-offset-2"
                          >
                            Mở link
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => setPreviewKey(file.key)}
                  style={{
                    borderColor: isPreviewing ? palette.link : palette.border,
                    color: isPreviewing ? palette.link : palette.textSecondary,
                    backgroundColor: palette.surface,
                  }}
                  className="px-2.5 min-h-[34px] text-[11px] font-medium rounded-lg border cursor-pointer whitespace-nowrap shrink-0"
                >
                  Xem mã
                </button>
              </div>
            );
          })}
        </div>

        {/* Right: Code Preview & Sync Action */}
        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.canvas,
          }}
          className="lg:col-span-6 rounded-xl border flex flex-col overflow-hidden"
        >
          <div
            style={{ borderColor: palette.border, backgroundColor: palette.surfaceElevated }}
            className="px-4 py-2.5 border-b flex items-center justify-between gap-2"
          >
            <div
              style={{ fontFamily: fonts.mono }}
              className="text-xs font-medium flex items-center gap-2 truncate"
            >
              <FileCode2 className="w-4 h-4 shrink-0" style={{ color: palette.link }} />
              <span className="truncate">{activeFileInfo?.targetPath || `${previewKey}`}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyPreview}
                style={{ borderColor: palette.border, color: palette.textSecondary }}
                className="inline-flex items-center gap-1 px-2.5 min-h-[32px] text-[11px] font-medium rounded-lg border cursor-pointer"
              >
                {copiedPreview ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPreview ? 'Đã chép' : 'Sao chép'}
              </button>
              <button
                type="button"
                onClick={handleDownloadPreview}
                style={{ borderColor: palette.border, color: palette.textSecondary }}
                aria-label="Tải tệp"
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg border cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <pre
            style={{
              fontFamily: fonts.mono,
              color: palette.textSecondary,
            }}
            className="p-4 text-[11px] leading-relaxed overflow-auto max-h-[320px] flex-1 whitespace-pre"
          >
            {previewKey === 'nojekyll'
              ? '# Tệp rỗng (.nojekyll) dùng để báo GitHub Pages phục vụ thẳng file tĩnh.'
              : activePreviewContent}
          </pre>

          <div
            style={{ borderColor: palette.border, backgroundColor: palette.surfaceElevated }}
            className="p-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <span style={{ color: palette.textMuted }} className="text-xs">
              Đã chọn <strong>{selectedCount}</strong> tệp để tạo / cập nhật
            </span>

            <button
              type="button"
              onClick={handlePublishSelected}
              disabled={isPublishing || selectedCount === 0 || !authStatus?.authenticated}
              style={{
                backgroundColor: palette.accent,
                color: palette.accentText,
              }}
              className="inline-flex items-center justify-center gap-2 px-4 min-h-[42px] text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-45 whitespace-nowrap"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang đồng bộ lên GitHub...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Đẩy {selectedCount} tệp lên GitHub (1 Commit)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {publishError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
          {publishError}
        </div>
      )}

      {publishResult && (
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
          className="p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2"
        >
          <span className="inline-flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {publishResult.message}
          </span>
          {publishResult.url && (
            <a
              href={publishResult.url}
              target="_blank"
              rel="noreferrer"
              style={{ color: palette.link }}
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"
            >
              Xem Commit <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
