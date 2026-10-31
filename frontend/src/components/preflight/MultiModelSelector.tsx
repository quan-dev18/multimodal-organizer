import React from 'react';
import { Download, CheckCircle2, Check, Trash2, FolderOpen, HardDrive, Clock, Loader2 } from 'lucide-react';

export interface ModelItem {
  id: string;
  name: string;
  tag: string;
  params: string;
  size_download_gb: number;
  est_vram_gb: number;
  category: string;
  badge: string;
  description: string;
  modality_support?: string[];
  default_selected?: boolean;
}

export interface ModelCluster {
  cluster_id: string;
  cluster_name: string;
  role: string;
  description: string;
  models: ModelItem[];
}

export interface BatchDownloadStatus {
  isDownloading: boolean;
  currentModelTag: string;
  currentIndex: number;
  totalModels: number;
  progressPercent: number;
  statusText: string;
  elapsedSeconds: number;
  estimatedSecondsLeft: number;
  speedMbps: number;
}

interface MultiModelSelectorProps {
  clusters: ModelCluster[];
  selectedModelIds: Set<string>;
  installedModels: string[];
  batchStatus: BatchDownloadStatus;
  storagePath: string;
  onToggleModel: (model: ModelItem) => void;
  onDownloadAllSelected: () => void;
  onDownloadSingleModel: (modelTag: string) => void;
  onDeleteModel: (modelTag: string) => void;
  onOpenFolderPicker: () => void;
}

export const MultiModelSelector: React.FC<MultiModelSelectorProps> = ({
  clusters,
  selectedModelIds,
  installedModels,
  batchStatus,
  storagePath,
  onToggleModel,
  onDownloadAllSelected,
  onDownloadSingleModel,
  onDeleteModel,
  onOpenFolderPicker
}) => {
  const allSelectedModels: ModelItem[] = [];
  clusters.forEach(c => c.models.forEach(m => {
    if (selectedModelIds.has(m.id)) allSelectedModels.push(m);
  }));

  const uninstalledCount = allSelectedModels.filter(
    m => !installedModels.some(tag => tag.includes(m.tag) || m.tag.includes(tag))
  ).length;

  return (
    <div className="space-y-5">
      {/* 1. Storage Location & Batch Download Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        {/* Left: Folder Picker */}
        <div className="flex items-center gap-3.5 flex-1 min-w-[320px]">
          <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/60 shrink-0">
            <HardDrive className="w-4 h-4 text-zinc-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-400 font-medium mb-1">
              Thư mục lưu trữ tệp mô hình
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 truncate max-w-md block">
                {storagePath || "D:\\OllamaModels"}
              </span>
              <button
                onClick={onOpenFolderPicker}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-zinc-700/60 shrink-0"
              >
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                Thay đổi...
              </button>
            </div>
          </div>
        </div>

        {/* Right: Download All Action Button */}
        <div className="flex items-center gap-4">
          <div className="text-right text-xs text-zinc-400">
            <div>Đã chọn: <span className="text-zinc-200 font-medium">{selectedModelIds.size}</span> mô hình</div>
            <div className="text-xs text-zinc-400">({uninstalledCount} chưa tải về)</div>
          </div>

          <button
            onClick={onDownloadAllSelected}
            disabled={batchStatus.isDownloading || uninstalledCount === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {batchStatus.isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang tải ({batchStatus.currentIndex}/{batchStatus.totalModels})
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Tải các mô hình còn thiếu ({uninstalledCount})
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Download Progress Bar */}
      {batchStatus.isDownloading && (
        <div className="bg-zinc-900 border border-indigo-500/40 rounded-xl p-4 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-zinc-200 font-medium">
                Đang xử lý [{batchStatus.currentIndex}/{batchStatus.totalModels}]: <span className="font-mono text-indigo-400">{batchStatus.currentModelTag}</span>
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-400">
              {batchStatus.speedMbps > 0 && (
                <span>Tốc độ: <span className="text-zinc-200 font-mono font-medium">{batchStatus.speedMbps.toFixed(1)} MB/s</span></span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Đã chạy: <span className="text-zinc-200 font-mono font-medium">{batchStatus.elapsedSeconds}s</span>
              </span>
              <span>
                Ước tính: <span className="text-zinc-200 font-mono font-medium">~{batchStatus.estimatedSecondsLeft}s</span>
              </span>
            </div>
          </div>

          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${batchStatus.progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="truncate">{batchStatus.statusText}</span>
            <span className="font-mono font-medium text-indigo-400 ml-2">{batchStatus.progressPercent}%</span>
          </div>
        </div>
      )}

      {/* 3. Multi-Model Clusters Cards */}
      <div className="space-y-4">
        {clusters.map((cluster) => (
          <div key={cluster.cluster_id} className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/60">
              <div>
                <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  {cluster.cluster_name}
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">{cluster.description}</p>
              </div>
              <span className="text-xs bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded">
                {cluster.role}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {cluster.models.map((m) => {
                const isSelected = selectedModelIds.has(m.id);
                const isInstalled = installedModels.some(tag => tag.includes(m.tag) || m.tag.includes(tag));
                const isHeavy = m.est_vram_gb > 3.8;

                return (
                  <div
                    key={m.id}
                    onClick={() => onToggleModel(m)}
                    className={`cursor-pointer rounded-xl p-3.5 transition-all duration-150 border text-left flex flex-col justify-between select-none relative ${
                      isSelected
                        ? 'bg-zinc-800/90 border-indigo-500 shadow-sm ring-1 ring-indigo-500/30'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-zinc-700 bg-zinc-900'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </div>

                      <span className={`text-xs px-2 py-0.5 rounded ${
                        isHeavy ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60' : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                      }`}>
                        {m.badge}
                      </span>
                    </div>

                    <div>
                      <div className="font-medium text-zinc-100 text-xs flex items-center justify-between">
                        <span className="truncate pr-1">{m.name}</span>
                        <span className="text-xs text-zinc-400 font-mono">~{m.size_download_gb}GB</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className={`font-mono text-xs ${isHeavy ? "text-rose-400 font-medium" : "text-zinc-400"}`}>
                        VRAM: ~{m.est_vram_gb} GB
                      </span>

                      {isInstalled ? (
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã sẵn sàng
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Xác nhận xóa mô hình ${m.name} (${m.tag}) để giải phóng dung lượng đĩa?`)) {
                                onDeleteModel(m.tag);
                              }
                            }}
                            title="Xóa tệp mô hình này"
                            className="p-1 hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadSingleModel(m.tag);
                          }}
                          disabled={batchStatus.isDownloading}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-xs flex items-center gap-1 disabled:opacity-50 transition-colors"
                        >
                          <Download className="w-3 h-3" /> Tải về
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};