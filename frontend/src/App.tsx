import { useState, useEffect } from 'react';
import { VramGauge } from './components/preflight/VramGauge';
import { MultiModelSelector } from './components/preflight/MultiModelSelector';
import type { ModelItem, ModelCluster, BatchDownloadStatus } from './components/preflight/MultiModelSelector';
import { BenchmarkCard } from './components/preflight/BenchmarkCard';
import { MainApp } from './components/main/MainApp';
import { ArrowRight, RefreshCw } from 'lucide-react';

const API_BASE = "http://127.0.0.1:8001/api";

export function App() {
  const [isInPreflight, setIsInPreflight] = useState<boolean>(true);
  const [hardware, setHardware] = useState<any>(null);
  const [ollamaStatus, setOllamaStatus] = useState<any>(null);
  const [clusters, setClusters] = useState<ModelCluster[]>([]);
  const [flatCatalog, setFlatCatalog] = useState<ModelItem[]>([]);
  const [storagePath, setStoragePath] = useState<string>("D:\\OllamaModels");
  
  // Selected models
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(
    new Set(["qwen2.5:1.5b", "bge-m3"])
  );

  // Batch download state
  const [batchStatus, setBatchStatus] = useState<BatchDownloadStatus>({
    isDownloading: false,
    currentModelTag: "",
    currentIndex: 0,
    totalModels: 0,
    progressPercent: 0,
    statusText: "",
    elapsedSeconds: 0,
    estimatedSecondsLeft: 0,
    speedMbps: 0
  });

  const [loadingHardware, setLoadingHardware] = useState(true);

  // Fetch Hardware & Clusters
  const refreshSystemInfo = async () => {
    setLoadingHardware(true);
    try {
      const [hwRes, ollamaRes, clusRes, catRes, pathRes] = await Promise.all([
        fetch(`${API_BASE}/hardware`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/ollama/status`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/models/clusters`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/models/catalog`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/models/storage_location`).then(r => r.json()).catch(() => null)
      ]);

      if (hwRes) setHardware(hwRes);
      if (ollamaRes) setOllamaStatus(ollamaRes);
      if (clusRes && clusRes.length > 0) setClusters(clusRes);
      if (catRes && catRes.length > 0) setFlatCatalog(catRes);
      if (pathRes && pathRes.current_path) setStoragePath(pathRes.current_path);
    } catch (e) {
      console.error("Lỗi kết nối", e);
    } finally {
      setLoadingHardware(false);
    }
  };

  useEffect(() => {
    refreshSystemInfo();
    const interval = setInterval(refreshSystemInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleModel = (m: ModelItem) => {
    const next = new Set(selectedModelIds);
    if (next.has(m.id)) {
      if (next.size > 1) next.delete(m.id);
    } else {
      next.add(m.id);
    }
    setSelectedModelIds(next);
  };

  // Open native Windows folder selector dialog
  const handleOpenFolderPicker = async () => {
    try {
      const res = await fetch(`${API_BASE}/system/select_folder`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.path) {
        // Update storage location
        const updateRes = await fetch(`${API_BASE}/models/update_storage_location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_path: data.path })
        });
        await updateRes.json();
        setStoragePath(data.path);
        alert(`Đã chọn thư mục cài đặt mô hình: ${data.path}`);
        await refreshSystemInfo();
      }
    } catch (e: any) {
      alert(`Lỗi chọn thư mục: ${e.message}`);
    }
  };

  // Single Model Download logic
  const downloadOneModel = async (modelTag: string, onProgress: (percent: number, status: string, speed: number, estLeft: number) => void) => {
    const startTime = Date.now();
    let lastBytes = 0;
    let lastTime = startTime;

    const response = await fetch(`${API_BASE}/ollama/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name: modelTag })
    });

    if (!response.body) throw new Error("Không có phản hồi từ máy chủ");
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
            let percent = 0;
            let speedMbps = 0;
            let estLeft = 0;

            if (data.completed && data.total) {
              percent = Math.round((data.completed / data.total) * 100);
              const now = Date.now();
              const timeDiff = (now - lastTime) / 1000;
              if (timeDiff > 0.5) {
                const bytesDiff = data.completed - lastBytes;
                speedMbps = (bytesDiff / (1024 * 1024)) / timeDiff;
                const remainingBytes = data.total - data.completed;
                estLeft = speedMbps > 0 ? Math.round((remainingBytes / (1024 * 1024)) / speedMbps) : 0;
                lastBytes = data.completed;
                lastTime = now;
              }
            }
            onProgress(percent, data.status, speedMbps, estLeft);
          }
        } catch {}
      }
    }
  };

  // Batch Download all uninstalled models sequentially
  const handleDownloadAllSelected = async () => {
    const installedList: string[] = ollamaStatus?.models?.map((m: any) => m.name) || [];
    const modelsToDownload = flatCatalog.filter(
      m => selectedModelIds.has(m.id) && !installedList.some(tag => tag.includes(m.tag) || m.tag.includes(tag))
    );

    if (modelsToDownload.length === 0) {
      alert("Tất cả các mô hình bạn chọn đều đã được tải về sẵn!");
      return;
    }

    setBatchStatus({
      isDownloading: true,
      currentModelTag: modelsToDownload[0].tag,
      currentIndex: 1,
      totalModels: modelsToDownload.length,
      progressPercent: 0,
      statusText: "Bắt đầu tải tuần tự...",
      elapsedSeconds: 0,
      estimatedSecondsLeft: 60,
      speedMbps: 0
    });

    const globalStartTime = Date.now();
    const timerInterval = setInterval(() => {
      setBatchStatus(prev => ({
        ...prev,
        elapsedSeconds: Math.round((Date.now() - globalStartTime) / 1000)
      }));
    }, 1000);

    try {
      for (let i = 0; i < modelsToDownload.length; i++) {
        const m = modelsToDownload[i];
        setBatchStatus(prev => ({
          ...prev,
          currentModelTag: m.tag,
          currentIndex: i + 1,
          progressPercent: 0,
          statusText: `Đang tải ${m.name} (${m.tag})...`
        }));

        await downloadOneModel(m.tag, (percent, status, speed, estLeft) => {
          setBatchStatus(prev => ({
            ...prev,
            progressPercent: percent || prev.progressPercent,
            statusText: status,
            speedMbps: speed > 0 ? speed : prev.speedMbps,
            estimatedSecondsLeft: estLeft > 0 ? estLeft : prev.estimatedSecondsLeft
          }));
        });
      }

      alert("Đã hoàn tất tải tất cả các mô hình thành công!");
      await refreshSystemInfo();
    } catch (err: any) {
      alert(`Lỗi trong quá trình tải: ${err.message}`);
    } finally {
      clearInterval(timerInterval);
      setBatchStatus(prev => ({ ...prev, isDownloading: false }));
    }
  };

  // Download single model
  const handleDownloadSingleModel = async (modelTag: string) => {
    setBatchStatus({
      isDownloading: true,
      currentModelTag: modelTag,
      currentIndex: 1,
      totalModels: 1,
      progressPercent: 0,
      statusText: `Bắt đầu tải ${modelTag}...`,
      elapsedSeconds: 0,
      estimatedSecondsLeft: 30,
      speedMbps: 0
    });

    try {
      await downloadOneModel(modelTag, (percent, status, speed, estLeft) => {
        setBatchStatus(prev => ({
          ...prev,
          progressPercent: percent || prev.progressPercent,
          statusText: status,
          speedMbps: speed > 0 ? speed : prev.speedMbps,
          estimatedSecondsLeft: estLeft > 0 ? estLeft : prev.estimatedSecondsLeft
        }));
      });
      await refreshSystemInfo();
    } catch (err: any) {
      alert(`Lỗi tải: ${err.message}`);
    } finally {
      setBatchStatus(prev => ({ ...prev, isDownloading: false }));
    }
  };

  // Delete model
  const handleDeleteModel = async (modelTag: string) => {
    try {
      const res = await fetch(`${API_BASE}/models/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelTag })
      });
      const data = await res.json();
      alert(data.message);
      await refreshSystemInfo();
    } catch (e: any) {
      alert(`Lỗi khi xóa: ${e.message}`);
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

  const totalVram = hardware?.gpu?.total_vram_gb || 4.0;
  const usedVramOther = hardware?.gpu?.used_vram_gb ? Math.max(hardware.gpu.used_vram_gb - 1.6, 0.8) : 0.8;
  const gpuName = hardware?.gpu?.name || "NVIDIA GeForce GTX 1650";

  const selectedModelsList = flatCatalog.filter(m => selectedModelIds.has(m.id));
  const totalModelVram = selectedModelsList.reduce((acc, m) => acc + (m.est_vram_gb || 1.0), 0);

  const installedModelsList: string[] = ollamaStatus?.models?.map((m: any) => m.name) || [];
  const primaryModel = selectedModelsList[0] || flatCatalog[0] || { tag: "qwen2.5:1.5b", name: "Qwen 2.5 1.5B" };
  const isPrimaryInstalled = installedModelsList.some(tag => tag.includes(primaryModel.tag) || primaryModel.tag.includes(tag));

  if (!isInPreflight) {
    return (
      <MainApp
        onBackToPreflight={() => setIsInPreflight(true)}
        activeModelNames={selectedModelsList.map(m => m.name)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-lime-500 to-emerald-600 flex items-center justify-center font-black text-slate-950 text-2xl shadow-lg shadow-lime-950/50">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-wide">MMO — ĐA MÔ HÌNH (MULTI-MODEL AI ORGANIZER)</h1>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">PHASE 2 - 3</span>
            </div>
            <p className="text-xs text-slate-400">
              Chọn thư mục cài đặt mô hình qua cửa sổ Windows, theo dõi thanh VRAM cố định & tải tự động tuần tự
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
            Vào Không Gian Lưu Trữ
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="space-y-6 my-6">
        {/* 1. STICKY VRAM GAUGE BAR: Luôn ghim cố định trên màn hình để quan sát khi chọn model */}
        <div className="sticky top-4 z-40 shadow-2xl">
          <VramGauge
            totalVramGb={totalVram}
            usedVramOtherGb={usedVramOther}
            modelVramGb={totalModelVram}
            appName={`Cụm ${selectedModelIds.size} Mô Hình MMO`}
            gpuName={gpuName}
          />
        </div>

        {/* 2. Multi-Model Cluster Selection with Native Folder Picker & Download All */}
        <section>
          <MultiModelSelector
            clusters={clusters}
            selectedModelIds={selectedModelIds}
            installedModels={installedModelsList}
            batchStatus={batchStatus}
            storagePath={storagePath}
            onToggleModel={handleToggleModel}
            onDownloadAllSelected={handleDownloadAllSelected}
            onDownloadSingleModel={handleDownloadSingleModel}
            onDeleteModel={handleDeleteModel}
            onOpenFolderPicker={handleOpenFolderPicker}
          />
        </section>

        {/* 3. Benchmark Card */}
        <section>
          <BenchmarkCard
            selectedModelTag={primaryModel.tag}
            isInstalled={isPrimaryInstalled}
            onRunBenchmark={handleRunBenchmark}
          />
        </section>
      </main>

      {/* Footer System Specs */}
      <footer className="pt-4 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-4">
          <span>GPU: <b className="text-slate-400 font-sans">{gpuName}</b> ({totalVram} GB)</span>
          <span>RAM: <b className="text-slate-400 font-sans">{hardware?.ram?.total_gb || 16} GB</b> (Trống: {hardware?.ram?.free_gb || 6} GB)</span>
          <span>CPU: <b className="text-slate-400 font-sans">{hardware?.cpu?.logical_cores || 8} Luồng</b></span>
        </div>
        <div className="text-slate-600">
          MMO Multimodal Organizer v1.4 · Sticky VRAM & Sequential Batch Download
        </div>
      </footer>
    </div>
  );
}

export default App;
