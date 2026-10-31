import { useState } from 'react';
import { Gauge, Play } from 'lucide-react';

interface BenchmarkCardProps {
  selectedModelTag: string;
  isInstalled: boolean;
  onRunBenchmark: (modelTag: string) => Promise<any>;
}

export const BenchmarkCard = ({
  selectedModelTag,
  isInstalled,
  onRunBenchmark
}: BenchmarkCardProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const data = await onRunBenchmark(selectedModelTag);
      setResult(data);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-amber-400" />
          <h4 className="text-sm font-semibold text-slate-100">
            Kiểm Tra Tính Hiệu Quả & Tốc Độ Thực Tế (Benchmark trên máy)
          </h4>
        </div>

        <button
          onClick={handleRun}
          disabled={!isInstalled || isRunning}
          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-950/30"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {isRunning ? "Đang chạy test..." : "Chạy Thử Nghiệm"}
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Hệ thống sẽ gửi mẫu tệp tin đa phương thức để đo tốc độ sinh token/giây (tok/s), mức tiêu thụ tài nguyên và thời gian trích xuất metadata thực tế trên card GTX 1650.
      </p>

      {/* Result Metrics */}
      {result && result.success && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 font-mono text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800/80 text-center">
              <span className="text-slate-400 block text-[11px]">TỐC ĐỘ XỬ LÝ</span>
              <span className="text-lime-400 text-base font-bold">{result.tokens_per_sec} tok/s</span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800/80 text-center">
              <span className="text-slate-400 block text-[11px]">THỜI GIAN PHẢN HỒI</span>
              <span className="text-amber-400 text-base font-bold">{result.total_time_sec}s</span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800/80 text-center">
              <span className="text-slate-400 block text-[11px]">ĐÁNH GIÁ ĐỘ MƯỢT</span>
              <span className="text-sky-400 text-base font-bold">{result.speed_rating}</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded border border-slate-800 text-slate-300">
            <span className="text-slate-400 block font-sans text-xs font-semibold mb-1">Kết quả phân loại mẫu:</span>
            <p className="font-mono text-xs text-slate-200 line-clamp-3">{result.response}</p>
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="bg-rose-950/40 border border-rose-800/50 rounded-lg p-3 text-xs text-rose-300">
          ❌ {result.message || result.error}
        </div>
      )}

      {!isInstalled && (
        <div className="text-xs text-slate-500 italic bg-slate-950/50 p-2.5 rounded border border-slate-800/50 text-center">
          💡 Vui lòng bấm <b>"Tải về"</b> mô hình ở trên trước khi chạy thử nghiệm hiệu năng.
        </div>
      )}
    </div>
  );
};
