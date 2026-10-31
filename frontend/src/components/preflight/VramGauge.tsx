import React from 'react';

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
  appName = "MMO LOCAL AI",
  gpuName = "NVIDIA GeForce GTX 1650"
}) => {
  const total = Math.max(totalVramGb, 0.1);
  const targetThresholdGb = total * 0.82; // 82% threshold target
  const targetPercent = (targetThresholdGb / total) * 100;

  const currentTotalUsedGb = usedVramOtherGb + modelVramGb;
  const isOverVram = currentTotalUsedGb > total;
  const isNearTarget = currentTotalUsedGb > targetThresholdGb;

  // Calculate widths in percentage
  const modelPercent = Math.min((modelVramGb / total) * 100, 100);
  const otherPercent = Math.min((usedVramOtherGb / total) * 100, 100 - modelPercent);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
      {/* Title & Target header */}
      <div className="flex items-center justify-between text-xs tracking-widest text-slate-400 font-mono font-bold uppercase mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-lime-400 animate-pulse"></span>
          <span>DUNG LƯỢNG VRAM ƯỚC TÍNH:</span>
          <span className="text-slate-500 font-normal">({gpuName})</span>
        </div>
        <div className="flex items-center gap-2 pr-6">
          <span>TARGET (AN TOÀN):</span>
          <span className="text-slate-300 font-mono">{targetThresholdGb.toFixed(2)} GB</span>
        </div>
      </div>

      {/* Main Gauge Container with Game HUD style */}
      <div className="relative w-full h-8 bg-slate-950/80 border border-slate-700/60 rounded px-1 flex items-center overflow-hidden">
        {/* Model segment (Green/Lime striped) */}
        <div
          className={`h-6 rounded-l transition-all duration-500 ${isOverVram ? 'vram-segment-red' : 'vram-segment-green'}`}
          style={{ width: `${modelPercent}%` }}
          title={`MMO Model: ${modelVramGb.toFixed(2)} GB`}
        />

        {/* Other apps segment (White/Gray striped) */}
        <div
          className="h-6 transition-all duration-500 vram-segment-gray"
          style={{ width: `${otherPercent}%` }}
          title={`Ứng dụng khác: ${usedVramOtherGb.toFixed(2)} GB`}
        />

        {/* Target Vertical Marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 z-20 flex flex-col items-center justify-between"
          style={{ left: `${targetPercent}%` }}
        >
          <div className="w-2 h-1 bg-amber-400 -mt-0.5"></div>
          <div className="w-2 h-1 bg-amber-400 -mb-0.5"></div>
        </div>
      </div>

      {/* Footer Metrics similar to game screenshot */}
      <div className="mt-3 flex items-center justify-between text-xs font-mono font-semibold tracking-wide">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-lime-400">
            <span className="font-bold">III</span>
            <span className="uppercase">{appName}:</span>
            <span className="text-white text-sm">{modelVramGb.toFixed(2)} GB</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-bold">III</span>
            <span className="uppercase">ỨNG DỤNG KHÁC:</span>
            <span className="text-slate-200 text-sm">{usedVramOtherGb.toFixed(2)} GB</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">TỔNG:</span>
          <span className={`text-sm font-bold ${isOverVram ? 'text-red-400' : isNearTarget ? 'text-amber-400' : 'text-slate-100'}`}>
            {currentTotalUsedGb.toFixed(2)} / {total.toFixed(2)} GB
          </span>
        </div>
      </div>

      {/* Advisory Status Alert */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        {isOverVram ? (
          <div className="text-red-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>⚠️ Cảnh báo: Vượt quá dung lượng 4GB VRAM! Ollama sẽ tràn tải sang RAM, tốc độ phản hồi có thể bị chậm.</span>
          </div>
        ) : isNearTarget ? (
          <div className="text-amber-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Gần ngưỡng giới hạn Target! Mô hình hoạt động ổn định nhưng nên tắt bớt tác vụ đồ họa khác.</span>
          </div>
        ) : (
          <div className="text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Trạng thái Tối Ưu: Mô hình nằm trọn 100% trong VRAM (GTX 1650). Tốc độ xử lý tối đa, cực kỳ mượt mà!</span>
          </div>
        )}
      </div>
    </div>
  );
};
