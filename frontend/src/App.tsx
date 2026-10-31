import { useState, useEffect } from 'react';
import { VramGauge } from './components/preflight/VramGauge';
import { ModelSelector } from './components/preflight/ModelSelector';
import type { ModelItem } from './components/preflight/ModelSelector';
import { BenchmarkCard } from './components/preflight/BenchmarkCard';
import { MainApp } from './components/main/MainApp';
import { ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

const API_BASE = "http://127.0.0.1:8001/api";

export function App() {
  const [isInPreflight, setIsInPreflight] = useState<boolean>(true);
  const [hardware, setHardware] = useState<any>(null);
  const [ollamaStatus, setOllamaStatus] = useState<any>(null);
  const [catalog, setCatalog] = useState<ModelItem[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelItem>({
    id: "qwen2.5:1.5b",
    name: "Qwen 2.5 (1.5B)",
    tag: "qwen2.5:1.5b",
    params: "1.5B",
    size_download_gb: 1.0,
    est_vram_gb: 1.6,
    category: "Text & Metadata",
    badge: "Khuyên dùng (4GB VRAM)",
    description: "Siêu nhanh, trích xuất metadata, phân loại file và sinh tên folder chuẩn. Tốc độ cao ~45 tok/s.",
    recommended_for: ["classification", "metadata"]
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const [loadingHardware, setLoadingHardware] = useState(true);

  // Fetch Hardware & Ollama Info
  const refreshSystemInfo = async () => {
    setLoadingHardware(true);
    try {
      const [hwRes, ollamaRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/hardware`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/ollama/status`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/models/catalog`).then(r => r.json()).catch(() => null)
      ]);

      if (hwRes) setHardware(hwRes);
      if (ollamaRes) setOllamaStatus(ollamaRes);
      if (catRes && catRes.length > 0) {
        setCatalog(catRes);
        if (!selectedModel) setSelectedModel(catRes[0]);
      }
    } catch (e) {
      console.error("Error connecting to sidecar backend", e);
    } finally {
      setLoadingHardware(false);
    }
  };

  useEffect(() => {
    refreshSystemInfo();
    const interval = setInterval(refreshSystemInfo, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  // Handle Download / Pull model via Ollama
  const handleDownloadModel = async (modelTag: string) => {
    setIsDownloading(true);
    setDownloadProgress("Bắt đầu kết nối tới Ollama...");
    try {
      const response = await fetch(`${API_BASE}/ollama/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelTag })
      });

      if (!response.body) {
        throw new Error("No response body stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.status) {
              if (data.completed && data.total) {
                const percent = Math.round((data.completed / data.total) * 100);
                setDownloadProgress(`${data.status} (${percent}%)`);
              } else {
                setDownloadProgress(data.status);
              }
            }
          } catch {
            // non-json line
          }
        }
      }

      setDownloadProgress("Hoàn tất tải về!");
      await refreshSystemInfo();
    } catch (err: any) {
      setDownloadProgress(`Lỗi tải về: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Run Benchmark
  const handleRunBenchmark = async (modelTag: string) => {
    const res = await fetch(`${API_BASE}/models/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name: modelTag })
    });
    return res.json();
  };

  // Calculate parameters for VRAM Gauge
  const totalVram = hardware?.gpu?.total_vram_gb || 4.0;
  const usedVramOther = hardware?.gpu?.used_vram_gb ? Math.max(hardware.gpu.used_vram_gb - (selectedModel?.est_vram_gb || 0), 0.8) : 1.32;
  const modelVram = selectedModel?.est_vram_gb || 1.6;
  const gpuName = hardware?.gpu?.name || "NVIDIA GeForce GTX 1650";

  const installedModelsList: string[] = ollamaStatus?.models?.map((m: any) => m.name) || [];
  const isSelectedInstalled = installedModelsList.some(tag => tag.includes(selectedModel.tag) || selectedModel.tag.includes(tag));

  // If user passed preflight, show main MMO Desktop app
  if (!isInPreflight) {
    return (
      <MainApp
        onBackToPreflight={() => setIsInPreflight(true)}
        activeModelName={selectedModel.name}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-lime-500 to-emerald-600 flex items-center justify-center font-black text-slate-950 text-2xl shadow-lg shadow-lime-950/50">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-wide">MMO — MULTIMODAL ORGANIZER</h1>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">PRE-FLIGHT</span>
            </div>
            <p className="text-xs text-slate-400">
              Kiểm tra tài nguyên phần cứng & cấu hình mô hình AI cục bộ trước khi khởi động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshSystemInfo}
            disabled={loadingHardware}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHardware ? 'animate-spin text-lime-400' : ''}`} />
            Làm mới phần cứng
          </button>

          <button
            onClick={() => setIsInPreflight(false)}
            className="px-5 py-2 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 transition-all shadow-lg shadow-lime-950/40"
          >
            Tiếp Tục Vào Ứng Dụng
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="space-y-6 my-6">
        {/* 1. VRAM Gauge Bar (Game HUD Style) */}
        <section>
          <VramGauge
            totalVramGb={totalVram}
            usedVramOtherGb={usedVramOther}
            modelVramGb={modelVram}
            appName={`MMO [${selectedModel.name}]`}
            gpuName={gpuName}
          />
        </section>

        {/* Ollama Service Notice if not running */}
        {ollamaStatus && !ollamaStatus.installed_or_running && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Ollama chưa được khởi động trên máy:</span>
              <p className="mt-1 text-slate-300">
                Để tải và chạy mô hình cục bộ, vui lòng cài đặt Ollama từ <a href="https://ollama.com/download" target="_blank" rel="noreferrer" className="text-lime-400 underline font-semibold">ollama.com</a> và bật ứng dụng Ollama trên máy tính. Bạn vẫn có thể duyệt cấu hình VRAM và vào giao diện chính bất kỳ lúc nào.
              </p>
            </div>
          </div>
        )}

        {/* 2. Model Selection Grid */}
        <section>
          <ModelSelector
            catalog={catalog}
            selectedModel={selectedModel}
            installedModels={installedModelsList}
            isDownloading={isDownloading}
            downloadProgress={downloadProgress}
            onSelectModel={(m) => setSelectedModel(m)}
            onDownloadModel={handleDownloadModel}
          />
        </section>

        {/* 3. Benchmark & Verification */}
        <section>
          <BenchmarkCard
            selectedModelTag={selectedModel.tag}
            isInstalled={isSelectedInstalled}
            onRunBenchmark={handleRunBenchmark}
          />
        </section>
      </main>

      {/* Footer System Specs */}
      <footer className="pt-4 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-4">
          <span>GPU: <b className="text-slate-400 font-sans">{gpuName}</b> ({totalVram} GB)</span>
          <span>RAM HỆ THỐNG: <b className="text-slate-400 font-sans">{hardware?.ram?.total_gb || 16} GB</b> (Trống: {hardware?.ram?.free_gb || 6} GB)</span>
          <span>CPU: <b className="text-slate-400 font-sans">{hardware?.cpu?.logical_cores || 8} Threads</b></span>
        </div>
        <div className="text-slate-600">
          MMO Multimodal Organizer v0.1-alpha · Offline First
        </div>
      </footer>
    </div>
  );
}

export default App;
