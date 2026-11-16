import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  EyeOff,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type {
  AuthStatus,
  BlogConfig,
  BlogTheme,
  CommentStatus,
  GitHubRepoInfo,
  PostComment,
} from '../types/blog';

interface CommentModerationCardProps {
  theme: BlogTheme;
  config: BlogConfig;
  authStatus: AuthStatus | null;
  repoInfo: GitHubRepoInfo | null;
  comments: PostComment[];
  onRefreshComments: () => Promise<void>;
  onCommentsSynced?: (message: string, commitUrl?: string) => void;
}

export function CommentModerationCard({
  theme,
  config,
  authStatus,
  repoInfo,
  comments,
  onRefreshComments,
  onCommentsSynced,
}: CommentModerationCardProps) {
  const { palette, fonts } = theme;
  const [filter, setFilter] = useState<'all' | CommentStatus>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ text: string; url?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pendingCount = comments.filter((c) => c.status === 'pending').length;
  const approvedCount = comments.filter((c) => c.status === 'approved').length;
  const rejectedCount = comments.filter((c) => c.status === 'rejected').length;

  const visibleComments =
    filter === 'all' ? comments : comments.filter((c) => c.status === filter);

  const handleModerate = async (id: string, status: CommentStatus) => {
    setBusyId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Không thể cập nhật trạng thái bình luận.');
        return;
      }
      await onRefreshComments();
    } catch {
      setErrorMsg('Lỗi kết nối khi duyệt bình luận.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Không thể xoá bình luận.');
        return;
      }
      await onRefreshComments();
    } catch {
      setErrorMsg('Lỗi kết nối khi xoá bình luận.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSyncApprovedToGitHub = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    setSyncResult(null);
    try {
      const res = await fetch('/api/comments/sync-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: config.githubOwner,
          repo: config.githubRepo,
          branch: repoInfo?.defaultBranch || 'main',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Không thể đồng bộ bình luận lên GitHub.');
        return;
      }
      const msg = `Đã đồng bộ ${data.approvedCount} bình luận đã duyệt lên .blogvn/approved-comments.json.`;
      setSyncResult({ text: msg, url: data.commit?.htmlUrl });
      onCommentsSynced?.(msg, data.commit?.htmlUrl);
    } catch {
      setErrorMsg('Lỗi mạng khi đồng bộ bình luận lên GitHub.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section
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
            <MessageSquare className="w-5 h-5" style={{ color: palette.link }} />
          </div>
          <div>
            <h2 style={{ fontFamily: fonts.display }} className="text-lg font-bold">
              6. Kiểm duyệt Bình luận bài viết
            </h2>
            <p style={{ color: palette.textSecondary }} className="text-xs sm:text-sm mt-1">
              Bình luận từ độc giả được giữ ở hàng chờ riêng và{' '}
              <strong>chỉ hiển thị công khai sau khi bạn bấm Duyệt tại đây</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onRefreshComments()}
            style={{
              borderColor: palette.border,
              backgroundColor: palette.canvas,
              color: palette.textPrimary,
            }}
            className="inline-flex items-center gap-1.5 px-3 min-h-[40px] text-xs font-medium rounded-xl border cursor-pointer hover:opacity-85"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>

          <button
            type="button"
            onClick={handleSyncApprovedToGitHub}
            disabled={isSyncing || !authStatus?.authenticated}
            style={{
              backgroundColor: palette.accent,
              color: palette.accentText,
            }}
            className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] text-xs font-semibold rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-45"
          >
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            Đẩy bình luận đã duyệt lên Git ({approvedCount})
          </button>
        </div>
      </div>

      {/* Filter Segmented Control */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'pending', label: `Chờ duyệt (${pendingCount})` },
            { id: 'approved', label: `Đã duyệt (${approvedCount})` },
            { id: 'rejected', label: `Đã ẩn (${rejectedCount})` },
            { id: 'all', label: `Tất cả (${comments.length})` },
          ] as const
        ).map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              style={{
                backgroundColor: active ? palette.accent : palette.canvas,
                color: active ? palette.accentText : palette.textSecondary,
                borderColor: active ? palette.accent : palette.border,
              }}
              className="px-3 min-h-[38px] text-xs font-medium rounded-xl border cursor-pointer tabular-nums transition-colors"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
          {errorMsg}
        </div>
      )}

      {syncResult && (
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
          className="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {syncResult.text}
          </span>
          {syncResult.url && (
            <a
              href={syncResult.url}
              target="_blank"
              rel="noreferrer"
              style={{ color: palette.link }}
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"
            >
              Xem commit <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {!authStatus?.authenticated ? (
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
          className="p-4 rounded-xl border text-xs"
        >
          Vui lòng đăng nhập GitHub OAuth để xem hàng đợi chờ duyệt và phê duyệt bình luận của độc giả.
        </div>
      ) : visibleComments.length === 0 ? (
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.canvas, color: palette.textMuted }}
          className="p-5 rounded-xl border text-center text-xs sm:text-sm"
        >
          {filter === 'pending'
            ? 'Không có bình luận nào đang chờ duyệt.'
            : 'Chưa có bình luận nào trong mục này.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleComments.map((cmt) => {
            const isBusy = busyId === cmt.id;
            const statusText =
              cmt.status === 'approved'
                ? 'Đã duyệt hiển thị'
                : cmt.status === 'rejected'
                ? 'Đang ẩn'
                : 'Chờ duyệt';

            return (
              <div
                key={cmt.id}
                style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
                className="p-4 rounded-xl border space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs sm:text-sm font-semibold flex flex-wrap items-center gap-2">
                    <span>{cmt.authorName}</span>
                    {cmt.authorEmail && (
                      <span style={{ color: palette.textMuted, fontFamily: fonts.mono }} className="text-[11px] font-normal">
                        ({cmt.authorEmail})
                      </span>
                    )}
                    <span aria-hidden="true" style={{ color: palette.textMuted }}>
                      ·
                    </span>
                    <span
                      style={{
                        color:
                          cmt.status === 'approved'
                            ? '#10b981'
                            : cmt.status === 'rejected'
                            ? '#ef4444'
                            : palette.link,
                      }}
                      className="text-xs font-medium"
                    >
                      {statusText}
                    </span>
                  </div>
                  <span
                    style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                    className="text-[11px] tabular-nums"
                  >
                    {new Date(cmt.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                <div style={{ color: palette.textMuted }} className="text-xs">
                  Bài viết: <strong style={{ color: palette.textPrimary }}>{cmt.postTitle}</strong>
                </div>

                <p style={{ color: palette.textSecondary }} className="text-sm leading-relaxed whitespace-pre-wrap">
                  {cmt.content}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {cmt.status !== 'approved' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleModerate(cmt.id, 'approved')}
                      style={{
                        backgroundColor: palette.accent,
                        color: palette.accentText,
                      }}
                      className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-semibold rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Duyệt hiển thị
                    </button>
                  )}

                  {cmt.status !== 'rejected' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleModerate(cmt.id, 'rejected')}
                      style={{
                        borderColor: palette.border,
                        color: palette.textSecondary,
                      }}
                      className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer hover:opacity-85 disabled:opacity-50"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      Ẩn bình luận
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDelete(cmt.id)}
                    style={{ borderColor: palette.border }}
                    className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-medium rounded-lg border text-red-500 hover:bg-red-500/10 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xoá
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
