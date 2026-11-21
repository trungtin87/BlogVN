import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isFirestorePermissionError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isFirestorePermissionError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'Đã xảy ra lỗi không xác định.';
    let isPerm = false;
    let readable = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string' && parsed.operationType) {
        isPerm = parsed.error.toLowerCase().includes('permission');
        readable = `${parsed.error} (${parsed.operationType}: ${parsed.path || 'unknown'})`;
      }
    } catch {
      isPerm = raw.toLowerCase().includes('insufficient permissions');
    }
    return {
      hasError: true,
      errorMessage: readable,
      isFirestorePermissionError: isPerm,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ hasError: false, errorMessage: '', isFirestorePermissionError: false });
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#141414] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-[#E6E4DD] rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-xl font-bold text-[#141414]">
                {this.state.isFirestorePermissionError
                  ? 'Không đủ quyền truy cập Cloud Firestore'
                  : 'Ứng dụng gặp sự cố hiển thị'}
              </h1>
              <p className="mt-2 text-sm text-[#57534E] leading-relaxed">
                {this.state.isFirestorePermissionError
                  ? 'Tài khoản hiện tại chưa được cấp quyền hoặc email chưa xác thực để thao tác dữ liệu này.'
                  : 'Đã có lỗi xảy ra trong phiên làm việc. Dữ liệu nháp cục bộ của bạn vẫn được giữ an toàn.'}
              </p>
              <div className="mt-3 p-3 rounded-lg bg-[#F4F3EE] border border-[#E6E4DD] font-mono text-xs text-[#44403C] break-all">
                {this.state.errorMessage}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-[#141414] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Tải lại ứng dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
