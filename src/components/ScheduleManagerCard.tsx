import { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  Workflow,
} from 'lucide-react';
import type {
  AuthStatus,
  BlogConfig,
  BlogTheme,
  GitHubRepoInfo,
  ScheduledTask,
} from '../types/blog';
import {
  ghCheckSchedulerWorkflow,
  ghDeleteSchedule,
  ghRunScheduleNow,
  ghSyncSchedulerWorkflow,
  ghUpdateSchedule,
} from '../utils/githubClient';

interface ScheduleManagerCardProps {
  theme: BlogTheme;
  config: BlogConfig;
  authStatus: AuthStatus | null;
  repoInfo: GitHubRepoInfo | null;
  tasks: ScheduledTask[];
  onRefreshTasks: () => Promise<void>;
  onTasksExecuted: () => void;
}

function formatDateTimeVi(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRemainingTime(iso: string): string {
  const diff = Date.parse(iso) - Date.now();
  if (Number.isNaN(diff)) return '';
  if (diff <= 0) return 'Đến hạn — Đang chờ xử lý';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Còn ${mins} phút`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Còn ${hours} giờ ${mins % 60} phút`;
  const days = Math.floor(hours / 24);
  return `Còn ${days} ngày ${hours % 24} giờ`;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function ScheduleManagerCard({
  theme,
  config,
  authStatus,
  repoInfo,
  tasks,
  onRefreshTasks,
  onTasksExecuted,
}: ScheduleManagerCardProps) {
  const { palette, fonts } = theme;
  const [runningId, setRunningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTimeValue, setEditTimeValue] = useState('');
  const [workflowInstalled, setWorkflowInstalled] = useState(false);
  const [isSyncingWorkflow, setIsSyncingWorkflow] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; url?: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const branch = repoInfo?.defaultBranch || 'main';

  const checkWorkflowStatus = useCallback(async () => {
    try {
      const installed = await ghCheckSchedulerWorkflow(
        config.githubOwner,
        config.githubRepo,
        branch
      );
      setWorkflowInstalled(installed);
    } catch {
      // ignore
    }
  }, [config.githubOwner, config.githubRepo, branch]);

  useEffect(() => {
    checkWorkflowStatus();
  }, [checkWorkflowStatus]);

  const handleRunNow = async (task: ScheduledTask) => {
    setRunningId(task.id);
    setActionError(null);
    setActionMessage(null);
    try {
      const data = await ghRunScheduleNow(task);
      if (!data.ok) {
        setActionError(data.error || 'Không thể thực thi lịch trình ngay lúc này.');
      } else {
        setActionMessage({
          text:
            task.type === 'publish'
              ? `Đã đăng bài "${task.title}" lên GitHub.`
              : `Đã xoá tệp "${task.filePath}" khỏi GitHub.`,
          url: data.commitUrl,
        });
        await onRefreshTasks();
        onTasksExecuted();
      }
    } catch {
      setActionError('Lỗi mạng khi thực thi tác vụ.');
    } finally {
      setRunningId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setActionError(null);
    await ghDeleteSchedule(taskId);
    await onRefreshTasks();
  };

  const handleSaveReschedule = async (taskId: string) => {
    if (!editTimeValue) return;
    setActionError(null);
    const res = await ghUpdateSchedule(taskId, new Date(editTimeValue).toISOString());
    if (!res.ok) {
      setActionError(res.error || 'Không thể cập nhật giờ hẹn.');
      return;
    }
    setEditingId(null);
    await onRefreshTasks();
  };

  const handleSyncWorkflow = async () => {
    setIsSyncingWorkflow(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const data = await ghSyncSchedulerWorkflow({
        owner: config.githubOwner,
        repo: config.githubRepo,
        branch,
      });
      if (!data.ok) {
        setActionError(data.error || 'Không thể đồng bộ Workflow lên GitHub.');
        return;
      }
      setWorkflowInstalled(true);
      setActionMessage({
        text: `Đã cài đặt GitHub Actions Scheduler & đồng bộ ${data.syncedCount || 0} lịch trình chạy tự động 24/7.`,
        url: data.commitUrl,
      });
    } catch {
      setActionError('Lỗi mạng khi cài đặt GitHub Actions.');
    } finally {
      setIsSyncingWorkflow(false);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const historyTasks = tasks.filter((t) => t.status !== 'pending');

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
            <CalendarClock className="w-5 h-5" style={{ color: palette.link }} />
          </div>
          <div>
            <h2 style={{ fontFamily: fonts.display }} className="text-lg font-bold">
              4. Lên lịch đăng bài &amp; Xoá bài tự động ({pendingTasks.length} đang chờ)
            </h2>
            <p style={{ color: palette.textSecondary }} className="text-xs sm:text-sm mt-1">
              Hệ thống tự động kiểm tra và thực thi mỗi 20 giây khi ứng dụng hoạt động, hoặc chạy ngầm 24/7 qua GitHub Actions ngay cả khi tắt máy.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRefreshTasks()}
          style={{
            borderColor: palette.border,
            backgroundColor: palette.canvas,
            color: palette.textPrimary,
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[40px] text-xs font-medium rounded-xl border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Làm mới lịch
        </button>
      </div>

      {/* Pending Tasks Queue */}
      {pendingTasks.length === 0 ? (
        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.canvas,
            color: palette.textMuted,
          }}
          className="p-6 rounded-xl border text-center text-xs sm:text-sm"
        >
          Chưa có lịch đăng bài hoặc lịch xoá tự động nào. Bạn có thể hẹn giờ khi bấm{' '}
          <strong>Đăng lên GitHub</strong> trong trình soạn thảo, hoặc nhấn <strong>Hẹn xoá</strong> bên cạnh bất kỳ bài viết nào bên dưới.
        </div>
      ) : (
        <div style={{ borderColor: palette.border }} className="divide-y rounded-xl border overflow-hidden">
          {pendingTasks.map((task) => {
            const isEditing = editingId === task.id;
            return (
              <div
                key={task.id}
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.canvas,
                }}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span style={{ color: task.type === 'delete' ? '#ef4444' : palette.link }}>
                      {task.type === 'delete' ? 'Tự động xoá bài' : 'Hẹn giờ đăng bài'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate text-sm">{task.title}</span>
                  </div>

                  <div
                    style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                    className="text-xs tabular-nums flex flex-wrap items-center gap-2"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDateTimeVi(task.scheduledAt)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatRemainingTime(task.scheduledAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate max-w-full">{task.filePath}</span>
                  </div>

                  {task.autoDeleteAt && (
                    <div
                      style={{ color: palette.textSecondary, fontFamily: fonts.mono }}
                      className="text-[11px]"
                    >
                      Kèm lịch tự xoá sau khi đăng: {formatDateTimeVi(task.autoDeleteAt)}
                    </div>
                  )}

                  {isEditing && (
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="datetime-local"
                        value={editTimeValue}
                        onChange={(e) => setEditTimeValue(e.target.value)}
                        style={{
                          backgroundColor: palette.surfaceElevated,
                          borderColor: palette.border,
                          color: palette.textPrimary,
                          fontFamily: fonts.mono,
                        }}
                        className="px-2.5 min-h-[38px] text-xs rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveReschedule(task.id)}
                        style={{
                          backgroundColor: palette.accent,
                          color: palette.accentText,
                        }}
                        className="px-3 min-h-[38px] text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Lưu giờ mới
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        style={{
                          borderColor: palette.border,
                          color: palette.textSecondary,
                        }}
                        className="px-3 min-h-[38px] text-xs rounded-lg border cursor-pointer"
                      >
                        Huỷ
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRunNow(task)}
                    disabled={runningId === task.id || !authStatus?.authenticated}
                    style={{
                      backgroundColor: palette.accent,
                      color: palette.accentText,
                    }}
                    className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-45 whitespace-nowrap"
                  >
                    {runningId === task.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    Chạy ngay
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(task.id);
                      setEditTimeValue(toLocalInputValue(task.scheduledAt));
                    }}
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.surface,
                      color: palette.textPrimary,
                    }}
                    className="px-3 min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer whitespace-nowrap"
                  >
                    Đổi giờ
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    aria-label="Huỷ lịch"
                    style={{
                      borderColor: palette.border,
                      color: palette.textMuted,
                    }}
                    className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg border hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 24/7 GitHub Actions Cron Sync Bar */}
      <div
        style={{
          borderColor: palette.border,
          backgroundColor: palette.canvas,
        }}
        className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="space-y-1 min-w-0">
          <div className="text-xs sm:text-sm font-semibold flex flex-wrap items-center gap-2">
            <Workflow className="w-4 h-4 shrink-0" style={{ color: palette.link }} />
            <span>Chạy ngầm 24/7 trên GitHub Actions</span>
            {workflowInstalled && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã cài đặt
              </span>
            )}
          </div>
          <p style={{ color: palette.textSecondary }} className="text-xs leading-relaxed">
            Đẩy tệp workflow <code>.github/workflows/blogvn-scheduler.yml</code> và danh sách chờ{' '}
            <code>.blogvn/schedules.json</code> lên repo để GitHub tự động xuất bản &amp; xoá bài đúng giờ ngay cả khi bạn tắt điện thoại.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSyncWorkflow}
          disabled={isSyncingWorkflow || !authStatus?.authenticated}
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surfaceElevated,
            color: palette.textPrimary,
          }}
          className="inline-flex items-center justify-center gap-2 px-4 min-h-[42px] text-xs font-semibold rounded-xl border cursor-pointer disabled:opacity-45 whitespace-nowrap shrink-0"
        >
          {isSyncingWorkflow ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang đồng bộ...
            </>
          ) : workflowInstalled ? (
            'Đồng bộ lại lịch lên GitHub Actions'
          ) : (
            'Kích hoạt chạy ngầm 24/7'
          )}
        </button>
      </div>

      {/* Recent Executed History */}
      {historyTasks.length > 0 && (
        <div className="space-y-2">
          <div style={{ color: palette.textMuted }} className="text-xs font-medium">
            Lịch sử đã xử lý gần đây ({historyTasks.slice(0, 5).length})
          </div>
          <div style={{ borderColor: palette.border }} className="divide-y rounded-xl border overflow-hidden">
            {historyTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.canvas,
                }}
                className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span
                    className={
                      task.status === 'completed'
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-red-500 font-semibold'
                    }
                  >
                    {task.status === 'completed' ? 'Hoàn tất' : 'Thất bại'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{task.type === 'delete' ? 'Xoá' : 'Đăng'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate font-medium">{task.title}</span>
                  {task.error && (
                    <span className="text-red-500 truncate">({task.error})</span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0" style={{ color: palette.textMuted, fontFamily: fonts.mono }}>
                  <span>{formatDateTimeVi(task.executedAt || task.scheduledAt)}</span>
                  {task.commitUrl && (
                    <a
                      href={task.commitUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: palette.link }}
                      className="inline-flex items-center gap-1 underline underline-offset-2"
                    >
                      Commit <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="hover:text-red-500 cursor-pointer"
                    aria-label="Xoá khỏi lịch sử"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
          {actionError}
        </div>
      )}

      {actionMessage && (
        <div
          style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
          className="p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2"
        >
          <span className="inline-flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {actionMessage.text}
          </span>
          {actionMessage.url && (
            <a
              href={actionMessage.url}
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
