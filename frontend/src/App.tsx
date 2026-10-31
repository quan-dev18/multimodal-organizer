import { useState, useEffect } from 'react';
import { VramGauge } from './components/preflight/VramGauge';
import { MultiModelSelector } from './components/preflight/MultiModelSelector';
import type { ModelItem, ModelCluster, BatchDownloadStatus } from './components/preflight/MultiModelSelector';
import { BenchmarkCard } from './components/preflight/BenchmarkCard';
import { MainApp } from './components/main/MainApp';
import { ArrowRight, RefreshCw, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ThemeAndLangControls } from './lib/ThemeAndLangControls';
import { useApp } from './lib/AppContext';
import { sfx } from './lib/sounds';

const API_BASE = "http://127.0.0.1:8001/api";

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export function App() {
  const { t } = useApp();
  const [isInPreflight, setIsInPreflight] = useState<boolean>(true);
  const [hardware, setHardware] = useState<any>(null);
  const [ollamaStatus, setOllamaStatus] = useState<any>(null);
  const [clusters, setClusters] = useState<ModelCluster[]>([]);
  const [flatCatalog, setFlatCatalog] = useState<ModelItem[]>([]);
  const [storagePath, setStoragePath] = useState<string>("D:\\OllamaModels");
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  
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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    if (type === 'success') sfx.success();
    else if (type === 'error') sfx.error();
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

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
      if (ollamaRes) {
        setOllamaStatus(ollamaRes);
        // Sync active selection with actually installed models if available
        if (ollamaRes.models && ollamaRes.models.length > 0) {
          const installedTags: string[] = ollamaRes.models.map((m: any) => m.name);
          setSelectedModelIds(prev => {
            const matched = new Set<string>();
            catRes?.forEach((c: ModelItem) => {
              if (installedTags.some(t => t.includes(c.tag) || c.tag.includes(t))) {
                matched.add(c.id);
              }
            });
            return matched.size > 0 ? matched : prev;
          });
        }
      }
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
    sfx.toggle();
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
    sfx.click();
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
        showToast(`Đã chọn thư mục lưu trữ: ${data.path}`, 'success');
        await refreshSystemInfo();
      }
    } catch (e: any) {
      showToast(`Lỗi chọn thư mục: ${e.message}`, 'error');
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
          if (data.error) {
            throw new Error(data.error);
          }
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
    sfx.click();
    const installedList: string[] = ollamaStatus?.models?.map((m: any) => m.name) || [];
    const modelsToDownload = flatCatalog.filter(
      m => selectedModelIds.has(m.id) && !installedList.some(tag => tag.includes(m.tag) || m.tag.includes(tag))
    );

    if (modelsToDownload.length === 0) {
      showToast("Tất cả các mô hình đã chọn đều đã được tải về sẵn.", 'info');
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

      sfx.complete();
      showToast("Đã tải xong toàn bộ mô hình được chọn!", 'success');
      await refreshSystemInfo();
    } catch (err: any) {
      showToast(`Lỗi trong quá trình tải: ${err.message}`, 'error');
    } finally {
      clearInterval(timerInterval);
      setBatchStatus(prev => ({ ...prev, isDownloading: false }));
    }
  };

  // Download single model
  const handleDownloadSingleModel = async (modelTag: string) => {
    sfx.click();
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
      sfx.success();
      showToast(`Đã tải mô hình ${modelTag} thành công`, 'success');
      await refreshSystemInfo();
    } catch (err: any) {
      showToast(`Lỗi tải: ${err.message}`, 'error');
    } finally {
      setBatchStatus(prev => ({ ...prev, isDownloading: false }));
    }
  };

  // Delete model
  const handleDeleteModel = async (modelTag: string) => {
    sfx.delete();
    try {
      const res = await fetch(`${API_BASE}/models/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelTag })
      });
      const data = await res.json();
      showToast(data.message || `Đã xoá ${modelTag}`, 'info');
      await refreshSystemInfo();
    } catch (e: any) {
      showToast(`Lỗi khi xóa: ${e.message}`, 'error');
    }
  };

  // Run Benchmark
  const handleRunBenchmark = async (modelTag: string) => {
    sfx.scan();
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
        onBackToPreflight={() => {
          sfx.navigate();
          setIsInPreflight(true);
        }}
        activeModelNames={selectedModelsList.map(m => m.name)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-6 max-w-6xl mx-auto font-sans antialiased">
      {/* Toast notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 text-xs ${
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                : 'bg-zinc-900/90 border-zinc-700 text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-zinc-200 p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Top Header */}
      <header className="flex items-center justify-between pb-5 border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-3.5">
          <img 
            src="./mmo_app_icon.png" 
            alt="MMO App Icon" 
            className="w-10 h-10 rounded-xl object-contain bg-zinc-900 border border-zinc-800 p-1 shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-base text-zinc-100">{t('setup_title')}</h1>
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 font-mono">
                {t('setup_badge')}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t('setup_desc')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeAndLangControls />

          <button
            onClick={() => {
              sfx.click();
              refreshSystemInfo();
            }}
            disabled={loadingHardware}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800/80 text-zinc-300 rounded-lg text-xs flex items-center gap-1.5 border border-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHardware ? 'animate-spin text-indigo-400' : ''}`} />
            {t('refresh')}
          </button>

          <button
            onClick={() => {
              // 1. Validation check: Must select at least 1 model
              if (selectedModelsList.length === 0) {
                sfx.error();
                showToast("Vui lòng chọn ít nhất 1 mô hình AI trước khi bắt đầu sử dụng!", "error");
                return;
              }

              // 2. Validation check: Selected models must actually be downloaded in Ollama
              const uninstalledSelected = selectedModelsList.filter(
                m => !installedModelsList.some(tag => tag.includes(m.tag) || m.tag.includes(tag))
              );
              if (uninstalledSelected.length > 0) {
                sfx.error();
                showToast(`Mô hình [${uninstalledSelected.map(m => m.name).join(', ')}] chưa được tải về! Hãy bấm 'Tải về' trước khi mở ứng dụng.`, "error");
                return;
              }

              // 3. Validation check: VRAM overflow prevention
              const totalEstVram = usedVramOther + totalModelVram;
              if (totalEstVram > totalVram) {
                sfx.error();
                showToast(`Cảnh báo tràn bộ nhớ: Tổng dung lượng VRAM dự kiến (${totalEstVram.toFixed(1)} GB) vượt quá dung lượng card đồ họa (${totalVram.toFixed(1)} GB)! Vui lòng bỏ chọn bớt mô hình.`, "error");
                return;
              }

              sfx.navigate();
              setIsInPreflight(false);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-950/40 cursor-pointer"
          >
            {t('start_app')}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="space-y-6 my-6">
        {/* 1. STICKY VRAM GAUGE BAR */}
        <div className="sticky top-4 z-40 shadow-xl">
          <VramGauge
            totalVramGb={totalVram}
            usedVramOtherGb={usedVramOther}
            modelVramGb={totalModelVram}
            appName={`Cụm ${selectedModelIds.size} mô hình đã chọn`}
            gpuName={gpuName}
          />
        </div>

        {/* 2. Multi-Model Cluster Selection */}
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
      <footer className="pt-4 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-400 font-sans">
        <div className="flex items-center gap-4">
          <span>GPU: <span className="text-zinc-300 font-medium">{gpuName}</span> ({totalVram} GB)</span>
          <span>RAM: <span className="text-zinc-300 font-medium">{hardware?.ram?.total_gb || 16} GB</span> (Trống: {hardware?.ram?.free_gb || 6} GB)</span>
          <span>CPU: <span className="text-zinc-300 font-medium">{hardware?.cpu?.logical_cores || 8} luồng</span></span>
        </div>
        <div className="text-zinc-400 text-xs">
          MMO Desktop · Trải nghiệm mượt mà, tối ưu phần cứng cục bộ
        </div>
      </footer>
    </div>
  );
}

export default App;