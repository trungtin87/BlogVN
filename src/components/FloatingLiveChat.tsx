import { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Mail,
  MessageCircle,
  MessageSquare,
  Power,
  Send,
  Settings,
  X,
} from 'lucide-react';
import type {
  BlogConfig,
  BlogTheme,
  LiveChatChannelConfig,
  LiveChatPlatformId,
} from '../types/blog';

interface FloatingLiveChatProps {
  theme: BlogTheme;
  config: BlogConfig;
  onUpdateConfig: (next: BlogConfig) => void;
  onOpenSettings?: () => void;
}

function buildChannelHref(ch: LiveChatChannelConfig): string {
  const val = ch.value.trim();
  if (!val) return '#';
  switch (ch.id) {
    case 'zalo':
      return /^https?:\/\//i.test(val)
        ? val
        : `https://zalo.me/${val.replace(/[^a-zA-Z0-9_.]/g, '')}`;
    case 'messenger':
      return /^https?:\/\//i.test(val) ? val : `https://m.me/${val.replace(/^@/, '')}`;
    case 'telegram':
      return /^https?:\/\//i.test(val) ? val : `https://t.me/${val.replace(/^@/, '')}`;
    case 'whatsapp': {
      const digits = val.replace(/[^0-9]/g, '');
      return /^https?:\/\//i.test(val) ? val : `https://wa.me/${digits}`;
    }
    case 'email':
      return val.startsWith('mailto:') ? val : `mailto:${val}`;
    case 'tawkto': {
      const clean = val.replace(/^https?:\/\/embed\.tawk\.to\//i, '').replace(/^\/+/, '');
      return `https://tawk.to/chat/${clean}`;
    }
    case 'crisp':
      return '#crisp-chat';
  }
}

function channelPlatformHint(id: LiveChatPlatformId): { tag: string; color: string } {
  switch (id) {
    case 'zalo':
      return { tag: 'Zalo OA / Cá nhân', color: '#0068FF' };
    case 'messenger':
      return { tag: 'Facebook Messenger', color: '#0084FF' };
    case 'telegram':
      return { tag: 'Telegram Trực tiếp', color: '#26A5E4' };
    case 'whatsapp':
      return { tag: 'WhatsApp', color: '#25D366' };
    case 'email':
      return { tag: 'Email hỗ trợ', color: '#6366F1' };
    case 'tawkto':
      return { tag: 'Tawk.to Live Widget', color: '#03A84E' };
    case 'crisp':
      return { tag: 'Crisp Chat Widget', color: '#1972F5' };
  }
}

export function FloatingLiveChat({
  theme,
  config,
  onUpdateConfig,
  onOpenSettings,
}: FloatingLiveChatProps) {
  const { palette, fonts } = theme;
  const [open, setOpen] = useState(false);

  const liveChat = config.liveChat;
  const enabledChannels = useMemo(
    () => (liveChat?.channels || []).filter((c) => c.enabled && c.value.trim().length > 0),
    [liveChat]
  );

  // Dynamically inject official Tawk.to script inside BlogVN when active
  useEffect(() => {
    const tawkCh = liveChat?.enabled
      ? enabledChannels.find((c) => c.id === 'tawkto' && c.value.trim())
      : undefined;
    const scriptId = 'blogvn-livechat-tawk-script';
    const existing = document.getElementById(scriptId);

    if (!tawkCh) {
      if (existing) existing.remove();
      return;
    }

    const cleanId = tawkCh.value
      .trim()
      .replace(/^https?:\/\/embed\.tawk\.to\//i, '')
      .replace(/^\/+/, '');
    if (!cleanId.includes('/')) return;

    if (existing?.getAttribute('data-tawk-id') === cleanId) return;
    if (existing) existing.remove();

    const s = document.createElement('script');
    s.id = scriptId;
    s.async = true;
    s.setAttribute('data-tawk-id', cleanId);
    s.src = `https://embed.tawk.to/${cleanId}`;
    s.charset = 'UTF-8';
    s.setAttribute('crossorigin', '*');
    document.body.appendChild(s);

    return () => {
      s.remove();
    };
  }, [liveChat?.enabled, enabledChannels]);

  // Dynamically inject official Crisp Web SDK inside BlogVN when active
  useEffect(() => {
    const crispCh = liveChat?.enabled
      ? enabledChannels.find((c) => c.id === 'crisp' && c.value.trim())
      : undefined;
    const scriptId = 'blogvn-livechat-crisp-script';
    const existing = document.getElementById(scriptId);

    if (!crispCh) {
      if (existing) existing.remove();
      return;
    }

    const websiteId = crispCh.value.trim();
    if (existing?.getAttribute('data-crisp-id') === websiteId) return;
    if (existing) existing.remove();

    const win = window as any;
    win.$crisp = win.$crisp || [];
    win.CRISP_WEBSITE_ID = websiteId;

    const s = document.createElement('script');
    s.id = scriptId;
    s.async = true;
    s.setAttribute('data-crisp-id', websiteId);
    s.src = 'https://client.crisp.chat/l.js';
    document.head.appendChild(s);

    return () => {
      s.remove();
    };
  }, [liveChat?.enabled, enabledChannels]);

  if (!liveChat?.enabled) {
    return null;
  }

  const handleTurnOffLiveChat = () => {
    setOpen(false);
    onUpdateConfig({
      ...config,
      liveChat: {
        ...liveChat,
        enabled: false,
      },
    });
  };

  const handleOpenChannel = (ch: LiveChatChannelConfig) => {
    if (ch.id === 'crisp') {
      const crisp = (window as any).$crisp;
      if (Array.isArray(crisp)) {
        crisp.push(['do', 'chat:open']);
        setOpen(false);
        return;
      }
    }
    const href = buildChannelHref(ch);
    if (href && href !== '#') {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-5 right-4 z-40 flex flex-col items-end gap-2.5">
      {open && (
        <div
          style={{
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
            color: palette.textPrimary,
            fontFamily: fonts.body,
          }}
          className="w-[310px] sm:w-[330px] rounded-2xl border shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: palette.accent,
              color: palette.accentText,
            }}
            className="px-4 py-3 flex items-start justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="text-sm font-bold leading-snug truncate">
                {liveChat.title?.trim() || 'Trò chuyện với tác giả'}
              </div>
              <div className="text-[11px] opacity-85 mt-0.5 leading-snug">
                {liveChat.welcomeText?.trim() || 'Chọn kênh liên hệ trực tiếp bên dưới'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng hộp thoại Live Chat"
              className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Channel List */}
          <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
            {enabledChannels.length === 0 ? (
              <div
                style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
                className="p-3 rounded-xl border text-xs space-y-2"
              >
                <div style={{ color: palette.textSecondary }}>
                  Bạn đã bật Live Chat nhưng chưa nhập ID/tài khoản cho kênh nào.
                </div>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpenSettings();
                    }}
                    style={{ color: palette.link }}
                    className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Cấu hình kênh Live Chat
                  </button>
                )}
              </div>
            ) : (
              enabledChannels.map((ch) => {
                const meta = channelPlatformHint(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleOpenChannel(ch)}
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.canvas,
                      color: palette.textPrimary,
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border flex items-center justify-between gap-2.5 text-left hover:opacity-85 cursor-pointer transition-opacity min-h-[46px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        style={{ backgroundColor: meta.color }}
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {ch.label?.trim() || meta.tag}
                        </div>
                        <div
                          style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                          className="text-[11px] truncate"
                        >
                          {ch.value}
                        </div>
                      </div>
                    </div>
                    {ch.id === 'email' ? (
                      <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: palette.link }} />
                    ) : ch.id === 'telegram' ? (
                      <Send className="w-3.5 h-3.5 shrink-0" style={{ color: palette.link }} />
                    ) : (
                      <ExternalLink
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: palette.link }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Quick Off Switch + Settings Shortcut */}
          <div
            style={{
              borderColor: palette.border,
              backgroundColor: palette.surface,
            }}
            className="px-3 py-2 border-t flex items-center justify-between gap-2 text-[11px]"
          >
            {onOpenSettings ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
                style={{ color: palette.textSecondary }}
                className="inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                Chọn nền tảng
              </button>
            ) : (
              <span style={{ color: palette.textMuted }}>Live Chat Blog</span>
            )}

            <button
              type="button"
              onClick={handleTurnOffLiveChat}
              className="inline-flex items-center gap-1 font-medium text-red-500 hover:underline cursor-pointer"
            >
              <Power className="w-3 h-3" />
              Tắt Live Chat
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mở Live Chat"
        style={{
          backgroundColor: palette.accent,
          color: palette.accentText,
        }}
        className="inline-flex items-center gap-2 px-4 min-h-[46px] rounded-full shadow-lg text-xs sm:text-sm font-semibold cursor-pointer hover:opacity-95 transition-transform active:scale-95"
      >
        {open ? <MessageSquare className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
        <span>{open ? 'Đóng Chat' : 'Chat'}</span>
      </button>
    </div>
  );
}
