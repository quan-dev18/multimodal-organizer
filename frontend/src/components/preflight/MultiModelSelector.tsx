import React from 'react';
import { Download, CheckCircle, Layers, Check } from 'lucide-react';

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
  onToggleModel: (model: ModelItem) => void;
  onDownloadModel: (modelTag: string) => void;
}

export const MultiModelSelector: React.FC<MultiModelSelectorProps> = ({
  clusters,
  selectedModelIds,
  installedModels,
  isDownloading,
  downloadProgress,
  onToggleModel,
  onDownloadModel
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-lime-400" />
            Cụm Mô Hình AI Đa Phương Thức (Multi-Model System Architecture)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Chọn tổ hợp nhiều mô hình phối hợp chạy đồng thời: SLM phân loại văn bản + Vision phân tích ảnh + BGE-M3 tạo vector nhúng.
          </p>
        </div>
        <div className="text-xs font-mono text-lime-400 bg-lime-950/40 border border-lime-800/80 px-3 py-1 rounded-full">
          Đang chọn: <b>{selectedModelIds.size}</b> mô hình phối hợp
        </div>
      </div>

      {/* Render Clusters */}
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

            {/* Model Cards in Cluster */}
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
                    {/* Header: Checkbox + Badge */}
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

                    {/* Name & Params */}
                    <div>
                      <div className="font-semibold text-slate-100 text-xs flex items-center justify-between">
                        <span className="truncate pr-1">{m.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                      <span className={isHeavy ? "text-rose-400 font-bold" : "text-lime-400 font-bold"}>
                        ~{m.est_vram_gb} GB
                      </span>

                      {isInstalled ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-sans font-medium">
                          <CheckCircle className="w-3 h-3" /> Đã tải
                        </span>
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

      {/* Download Stream Alert */}
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
