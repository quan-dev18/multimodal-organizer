import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Trash2, 
  RefreshCw, 
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { sfx } from '../../lib/sounds';

const API_BASE = "http://127.0.0.1:8001/api";

interface TempZone {
  id: string;
  name: string;
  path: string;
  description: string;
  file_count: number;
  size_bytes: number;
  size_formatted: string;
  size_mb: number;
}

interface CleanProgress {
  current_zone: string;
  current_file: string;
  cleaned_count: number;
  total_items: number;
  freed_mb: number;
  locked_count: number;
  percent: number;
  elapsed: number;
  est_left: number;
}

export const DedicatedTempCleaner: React.FC = () => {
  const [zones, setZones] = useState<TempZone[]>([]);
  const [selectedZones, setSelectedZones] = useState<Set<string>>(
    new Set(["user_temp", "win_temp", "crash_dumps"])
  );
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [actionStatus, setActionStatus] = useState<string>("");
  const [lastResult, setLastResult] = useState<any>(null);
  const [cleanProgress, setCleanProgress] = useState<CleanProgress | null>(null);

  const fetchTempStatus = async () => {
    sfx.scan();
    setIsScanning(true);
    setActionStatus("Đang phân tích các vùng lưu trữ tạm hệ thống...");
    try {
      const res = await fetch(`${API_BASE}/system/temp_status`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setZones(data);
        const totalMb = data.reduce((acc, curr) => acc + curr.size_mb, 0);
        setActionStatus(`Đã quét xong: Phát hiện ${totalMb.toFixed(1)} MB rác bộ nhớ tạm.`);
      }
    } catch (e: any) {
      setActionStatus(`Lỗi quét: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchTempStatus();
  }, []);

  const toggleZone = (id: string) => {
    sfx.toggle();
    const s = new Set(selectedZones);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelectedZones(s);
  };

  const handleCleanSelected = async () => {
    if (selectedZones.size === 0) {
      alert("Vui lòng chọn ít nhất 1 vùng cần dọn dẹp!");
      return;
    }

    if (!confirm(`Xác nhận bắt đầu dọn dẹp ${selectedZones.size} vùng bộ nhớ tạm đã chọn?`)) {
      return;
    }

    sfx.delete();
    setIsCleaning(true);
    setCleanProgress({
      current_zone: "Khởi động tiến trình...",
      current_file: "",
      cleaned_count: 0,
      total_items: zones.filter(z => selectedZones.has(z.id)).reduce((a, b) => a + b.file_count, 0) || 100,
      freed_mb: 0,
      locked_count: 0,
      percent: 0,
      elapsed: 0,
      est_left: 5
    });
    setActionStatus("Đang thực hiện dọn dẹp theo thời gian thực...");

    try {
      const res = await fetch(`${API_BASE}/system/clean_temp_stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones: Array.from(selectedZones) })
      });

      if (!res.body) throw new Error("Không thể kết nối đến stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let partialBuffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partialBuffer += decoder.decode(value, { stream: true });
        const lines = partialBuffer.split('\n');
        partialBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line.trim());
            if (data.type === 'progress') {
              setCleanProgress(data);
            } else if (data.type === 'completed' || data.status === 'completed' || data.cleaned_count !== undefined) {
              sfx.complete();
              setLastResult(data);
              setActionStatus(data.message);
              setCleanProgress(null);
            }
          } catch {}
        }
      }

      fetchTempStatus();
    } catch (e: any) {
      // Fallback to legacy endpoint if stream fails
      try {
        const res = await fetch(`${API_BASE}/system/clean_temp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zones: Array.from(selectedZones) })
        });
        const data = await res.json();
        setLastResult(data);
        setActionStatus(data.message);
        fetchTempStatus();
      } catch (err: any) {
        setActionStatus(`Lỗi dọn dẹp: ${err.message}`);
      }
    } finally {
      setIsCleaning(false);
      setCleanProgress(null);
    }
  };

  const totalSelectedMb = zones
    .filter(z => selectedZones.has(z.id))
    .reduce((sum, z) => sum + z.size_mb, 0);

  const totalSelectedFiles = zones
    .filter(z => selectedZones.has(z.id))
    .reduce((sum, z) => sum + z.file_count, 0);

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Dọn dẹp bộ nhớ tạm & Cache hệ thống
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Giải phóng không gian đĩa bằng cách xóa an toàn các tệp tạm Windows (%TEMP%), tệp rác ứng dụng và crash dump
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTempStatus}
            disabled={isScanning || isCleaning}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl text-xs flex items-center gap-2 border border-zinc-800 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-400' : ''}`} />
            Quét lại
          </button>

          <button
            onClick={handleCleanSelected}
            disabled={isScanning || isCleaning || selectedZones.size === 0}
            className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-medium rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            {isCleaning ? "Đang xử lý..." : `Dọn sạch ngay (${totalSelectedMb.toFixed(1)} MB)`}
          </button>
        </div>
      </div>

      {/* Real-time Cleanup Progress Bar */}
      {isCleaning && cleanProgress && (
        <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-5 space-y-3.5 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="font-semibold text-zinc-100">
                Đang dọn dẹp: <span className="text-amber-400 font-mono">{cleanProgress.current_zone}</span>
              </span>
              <span className="text-zinc-500 font-mono">
                ({cleanProgress.cleaned_count}/{cleanProgress.total_items} mục)
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <span className="text-emerald-400 font-mono font-medium">
                Đã giải phóng: {cleanProgress.freed_mb} MB
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Thời gian: <span className="text-zinc-200 font-mono">{cleanProgress.elapsed}s</span>
              </span>
              <span>
                Ước tính: <span className="text-amber-400 font-mono">~{cleanProgress.est_left}s</span>
              </span>
            </div>
          </div>

          {/* Smooth animated progress line */}
          <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 rounded-full transition-all duration-200"
              style={{ width: `${Math.max(cleanProgress.percent, 3)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span className="truncate max-w-lg">
              Tệp: {cleanProgress.current_file || "Đang xử lý các tệp con..."}
            </span>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <span className="text-zinc-500">Khóa bỏ qua: {cleanProgress.locked_count}</span>
              <span className="font-bold text-amber-400 text-sm">{cleanProgress.percent}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Status banner */}
      {actionStatus && !isCleaning && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 px-4 flex items-center justify-between text-xs">
          <span className="text-zinc-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            {actionStatus}
          </span>
          {lastResult && (
            <span className="text-zinc-500 text-xs font-mono">
              Đã bỏ qua an toàn {lastResult.locked_skipped || 0} tệp đang chạy
            </span>
          )}
        </div>
      )}

      {/* Target Zones Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span>Chọn các phân vùng rác hệ thống cần dọn:</span>
          <span>Đã chọn: <b className="text-zinc-200">{selectedZones.size}</b> vùng ({totalSelectedFiles.toLocaleString()} tệp)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {zones.map((z) => {
            const isChecked = selectedZones.has(z.id);
            return (
              <div
                key={z.id}
                onClick={() => toggleZone(z.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isChecked
                    ? 'bg-zinc-900/90 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleZone(z.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4.5 h-4.5 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                        {z.name}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{z.description}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <div className="text-sm font-mono font-bold text-amber-400">
                      {z.size_formatted}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5">
                      {z.file_count.toLocaleString()} tệp
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 font-mono">
                  <span className="truncate max-w-xs" title={z.path}>{z.path}</span>
                  <span className={`shrink-0 ml-2 ${isChecked ? 'text-amber-400 font-sans' : 'text-zinc-600 font-sans'}`}>
                    {isChecked ? '✓ Đã chọn' : 'Bỏ qua'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Safe protection notice */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex items-start gap-3.5 text-xs text-zinc-400">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="text-zinc-200 font-medium block">Cơ chế an toàn 100% không làm hỏng Windows hay Game:</span>
          <p className="leading-relaxed">
            MMO Temp Cleaner chỉ quét và xóa các tệp đệm vô hại. Mọi tệp đang được Windows, trình duyệt hoặc tiến trình game mở khóa độc quyền sẽ được tự động bỏ qua an toàn để tránh mọi xung đột phần mềm.
          </p>
        </div>
      </div>
    </div>
  );
};