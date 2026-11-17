import type {
  BlogConfig,
  SocialPlatformCredentials,
  SocialPlatformId,
  SocialPublishResult,
} from '../types/blog';
import { getActiveSessionUid, getUserStorageKey, isBackendAvailable } from './githubClient';

export interface SocialPlatformMeta {
  id: SocialPlatformId;
  name: string;
  apiDocName: string;
  supportsDirectBrowserApi: boolean;
  requiresBackendForApi?: boolean;
  supportsOfficialIntent: boolean;
  description: string;
}

export const SOCIAL_PLATFORM_LIST: SocialPlatformMeta[] = [
  {
    id: 'facebook',
    name: 'Facebook Page',
    apiDocName: 'Meta Graph API v21.0',
    supportsDirectBrowserApi: true,
    supportsOfficialIntent: true,
    description: 'Đăng trực tiếp lên Trang Facebook qua Graph API hoặc mở hộp thoại Chia sẻ Facebook.',
  },
  {
    id: 'threads',
    name: 'Threads',
    apiDocName: 'Meta Threads Graph API',
    supportsDirectBrowserApi: true,
    supportsOfficialIntent: true,
    description: 'Tạo bài viết kèm link trên Threads qua Threads API chính thức hoặc Intent.',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    apiDocName: 'X API v2',
    supportsDirectBrowserApi: false,
    requiresBackendForApi: true,
    supportsOfficialIntent: true,
    description: 'Đăng tweet qua X API v2 (OAuth 2.0 User Token) hoặc mở hộp thoại đăng X chính thống.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    apiDocName: 'LinkedIn UGC/Posts API',
    supportsDirectBrowserApi: false,
    requiresBackendForApi: true,
    supportsOfficialIntent: true,
    description: 'Chia sẻ bài viết chuyên môn lên hồ sơ/trang LinkedIn qua REST API hoặc Share Offsite.',
  },
  {
    id: 'bluesky',
    name: 'Bluesky',
    apiDocName: 'AT Protocol (XRPC)',
    supportsDirectBrowserApi: true,
    supportsOfficialIntent: true,
    description: 'Đăng tự động kèm thẻ xem trước bài viết qua AT Protocol (hỗ trợ chạy thẳng từ trình duyệt).',
  },
  {
    id: 'mastodon',
    name: 'Mastodon',
    apiDocName: 'Mastodon REST API v1',
    supportsDirectBrowserApi: true,
    supportsOfficialIntent: true,
    description: 'Đăng lên mọi máy chủ Mastodon qua API chính thức (chạy thẳng từ GitHub Pages).',
  },
  {
    id: 'telegram',
    name: 'Telegram Channel',
    apiDocName: 'Telegram Bot API',
    supportsDirectBrowserApi: true,
    supportsOfficialIntent: true,
    description: 'Gửi thông báo bài mới kèm tóm tắt & link vào Kênh/Nhóm Telegram qua Bot API.',
  },
  {
    id: 'discord',
    name: 'Discord',
    apiDocName: 'Discord Webhook API',
    supportsDirectBrowserApi: true,
    supportsOfficialIntent: false,
    description: 'Gửi thẻ bài viết (Embed) vào kênh Discord qua Webhook chính thức.',
  },
];

export function getDefaultSocialCredentials(): SocialPlatformCredentials {
  return {
    facebook: { enabled: false, pageId: '', pageAccessToken: '' },
    linkedin: { enabled: false, accessToken: '', authorUrn: '' },
    x: { enabled: false, accessToken: '' },
    threads: { enabled: false, userId: '', accessToken: '' },
    mastodon: { enabled: false, instanceUrl: 'https://mastodon.social', accessToken: '' },
    bluesky: { enabled: false, handle: '', appPassword: '' },
    telegram: { enabled: false, botToken: '', chatId: '' },
    discord: { enabled: false, webhookUrl: '' },
  };
}

