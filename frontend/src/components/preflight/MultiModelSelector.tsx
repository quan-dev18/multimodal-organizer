import React, { useState } from 'react';
import { Download, CheckCircle, Check, Trash2, FolderEdit, HardDrive, Check as CheckIcon } from 'lucide-react';

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

interface MultiModelSelectorProps {
  clusters: ModelCluster[];
  selectedModelIds: Set<string>;
  installedModels: string[];
  isDownloading: boolean;
  downloadProgress: string;
  storagePath: string;
  onToggleModel: (model: ModelItem) => void;
  onDownloadModel: (modelTag: string) => void;
  onDeleteModel: (modelTag: string) => void;
  onUpdateStoragePath: (newPath: string) => void;
}

export const MultiModelSelector: React.FC<MultiModelSelectorProps> = ({
  clusters,
  selectedModelIds,
  installedModels,
  isDownloading,
  downloadProgress,
  storagePath,
  onToggleModel,
  onDownloadModel,
  onDeleteModel,
  onUpdateStoragePath
}) => {
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [customPath, setCustomPath] = useState(storagePath);

  const handleSavePath = () => {
    if (!customPath.trim()) return;
    onUpdateStoragePath(customPath.trim());
    setIsEditingPath(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Model Storage Location Setting Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 flex-1 min-w-[340px]">
          <HardDrive className="w-4 h-4 text-lime-400 shrink-0" />
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider shrink-0">
            NƠI CÀI ĐẶT / LƯU TRỮ MODEL:
          </span>

          {isEditingPath ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="Nhập đường dẫn (ví dụ: D:\OllamaModels)..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-lime-400 font-mono focus:outline-none focus:border-lime-500"
              />
              <button
                onClick={handleSavePath}
                className="px-2.5 py-1 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded text-xs flex items-center gap-1"
              >
                <CheckIcon className="w-3.5 h-3.5" /> Lưu
              </button>
              <button
                onClick={() => {
                  setCustomPath(storagePath);
                  setIsEditingPath(false);
                }}
                className="px-2.5 py-1 bg-slate-800 text-slate-400 hover:text-white rounded text-xs"
              >
                Hủy
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-xs font-mono text-lime-400 truncate max-w-md">
                {storagePath || "D:\\OllamaModels"}
              </span>
              <button
                onClick={() => {
                  setCustomPath(storagePath || "D:\\OllamaModels");
                  setIsEditingPath(true);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1.5 transition-colors font-mono"
              >
                <FolderEdit className="w-3.5 h-3.5 text-amber-400" /> Đổi Nơi Cài Đặt
              </button>
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
          Đang chọn: <b className="text-lime-400">{selectedModelIds.size}</b> mô hình
        </div>
      </div>

      {/* 2. Model Clusters Grid */}
      <div className="space-y-5">
        {clusters.map((cluster) => (
          <div key={cluster.cluster_id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            {/* Cluster Header */}
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

            {/* Model Cards */}
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
                    {/* Header */}
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

                    {/* Info */}
                    <div>
                      <div className="font-semibold text-slate-100 text-xs flex items-center justify-between">
                        <span className="truncate pr-1">{m.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    {/* Footer Actions: Download & Delete Model */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                      <span className={isHeavy ? "text-rose-400 font-bold" : "text-lime-400 font-bold"}>
                        ~{m.est_vram_gb} GB
                      </span>

                      {isInstalled ? (
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-sans font-medium">
                            <CheckCircle className="w-3 h-3" /> Đã tải
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Xác nhận xóa mô hình ${m.name} (${m.tag}) để giải phóng dung lượng ổ đĩa?`)) {
                                onDeleteModel(m.tag);
                              }
                            }}
                            title="Xóa mô hình này để giải phóng dung lượng"
                            className="p-1 hover:bg-rose-900/60 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadModel(m.tag);
                          }}
                          disabled={isDownloading}
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

      {/* Download Alert */}
      {isDownloading && (
        <div className="bg-slate-900 border border-lime-500 rounded-xl p-3.5 flex items-center gap-3">
          <Download className="w-5 h-5 text-lime-400 animate-bounce" />
          <div className="flex-1 text-xs font-mono text-slate-200">
            <span className="text-lime-400 font-bold">TIẾN TRÌNH TẢI OLLAMA:</span> {downloadProgress}
          </div>
        </div>
      )}
    </div>
  );
};
