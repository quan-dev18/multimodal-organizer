import React, { useState } from 'react';
import { 
  Sliders, 
  Database, 
  Search, 
  TrendingUp, 
  HardDrive, 
  Cpu,
  FolderOpen,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { FileExplorerTree } from './FileExplorerTree';
import { DedicatedTempCleaner } from './DedicatedTempCleaner';
import { RuleConfigView } from './RuleConfigView';
import { TieringOptimizerView } from './TieringOptimizerView';
import { SemanticSearchView } from './SemanticSearchView';
import { CostInsightsView } from './CostInsightsView';

interface MainAppProps {
  onBackToPreflight: () => void;
  activeModelNames: string[];
}

export const MainApp: React.FC<MainAppProps> = ({ onBackToPreflight, activeModelNames }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'temp_cleaner' | 'dashboard' | 'organize' | 'storage' | 'search' | 'insights'>('files');

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 select-none shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-800/80">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-lime-500 to-emerald-600 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-lime-950/50">
              M
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">MMO Desktop</h1>
              <p className="text-[11px] text-lime-400 font-mono">Multimodal Organizer</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('files')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'files' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-4 h-4" /> Cây Thư Mục & Quản Lý File
            </button>

            <button
              onClick={() => setActiveTab('temp_cleaner')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'temp_cleaner' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-950' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" /> Công Cụ Dọn Temp & Rác Hệ Thống
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'dashboard' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-4 h-4" /> Dashboard Đa Mô Hình
            </button>

            <button
              onClick={() => setActiveTab('organize')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'organize' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" /> Quy Tắc Sắp Xếp
            </button>

            <button
              onClick={() => setActiveTab('storage')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'storage' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Database className="w-4 h-4" /> Phân Tầng Hot / Warm / Cold
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'search' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Search className="w-4 h-4" /> Tìm Kiếm Ngữ Nghĩa
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'insights' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Báo Cáo & Tối Ưu Chi Phí
            </button>
          </nav>
        </div>

        {/* Multi-model status widget */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-lime-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></span>
              Cụm AI Đang Chạy ({activeModelNames.length})
            </span>
          </div>

          <div className="space-y-1">
            {activeModelNames.slice(0, 3).map((name, idx) => (
              <div key={idx} className="text-[11px] font-mono text-slate-300 truncate bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                • {name}
              </div>
            ))}
            {activeModelNames.length > 3 && (
              <div className="text-[10px] text-slate-500 italic">+{activeModelNames.length - 3} mô hình khác</div>
            )}
          </div>

          <button
            onClick={onBackToPreflight}
            className="mt-3 w-full py-1.5 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors font-semibold"
          >
            <Cpu className="w-3.5 h-3.5 text-lime-400" />
            Cấu hình VRAM & Cụm Model
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 p-6">
        {/* Top Header */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-800/80 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-lime-400" />
              Cây Thư Mục & Quản Lý Dữ Liệu Đa Phương Thức
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Duyệt tệp trong từng thư mục cụ thể, lọc file ẩn/rác, quét sâu theo nhu cầu có đo đếm thời gian.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-4 h-4" /> An toàn tuyệt đối (Recycle Bin)
            </span>
          </div>
        </header>

        {/* Tab 1: File Explorer Tree */}
        {activeTab === 'files' && <FileExplorerTree />}

        {/* Tab: Dedicated System & App Temp Cleaner */}
        {activeTab === 'temp_cleaner' && <DedicatedTempCleaner />}

        {/* Tab: Rules Engine (Quy Tắc Sắp Xếp) */}
        {activeTab === 'organize' && <RuleConfigView />}

        {/* Tab: Tiering Optimizer (Phân Tầng Hot / Warm / Cold) */}
        {activeTab === 'storage' && <TieringOptimizerView />}

        {/* Tab: Semantic Search (Tìm Kiếm Ngữ Nghĩa) */}
        {activeTab === 'search' && <SemanticSearchView />}

        {/* Tab: Insights & ROI (Báo Cáo & Tối Ưu Chi Phí) */}
        {activeTab === 'insights' && <CostInsightsView />}

        {/* Tab 2: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Văn Bản (Text)</span>
                <div className="text-xl font-bold text-slate-100 mt-2">1,248 tệp</div>
                <div className="text-[11px] text-slate-500 mt-1">Hot/Warm Tier · Qwen 2.5</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Hình Ảnh (Images)</span>
                <div className="text-xl font-bold text-slate-100 mt-2">4,810 tệp</div>
                <div className="text-[11px] text-slate-500 mt-1">Warm Tier · Moondream2</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Âm Thanh (Audio)</span>
                <div className="text-xl font-bold text-slate-100 mt-2">320 tệp</div>
                <div className="text-[11px] text-slate-500 mt-1">Cold Tier · Whisper</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Video</span>
                <div className="text-xl font-bold text-slate-100 mt-2">84 tệp</div>
                <div className="text-[11px] text-slate-500 mt-1">Cold Tier · Storage</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
