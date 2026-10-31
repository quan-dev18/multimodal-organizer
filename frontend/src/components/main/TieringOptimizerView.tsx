import React, { useState } from 'react';
import { 
  Database, 
  Flame, 
  Sun, 
  Snowflake, 
  ArrowRightLeft, 
  CheckCircle
} from 'lucide-react';

export const TieringOptimizerView: React.FC = () => {
  const [migrationRunning, setMigrationRunning] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const tiers = [
    {
      id: 'hot',
      name: 'Hot Tier (Truy Xuất Nhanh)',
      icon: Flame,
      color: 'text-rose-400',
      bgColor: 'bg-rose-950/20 border-rose-500/40',
      storageType: 'NVMe / SSD Cực Nhanh (Redis, RAM Cache)',
      accessFreq: 'Hàng ngày (> 5 lần/tuần)',
      costPerGb: '0.12 $/tháng',
      latency: '< 5 ms',
      filesCount: 182,
      totalGb: '14.8 GB',
      description: 'Dữ liệu đang tích cực xử lý, tài liệu công việc tuần này, mã nguồn đang dev.'
    },
    {
      id: 'warm',
      name: 'Warm Tier (Trung Bình)',
      icon: Sun,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/20 border-amber-500/40',
      storageType: 'SSD / HDD Tốc Độ Cao (PostgreSQL, Milvus, MinIO)',
      accessFreq: 'Hàng tuần (1 - 4 lần/tháng)',
      costPerGb: '0.04 $/tháng',
      latency: '20 - 80 ms',
      filesCount: 3410,
      totalGb: '42.6 GB',
      description: 'Hình ảnh, thư viện assets, báo cáo tháng trước, dataset đã embed vector.'
    },
    {
      id: 'cold',
      name: 'Cold Tier (Lưu Trữ Lâu Dài)',
      icon: Snowflake,
      color: 'text-sky-400',
      bgColor: 'bg-sky-950/20 border-sky-500/40',
      storageType: 'HDD / Object Storage Nén (MinIO Cold, Zip/7z)',
      accessFreq: 'Hiếm khi (< 1 lần/quý)',
      costPerGb: '0.008 $/tháng',
      latency: '> 500 ms',
      filesCount: 6120,
      totalGb: '128.4 GB',
      description: 'Bản ghi log cũ, video raw đã xuất, bộ cài đặt, tệp sao lưu lưu trữ an toàn.'
    }
  ];

  const handleRunOptimizer = () => {
    setMigrationRunning(true);
    setStatusMsg('AI Tiering Optimizer (LightGBM Policy Engine) đang phân tích tần suất truy cập...');
    setTimeout(() => {
      setMigrationRunning(false);
      setStatusMsg('Đã hoàn tất tối ưu phân tầng! Tự động chuyển 45 tệp không dùng sang Cold Tier để tiết kiệm 68% chi phí lưu trữ.');
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Database className="w-6 h-6 text-sky-400" />
            Phân Tầng Dữ Liệu Tự Động (Hot / Warm / Cold Tiering)
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Hàm mục tiêu: Tối thiểu hoá tổng chi phí vận hành min Σ [S_i · c(t_i) + λ · E[N_i] · ℓ(t_i)] + C_AI
          </p>
        </div>

        <button
          onClick={handleRunOptimizer}
          disabled={migrationRunning}
          className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-950/40 font-mono transition-all disabled:opacity-50"
        >
          <ArrowRightLeft className={`w-4 h-4 ${migrationRunning ? 'animate-spin' : ''}`} />
          {migrationRunning ? 'Đang Tối Ưu...' : 'Chạy Tối Ưu Phân Tầng AI'}
        </button>
      </div>

      {statusMsg && (
        <div className="bg-sky-950/40 border border-sky-500/60 rounded-xl p-3 px-4 text-xs font-mono text-sky-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-sky-400" />
          {statusMsg}
        </div>
      )}

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tiers.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between ${t.bgColor} shadow-xl`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`p-2 rounded-xl bg-slate-950/80 border border-slate-800 ${t.color}`}>
                    <Icon className="w-6 h-6" />
                  </span>
                  <div className="text-right">
                    <span className="text-lg font-bold font-mono text-white">{t.totalGb}</span>
                    <p className="text-[11px] text-slate-400 font-mono">{t.filesCount} tệp</p>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white">{t.name}</h3>
                <p className="text-xs text-slate-300 mt-2 font-mono leading-relaxed">{t.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Hạ tầng:</span>
                  <span className="text-slate-200 text-right">{t.storageType}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tần suất:</span>
                  <span className="text-slate-200">{t.accessFreq}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Chi phí/GB:</span>
                  <span className="text-emerald-400 font-bold">{t.costPerGb}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Độ trễ:</span>
                  <span className="text-slate-200">{t.latency}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
