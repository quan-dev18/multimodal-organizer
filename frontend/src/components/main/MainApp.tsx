import { useState } from 'react';
import { 
  FolderSearch, 
  Layers, 
  Sliders, 
  Database, 
  Search, 
  TrendingUp, 
  HardDrive, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Cpu
} from 'lucide-react';

interface MainAppProps {
  onBackToPreflight: () => void;
  activeModelName: string;
}

export const MainApp = ({ onBackToPreflight, activeModelName }: MainAppProps) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'library' | 'organize' | 'search' | 'storage' | 'insights'>('dashboard');

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 select-none">
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

          {/* Navigation Items (8 screens from Phase Roadmap) */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'dashboard' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-4 h-4" /> 1. Dashboard
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'library' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" /> 2. Thư Viện Đa Phương Thức
            </button>

            <button
              onClick={() => setActiveTab('organize')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'organize' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" /> 3. Luật & Sắp Xếp
            </button>

            <button
              onClick={() => setActiveTab('storage')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'storage' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Database className="w-4 h-4" /> 4. Nơi Lưu Trữ (Hot/Warm/Cold)
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'search' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Search className="w-4 h-4" /> 5. Tìm Kiếm Ngữ Nghĩa
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'insights' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> 6. Insights & Chi Phí
            </button>
          </nav>
        </div>

        {/* Model status footer widget */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-lime-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></span>
              Local AI Engine
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-200 truncate">
            {activeModelName}
          </div>
          <button
            onClick={onBackToPreflight}
            className="mt-2.5 w-full py-1.5 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-lime-400" />
            Cấu hình VRAM / Model
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-8">
        {/* Top Header */}
        <header className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800/80">
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">
              {activeTab === 'dashboard' && 'Dashboard Tổng Quan Lưu Trữ'}
              {activeTab === 'library' && 'Thư Viện Tệp Đa Phương Thức'}
              {activeTab === 'organize' && 'Quy Tắc Định Tuyến & Sắp Xếp'}
              {activeTab === 'storage' && 'Quản Lý Vị Trí Lưu Trữ (Hot / Warm / Cold)'}
              {activeTab === 'search' && 'Tìm Kiếm Hybrid (FTS5 + LanceDB Vector)'}
              {activeTab === 'insights' && 'Insights Phân Tầng & Báo Cáo Chi Phí'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Hệ thống tổ chức lưu trữ đa phương thức cục bộ bám sát kiến trúc 9 lớp.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow">
              <FolderSearch className="w-4 h-4" />
              Quét Thư Mục Mới
            </button>
          </div>
        </header>

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Metric cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Văn Bản (Text)</span>
                  <FileText className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl font-bold text-slate-100 mt-2">1,248 tệp</div>
                <div className="text-[11px] text-slate-500 mt-1">1.82 GB · Tầng Hot/Warm</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Hình Ảnh (Images)</span>
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-slate-100 mt-2">4,810 tệp</div>
                <div className="text-[11px] text-slate-500 mt-1">14.6 GB · Tầng Warm</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Âm Thanh (Audio)</span>
                  <Music className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl font-bold text-slate-100 mt-2">320 tệp</div>
                <div className="text-[11px] text-slate-500 mt-1">3.2 GB · Tầng Cold</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Video</span>
                  <Video className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-xl font-bold text-slate-100 mt-2">84 tệp</div>
                <div className="text-[11px] text-slate-500 mt-1">42.1 GB · Tầng Cold/Storage</div>
              </div>
            </div>

            {/* Storage Tiers Visualizer */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-lime-400" />
                Phân Bổ Dữ Liệu Theo 3 Tầng Lưu Trữ (Polyglot Storage Tiers)
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span className="font-semibold text-rose-400">🔥 HOT TIER (SSD Cục Bộ - NVMe)</span>
                    <span className="font-mono">18.4 GB / 256 GB (Độ trễ &lt; 5ms)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span className="font-semibold text-amber-400">🌤️ WARM TIER (Ổ Đĩa D: HDD / SATA)</span>
                    <span className="font-mono">82.0 GB / 1000 GB</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '28%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span className="font-semibold text-sky-400">🧊 COLD TIER (Lưu Trữ Ngoài / Nén)</span>
                    <span className="font-mono">140.5 GB / Không Giới Hạn</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent AI Ingestion Queue */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center justify-between">
                <span>Hàng Đợi Xử Lý AI Gần Nhất (L1 Ingestion & L3 Understanding)</span>
                <span className="text-xs text-lime-400 font-mono font-normal">Active Local Model: {activeModelName}</span>
              </h3>
              <div className="divide-y divide-slate-800 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-sky-400" />
                    <div>
                      <div className="font-medium text-slate-200">De_tai_NCKH_Multimodal_Final.pdf</div>
                      <div className="text-[11px] text-slate-500">Đã gán nhãn: "Khoa học", "AI", "Kiến trúc hệ thống" · Độ tin cậy: 98%</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 text-[11px]">Đã sắp xếp</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-medium text-slate-200">Screenshot_VRAM_Budget_CallOfDuty.png</div>
                      <div className="text-[11px] text-slate-500">OCR & Vision: "Thanh VRAM ước tính", "TARGET 7.91GB"</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 text-[11px]">Đã sắp xếp</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Library Preview */}
        {activeTab === 'library' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
            <Layers className="w-10 h-10 text-lime-400 mx-auto mb-3 opacity-80" />
            <h3 className="font-semibold text-slate-200 text-base">Thư viện tệp đa phương thức</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Hỗ trợ duyệt lưới, danh sách, xem trước (Preview) nội dung và gắn thẻ tag ngữ nghĩa qua mô hình SLM cục bộ.
            </p>
          </div>
        )}

        {/* Tab 3: Organize */}
        {activeTab === 'organize' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
            <Sliders className="w-10 h-10 text-lime-400 mx-auto mb-3 opacity-80" />
            <h3 className="font-semibold text-slate-200 text-base">Quy tắc sắp xếp & Định tuyến dữ liệu</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Tùy biến template đường dẫn: <code className="text-lime-400 font-mono">{"{modality}/{year}/{month}/{label}/{name}"}</code> kèm cơ chế chạy thử (Dry-run) và hoàn tác (Undo).
            </p>
          </div>
        )}

        {/* Tab 4: Storage */}
        {activeTab === 'storage' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
            <Database className="w-10 h-10 text-lime-400 mx-auto mb-3 opacity-80" />
            <h3 className="font-semibold text-slate-200 text-base">Quản lý Storage Locations</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Định nghĩa vai trò Hot / Warm / Cold cho từng ổ đĩa hoặc thư mục nội bộ.
            </p>
          </div>
        )}

        {/* Tab 5: Search */}
        {activeTab === 'search' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
            <Search className="w-10 h-10 text-lime-400 mx-auto mb-3 opacity-80" />
            <h3 className="font-semibold text-slate-200 text-base">Tìm kiếm Hybrid (FTS5 + LanceDB Vector)</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Tìm kiếm chéo modality kết hợp từ khóa chính xác và vector embedding từ mô hình BGE-M3.
            </p>
          </div>
        )}

        {/* Tab 6: Insights */}
        {activeTab === 'insights' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
            <TrendingUp className="w-10 h-10 text-lime-400 mx-auto mb-3 opacity-80" />
            <h3 className="font-semibold text-slate-200 text-base">Báo cáo chi phí và tối ưu hóa</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Theo dõi hàm mục tiêu chi phí lưu trữ, tần suất truy cập, và chi phí suy luận AI theo công thức bài toán nghiên cứu.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