export function loadSocialCredentials(uid = getActiveSessionUid()): SocialPlatformCredentials {
  const defaults = getDefaultSocialCredentials();
  if (!uid || typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(getUserStorageKey(uid, 'social_v1'));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      facebook: { ...defaults.facebook!, ...(parsed.facebook || {}) },
      linkedin: { ...defaults.linkedin!, ...(parsed.linkedin || {}) },
      x: { ...defaults.x!, ...(parsed.x || {}) },
      threads: { ...defaults.threads!, ...(parsed.threads || {}) },
      mastodon: { ...defaults.mastodon!, ...(parsed.mastodon || {}) },
      bluesky: { ...defaults.bluesky!, ...(parsed.bluesky || {}) },
      telegram: { ...defaults.telegram!, ...(parsed.telegram || {}) },
      discord: { ...defaults.discord!, ...(parsed.discord || {}) },
    };
  } catch {
    return defaults;
  }
}

export function saveSocialCredentials(
  creds: SocialPlatformCredentials,
  uid = getActiveSessionUid()
): void {
  if (!uid || typeof window === 'undefined') return;
  try {
    localStorage.setItem(getUserStorageKey(uid, 'social_v1'), JSON.stringify(creds));
  } catch {
    // ignore storage quota errors
  }
}

export function clearSocialCredentials(uid = getActiveSessionUid()): void {
  if (!uid || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getUserStorageKey(uid, 'social_v1'));
  } catch {
    // ignore
  }
}

export function isPlatformConfigured(
  platform: SocialPlatformId,
  creds: SocialPlatformCredentials
): boolean {
  switch (platform) {
    case 'facebook':
      return Boolean(creds.facebook?.pageId.trim() && creds.facebook?.pageAccessToken.trim());
    case 'linkedin':
      return Boolean(creds.linkedin?.accessToken.trim() && creds.linkedin?.authorUrn.trim());
    case 'x':
      return Boolean(creds.x?.accessToken.trim());
    case 'threads':
      return Boolean(creds.threads?.userId.trim() && creds.threads?.accessToken.trim());
    case 'mastodon':
      return Boolean(creds.mastodon?.instanceUrl.trim() && creds.mastodon?.accessToken.trim());
    case 'bluesky':
      return Boolean(creds.bluesky?.handle.trim() && creds.bluesky?.appPassword.trim());
    case 'telegram':
      return Boolean(creds.telegram?.botToken.trim() && creds.telegram?.chatId.trim());
    case 'discord':
      return Boolean(creds.discord?.webhookUrl.trim());
  }
}

export function buildPublishedArticleUrl(config: BlogConfig, slug: string): string {
  const base = (
    config.pagesUrl ||
    (config.githubRepo.toLowerCase() === `${config.githubOwner.toLowerCase()}.github.io`
      ? `https://${config.githubRepo}`
      : `https://${config.githubOwner}.github.io/${config.githubRepo}`)
  )
    .trim()
    .replace(/\/+$/, '');
  const cleanSlug = (slug || 'bai-viet').replace(/^\/+|\/+$/g, '');
  return `${base}/bai-viet/${cleanSlug}/`;
}

export function buildSocialCaption(params: {
  title: string;
  excerpt: string;
  tags: string[];
  url: string;
}): string {
  const hashTags = params.tags
    .slice(0, 4)
    .map((t) => `#${t.trim().replace(/[^a-zA-Z0-9À-ỹ_]+/g, '')}`)
    .filter((t) => t.length > 1)
    .join(' ');
  const parts = [params.title.trim()];
  if (params.excerpt.trim()) parts.push(params.excerpt.trim());
  if (hashTags) parts.push(hashTags);
  return parts.join('\n\n');
}

