import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  KeyRound,
  Loader2,
  Send,
  Share2,
} from 'lucide-react';
import type {
  BlogTheme,
  SocialPlatformCredentials,
  SocialPlatformId,
  SocialPublishResult,
} from '../types/blog';
import {
  buildOfficialShareIntentUrl,
  isPlatformConfigured,
  loadSocialCredentials,
  publishToSocialPlatform,
  saveSocialCredentials,
  SOCIAL_PLATFORM_LIST,
} from '../utils/socialPublisher';

interface SocialSharePanelProps {
  mode?: 'studio' | 'publish-checklist';
  theme: BlogTheme;
  uid: string;
  postTitle: string;
  postExcerpt: string;
  postUrl: string;
  postCover?: string;
  caption: string;
  onChangeCaption: (next: string) => void;
  selectedPlatforms: SocialPlatformId[];
  onChangeSelectedPlatforms: (next: SocialPlatformId[]) => void;
}

export function SocialSharePanel({
  mode = 'studio',
  theme,
  uid,
  postTitle,
  postExcerpt,
  postUrl,
  postCover,
  caption,
  onChangeCaption,
  selectedPlatforms,
  onChangeSelectedPlatforms,
}: SocialSharePanelProps) {
  const { palette, fonts } = theme;
  const [creds, setCreds] = useState<SocialPlatformCredentials>(() =>
    loadSocialCredentials(uid)
  );
  const [editingPlatform, setEditingPlatform] = useState<SocialPlatformId | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [results, setResults] = useState<SocialPublishResult[]>([]);
  const [showCredsBox, setShowCredsBox] = useState(mode === 'studio');

  useEffect(() => {
    setCreds(loadSocialCredentials(uid));
  }, [uid]);

  const updateCredField = (
    platform: SocialPlatformId,
    field: string,
    value: string | boolean
  ) => {
    setCreds((prev) => {
      const next: SocialPlatformCredentials = {
        ...prev,
        [platform]: {
          ...(prev[platform] as Record<string, any>),
          [field]: value,
        },
      };
      saveSocialCredentials(next, uid);
      return next;
    });
  };

  const togglePlatformSelection = (platform: SocialPlatformId) => {
    if (selectedPlatforms.includes(platform)) {
      onChangeSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    } else {
      onChangeSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleShareSelectedNow = async () => {
    if (selectedPlatforms.length === 0) return;
    setIsPublishing(true);
    setResults([]);
    const list: SocialPublishResult[] = [];
    for (const pid of selectedPlatforms) {
      const res = await publishToSocialPlatform(pid, creds, {
        title: postTitle || 'Bài viết mới',
        excerpt: postExcerpt,
        caption: caption.trim() || postTitle || 'Bài viết mới',
        url: postUrl,
        cover: postCover,
      });
      list.push(res);
    }
    setResults(list);
    setIsPublishing(false);
  };

  const handleNativeWebShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: postTitle,
          text: caption || postExcerpt || postTitle,
          url: postUrl,
        });
      } catch {
        // user cancelled
      }
    }
  };

  const configuredPlatforms = SOCIAL_PLATFORM_LIST.filter((m) =>
    isPlatformConfigured(m.id, creds)
  );

  if (mode === 'publish-checklist') {
    return (
      <div
        style={{ borderColor: palette.border, backgroundColor: palette.surface }}
        className="p-3.5 rounded-xl border space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold flex items-center gap-1.5">
            <Share2 className="w-4 h-4" style={{ color: palette.link }} />
            Chia sẻ đồng thời lên Mạng xã hội (API chính thống)
          </div>
          <button
            type="button"
            onClick={() => setShowCredsBox((v) => !v)}
            style={{ color: palette.link }}
            className="text-[11px] font-medium hover:underline cursor-pointer"
          >
            {showCredsBox ? 'Thu gọn' : `Chọn nền tảng (${selectedPlatforms.length})`}
          </button>
        </div>

        <p style={{ color: palette.textMuted }} className="text-[11px] leading-relaxed">
          Sau khi commit lên GitHub thành công, BlogVN tự động đăng link{' '}
          <code style={{ fontFamily: fonts.mono }}>{postUrl}</code> lên các nền tảng bạn chọn bên dưới.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {SOCIAL_PLATFORM_LIST.map((meta) => {
            const ready = isPlatformConfigured(meta.id, creds);
            const checked = selectedPlatforms.includes(meta.id);
            return (
              <button
                key={meta.id}
                type="button"
                onClick={() => togglePlatformSelection(meta.id)}
                title={
                  ready
                    ? `Đã kết nối ${meta.apiDocName}`
                    : 'Chưa cấu hình API Token (có thể cấu hình ở tab Tối ưu hoặc dùng Share Intent)'
                }
                style={{
                  backgroundColor: checked ? palette.accent : palette.canvas,
                  color: checked ? palette.accentText : palette.textSecondary,
                  borderColor: checked ? palette.accent : palette.border,
                }}
                className="px-2.5 min-h-[34px] text-[11px] font-medium rounded-lg border inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    ready ? 'bg-emerald-500' : 'bg-zinc-400'
                  }`}
                />
                {meta.name}
              </button>
            );
          })}
        </div>

        {(showCredsBox || selectedPlatforms.length > 0) && (
          <div className="space-y-2 pt-1">
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => onChangeCaption(e.target.value)}
              placeholder="Lời dẫn khi chia sẻ lên mạng xã hội..."
              style={{
                backgroundColor: palette.canvas,
                borderColor: palette.border,
                color: palette.textPrimary,
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border"
            />
            {selectedPlatforms.some((pid) => !isPlatformConfigured(pid, creds)) && (
              <div className="text-[11px] text-amber-600 dark:text-amber-400">
                Một số nền tảng được tick chưa có Token API: hãy cấu hình trong tab{' '}
                <strong>Tối ưu</strong> hoặc dùng nút mở hộp thoại chia sẻ chính thống.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ borderColor: palette.border, backgroundColor: palette.surface }}
      className="p-4 sm:p-6 rounded-2xl border space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 style={{ fontFamily: fonts.display }} className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Share2 className="w-4 h-4" style={{ color: palette.link }} />
            Chia sẻ Mạng xã hội (API chính thống của từng nền tảng)
          </h3>
          <p style={{ color: palette.textMuted }} className="text-xs mt-1 leading-relaxed">
            Token API được lưu cục bộ tách biệt trên trình duyệt theo Google UID, không bao giờ đưa lên GitHub repository.
          </p>
        </div>

        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            type="button"
            onClick={handleNativeWebShare}
            style={{
              borderColor: palette.border,
              backgroundColor: palette.canvas,
              color: palette.textPrimary,
            }}
            className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer hover:opacity-85 whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" />
            Chia sẻ nhanh (Thiết bị)
          </button>
        )}
      </div>

      {/* Caption & Link Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <label style={{ color: palette.textMuted }} className="font-medium">
            Nội dung bài đăng mạng xã hội (Caption &amp; Hashtag)
          </label>
          <span
            style={{ color: palette.textMuted, fontFamily: fonts.mono }}
            className="text-[11px] truncate max-w-[260px]"
          >
            {postUrl}
          </span>
        </div>
        <textarea
          rows={3}
          value={caption}
          onChange={(e) => onChangeCaption(e.target.value)}
          placeholder="Nhập lời dẫn hoặc tóm tắt thu hút người đọc khi chia sẻ bài viết..."
          style={{
            backgroundColor: palette.canvas,
            borderColor: palette.border,
            color: palette.textPrimary,
          }}
          className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border"
        />
      </div>

      {/* Platform Grid with Configure + Toggle */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">
            Chọn nền tảng muốn chia sẻ ({configuredPlatforms.length}/8 đã nhập API)
          </span>
          <button
            type="button"
            onClick={handleShareSelectedNow}
            disabled={isPublishing || selectedPlatforms.length === 0}
            style={{
              backgroundColor: palette.accent,
              color: palette.accentText,
            }}
            className="inline-flex items-center gap-1.5 px-3.5 min-h-[38px] text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-45 whitespace-nowrap"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang gửi API...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Chia sẻ ngay ({selectedPlatforms.length})
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {SOCIAL_PLATFORM_LIST.map((meta) => {
            const ready = isPlatformConfigured(meta.id, creds);
            const selected = selectedPlatforms.includes(meta.id);
            const isEditing = editingPlatform === meta.id;
            const intentUrl = meta.supportsOfficialIntent
              ? buildOfficialShareIntentUrl(meta.id, {
                  title: postTitle || 'Bài viết mới',
                  text: caption || postExcerpt,
                  url: postUrl,
                })
              : null;

            return (
              <div
                key={meta.id}
                style={{
                  borderColor: selected ? palette.link : palette.border,
                  backgroundColor: palette.canvas,
                }}
                className="rounded-xl border p-3 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <label className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePlatformSelection(meta.id)}
                      className="mt-1 w-4 h-4 rounded shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold flex flex-wrap items-center gap-1.5">
                        <span>{meta.name}</span>
                        <span
                          className={`text-[10px] font-medium ${
                            ready
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-zinc-500'
                          }`}
                        >
                          {ready ? '· Đã nhập API' : '· Chưa cấu hình'}
                        </span>
                      </div>
                      <div style={{ color: palette.textMuted }} className="text-[11px] leading-snug mt-0.5">
                        {meta.apiDocName}
                        {meta.requiresBackendForApi ? ' (Cần Server hoặc mở Hộp thoại)' : ' (Chạy thẳng từ trình duyệt)'}
                      </div>
                    </div>
                  </label>

                  <div className="flex items-center gap-1 shrink-0">
                    {intentUrl && (
                      <a
                        href={intentUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Mở hộp thoại chia sẻ chính thức"
                        style={{ borderColor: palette.border, color: palette.link }}
                        className="min-w-[30px] min-h-[30px] flex items-center justify-center rounded-lg border hover:opacity-80"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingPlatform(isEditing ? null : meta.id)}
                      style={{ borderColor: palette.border, color: palette.textSecondary }}
                      className="inline-flex items-center gap-1 px-2 min-h-[30px] text-[11px] font-medium rounded-lg border cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3" />
                      API
                      {isEditing ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Per-platform credential inputs */}
                {isEditing && (
                  <div
                    style={{ borderColor: palette.border, backgroundColor: palette.surface }}
                    className="p-3 rounded-lg border space-y-2 text-xs"
                  >
                    <p style={{ color: palette.textMuted }} className="text-[11px] leading-relaxed">
                      {meta.description}
                    </p>

                    {meta.id === 'facebook' && (
                      <>
                        <input
                          type="text"
                          value={creds.facebook?.pageId || ''}
                          onChange={(e) => updateCredField('facebook', 'pageId', e.target.value)}
                          placeholder="Facebook Page ID"
                          style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                          className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                        />
                        <input
                          type="password"
                          value={creds.facebook?.pageAccessToken || ''}
                          onChange={(e) => updateCredField('facebook', 'pageAccessToken', e.target.value)}
                          placeholder="Page Access Token (pages_manage_posts)"
                          style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                          className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                        />
                      </>
                    )}

                    {meta.id === 'threads' && (
                      <>
                        <input
                          type="text"
                          value={creds.threads?.userId || ''}
                          onChange={(e) => updateCredField('threads', 'userId', e.target.value)}
                          placeholder="Threads User ID (số hoặc 'me')"
                          style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                          className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                        />
                        <input
                          type="password"
                          value={creds.threads?.accessToken || ''}
                          onChange={(e) => updateCredField('threads', 'accessToken', e.target.value)}
                          placeholder="Threads Access Token (threads_content_publish)"
                          style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                          className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                        />
                      </>
                    )}

                    {meta.id === 'x' && (
                      <input
                        type="password"
                        value={creds.x?.accessToken || ''}
                        onChange={(e) => updateCredField('x', 'accessToken', e.target.value)}
                        placeholder="X OAuth 2.0 User Access Token (tweet.write)"
                        style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                        className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                      />
                    )}

                    {meta.id === 'linkedin' && (
                      <>
                        <input
                          type="text"
                          value={creds.linkedin?.authorUrn || ''}
                          onChange={(e) => updateCredField('linkedin', 'authorUrn', e.target.value)}
                          placeholder="Author URN (VD: urn:li:person:xxxx)"
                          style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                          className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                        />
                        <input
                          type="password"
                          value={creds.linkedin?.accessToken || ''}
                          onChange={(e) => updateCredField('linkedin', 'accessToken', e.target.value)}
                          placeholder="LinkedIn OAuth Access Token (w_member_social)"
                          style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                          className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                        />
                      </>
                    )}

                    {meta.id === 'bluesky' && (
                      <>
                        <input
                          type="text"
                          value={creds.bluesky?.handle || ''}
                          onChange={(e) => updateCredField('bluesky', 'handle', e.target.value)}
                          placeholder="Bluesky Handle (VD: tenban.bsky.social)"
                          style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                          className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                        />
                        <input
                          type="password"
                          value={creds.bluesky?.appPassword || ''}
                          onChange={(e) => updateCredField('bluesky', 'appPassword', e.target.value)}
                          placeholder="App Password (xxxx-xxxx-xxxx-xxxx)"
                          style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                          className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                        />
                      </>
                    )}

                    {meta.id === 'mastodon' && (
                      <>
                        <input
                          type="url"
                          value={creds.mastodon?.instanceUrl || 'https://mastodon.social'}
                          onChange={(e) => updateCredField('mastodon', 'instanceUrl', e.target.value)}
                          placeholder="https://mastodon.social"
                          style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                          className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                        />
                        <input
                          type="password"
                          value={creds.mastodon?.accessToken || ''}
                          onChange={(e) => updateCredField('mastodon', 'accessToken', e.target.value)}
                          placeholder="Access Token (write:statuses)"
                          style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                          className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                        />
                      </>
                    )}

                    {meta.id === 'telegram' && (
                      <>
                        <input
                          type="password"
                          value={creds.telegram?.botToken || ''}
                          onChange={(e) => updateCredField('telegram', 'botToken', e.target.value)}
                          placeholder="Bot Token (123456:ABC-DEF...)"
                          style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                          className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                        />
                        <input
                          type="text"
                          value={creds.telegram?.chatId || ''}
                          onChange={(e) => updateCredField('telegram', 'chatId', e.target.value)}
                          placeholder="Chat ID / @ten_kenh"
                          style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                          className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                        />
                      </>
                    )}

                    {meta.id === 'discord' && (
                      <input
                        type="password"
                        value={creds.discord?.webhookUrl || ''}
                        onChange={(e) => updateCredField('discord', 'webhookUrl', e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        style={{ backgroundColor: palette.canvas, borderColor: palette.border, color: palette.textPrimary }}
                        className="w-full px-2.5 min-h-[36px] text-xs rounded-lg border"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Share Results Log */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <div
              key={r.platform}
              style={{
                borderColor: r.ok ? '#10b98150' : '#f59e0b50',
                backgroundColor: palette.canvas,
              }}
              className="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span className="inline-flex items-center gap-2 font-medium min-w-0">
                {r.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <span>
                  <strong>{r.platformName}:</strong> {r.message}
                </span>
              </span>

              {r.postUrl ? (
                <a
                  href={r.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: palette.link }}
                  className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 shrink-0"
                >
                  Xem bài đã đăng <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                r.fallbackShareUrl && (
                  <a
                    href={r.fallbackShareUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: palette.link }}
                    className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 shrink-0"
                  >
                    Mở hộp thoại chia sẻ chính thức <ExternalLink className="w-3 h-3" />
                  </a>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
