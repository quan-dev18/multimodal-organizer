import React, { useState, useEffect } from 'react';
import {
  Zap,
  Play,
  Download,
  Clock,
  Cpu,
  HardDrive,
  BarChart2,
  Award,
  Layers
} from 'lucide-react';
import { sfx } from '../../lib/sounds';

const API_BASE = "http://127.0.0.1:8001/api";

interface BenchmarkResult {
  model: string;
  task: string;
  tokens_per_sec: number;
  total_time_sec: number;
  ttft_ms: number;
  eval_tokens: number;
  speed_rating: string;
  response: string;
  hardware_assessment: string;
  timestamp: string;
}

export const BenchmarkDashboardView: React.FC = () => {
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('qwen2.5:1.5b');
  const [selectedTask, setSelectedTask] = useState<string>('classify');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hardware, setHardware] = useState<any>(null);
  const [resultsHistory, setResultsHistory] = useState<BenchmarkResult[]>(() => {
    try {
      const saved = localStorage.getItem('mmo_benchmark_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [activeTab, setActiveTab] = useState<'run' | 'charts' | 'export'>('run');

  useEffect(() => {
    // 1. Fetch installed models
    fetch(`${API_BASE}/ollama/status`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.installed_models) && data.installed_models.length > 0) {
          setInstalledModels(data.installed_models);
          if (!selectedModel || !data.installed_models.includes(selectedModel)) {
            setSelectedModel(data.installed_models[0]);
          }
        }
      })
      .catch(() => {});

    // 2. Fetch hardware specs
    fetch(`${API_BASE}/hardware`)
      .then(r => r.json())
      .then(data => {
        if (data) setHardware(data);
      })
      .catch(() => {});
  }, []);

  const saveHistory = (newHistory: BenchmarkResult[]) => {
    setResultsHistory(newHistory);
    try {
      localStorage.setItem('mmo_benchmark_history', JSON.stringify(newHistory));
    } catch {}
  };

  const handleRunBenchmark = async () => {
    if (isRunning) return;
    setIsRunning(true);
    sfx.click();

    try {
      const res = await fetch(`${API_BASE}/models/benchmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: selectedModel,
          task_type: selectedTask
        })
      });

      const data = await res.json();
      if (data && data.success) {
        const item: BenchmarkResult = {
          model: data.model,
          task: data.task || selectedTask,
          tokens_per_sec: data.tokens_per_sec,
          total_time_sec: data.total_time_sec,
          ttft_ms: data.ttft_ms,
          eval_tokens: data.eval_tokens || 0,
          speed_rating: data.speed_rating,
          response: data.response,
          hardware_assessment: data.hardware_assessment,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        const updated = [item, ...resultsHistory];
        saveHistory(updated);
        sfx.success();
      } else {
        alert(data.error || "Không thể đo lường mô hình. Hãy kiểm tra Ollama.");
        sfx.error();
      }
    } catch (e: any) {
      alert("Lỗi kết nối tới máy chủ đo kiểm: " + e.message);
      sfx.error();
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Xóa toàn bộ lịch sử đo kiểm hiệu năng?")) {
      saveHistory([]);
      sfx.click();
    }
  };

  // Group stats by model to compute averages
  const modelStats: Record<string, { count: number; avgSpeed: number; avgTime: number; avgTtft: number }> = {};
  resultsHistory.forEach(r => {
    if (!modelStats[r.model]) {
      modelStats[r.model] = { count: 0, avgSpeed: 0, avgTime: 0, avgTtft: 0 };
    }
    const stat = modelStats[r.model];
    stat.count += 1;
    stat.avgSpeed += r.tokens_per_sec;
    stat.avgTime += r.total_time_sec;
    stat.avgTtft += r.ttft_ms;
  });

  Object.keys(modelStats).forEach(k => {
    const s = modelStats[k];
    s.avgSpeed = Math.round((s.avgSpeed / s.count) * 10) / 10;
    s.avgTime = Math.round((s.avgTime / s.count) * 100) / 100;
    s.avgTtft = Math.round((s.avgTtft / s.count) * 10) / 10;
  });

  const maxSpeed = Math.max(...Object.values(modelStats).map(s => s.avgSpeed), 40);
  const maxTime = Math.max(...Object.values(modelStats).map(s => s.avgTime), 5);

  const handleExportHtmlReport = () => {
    sfx.click();
    const rows = resultsHistory.map(r => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #27272a;"><strong>${r.model}</strong></td>
        <td style="padding:10px; border-bottom:1px solid #27272a;">${r.task}</td>
        <td style="padding:10px; border-bottom:1px solid #27272a; color:#818cf8; font-weight:bold;">${r.tokens_per_sec} tok/s</td>
        <td style="padding:10px; border-bottom:1px solid #27272a;">${r.total_time_sec} s</td>
        <td style="padding:10px; border-bottom:1px solid #27272a;">${r.ttft_ms} ms</td>
        <td style="padding:10px; border-bottom:1px solid #27272a; color:#34d399;">${r.speed_rating}</td>
        <td style="padding:10px; border-bottom:1px solid #27272a;">${r.timestamp}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>MMO Laptop AI Benchmark Report</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #f4f4f5; padding: 30px; margin: 0; }
          .container { max-width: 900px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 24px; }
          h1 { color: #818cf8; margin-top: 0; }
          .badge { background: #312e81; color: #c7d2fe; padding: 4px 10px; border-radius: 8px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th { text-align: left; padding: 12px; background: #27272a; color: #a1a1aa; }
          .card { background: #09090b; padding: 16px; border-radius: 12px; border: 1px solid #27272a; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Báo Cáo Hiệu Năng AI Cục Bộ - MMO Desktop</h1>
          <p>Thiết bị đo: <strong>${hardware?.gpu?.name || 'Laptop Local Hardware'}</strong> | RAM: <strong>${hardware?.ram?.total_gb || '--'} GB</strong> | CPU: <strong>${hardware?.cpu?.cores || '--'} Cores</strong></p>
          <div class="card">
            <h3>Tổng Hợp Kết Quả Đo Kiểm Thực Tế</h3>
            <table>
              <thead>
                <tr>
                  <th>Mô hình</th>
                  <th>Tác vụ</th>
                  <th>Tốc độ</th>
                  <th>Thời gian</th>
                  <th>Độ trễ TTFT</th>
                  <th>Đánh giá</th>
                  <th>Thời gian đo</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="7" style="text-align:center; padding:20px;">Chưa có dữ liệu đo kiểm</td></tr>'}
              </tbody>
            </table>
          </div>
          <p style="text-align:center; color:#71717a; font-size:12px; margin-top:30px;">Tạo tự động bởi MMO Multimodal Organizer (Native Rust Engine)</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      alert("Hãy cho phép pop-up để mở báo cáo đo kiểm!");
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-7xl mx-auto w-full overflow-y-auto">
      {/* 1. View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            Đo Lường Hiệu Năng AI Cục Bộ (Laptop Benchmark)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kiểm tra tốc độ sinh token, độ trễ và khả năng xử lý thực tế của AI trên phần cứng laptop của bạn
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('run')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'run' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Chạy đo kiểm
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'charts' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Biểu đồ so sánh
          </button>
          <button
            onClick={handleExportHtmlReport}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-950/40 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất báo cáo Web
          </button>
        </div>
      </div>

      {/* 2. Hardware Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 block font-medium">Card Đồ Họa / GPU</span>
            <span className="text-xs font-semibold text-zinc-100 font-mono truncate block">
              {hardware?.gpu?.name || 'NVIDIA / Intel Iris Xe'}
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 block font-medium">Bộ nhớ RAM</span>
            <span className="text-xs font-semibold text-zinc-100 font-mono">
              {hardware?.ram?.total_gb ? `${hardware.ram.total_gb} GB` : 'Đang đọc...'} (Trống: {hardware?.ram?.available_gb || '--'} GB)
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 block font-medium">Vi xử lý CPU</span>
            <span className="text-xs font-semibold text-zinc-100 font-mono">
              {hardware?.cpu?.cores || hardware?.cpu_cores || '--'} Luồng xử lý
            </span>
          </div>
        </div>
      </div>

      {/* 3. Run Benchmark Panel */}
      {activeTab === 'run' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Form */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Play className="w-4 h-4 text-indigo-400" />
              Thiết lập bài đo
            </h3>

            {/* Model Select */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Chọn mô hình đã tải:
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono outline-none focus:border-indigo-500"
              >
                {installedModels.length > 0 ? (
                  installedModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))
                ) : (
                  <option value="qwen2.5:1.5b">qwen2.5:1.5b (Chờ tải...)</option>
                )}
              </select>
            </div>

            {/* Task Type */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Loại tác vụ mô phỏng:
              </label>
              <div className="space-y-2">
                {[
                  { id: 'classify', label: '1. Phân loại tệp đa phương tiện', desc: 'Đo năng lực xử lý phân loại cấu trúc thư mục' },
                  { id: 'summarize', label: '2. Tóm tắt nội dung văn bản', desc: 'Đo khả năng cô đọng ngữ cảnh dài' },
                  { id: 'latency', label: '3. Đo độ trễ phản hồi (TTFT)', desc: 'Kiểm tra tốc độ đáp ứng tức thì' }
                ].map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedTask === t.id
                        ? 'bg-indigo-950/40 border-indigo-600 text-indigo-200'
                        : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="font-semibold text-zinc-200">{t.label}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleRunBenchmark}
              disabled={isRunning || installedModels.length === 0}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-950/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'fill-current'}`} />
              {isRunning ? 'Đang thực hiện bài đo...' : 'Bắt đầu kiểm tra tốc độ'}
            </button>
          </div>

          {/* Results List */}
          <div className="lg:col-span-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                Kết quả đo gần đây trên Laptop ({resultsHistory.length} lần đo)
              </h3>
              {resultsHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Xóa lịch sử
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {resultsHistory.length > 0 ? (
                resultsHistory.map((res, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-100 font-mono">{res.model}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium">
                          {res.task}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 font-mono">{res.timestamp}</span>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-zinc-900/70 p-2.5 rounded-lg border border-zinc-800 text-center">
                        <span className="text-[10px] text-zinc-500 block">Tốc độ sinh text</span>
                        <span className="text-sm font-bold text-indigo-400 font-mono mt-0.5 block">
                          {res.tokens_per_sec} <span className="text-[10px] font-normal">tok/s</span>
                        </span>
                      </div>

                      <div className="bg-zinc-900/70 p-2.5 rounded-lg border border-zinc-800 text-center">
                        <span className="text-[10px] text-zinc-500 block">Tổng thời gian</span>
                        <span className="text-sm font-bold text-zinc-200 font-mono mt-0.5 block">
                          {res.total_time_sec}s
                        </span>
                      </div>

                      <div className="bg-zinc-900/70 p-2.5 rounded-lg border border-zinc-800 text-center">
                        <span className="text-[10px] text-zinc-500 block">Độ trễ TTFT</span>
                        <span className="text-sm font-bold text-amber-400 font-mono mt-0.5 block">
                          {res.ttft_ms}ms
                        </span>
                      </div>

                      <div className="bg-zinc-900/70 p-2.5 rounded-lg border border-zinc-800 text-center">
                        <span className="text-[10px] text-zinc-500 block">Đánh giá</span>
                        <span className="text-xs font-semibold text-emerald-400 mt-1 block truncate">
                          {res.speed_rating}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-zinc-400 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800/50">
                      <span className="text-zinc-500 font-medium">Đánh giá tương thích: </span>
                      {res.hardware_assessment}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center text-zinc-500 text-xs">
                  <Zap className="w-8 h-8 text-zinc-700 mb-2" />
                  <p>Chưa có dữ liệu đo kiểm nào.</p>
                  <p className="text-[11px] text-zinc-600 mt-1">Chọn mô hình bên trái và bấm 'Bắt đầu kiểm tra tốc độ' để đo.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Visual Comparison Charts */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              So Sánh Tốc Độ Sinh Token Trung Bình (tok/s) - Càng cao càng mượt
            </h3>

            {Object.keys(modelStats).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(modelStats).map(([mod, stat]) => {
                  const pct = Math.min((stat.avgSpeed / maxSpeed) * 100, 100);
                  return (
                    <div key={mod} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200 font-mono">{mod}</span>
                        <span className="text-indigo-400 font-mono font-bold">{stat.avgSpeed} tok/s ({stat.count} lượt đo)</span>
                      </div>
                      <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 py-8 text-center">Chưa có đủ số liệu so sánh. Hãy chạy bài đo trước.</p>
            )}
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              So Sánh Thời Gian Xử Lý Hoàn Thành (giây) - Càng thấp càng tốt
            </h3>

            {Object.keys(modelStats).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(modelStats).map(([mod, stat]) => {
                  const pct = Math.min((stat.avgTime / maxTime) * 100, 100);
                  return (
                    <div key={mod} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200 font-mono">{mod}</span>
                        <span className="text-amber-400 font-mono font-bold">{stat.avgTime} giây</span>
                      </div>
                      <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 py-8 text-center">Chưa có đủ số liệu so sánh.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
