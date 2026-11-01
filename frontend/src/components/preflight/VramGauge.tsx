import React from 'react';
import { Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';

interface VramGaugeProps {
  totalVramGb: number;
  usedVramOtherGb: number;
  modelVramGb: number;
  appName?: string;
  gpuName?: string;
}

export const VramGauge: React.FC<VramGaugeProps> = ({
  totalVramGb = 4.0,
  usedVramOtherGb = 1.3,
  modelVramGb = 1.6,
  appName = "Mô hình đã chọn",
  gpuName = "Thiết bị đồ họa (GPU)"
}) => {
  const total = Math.max(totalVramGb, 0.1);
  const targetThresholdGb = total * 0.85; // 85% an toàn
  const targetPercent = (targetThresholdGb / total) * 100;

  const currentTotalUsedGb = usedVramOtherGb + modelVramGb;
  const isOverVram = currentTotalUsedGb > total;
  const isNearTarget = currentTotalUsedGb > targetThresholdGb;

  // Calculate widths in percentage
  const modelPercent = Math.min((modelVramGb / total) * 100, 100);
  const otherPercent = Math.min((usedVramOtherGb / total) * 100, 100 - modelPercent);
  const totalPercent = Math.min((currentTotalUsedGb / total) * 100, 100);

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 shadow-xl backdrop-blur-md transition-all">
      {/* Title & Target header */}
      <div className="flex items-center justify-between text-xs text-zinc-400 mb-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span className="font-medium text-zinc-200">Bộ nhớ đồ họa (VRAM):</span>
          <span className="text-zinc-400">{gpuName}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span>Ngưỡng đề xuất:</span>
          <span className="text-zinc-300 font-mono font-medium">{targetThresholdGb.toFixed(1)} GB</span>
        </div>
      </div>

      {/* Main Gauge Progress Bar */}
      <div className="relative w-full h-6 bg-zinc-950 rounded-lg p-0.5 flex items-center overflow-hidden border border-zinc-800/80">
        {/* Model segment */}
        <div
          className={`h-full rounded-l transition-all duration-300 ${
            isOverVram ? 'bg-rose-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${modelPercent}%` }}
          title={`${appName}: ${modelVramGb.toFixed(2)} GB`}
        />

        {/* Other apps segment */}
        <div
          className="h-full bg-zinc-700/80 transition-all duration-300"
          style={{ width: `${otherPercent}%` }}
          title={`Ứng dụng khác: ${usedVramOtherGb.toFixed(2)} GB`}
        />

        {/* Target Vertical Marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400/90 z-20 flex flex-col items-center justify-between"
          style={{ left: `${targetPercent}%` }}
          title={`Ngưỡng an toàn (${targetPercent.toFixed(0)}%)`}
        >
          <div className="w-1.5 h-1 bg-amber-400 rounded-b-sm" />
          <div className="w-1.5 h-1 bg-amber-400 rounded-t-sm" />
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shrink-0" />
            <span className="text-zinc-400">{appName}:</span>
            <span className="text-zinc-200 font-mono font-medium">{modelVramGb.toFixed(2)} GB</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-zinc-700 shrink-0" />
            <span className="text-zinc-400">Hệ thống & ứng dụng khác:</span>
            <span className="text-zinc-300 font-mono font-medium">{usedVramOtherGb.toFixed(2)} GB</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">Tổng cộng:</span>
          <span className={`font-mono font-semibold ${
            isOverVram ? 'text-rose-400' : isNearTarget ? 'text-amber-400' : 'text-zinc-100'
          }`}>
            {currentTotalUsedGb.toFixed(2)} / {total.toFixed(1)} GB
          </span>
          <span className="text-zinc-400 text-xs">({totalPercent.toFixed(0)}%)</span>
        </div>
      </div>

      {/* Advisory Status Alert */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs">
        {isOverVram ? (
          <div className="text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Vượt quá dung lượng VRAM thực tế. Một phần mô hình sẽ tràn vào RAM hệ thống, có thể làm giảm tốc độ suy luận.</span>
          </div>
        ) : isNearTarget ? (
          <div className="text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Mức dùng gần ngưỡng dung lượng khuyến nghị. Khuyên bạn nên đóng bớt các ứng dụng đồ họa nặng khác.</span>
          </div>
        ) : (
          <div className="text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Phù hợp hoàn hảo. Toàn bộ trọng số mô hình được nạp trực tiếp vào VRAM card đồ họa cho tốc độ phản hồi nhanh nhất.</span>
          </div>
        )}
      </div>
    </div>
  );
};