export function buildOfficialShareIntentUrl(
  platform: SocialPlatformId | 'zalo',
  payload: { title: string; text: string; url: string }
): string | null {
  const u = encodeURIComponent(payload.url);
  const fullText = encodeURIComponent(`${payload.title}\n\n${payload.text}`.trim());
  const titleOnly = encodeURIComponent(payload.title);
  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${titleOnly}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case 'x':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(payload.title)}&url=${u}`;
    case 'threads':
      return `https://www.threads.net/intent/post?text=${encodeURIComponent(`${payload.title} ${payload.url}`)}`;
    case 'bluesky':
      return `https://bsky.app/intent/compose?text=${encodeURIComponent(`${payload.title}\n${payload.url}`)}`;
    case 'mastodon':
      return `https://mastodon.social/share?text=${encodeURIComponent(`${payload.title} ${payload.url}`)}`;
    case 'telegram':
      return `https://t.me/share/url?url=${u}&text=${fullText}`;
    case 'zalo':
      return `https://sp.zalo.me/plugins/share?url=${u}`;
    default:
      return null;
  }
}

async function publishDirectToBluesky(
  creds: NonNullable<SocialPlatformCredentials['bluesky']>,
  payload: { title: string; excerpt: string; caption: string; url: string }
): Promise<SocialPublishResult> {
  const identifier = creds.handle.trim().replace(/^@/, '');
  const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: creds.appPassword.trim() }),
  });
  const sessionJson = await sessionRes.json().catch(() => ({}));
  if (!sessionRes.ok || !sessionJson.accessJwt || !sessionJson.did) {
    return {
      platform: 'bluesky',
      platformName: 'Bluesky',
      ok: false,
      message: sessionJson.message || 'Xác thực Bluesky thất bại (kiểm tra Handle & App Password).',
      fallbackShareUrl: buildOfficialShareIntentUrl('bluesky', {
        title: payload.title,
        text: payload.excerpt,
        url: payload.url,
      }) || undefined,
    };
  }

  const textBody = `${payload.caption}\n${payload.url}`.slice(0, 295);
  const urlStart = new TextEncoder().encode(`${payload.caption}\n`).byteLength;
  const urlLen = new TextEncoder().encode(payload.url).byteLength;
  const facets =
    textBody.endsWith(payload.url)
      ? [
          {
            index: { byteStart: urlStart, byteEnd: urlStart + urlLen },
            features: [{ $type: 'app.bsky.richtext.facet#link', uri: payload.url }],
          },
        ]
      : undefined;

  const recordRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionJson.accessJwt}`,
    },
    body: JSON.stringify({
      repo: sessionJson.did,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text: textBody,
        createdAt: new Date().toISOString(),
        ...(facets ? { facets } : {}),
        embed: {
          $type: 'app.bsky.embed.external',
          external: {
            uri: payload.url,
            title: payload.title.slice(0, 120),
            description: (payload.excerpt || payload.title).slice(0, 250),
          },
        },
      },
    }),
  });
  const recordJson = await recordRes.json().catch(() => ({}));
  if (!recordRes.ok || !recordJson.uri) {
    return {
      platform: 'bluesky',
      platformName: 'Bluesky',
      ok: false,
      message: recordJson.message || 'Không thể đăng bài lên Bluesky.',
    };
  }
  const rkey = String(recordJson.uri).split('/').pop();
  return {
    platform: 'bluesky',
    platformName: 'Bluesky',
    ok: true,
    postUrl: rkey ? `https://bsky.app/profile/${identifier}/post/${rkey}` : undefined,
    message: 'Đã đăng thành công lên Bluesky qua AT Protocol.',
  };
}

