import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { BlogConfig, BlogTheme, RepoStructureInfo } from '../types/blog';
import {
  formatBytes,
  prepareImageForUpload,
  uploadImagesBatchToGitHub,
  type ImageBatchFormat,
  type PreparedImageFile,
  type UploadedImageResult,
} from '../utils/imageUpload';

export type BatchInsertLayout = 'vertical' | 'grid';

interface QueuedBatchItem {
  id: string;
  file: File;
  altText: string;
  prepared: PreparedImageFile | null;
  processing: boolean;
  error?: string;
}

interface ImageBatchModalProps {
  isOpen: boolean;
  initialFiles?: File[];
  theme: BlogTheme;
  config: BlogConfig;
  repoStructure?: RepoStructureInfo | null;
  isAstroRepo?: boolean;
  authenticated: boolean;
  onClose: () => void;
  onUploadedAndInsert: (params: {
    uploaded: UploadedImageResult[];
    altTexts: string[];
    layout: BatchInsertLayout;
    setFirstAsCover: boolean;
    commitUrl?: string;
  }) => void;
}

const PRESETS: Array<{
  id: string;
  label: string;
  maxWidth: number;
  quality: number;
  format: ImageBatchFormat;
}> = [
  { id: 'webp-1600', label: 'WebP 1600px (Chuẩn SEO)', maxWidth: 1600, quality: 0.84, format: 'webp' },
  { id: 'webp-1200', label: 'WebP 1200px (Siêu nhẹ)', maxWidth: 1200, quality: 0.8, format: 'webp' },
  { id: 'jpeg-1600', label: 'JPEG 1600px (Tương thích)', maxWidth: 1600, quality: 0.85, format: 'jpeg' },
  { id: 'original', label: 'Giữ nguyên file gốc', maxWidth: 0, quality: 1, format: 'original' },
];

