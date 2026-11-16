import { useCallback, useEffect, useState } from 'react';
import { Check, EyeOff, Loader2, MessageSquare, Send, Trash2 } from 'lucide-react';
import type { AuthStatus, BlogConfig, BlogPost, BlogTheme, PostComment } from '../types/blog';

interface PostCommentsSectionProps {
  theme: BlogTheme;
  config: BlogConfig;
  post: BlogPost;
  authStatus?: AuthStatus | null;
  onCommentsUpdated?: () => void;
}

export function PostCommentsSection({
  theme,
  config,
  post,
  authStatus,
  onCommentsUpdated,
}: PostCommentsSectionProps) {
  const { palette, fonts } = theme;
  const [comments, setComments] = useState<PostComment[]>([]);
  const [canModerate, setCanModerate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchPostComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const includePending = authStatus?.authenticated ? 'true' : 'false';
      const res = await fetch(
        `/api/comments?owner=${encodeURIComponent(config.githubOwner)}&repo=${encodeURIComponent(
          config.githubRepo
        )}&postPath=${encodeURIComponent(post.path)}&postSlug=${encodeURIComponent(
          post.slug
        )}&includePending=${includePending}`
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setCanModerate(Boolean(data.canModerate));
      }
    } catch {
      // ignore fetch errors
    } finally {
      setIsLoading(false);
    }
  }, [config.githubOwner, config.githubRepo, post.path, post.slug, authStatus?.authenticated]);

  useEffect(() => {
    fetchPostComments();
  }, [fetchPostComments]);

  const approvedComments = comments.filter((c) => c.status === 'approved');
  const pendingComments = canModerate ? comments.filter((c) => c.status === 'pending') : [];

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) {
      setErrorMsg('Vui lòng nhập tên và nội dung bình luận.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSubmitNotice(null);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: config.githubOwner,
          repo: config.githubRepo,
          postPath: post.path,
          postSlug: post.slug,
          postTitle: post.title,
          authorName: authorName.trim(),
          authorEmail: authorEmail.trim() || undefined,
          content: content.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Không thể gửi bình luận.');
        return;
      }

      setAuthorName('');
      setAuthorEmail('');
      setContent('');
      setSubmitNotice(
        data.message ||
          'Bình luận đã gửi! Nội dung sẽ chỉ hiển thị sau khi được chủ blog duyệt trong ứng dụng.'
      );
      await fetchPostComments();
      onCommentsUpdated?.();
    } catch {
      setErrorMsg('Lỗi kết nối khi gửi bình luận.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModerate = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchPostComments();
        onCommentsUpdated?.();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPostComments();
        onCommentsUpdated?.();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      style={{ borderColor: palette.border }}
      className="mt-12 pt-8 border-t space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" style={{ color: palette.link }} />
          <h3 style={{ fontFamily: fonts.display }} className="text-xl font-bold">
            {config.commentsHeading || 'Bình luận bài viết'} ({approvedComments.length})
          </h3>
        </div>
        {config.commentsRequireApproval !== false && (
          <span style={{ color: palette.textMuted }} className="text-xs">
            Kiểm duyệt trước khi hiển thị
          </span>
        )}
      </div>

      {/* Approved Public Comments */}
      {isLoading ? (
        <div style={{ color: palette.textMuted }} className="text-xs flex items-center gap-2 py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải bình luận...
        </div>
      ) : approvedComments.length === 0 ? (
        <p style={{ color: palette.textMuted }} className="text-sm">
          Chưa có bình luận nào được duyệt hiển thị cho bài viết này.
        </p>
      ) : (
        <div className="space-y-3">
          {approvedComments.map((cmt) => (
            <div
              key={cmt.id}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.surface,
              }}
              className="p-4 rounded-xl border space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-sm" style={{ color: palette.textPrimary }}>
                  {cmt.authorName}
                </span>
                <span
                  style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                  className="tabular-nums"
                >
                  {new Date(cmt.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <p
                style={{ color: palette.textSecondary }}
                className="text-sm leading-relaxed whitespace-pre-wrap"
              >
                {cmt.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Owner-Only Pending Queue for This Post */}
      {canModerate && pendingComments.length > 0 && (
        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
          className="p-4 rounded-xl border space-y-3"
        >
          <div className="text-xs font-semibold" style={{ color: palette.link }}>
            Bình luận mới đang chờ bạn duyệt ({pendingComments.length}) — Chưa hiển thị công khai
          </div>
          {pendingComments.map((cmt) => (
            <div
              key={cmt.id}
              style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
              className="p-3.5 rounded-xl border space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold">
                  {cmt.authorName}
                  {cmt.authorEmail ? ` (${cmt.authorEmail})` : ''}
                </span>
                <span style={{ color: palette.textMuted, fontFamily: fonts.mono }}>
                  {new Date(cmt.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <p style={{ color: palette.textSecondary }} className="text-sm whitespace-pre-wrap">
                {cmt.content}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busyId === cmt.id}
                  onClick={() => handleModerate(cmt.id, 'approved')}
                  style={{ backgroundColor: palette.accent, color: palette.accentText }}
                  className="inline-flex items-center gap-1 px-3 min-h-[36px] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Duyệt hiển thị
                </button>
                <button
                  type="button"
                  disabled={busyId === cmt.id}
                  onClick={() => handleModerate(cmt.id, 'rejected')}
                  style={{ borderColor: palette.border, color: palette.textSecondary }}
                  className="inline-flex items-center gap-1 px-3 min-h-[36px] text-xs font-medium rounded-lg border cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" /> Ẩn
                </button>
                <button
                  type="button"
                  disabled={busyId === cmt.id}
                  onClick={() => handleDelete(cmt.id)}
                  style={{ borderColor: palette.border }}
                  className="inline-flex items-center gap-1 px-3 min-h-[36px] text-xs font-medium rounded-lg border text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xoá
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Comment Form */}
      <form
        onSubmit={handleSubmitComment}
        style={{ borderColor: palette.border, backgroundColor: palette.surface }}
        className="p-4 sm:p-5 rounded-xl border space-y-3"
      >
        <div className="text-sm font-semibold">Gửi bình luận của bạn</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Tên của bạn *"
            required
            style={{
              backgroundColor: palette.canvas,
              borderColor: palette.border,
              color: palette.textPrimary,
            }}
            className="w-full px-3.5 min-h-[44px] text-sm rounded-xl border"
          />
          <input
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            placeholder="Email (tuỳ chọn, chỉ chủ blog xem)"
            style={{
              backgroundColor: palette.canvas,
              borderColor: palette.border,
              color: palette.textPrimary,
            }}
            className="w-full px-3.5 min-h-[44px] text-sm rounded-xl border"
          />
        </div>
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Chia sẻ suy nghĩ hoặc câu hỏi về bài viết..."
          required
          style={{
            backgroundColor: palette.canvas,
            borderColor: palette.border,
            color: palette.textPrimary,
          }}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border"
        />

        {errorMsg && <div className="text-xs text-red-500">{errorMsg}</div>}
        {submitNotice && (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {submitNotice}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: palette.accent,
              color: palette.accentText,
            }}
            className="inline-flex items-center gap-2 px-4 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Gửi bình luận
          </button>
        </div>
      </form>
    </section>
  );
}