async function publishDirectToMastodon(
  creds: NonNullable<SocialPlatformCredentials['mastodon']>,
  payload: { caption: string; url: string }
): Promise<SocialPublishResult> {
  const baseUrl = (creds.instanceUrl || 'https://mastodon.social').trim().replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creds.accessToken.trim()}`,
    },
    body: JSON.stringify({
      status: `${payload.caption}\n\n${payload.url}`.slice(0, 495),
      visibility: 'public',
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.id) {
    return {
      platform: 'mastodon',
      platformName: 'Mastodon',
      ok: false,
      message: json.error || 'Không thể đăng lên Mastodon (kiểm tra Instance URL & Token).',
    };
  }
  return {
    platform: 'mastodon',
    platformName: 'Mastodon',
    ok: true,
    postUrl: json.url || undefined,
    message: 'Đã đăng thành công lên Mastodon.',
  };
}

async function publishDirectToTelegram(
  creds: NonNullable<SocialPlatformCredentials['telegram']>,
  payload: { title: string; excerpt: string; url: string }
): Promise<SocialPublishResult> {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const text = `<b>${esc(payload.title)}</b>\n\n${
    payload.excerpt ? `${esc(payload.excerpt)}\n\n` : ''
  }<a href="${esc(payload.url)}">Đọc bài viết →</a>`;

  const res = await fetch(
    `https://api.telegram.org/bot${encodeURIComponent(creds.botToken.trim())}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: creds.chatId.trim(),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    return {
      platform: 'telegram',
      platformName: 'Telegram Channel',
      ok: false,
      message: json.description || 'Không thể gửi bài vào Telegram Channel.',
    };
  }
  return {
    platform: 'telegram',
    platformName: 'Telegram Channel',
    ok: true,
    message: 'Đã gửi bài viết tới Telegram qua Bot API.',
  };
}

async function publishDirectToDiscord(
  creds: NonNullable<SocialPlatformCredentials['discord']>,
  payload: { title: string; excerpt: string; url: string; cover?: string }
): Promise<SocialPublishResult> {
  const webhookUrl = creds.webhookUrl.trim();
  const targetUrl = webhookUrl.includes('?') ? `${webhookUrl}&wait=true` : `${webhookUrl}?wait=true`;
  const embed: Record<string, any> = {
    title: payload.title.slice(0, 250),
    description: (payload.excerpt || 'Bài viết blog mới vừa xuất bản').slice(0, 350),
    url: payload.url,
    color: 0x1e3a8a,
  };
  if (payload.cover && /^https?:\/\//i.test(payload.cover)) {
    embed.image = { url: payload.cover };
  }
  const res = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return {
      platform: 'discord',
      platformName: 'Discord',
      ok: false,
      message: errText || `Discord Webhook trả về lỗi HTTP ${res.status}.`,
    };
  }
  return {
    platform: 'discord',
    platformName: 'Discord',
    ok: true,
    message: 'Đã đăng thẻ bài viết vào Discord Webhook.',
  };
}

async function publishDirectToFacebook(
  creds: NonNullable<SocialPlatformCredentials['facebook']>,
  payload: { caption: string; url: string; title: string }
): Promise<SocialPublishResult> {
  const params = new URLSearchParams({
    message: payload.caption,
    link: payload.url,
    access_token: creds.pageAccessToken.trim(),
  });
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(creds.pageId.trim())}/feed`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.id) {
    return {
      platform: 'facebook',
      platformName: 'Facebook Page',
      ok: false,
      message: json.error?.message || 'Meta Graph API từ chối đăng (kiểm tra Page ID / Token).',
      fallbackShareUrl:
        buildOfficialShareIntentUrl('facebook', {
          title: payload.title,
          text: payload.caption,
          url: payload.url,
        }) || undefined,
    };
  }
  return {
    platform: 'facebook',
    platformName: 'Facebook Page',
    ok: true,
    postUrl: `https://www.facebook.com/${json.id}`,
    message: 'Đã đăng trực tiếp lên Facebook Page qua Meta Graph API.',
  };
}

