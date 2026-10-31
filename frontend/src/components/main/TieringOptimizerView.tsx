import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Flame, 
  Sun, 
  Snowflake, 
  ArrowRightLeft, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  FolderOpen,
  Folder
} from 'lucide-react';
import { sfx } from '../../lib/sounds';
import { useApp } from '../../lib/AppContext';

const API_BASE = "http://127.0.0.1:8001/api";

interface TierStats {
  count: number;
  bytes: number;
  size_formatted: string;
  sample: any[];
}

export const TieringOptimizerView: React.FC = () => {
  const { t, globalDirectory, setGlobalDirectory } = useApp();
  const [migrationRunning, setMigrationRunning] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [sourceDir, setSourceDir] = useState<string>(globalDirectory);

  // Sync with global directory
  useEffect(() => {
    setSourceDir(globalDirectory);
  }, [globalDirectory]);
  
  const [hotData, setHotData] = useState<TierStats>({ count: 0, bytes: 0, size_formatted: '0 B', sample: [] });
  const [warmData, setWarmData] = useState<TierStats>({ count: 0, bytes: 0, size_formatted: '0 B', sample: [] });
  const [coldData, setColdData] = useState<TierStats>({ count: 0, bytes: 0, size_formatted: '0 B', sample: [] });

  const fetchRealTiering = async () => {
    setIsScanning(true);
    try {
      const res = await fetch(`${API_BASE}/storage/tiering_scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_dir: sourceDir })
      });
      const data = await res.json();
      if (data.success) {
        setHotData(data.hot);
        setWarmData(data.warm);
        setColdData(data.cold);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchRealTiering();
  }, [sourceDir]);

  const handlePickDirectory = async () => {
    sfx.click();
    try {
      const res = await fetch(`${API_BASE}/system/select_folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: "Chọn thư mục phân tầng dữ liệu" })
      });
      const data = await res.json();
      if (data && data.success && data.path) {
        setSourceDir(data.path);
        setGlobalDirectory(data.path);
        return;
      }
    } catch {}

    const manual = prompt('Nhập đường dẫn thư mục cần phân tích:', sourceDir);
    if (manual && manual.trim()) {
      setSourceDir(manual.trim());
      setGlobalDirectory(manual.trim());
    }
  };

  const handleRunOptimizer = async () => {
    sfx.scan();
    setMigrationRunning(true);
    setStatusMsg(t('moving_files'));

    try {
      const res = await fetch(`${API_BASE}/storage/tiering_migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_dir: sourceDir, target_cold_dir: `${sourceDir}\\Cold_Tier_Vault` })
      });
      const data = await res.json();
      if (data.success) {
        sfx.complete();
        setStatusMsg(data.message || 'Đã hoàn tất phân tầng!');
        fetchRealTiering();
      } else {
        setStatusMsg(data.message || 'Lỗi khi tối ưu phân tầng');
      }
    } catch (e: any) {
      setStatusMsg(`Lỗi kết nối: ${e.message}`);
    } finally {
      setMigrationRunning(false);
    }
  };

  const tiers = [
    {
      id: 'hot',
      name: t('hot_tier_name'),
      icon: Flame,
      color: 'text-rose-400',
      bgColor: 'bg-zinc-900/60 border-zinc-800',
      storageType: t('hot_tier_infra'),
      accessFreq: t('hot_tier_criteria'),
      costPerGb: t('hot_tier_cost'),
      latency: '< 5 ms',
      filesCount: hotData.count,
      totalFormatted: hotData.size_formatted,
      description: t('hot_tier_desc')
    },
    {
      id: 'warm',
      name: t('warm_tier_name'),
      icon: Sun,
      color: 'text-amber-400',
      bgColor: 'bg-zinc-900/60 border-zinc-800',
      storageType: t('warm_tier_infra'),
      accessFreq: t('warm_tier_criteria'),
      costPerGb: t('warm_tier_cost'),
      latency: '20 - 80 ms',
      filesCount: warmData.count,
      totalFormatted: warmData.size_formatted,
      description: t('warm_tier_desc')
    },
    {
      id: 'cold',
      name: t('cold_tier_name'),
      icon: Snowflake,
      color: 'text-sky-400',
      bgColor: 'bg-zinc-900/60 border-zinc-800',
      storageType: t('cold_tier_infra'),
      accessFreq: t('cold_tier_criteria'),
      costPerGb: t('cold_tier_cost'),
      latency: '> 500 ms',
      filesCount: coldData.count,
      totalFormatted: coldData.size_formatted,
      description: t('cold_tier_desc')
    }
  ];

  const totalFiles = hotData.count + warmData.count + coldData.count;

  return (
    <div className="flex-1 flex flex-col p-6 space-y-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            {t('tiering_title')}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {t('tiering_desc')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRealTiering}
            disabled={isScanning || migrationRunning}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs flex items-center gap-1.5 border border-zinc-700 shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-indigo-400' : ''}`} />
            {t('rescan_btn')}
          </button>

          <button
            onClick={handleRunOptimizer}
            disabled={migrationRunning}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {migrationRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('moving_files')}
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-3.5 h-3.5" />
                {t('run_optimizer_btn')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Directory Selector Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 flex-1 min-w-[320px]">
          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-medium text-zinc-300 shrink-0">{t('analyzed_folder')}</span>
          <input
            type="text"
            value={sourceDir}
            onChange={(e) => setSourceDir(e.target.value)}
            className="flex-1 bg-zinc-950/80 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-mono">
            {t('total_indexed', { count: totalFiles })}
          </span>
          <button
            onClick={handlePickDirectory}
            type="button"
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            {t('browse_btn')}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-3.5 px-4 text-xs text-indigo-300 flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Tier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <div 
              key={tier.id}
              className={`p-5 rounded-xl border ${tier.bgColor} flex flex-col justify-between space-y-4 shadow-sm hover:border-zinc-700/80 transition-all`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/60">
                    <Icon className={`w-5 h-5 ${tier.color}`} />
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold font-mono text-zinc-100">
                      {tier.totalFormatted}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      {tier.filesCount} {t('files_count_unit')}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <h3 className="font-semibold text-xs text-zinc-100">{tier.name}</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed min-h-[38px]">
                    {tier.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/60 space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>{t('infra_label')}</span>
                  <span className="font-medium text-zinc-200">{tier.storageType}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>{t('criteria_label')}</span>
                  <span className="font-medium text-zinc-300">{tier.accessFreq}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>{t('target_cost_label')}</span>
                  <span className="font-medium text-emerald-400">{tier.costPerGb}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>{t('avg_latency_label')}</span>
                  <span className="font-mono text-zinc-300">{tier.latency}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
