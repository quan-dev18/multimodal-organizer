import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Trash2, 
  RefreshCw, 
  ShieldCheck
} from 'lucide-react';

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

export const DedicatedTempCleaner: React.FC = () => {
  const [zones, setZones] = useState<TempZone[]>([]);
  const [selectedZones, setSelectedZones] = useState<Set<string>>(
    new Set(["user_temp", "win_temp", "crash_dumps"])
  );
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [actionStatus, setActionStatus] = useState<string>("");
  const [lastResult, setLastResult] = useState<any>(null);

  const fetchTempStatus = async () => {
    setIsScanning(true);
    setActionStatus("Đang phân tích các vùng lưu trữ Temp & Cache hệ thống...");
    try {
      const res = await fetch(`${API_BASE}/system/temp_status`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setZones(data);
        const totalMb = data.reduce((acc, curr) => acc + curr.size_mb, 0);
        setActionStatus(`Đã quét xong: Phát hiện ${totalMb.toFixed(1)} MB rác bộ nhớ tạm có thể giải phóng.`);
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
    const s = new Set(selectedZones);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelectedZones(s);
  };

  const handleCleanSelected = async () => {
    if (selectedZones.size === 0) {
      alert("Vui lòng chọn ít nhất 1 vùng bộ nhớ tạm cần dọn!");
      return;
    }

    if (!confirm(`Xác nhận kích hoạt Công cụ MMO Temp Cleaner để dọn sạch ${selectedZones.size} vùng bộ nhớ tạm đã chọn?`)) {
      return;
    }

    setIsCleaning(true);
    setActionStatus("MMO Engine đang dọn sạch các vùng Temp và chạy kết hợp công cụ C:\\Tool\\TempCleaner.exe...");
    try {
      const res = await fetch(`${API_BASE}/system/clean_temp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones: Array.from(selectedZones) })
      });
      const data = await res.json();
      setLastResult(data);
      if (data.success) {
        setActionStatus(data.message);
        alert(data.message);
      } else {
        setActionStatus(data.message || "Lỗi dọn dẹp bộ nhớ tạm.");
      }
      fetchTempStatus();
    } catch (e: any) {
      setActionStatus(`Lỗi dọn dẹp: ${e.message}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const totalSelectedMb = zones
    .filter(z => selectedZones.has(z.id))
    .reduce((sum, z) => sum + z.size_mb, 0);

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-amber-400" />
            Công Cụ MMO System & App Temp Cleaner
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Chuyên dụng dọn sạch sâu bộ nhớ đệm, tệp tạm Windows (%TEMP%), Crash Dumps và liên kết C:\Tool\TempCleaner.exe
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTempStatus}
            disabled={isScanning || isCleaning}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-400' : ''}`} />
            Quét Lại
          </button>

          <button
            onClick={handleCleanSelected}
            disabled={isScanning || isCleaning || selectedZones.size === 0}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-950/50 disabled:opacity-50 transition-all font-mono"
          >
            <Trash2 className="w-4 h-4" />
            {isCleaning ? "Đang dọn dẹp..." : `Dọn Sạch Ngay (${totalSelectedMb.toFixed(1)} MB)`}
          </button>
        </div>
      </div>

      {/* Status banner */}
      {actionStatus && (
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 px-4 flex items-center justify-between text-xs font-mono">
          <span className="text-amber-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            {actionStatus}
          </span>
          {lastResult && (
            <span className="text-slate-400 text-[11px]">
              Tệp bị khóa bỏ qua an toàn: {lastResult.locked_skipped || 0}
            </span>
          )}
        </div>
      )}

      {/* Target Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {zones.map((z) => {
          const isChecked = selectedZones.has(z.id);
          return (
            <div
              key={z.id}
              onClick={() => toggleZone(z.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isChecked
                  ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-950/20'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleZone(z.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {z.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{z.description}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-amber-400">
                    {z.size_formatted}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {z.file_count} tệp
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500 truncate">
                <span className="truncate" title={z.path}>{z.path}</span>
                <span className="text-slate-400 shrink-0 ml-2">
                  {isChecked ? 'Đã chọn' : 'Bỏ qua'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safe protection notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400 font-mono">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-slate-200 font-semibold block mb-0.5">Bảo Vệ Tính Ổn Định Của Hệ Thống:</span>
          Công cụ MMO Temp Cleaner chỉ quét và xóa các tệp tạm vô hại không còn sử dụng. Bất kỳ tệp tạm nào đang được Windows hoặc các tiến trình game/ứng dụng mở khóa độc quyền sẽ được tự động giữ lại để tránh xung đột phần mềm. Đồng thời, liên kết trực tiếp với <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded">C:\Tool\TempCleaner.exe</code> để giải phóng dung lượng tối đa.
        </div>
      </div>
    </div>
  );
};