async function publishDirectToThreads(
  creds: NonNullable<SocialPlatformCredentials['threads']>,
  payload: { caption: string; url: string; title: string }
): Promise<SocialPublishResult> {
  const uid = encodeURIComponent(creds.userId.trim());
  const token = creds.accessToken.trim();
  const createParams = new URLSearchParams({
    media_type: 'TEXT',
    text: `${payload.caption}\n\n${payload.url}`.slice(0, 495),
    link_attachment: payload.url,
    access_token: token,
  });
  const createRes = await fetch(`https://graph.threads.net/v1.0/${uid}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: createParams.toString(),
  });
  const createJson = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !createJson.id) {
    return {
      platform: 'threads',
      platformName: 'Threads',
      ok: false,
      message: createJson.error?.message || 'Không thể khởi tạo bài Threads qua Threads API.',
      fallbackShareUrl:
        buildOfficialShareIntentUrl('threads', {
          title: payload.title,
          text: payload.caption,
          url: payload.url,
        }) || undefined,
    };
  }

  const pubParams = new URLSearchParams({
    creation_id: createJson.id,
    access_token: token,
  });
  const pubRes = await fetch(`https://graph.threads.net/v1.0/${uid}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: pubParams.toString(),
  });
  const pubJson = await pubRes.json().catch(() => ({}));
  if (!pubRes.ok || !pubJson.id) {
    return {
      platform: 'threads',
      platformName: 'Threads',
      ok: false,
      message: pubJson.error?.message || 'Không thể xuất bản container Threads.',
    };
  }
  return {
    platform: 'threads',
    platformName: 'Threads',
    ok: true,
    message: 'Đã đăng thành công lên Threads qua Meta Threads API.',
  };
}

export async function publishToSocialPlatform(
  platform: SocialPlatformId,
  creds: SocialPlatformCredentials,
  payload: {
    title: string;
    excerpt: string;
    caption: string;
    url: string;
    cover?: string;
  }
): Promise<SocialPublishResult> {
  const fallbackShareUrl =
    buildOfficialShareIntentUrl(platform, {
      title: payload.title,
      text: payload.excerpt,
      url: payload.url,
    }) || undefined;

  if (!isPlatformConfigured(platform, creds)) {
    return {
      platform,
      platformName: SOCIAL_PLATFORM_LIST.find((p) => p.id === platform)?.name || platform,
      ok: false,
      message: 'Chưa nhập đủ thông tin API Token cho nền tảng này.',
      fallbackShareUrl,
    };
  }

  try {
    // Use Express backend proxy when available for server-only CORS APIs (LinkedIn, X API v2)
    if (platform === 'linkedin' || platform === 'x') {
      const hasBackend = await isBackendAvailable();
      if (!hasBackend) {
        return {
          platform,
          platformName: platform === 'linkedin' ? 'LinkedIn' : 'X (Twitter)',
          ok: false,
          message:
            'API của nền tảng này chặn gọi trực tiếp từ trình duyệt (CORS) khi chạy thuần GitHub Pages. Hãy bấm nút mở hộp thoại chia sẻ chính thức bên cạnh.',
          fallbackShareUrl,
        };
      }
      const res = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          credentials: creds[platform],
          payload,
        }),
      });
      const json = await res.json().catch(() => ({}));
      return {
        platform,
        platformName: platform === 'linkedin' ? 'LinkedIn' : 'X (Twitter)',
        ok: Boolean(res.ok && json.ok),
        postUrl: json.postUrl,
        message: json.message || (res.ok ? 'Đã đăng thành công.' : 'Lỗi khi gọi API.'),
        fallbackShareUrl,
      };
    }

    switch (platform) {
      case 'bluesky':
        return await publishDirectToBluesky(creds.bluesky!, payload);
      case 'mastodon':
        return await publishDirectToMastodon(creds.mastodon!, payload);
      case 'telegram':
        return await publishDirectToTelegram(creds.telegram!, payload);
      case 'discord':
        return await publishDirectToDiscord(creds.discord!, payload);
      case 'facebook':
        return await publishDirectToFacebook(creds.facebook!, payload);
      case 'threads':
        return await publishDirectToThreads(creds.threads!, payload);
    }
  } catch (err: any) {
    return {
      platform,
      platformName: SOCIAL_PLATFORM_LIST.find((p) => p.id === platform)?.name || platform,
      ok: false,
      message:
        err?.message ||
        'Không thể kết nối tới API nền tảng (kiểm tra mạng hoặc dùng nút chia sẻ chính thức).',
      fallbackShareUrl,
    };
  }
}
