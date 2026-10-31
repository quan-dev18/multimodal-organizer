import { Download, CheckCircle, Layers } from 'lucide-react';

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
  recommended_for: string[];
}

interface ModelSelectorProps {
  catalog: ModelItem[];
  selectedModel: ModelItem;
  installedModels: string[];
  isDownloading: boolean;
  downloadProgress: string;
  onSelectModel: (model: ModelItem) => void;
  onDownloadModel: (modelTag: string) => void;
}

export const ModelSelector = ({
  catalog,
  selectedModel,
  installedModels,
  isDownloading,
  downloadProgress,
  onSelectModel,
  onDownloadModel
}: ModelSelectorProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-lime-400" />
            Tuyển Chọn Mô Hình Nhỏ Chạy Cục Bộ (Ollama SLMs)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Các mô hình đã được tinh chỉnh tham số để chạy trực tiếp trên GTX 1650 (4GB VRAM) & 16GB RAM.
          </p>
        </div>
      </div>

      {/* Grid of model cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {catalog.map((m) => {
          const isSelected = selectedModel.id === m.id;
          const isInstalled = installedModels.some(tag => tag.includes(m.tag) || m.tag.includes(tag));
          const isHeavy = m.est_vram_gb > 3.8;

          return (
            <div
              key={m.id}
              onClick={() => onSelectModel(m)}
              className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border text-left flex flex-col justify-between relative ${
                isSelected
                  ? 'bg-slate-800/90 border-lime-500/80 shadow-lg shadow-lime-950/40 ring-1 ring-lime-500/40'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
              }`}
            >
              {/* Badges */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  isHeavy 
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                    : 'bg-lime-950/80 text-lime-400 border border-lime-800/70'
                }`}>
                  {m.badge}
                </span>

                {isInstalled ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> Đã tải
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Tải về ~{m.size_download_gb} GB
                  </span>
                )}
              </div>

              {/* Title & Category */}
              <div>
                <h4 className="font-semibold text-slate-100 text-sm flex items-center justify-between">
                  {m.name}
                  <span className="text-xs font-mono text-slate-400 font-normal">{m.params}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {m.description}
                </p>
              </div>

              {/* Footer info: VRAM estimate + download trigger */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="font-mono text-slate-300">
                  VRAM: <span className={isHeavy ? "text-rose-400 font-bold" : "text-lime-400 font-bold"}>~{m.est_vram_gb} GB</span>
                </div>

                {isInstalled ? (
                  <button
                    disabled
                    className="px-2.5 py-1 bg-emerald-950/50 text-emerald-400 border border-emerald-800/50 rounded text-xs flex items-center gap-1 opacity-80"
                  >
                    <CheckCircle className="w-3 h-3" /> Sẵn sàng
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadModel(m.tag);
                    }}
                    disabled={isDownloading}
                    className="px-3 py-1 bg-lime-500 hover:bg-lime-400 text-slate-950 font-semibold rounded text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3 h-3" /> Tải về
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress banner if downloading */}
      {isDownloading && (
        <div className="bg-slate-900 border border-lime-500/50 rounded-lg p-3 flex items-center gap-3 animate-pulse">
          <Download className="w-5 h-5 text-lime-400 animate-bounce" />
          <div className="flex-1 text-xs font-mono text-slate-300">
            <span className="text-lime-400 font-bold">ĐANG TẢI MÔ HÌNH QUA OLLAMA:</span> {downloadProgress}
          </div>
        </div>
      )}
    </div>
  );
};
