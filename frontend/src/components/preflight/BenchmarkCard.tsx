import { useState } from 'react';
import { Play, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

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
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <h4 className="text-sm font-semibold text-zinc-100">
            Thử nghiệm tốc độ thực tế (Benchmark)
          </h4>
        </div>

        <button
          onClick={handleRun}
          disabled={!isInstalled || isRunning}
          className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-lg text-xs flex items-center gap-1.5 transition-all border border-zinc-700/80 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              Đang đo tốc độ...
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current text-indigo-400" />
              Chạy kiểm tra
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
        Gửi yêu cầu mẫu để đo tốc độ sinh token/giây (tok/s) và độ trễ phản hồi thực tế của mô hình <span className="font-mono text-zinc-300 font-medium">{selectedModelTag}</span> trên card đồ họa của bạn.
      </p>

      {/* Result Metrics */}
      {result && result.success && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 text-center">
              <span className="text-zinc-400 block text-xs">Tốc độ sinh text</span>
              <span className="text-indigo-400 text-base font-semibold font-mono mt-0.5 block">{result.tokens_per_sec} tok/s</span>
            </div>
            <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 text-center">
              <span className="text-zinc-400 block text-xs">Thời gian xử lý</span>
              <span className="text-zinc-200 text-base font-semibold font-mono mt-0.5 block">{result.total_time_sec}s</span>
            </div>
            <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 text-center">
              <span className="text-zinc-400 block text-xs">Mức độ mượt</span>
              <span className="text-emerald-400 text-base font-semibold mt-0.5 block">{result.speed_rating}</span>
            </div>
          </div>

          <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80 text-zinc-300">
            <span className="text-zinc-400 block text-xs font-medium mb-1">Kết quả phân tích mẫu:</span>
            <p className="text-xs text-zinc-300 leading-relaxed font-mono line-clamp-3">{result.response}</p>
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{result.message || result.error}</span>
        </div>
      )}

      {!isInstalled && (
        <div className="text-xs text-zinc-400 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/60 text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>Vui lòng tải mô hình về trước khi bắt đầu thử nghiệm hiệu năng.</span>
        </div>
      )}
    </div>
  );
};