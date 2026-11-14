import React from 'react';
import { X, Check, Download, Zap, ShieldCheck } from 'lucide-react';
import type { ModelItem } from './MultiModelSelector';

interface ModelComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelItem[];
  selectedModelIds: Set<string>;
  installedModels: string[];
  onToggleModel: (m: ModelItem) => void;
  onDownloadSingleModel: (modelTag: string) => void;
}

export const ModelComparisonModal: React.FC<ModelComparisonModalProps> = ({
  isOpen,
  onClose,
  models,
  selectedModelIds,
  installedModels,
  onToggleModel,
  onDownloadSingleModel
}) => {
  if (!isOpen) return null;

  const COMPARISON_SPECS: Record<string, {
    params: string;
    speed: string;
    ttft: string;
    vietnamese: string;
    idealLaptop: string;
  }> = {
    'qwen2.5:0.5b': {
      params: '0.49 Tỷ',
      speed: '~55 - 70 tok/s',
      ttft: '< 150 ms',
      vietnamese: 'Tốt (Đủ hiểu ngữ cảnh tệp)',
      idealLaptop: 'Laptop Ultrabook/Văn phòng (Core i3/i5, 8GB RAM, không card rời)'
    },
    'qwen2.5:1.5b': {
      params: '1.54 Tỷ',
      speed: '~35 - 50 tok/s',
      ttft: '~200 ms',
      vietnamese: 'Xuất sắc (Tối ưu Tiếng Việt & Phân loại)',
      idealLaptop: 'Laptop phổ thông (Core i5/i7, 8GB-16GB RAM, Iris Xe hoặc GTX 1650)'
    },
    'llama3.2:3b': {
      params: '3.21 Tỷ',
      speed: '~25 - 35 tok/s',
      ttft: '~350 ms',
      vietnamese: 'Khá tốt (Suy luận & Tóm tắt mạnh mẽ)',
      idealLaptop: 'Laptop đồ họa/lập trình (16GB RAM, RTX 3050/4050 4GB+)'
    },
    'mistral:7b': {
      params: '7.24 Tỷ',
      speed: '~12 - 20 tok/s',
      ttft: '~600 ms',
      vietnamese: 'Khá (Tập trung logic & suy luận chuyên sâu)',
      idealLaptop: 'Laptop gaming cao cấp (16GB-32GB RAM, RTX 3060/4060 6GB-8GB)'
    },
    'phi3:mini': {
      params: '3.82 Tỷ',
      speed: '~22 - 30 tok/s',
      ttft: '~300 ms',
      vietnamese: 'Khá (Mạnh về toán và cấu trúc JSON)',
      idealLaptop: 'Laptop 16GB RAM, chip thế hệ mới có NPU hoặc GPU rời 4GB'
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              Bảng So Sánh Chi Tiết Các Mô Hình AI
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Đánh giá thông số kỹ thuật, VRAM và mức độ tương thích trước khi tải về laptop của bạn
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Comparison Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="py-3 px-4 font-semibold w-44 bg-zinc-900/40 rounded-l-xl">Tiêu chí so sánh</th>
                {models.map(m => {
                  const isInstalled = installedModels.some(t => t.includes(m.tag) || m.tag.includes(t));
                  return (
                    <th key={m.id} className="py-3 px-4 font-semibold min-w-[180px]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-zinc-100 font-bold text-sm">{m.name}</span>
                        {isInstalled && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            Đã tải
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-indigo-400 block">{m.tag}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {/* Parameters */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-zinc-400 bg-zinc-900/20">Số lượng tham số</td>
                {models.map(m => (
                  <td key={m.id} className="py-3.5 px-4 font-mono font-semibold text-zinc-200">
                    {COMPARISON_SPECS[m.tag]?.params || m.params || 'Tiêu chuẩn'}
                  </td>
                ))}
              </tr>

              {/* VRAM Requirement */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-zinc-400 bg-zinc-900/20">VRAM đề xuất</td>
                {models.map(m => (
                  <td key={m.id} className="py-3.5 px-4 font-mono text-amber-300">
                    {m.est_vram_gb} GB
                  </td>
                ))}
              </tr>

              {/* Disk Size */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-zinc-400 bg-zinc-900/20">Dung lượng ổ cứng</td>
                {models.map(m => (
                  <td key={m.id} className="py-3.5 px-4 font-mono text-zinc-300">
                    {m.size_download_gb} GB
                  </td>
                ))}
              </tr>

              {/* Speed Rating */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-zinc-400 bg-zinc-900/20">Tốc độ sinh text</td>
                {models.map(m => (
                  <td key={m.id} className="py-3.5 px-4 text-emerald-400 font-semibold">
                    {COMPARISON_SPECS[m.tag]?.speed || 'Rất nhanh'}
                  </td>
                ))}
              </tr>

              {/* TTFT Latency */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-zinc-400 bg-zinc-900/20">Độ trễ từ đầu (TTFT)</td>
                {models.map(m => (
                  <td key={m.id} className="py-3.5 px-4 font-mono text-zinc-300">
                    {COMPARISON_SPECS[m.tag]?.ttft || '< 250 ms'}
                  </td>
                ))}
              </tr>

              {/* Vietnamese support */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-zinc-400 bg-zinc-900/20">Độ chuẩn Tiếng Việt</td>
                {models.map(m => (
                  <td key={m.id} className="py-3.5 px-4 text-zinc-200">
                    {COMPARISON_SPECS[m.tag]?.vietnamese || 'Tốt'}
                  </td>
                ))}
              </tr>

              {/* Laptop Suitability */}
              <tr>
                <td className="py-3.5 px-4 font-medium text-zinc-400 bg-zinc-900/20">Cấu hình laptop phù hợp</td>
                {models.map(m => (
                  <td key={m.id} className="py-3.5 px-4 text-zinc-300 leading-relaxed text-[11px]">
                    {COMPARISON_SPECS[m.tag]?.idealLaptop || 'Laptop thông dụng'}
                  </td>
                ))}
              </tr>

              {/* Action Buttons */}
              <tr className="bg-zinc-900/30">
                <td className="py-4 px-4 font-medium text-zinc-400">Thao tác</td>
                {models.map(m => {
                  const isInstalled = installedModels.some(t => t.includes(m.tag) || m.tag.includes(t));
                  const isSelected = selectedModelIds.has(m.id);
                  return (
                    <td key={m.id} className="py-4 px-4">
                      {isInstalled ? (
                        <button
                          onClick={() => onToggleModel(m)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isSelected ? 'Đang chọn' : 'Chọn dùng'}
                        </button>
                      ) : (
                        <button
                          onClick={() => onDownloadSingleModel(m.tag)}
                          className="w-full py-2 px-3 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Tải về ngay
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Modal Footer Advice */}
        <div className="px-6 py-3.5 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Lời khuyên: Với laptop thông thường, <strong className="text-indigo-300 font-mono">qwen2.5:1.5b</strong> là lựa chọn vàng giữa tốc độ và độ chính xác phân loại.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
