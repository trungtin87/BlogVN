import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { MediaAssetItem } from '../types/blog';
import { ghDeleteMediaAsset, ghListMediaAssets } from '../utils/githubClient';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  branch: string;
  isDark: boolean;
  onInsertMarkdown?: (markdownSnippet: string, item: MediaAssetItem) => void;
  onSelectCover?: (publicPath: string, item: MediaAssetItem) => void;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  owner,
  repo,
  branch,
  isDark,
  onInsertMarkdown,
  onSelectCover,
}) => {
  const [items, setItems] = useState<MediaAssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  const loadAssets = async () => {
    if (!owner?.trim() || !repo?.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await ghListMediaAssets(owner, repo, branch);
    if (!res.ok && res.error) {
      setError(res.error);
    }
    setItems(res.items || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      void loadAssets();
    }
  }, [isOpen, owner, repo, branch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.publicPath.toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPath(id);
      window.setTimeout(() => setCopiedPath(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDelete = async (item: MediaAssetItem) => {
    setDeletingPath(item.path);
    setError(null);
    const res = await ghDeleteMediaAsset({
      owner,
      repo,
      branch,
      filePath: item.path,
      sha: item.sha,
    });
    setDeletingPath(null);
    if (!res.ok) {
      setError(res.error || 'Không thể xoá ảnh trên GitHub.');
      return;
    }
    setItems((prev) => prev.filter((x) => x.path !== item.path));
  };

  if (!isOpen) return null;

  const surface = isDark
    ? 'bg-[#171717] text-[#EDEDEB] border-[#2C2C2A]'
    : 'bg-[#FFFFFF] text-[#141414] border-[#E6E4DD]';
  const muted = isDark ? 'text-[#9A9A96]' : 'text-[#6B6A65]';
  const subtleBg = isDark ? 'bg-[#1F1F1D] border-[#2C2C2A]' : 'bg-[#F6F5F0] border-[#E6E4DD]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Thư viện Media Repository"
    >
      <div
        className={`w-full max-w-4xl max-h-[88vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${surface}`}
      >
        <div className={`px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-3 ${isDark ? 'border-[#2C2C2A]' : 'border-[#E6E4DD]'}`}>
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-bold truncate flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>Thư viện Media Repository</span>
            </h2>
            <p className={`text-xs mt-0.5 truncate ${muted}`}>
              {owner && repo
                ? `${owner}/${repo} (${items.length} tệp ảnh)`
                : 'Chưa kết nối repository GitHub'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void loadAssets()}
              disabled={loading || !owner || !repo}
              className={`min-h-[44px] min-w-[44px] px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${subtleBg}`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng thư viện ảnh"
              className={`min-h-[44px] min-w-[44px] rounded-lg border inline-flex items-center justify-center cursor-pointer ${subtleBg}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className={`px-4 sm:px-6 py-3 border-b ${isDark ? 'border-[#2C2C2A]' : 'border-[#E6E4DD]'}`}>
          <div className="relative">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên ảnh hoặc đường dẫn..."
              className={`w-full pl-9 pr-3 py-2.5 min-h-[44px] rounded-lg border text-sm outline-none ${subtleBg}`}
            />
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-500">{error}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <p className={`text-sm ${muted}`}>Đang quét ảnh trên kho lưu trữ GitHub...</p>
            </div>
          ) : !owner || !repo ? (
            <div className={`py-14 text-center text-sm ${muted}`}>
              Hãy kết nối repository GitHub ở mục Cấu hình trước khi duyệt thư viện ảnh.
            </div>
          ) : filtered.length === 0 ? (
            <div className={`py-14 text-center text-sm ${muted}`}>
              Không tìm thấy ảnh nào trong thư mục tải lên của repository.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => {
                const kb = item.size > 0 ? `${Math.max(1, Math.round(item.size / 1024))} KB` : '—';
                const mdSnippet = `![${item.name.replace(/\.[^.]+$/, '')}](${item.publicPath})`;
                return (
                  <div
                    key={item.path}
                    className={`rounded-xl border overflow-hidden flex flex-col ${subtleBg}`}
                  >
                    <div className="aspect-[16/10] bg-black/10 relative overflow-hidden">
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate" title={item.name}>
                          {item.name}
                        </div>
                        <div className={`text-[11px] truncate mt-0.5 font-mono ${muted}`} title={item.publicPath}>
                          {item.publicPath} · {kb}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {onInsertMarkdown && (
                          <button
                            type="button"
                            onClick={() => {
                              onInsertMarkdown(mdSnippet, item);
                              onClose();
                            }}
                            className="flex-1 min-h-[38px] px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium whitespace-nowrap cursor-pointer"
                          >
                            Chèn vào bài
                          </button>
                        )}
                        {onSelectCover && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCover(item.publicPath, item);
                              onClose();
                            }}
                            className={`flex-1 min-h-[38px] px-2.5 rounded-lg border text-xs font-medium whitespace-nowrap cursor-pointer ${isDark ? 'border-[#333] hover:bg-[#2A2A27]' : 'border-[#D5D3CA] hover:bg-white'}`}
                          >
                            Đặt ảnh bìa
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleCopy(item.publicPath, item.path)}
                          title="Sao chép đường dẫn"
                          className={`min-h-[38px] min-w-[38px] px-2 rounded-lg border inline-flex items-center justify-center cursor-pointer ${isDark ? 'border-[#333] hover:bg-[#2A2A27]' : 'border-[#D5D3CA] hover:bg-white'}`}
                        >
                          {copiedPath === item.path ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          disabled={deletingPath === item.path}
                          title="Xoá ảnh khỏi repository"
                          className="min-h-[38px] min-w-[38px] px-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                        >
                          {deletingPath === item.path ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
