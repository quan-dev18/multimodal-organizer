import React from 'react';
import { Download, CheckCircle, Check, Trash2, FolderOpen, HardDrive, Clock, Loader2 } from 'lucide-react';

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
  // Count how many selected models are not yet installed
  const allSelectedModels: ModelItem[] = [];
  clusters.forEach(c => c.models.forEach(m => {
    if (selectedModelIds.has(m.id)) allSelectedModels.push(m);
  }));

  const uninstalledCount = allSelectedModels.filter(
    m => !installedModels.some(tag => tag.includes(m.tag) || m.tag.includes(tag))
  ).length;

  return (
    <div className="space-y-6">
      {/* 1. Storage Location & Batch Download Bar */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        {/* Left: Folder Picker */}
        <div className="flex items-center gap-3 flex-1 min-w-[340px]">
          <HardDrive className="w-5 h-5 text-lime-400 shrink-0" />
          <div className="flex-1">
            <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
              NƠI LƯU TRỮ MÔ HÌNH:
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-lime-400 truncate max-w-md block">
                {storagePath || "D:\\OllamaModels"}
              </span>
              <button
                onClick={onOpenFolderPicker}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1.5 transition-colors font-semibold border border-slate-700"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                Chọn Thư Mục Cài...
              </button>
            </div>
          </div>
        </div>

        {/* Right: Download All Action Button */}
        <div className="flex items-center gap-3">
          <div className="text-right text-xs font-mono text-slate-400">
            <div>Đã chọn: <b className="text-lime-400">{selectedModelIds.size}</b> mô hình</div>
            <div className="text-[11px] text-slate-500">({uninstalledCount} mô hình chưa tải)</div>
          </div>

          <button
            onClick={onDownloadAllSelected}
            disabled={batchStatus.isDownloading || uninstalledCount === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-lime-950/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {batchStatus.isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang Tải Tuần Tự ({batchStatus.currentIndex}/{batchStatus.totalModels})
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Tải Tất Cả Mô Hình ({uninstalledCount})
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Real-Time Accurate Batch Download Progress Bar */}
      {batchStatus.isDownloading && (
        <div className="bg-slate-900 border border-lime-500/80 rounded-xl p-4 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-ping"></span>
              <span className="text-lime-400 font-bold uppercase">
                ĐANG TẢI [{batchStatus.currentIndex}/{batchStatus.totalModels}]: {batchStatus.currentModelTag}
              </span>
            </div>

            <div className="flex items-center gap-4 text-slate-300">
              {batchStatus.speedMbps > 0 && (
                <span className="text-sky-400">Tốc độ: <b>{batchStatus.speedMbps.toFixed(1)} MB/s</b></span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Đã chạy: <b>{batchStatus.elapsedSeconds}s</b>
              </span>
              <span>
                Ước tính còn lại: <b className="text-amber-400">~{batchStatus.estimatedSecondsLeft}s</b>
              </span>
            </div>
          </div>

          {/* Progress bar container */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-lime-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${batchStatus.progressPercent}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>{batchStatus.statusText}</span>
            <span className="font-bold text-lime-400">{batchStatus.progressPercent}%</span>
          </div>
        </div>
      )}

      {/* 3. Multi-Model Clusters Cards */}
      <div className="space-y-5">
        {clusters.map((cluster) => (
          <div key={cluster.cluster_id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
              <div>
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400"></span>
                  {cluster.cluster_name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{cluster.description}</p>
              </div>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
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
                    className={`cursor-pointer rounded-xl p-3.5 transition-all duration-200 border text-left flex flex-col justify-between select-none relative ${
                      isSelected
                        ? 'bg-slate-800/95 border-lime-500 shadow-md shadow-lime-950/40 ring-1 ring-lime-500/50'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-lime-500 border-lime-400 text-slate-950' : 'border-slate-700 bg-slate-900'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isHeavy ? 'bg-rose-950 text-rose-300' : 'bg-lime-950 text-lime-400 border border-lime-800/60'
                      }`}>
                        {m.badge}
                      </span>
                    </div>

                    <div>
                      <div className="font-semibold text-slate-100 text-xs flex items-center justify-between">
                        <span className="truncate pr-1">{m.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">~{m.size_download_gb}GB</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                      <span className={isHeavy ? "text-rose-400 font-bold" : "text-lime-400 font-bold"}>
                        VRAM: ~{m.est_vram_gb} GB
                      </span>

                      {isInstalled ? (
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-sans font-medium">
                            <CheckCircle className="w-3 h-3" /> Đã tải
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Xác nhận xóa mô hình ${m.name} (${m.tag}) để giải phóng dung lượng?`)) {
                                onDeleteModel(m.tag);
                              }
                            }}
                            title="Xóa mô hình này"
                            className="p-1 hover:bg-rose-900/60 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadSingleModel(m.tag);
                          }}
                          disabled={batchStatus.isDownloading}
                          className="px-2 py-0.5 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded text-[10px] font-sans flex items-center gap-1 disabled:opacity-50"
                        >
                          <Download className="w-2.5 h-2.5" /> Tải về
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