export function ImageBatchModal({
  isOpen,
  initialFiles = [],
  theme,
  config,
  repoStructure = null,
  isAstroRepo = true,
  authenticated,
  onClose,
  onUploadedAndInsert,
}: ImageBatchModalProps) {
  const { palette, fonts } = theme;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [presetId, setPresetId] = useState<string>('webp-1600');
  const [items, setItems] = useState<QueuedBatchItem[]>([]);
  const [layout, setLayout] = useState<BatchInsertLayout>('vertical');
  const [setFirstAsCover, setSetFirstAsCover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const activePreset = useMemo(
    () => PRESETS.find((p) => p.id === presetId) || PRESETS[0],
    [presetId]
  );

  const addFiles = (files: File[]) => {
    const valid = files.filter((f) => f.type.startsWith('image/')).slice(0, 20);
    if (valid.length === 0) return;

    const newItems: QueuedBatchItem[] = valid.map((file, idx) => {
      const cleanAlt =
        file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .trim() || `Hình ảnh ${items.length + idx + 1}`;
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${idx}`,
        file,
        altText: cleanAlt,
        prepared: null,
        processing: true,
      };
    });

    setItems((prev) => [...prev, ...newItems].slice(0, 20));
    setUploadError(null);
  };

  // Seed files when dropped onto editor
  useEffect(() => {
    if (isOpen && initialFiles.length > 0) {
      addFiles(initialFiles);
    }
  }, [isOpen, initialFiles]);

  // Process / re-compress items whenever queue items lack `prepared` or preset changes
  useEffect(() => {
    let cancelled = false;
    const pending = items.filter((item) => item.processing && !item.prepared && !item.error);
    if (pending.length === 0) return;

    (async () => {
      for (const item of pending) {
        if (cancelled) break;
        try {
          const prepared = await prepareImageForUpload(item.file, {
            maxWidth: activePreset.maxWidth,
            quality: activePreset.quality,
            format: activePreset.format,
          });
          if (!cancelled) {
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, prepared, processing: false } : it
              )
            );
          }
        } catch {
          if (!cancelled) {
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id
                  ? { ...it, processing: false, error: 'Không đọc được ảnh này' }
                  : it
              )
            );
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items, activePreset]);

  const handleChangePreset = (nextId: string) => {
    setPresetId(nextId);
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        prepared: null,
        processing: true,
        error: undefined,
      }))
    );
  };

  const totals = useMemo(() => {
    let orig = 0;
    let comp = 0;
    for (const item of items) {
      orig += item.file.size;
      comp += item.prepared ? item.prepared.compressedSize : item.file.size;
    }
    const savedPct = orig > 0 ? Math.max(0, Math.round(((orig - comp) / orig) * 100)) : 0;
    return { orig, comp, savedPct };
  }, [items]);

  const readyItems = items.filter((it) => it.prepared && !it.error);
  const anyProcessing = items.some((it) => it.processing);

  const handleUploadAll = async () => {
    if (readyItems.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const response = await uploadImagesBatchToGitHub({
        items: readyItems.map((it) => ({
          filename: it.prepared!.filename,
          base64Data: it.prepared!.base64Data,
          localDataUrl: it.prepared!.localDataUrl,
        })),
        owner: config.githubOwner,
        repo: config.githubRepo,
        isAstroRepo,
        uploadDir: repoStructure?.uploadDir,
        publicUploadPrefix: repoStructure?.publicUploadPrefix,
      });

      onUploadedAndInsert({
        uploaded: response.results,
        altTexts: readyItems.map((it) => it.altText || 'Hình ảnh'),
        layout,
        setFirstAsCover,
        commitUrl: response.commitUrl,
      });
      setItems([]);
      onClose();
    } catch (err: any) {
      setUploadError(err?.message || 'Không thể tải loạt ảnh lên GitHub.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
      <div
        style={{
          backgroundColor: palette.surfaceElevated,
          borderColor: palette.border,
          color: palette.textPrimary,
          fontFamily: fonts.body,
        }}
        className="w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl border p-5 sm:p-6 shadow-xl flex flex-col max-h-[92vh]"
      >
        <div className="sm:hidden w-10 h-1.5 rounded-full bg-zinc-400/40 mx-auto -mt-1 mb-3" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b" style={{ borderColor: palette.border }}>
          <div>
            <h2 style={{ fontFamily: fonts.display }} className="text-xl font-bold flex items-center gap-2">
              <ImagePlus className="w-5 h-5" style={{ color: palette.link }} />
              Tải &amp; Nén ảnh hàng loạt (Image Batch)
            </h2>
            <p style={{ color: palette.textMuted }} className="text-xs mt-1">
              Tối ưu dung lượng WebP/JPEG trên trình duyệt và đẩy tối đa 20 ảnh vào{' '}
              <code>{repoStructure?.uploadDir || 'assets/uploads'}</code> chỉ trong 1 commit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-black/5 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls & Drop Zone */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(Array.from(e.target.files));
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer?.files) {
                addFiles(Array.from(e.dataTransfer.files));
              }
            }}
            style={{
              borderColor: isDragging ? palette.link : palette.border,
              backgroundColor: palette.canvas,
            }}
            className="p-4 sm:p-5 rounded-xl border border-dashed text-center space-y-2.5 transition-colors"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  backgroundColor: palette.accent,
                  color: palette.accentText,
                }}
                className="inline-flex items-center gap-2 px-4 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl cursor-pointer hover:opacity-90"
              >
                <Upload className="w-4 h-4" />
                Chọn nhiều ảnh từ máy
              </button>
              <span style={{ color: palette.textMuted }} className="text-xs">
                hoặc kéo thả nhiều ảnh vào khung này (tối đa 20 ảnh/lần)
              </span>
            </div>
          </div>

          {/* Compression Preset & Layout Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label style={{ color: palette.textMuted }} className="block text-xs font-medium mb-1.5">
                Chuẩn nén &amp; kích thước ảnh
              </label>
              <select
                value={presetId}
                onChange={(e) => handleChangePreset(e.target.value)}
                style={{
                  backgroundColor: palette.canvas,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                }}
                className="w-full px-3 min-h-[44px] sm:min-h-[40px] text-xs rounded-xl border"
              >
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ color: palette.textMuted }} className="block text-xs font-medium mb-1.5">
                Kiểu chèn vào bài viết Markdown
              </label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as BatchInsertLayout)}
                style={{
                  backgroundColor: palette.canvas,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                }}
                className="w-full px-3 min-h-[44px] sm:min-h-[40px] text-xs rounded-xl border"
              >
                <option value="vertical">Danh sách ảnh dọc (Markdown chuẩn)</option>
                <option value="grid">Lưới thư viện ảnh 2 cột (HTML Responsive)</option>
              </select>
            </div>
          </div>

          {/* Queue Summary */}
          {items.length > 0 && (
            <div
              style={{
                borderColor: palette.border,
                backgroundColor: palette.surface,
                fontFamily: fonts.mono,
              }}
              className="px-3.5 py-2.5 rounded-xl border text-xs tabular-nums flex flex-wrap items-center justify-between gap-2"
            >
              <span>
                {items.length} ảnh · Gốc {formatBytes(totals.orig)} → Sau nén{' '}
                <strong style={{ color: palette.link }}>{formatBytes(totals.comp)}</strong>
                {totals.savedPct > 0 && ` (-${totals.savedPct}%)`}
              </span>
              <button
                type="button"
                onClick={() => setItems([])}
                style={{ color: palette.textMuted }}
                className="hover:text-red-500 cursor-pointer underline underline-offset-4"
              >
                Xoá danh sách
              </button>
            </div>
          )}

          {/* Queue Items Grid */}
          {items.length > 0 && (
            <div className="space-y-2.5">
              {items.map((item, index) => {
                const origBytes = item.file.size;
                const compBytes = item.prepared?.compressedSize ?? origBytes;
                const pct =
                  origBytes > compBytes
                    ? Math.round(((origBytes - compBytes) / origBytes) * 100)
                    : 0;
                return (
                  <div
                    key={item.id}
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.canvas,
                    }}
                    className="p-3 rounded-xl border flex items-center gap-3"
                  >
                    <div
                      style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                      className="w-14 h-14 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center"
                    >
                      {item.prepared?.localDataUrl ? (
                        <img
                          src={item.prepared.localDataUrl}
                          alt={item.altText}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: palette.textMuted }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div
                        style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                        className="text-[11px] flex flex-wrap items-center gap-1.5 truncate"
                      >
                        <span className="truncate font-medium" style={{ color: palette.textPrimary }}>
                          #{index + 1} {item.prepared?.filename || item.file.name}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatBytes(compBytes)}</span>
                        {pct > 0 && <span style={{ color: palette.link }}>(-{pct}%)</span>}
                        {item.prepared && item.prepared.width > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              {item.prepared.width}×{item.prepared.height}
                            </span>
                          </>
                        )}
                      </div>

                      <input
                        type="text"
                        value={item.altText}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it) =>
                              it.id === item.id ? { ...it, altText: e.target.value } : it
                            )
                          )
                        }
                        placeholder="Mô tả Alt ảnh (tối ưu SEO Google Images)..."
                        style={{
                          backgroundColor: palette.surfaceElevated,
                          borderColor: palette.border,
                          color: palette.textPrimary,
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((it) => it.id !== item.id))}
                      aria-label={`Xoá ${item.file.name}`}
                      style={{ color: palette.textMuted }}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:text-red-500 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
              {uploadError}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{ borderColor: palette.border }}
          className="pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none min-h-[36px]">
            <input
              type="checkbox"
              checked={setFirstAsCover}
              onChange={(e) => setSetFirstAsCover(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span style={{ color: palette.textSecondary }}>
              Đặt ảnh #1 làm Ảnh bìa (og:image)
            </span>
          </label>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              style={{
                borderColor: palette.border,
                color: palette.textSecondary,
              }}
              className="px-4 min-h-[44px] text-xs sm:text-sm font-medium rounded-xl border cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleUploadAll}
              disabled={isUploading || anyProcessing || readyItems.length === 0 || !authenticated}
              style={{
                backgroundColor: palette.accent,
                color: palette.accentText,
              }}
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl cursor-pointer disabled:opacity-45 whitespace-nowrap"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang commit {readyItems.length} ảnh...
                </>
              ) : anyProcessing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Đang nén ảnh...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Tải {readyItems.length > 0 ? `${readyItems.length} ` : ''}ảnh &amp; Chèn vào bài
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
