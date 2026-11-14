import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';

export interface OllamaStatus {
  is_installed?: boolean;
  is_running?: boolean;
  installed_or_running?: boolean;
  version?: string;
  url?: string;
  executable_path?: string;
  download_url?: string;
  error_message?: string;
  models?: any[];
}

interface OllamaBannerProps {
  status: OllamaStatus | null;
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  apiBase?: string;
}

export const OllamaBanner: React.FC<OllamaBannerProps> = ({
  status,
  loading,
  onRefresh,
  apiBase = 'http://127.0.0.1:8001/api'
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [startMsg, setStartMsg] = useState<string | null>(null);

  const handleStartOllama = async () => {
    setIsStarting(true);
    setStartMsg('Đang gửi tín hiệu khởi động dịch vụ Ollama...');
    try {
      const res = await fetch(`${apiBase}/ollama/start`, { method: 'POST' });
      const data = await res.json();
      setStartMsg(data.message || 'Đã gửi yêu cầu khởi động');
      await onRefresh();
    } catch (e: any) {
      setStartMsg(`Lỗi khi khởi động: ${e.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleOpenInstall = async () => {
    try {
      await fetch(`${apiBase}/ollama/install`, { method: 'POST' });
    } catch {
      window.open('https://ollama.com/download', '_blank');
    }
  };

  if (!status) {
    return null;
  }

  // Case 1: Ollama is running normally
  if (status.is_running) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-200 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-emerald-300">Dịch vụ AI Ollama đang hoạt động</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px] font-mono border border-emerald-700/50">
              v{status.version || '0.40+'}
            </span>
            <span className="text-emerald-400/80 font-mono text-[11px]">
              • {status.models?.length || 0} mô hình đã sẵn sàng
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-emerald-400/80 text-[11px] font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>127.0.0.1:11434</span>
        </div>
      </div>
    );
  }

  // Case 2: Ollama is NOT installed
  if (!status.is_installed) {
    return (
      <div className="bg-gradient-to-r from-rose-950/90 via-red-950/70 to-zinc-950 border border-rose-600/80 rounded-xl p-4 shadow-xl text-rose-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-300">
        <div className="flex items-start gap-3.5 max-w-2xl">
          <div className="p-2.5 rounded-xl bg-rose-600/20 border border-rose-500/50 text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-600 text-white shadow-sm">
                BẮT BUỘC
              </span>
              <h3 className="font-semibold text-rose-100 text-sm">
                Chưa phát hiện Ollama trên máy tính!
              </h3>
            </div>
            <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
              MMO Desktop cần <strong>Ollama</strong> để vận hành các mô hình ngôn ngữ và thị giác (Qwen, Llama, BGE) cục bộ bảo mật, an toàn dữ liệu và hoàn toàn offline. Vui lòng cài đặt Ollama từ trang chủ (chỉ mất khoảng 1-2 phút).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <button
            onClick={handleOpenInstall}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-rose-950/60 cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Tải Ollama ngay (ollama.com)
            <ExternalLink className="w-3 h-3 opacity-80" />
          </button>

          <button
            onClick={() => onRefresh()}
            disabled={loading}
            className="px-3 py-2 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kiểm tra lại sau khi cài đặt"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
            Đã cài xong, Kiểm tra lại
          </button>
        </div>
      </div>
    );
  }

  // Case 3: Ollama is installed but NOT running or timed out
  return (
    <div className="bg-gradient-to-r from-amber-950/90 via-orange-950/70 to-zinc-950 border border-amber-600/80 rounded-xl p-4 shadow-xl text-amber-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-300">
      <div className="flex items-start gap-3.5 max-w-2xl">
        <div className="p-2.5 rounded-xl bg-amber-600/20 border border-amber-500/50 text-amber-400 shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500 text-black shadow-sm">
              CHƯA CHẠY / TIMEOUT
            </span>
            <h3 className="font-semibold text-amber-100 text-sm">
              Dịch vụ Ollama chưa bật hoặc bị quá thời gian chờ (Timeout)
            </h3>
          </div>
          <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
            Đã phát hiện Ollama tại: <code className="bg-black/40 px-1.5 py-0.5 rounded text-[11px] font-mono text-amber-300">{status.executable_path || "Hệ thống"}</code>.
            {status.error_message && (
              <span className="block mt-1 text-amber-300/80 italic font-mono text-[11px]">
                Chi tiết: {status.error_message}
              </span>
            )}
          </p>
          {startMsg && (
            <p className="text-[11px] text-lime-400 mt-1.5 font-mono animate-pulse">
              ● {startMsg}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
        <button
          onClick={handleStartOllama}
          disabled={isStarting}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-amber-950/60 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {isStarting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          {isStarting ? "Đang khởi động..." : "Tự động bật Ollama ngay"}
        </button>

        <button
          onClick={() => onRefresh()}
          disabled={loading || isStarting}
          className="px-3 py-2 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          Kiểm tra lại
        </button>

        <button
          onClick={handleOpenInstall}
          className="p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg text-xs transition-colors"
          title="Tải lại bộ cài đặt Ollama nếu bị lỗi"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
