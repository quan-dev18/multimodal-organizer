import { useState } from 'react';
import { 
  Sliders, 
  Database, 
  Search, 
  TrendingUp, 
  HardDrive, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Cpu,
  Trash2,
  Eye,
  EyeOff,
  FolderOpen,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  FolderCheck,
  ShieldCheck
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8001/api";

interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size_bytes: number;
  size_formatted: string;
  extension: string;
  is_hidden: boolean;
  is_junk: boolean;
  modified_timestamp: number;
  modality: string;
}

interface MainAppProps {
  onBackToPreflight: () => void;
  activeModelName: string;
}

export const MainApp = ({ onBackToPreflight, activeModelName }: MainAppProps) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'files' | 'organize' | 'search' | 'storage' | 'insights'>('files');

  // File Manager State
  const [scanPath, setScanPath] = useState<string>("d:\\AI_NCKH");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [showHidden, setShowHidden] = useState<boolean>(true);
  const [showJunkOnly, setShowJunkOnly] = useState<boolean>(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [actionStatus, setActionStatus] = useState<string>("");

  // Scan folder
  const handleScanDirectory = async () => {
    setIsScanning(true);
    setActionStatus("Đang quét cấu trúc thư mục...");
    try {
      const res = await fetch(`${API_BASE}/files/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: scanPath, include_hidden: showHidden })
      });
      const data = await res.json();
      setFileList(data.files || []);
      setSelectedPaths(new Set());
      setActionStatus(`Quét thành công ${data.total_items} tệp/thư mục.`);
    } catch (e: any) {
      setActionStatus(`Lỗi khi quét: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Safe Trash Cleanup (Recycle Bin)
  const handleSafeCleanTrash = async () => {
    const pathsToClean = selectedPaths.size > 0 
      ? Array.from(selectedPaths)
      : fileList.filter(f => f.is_junk).map(f => f.path);

    if (pathsToClean.length === 0) {
      alert("Không có tệp rác nào được chọn để dọn dẹp.");
      return;
    }

    if (!confirm(`Xác nhận dọn dẹp an toàn ${pathsToClean.length} tệp? (Các tệp sẽ được chuyển vào Thùng rác Windows Recycle Bin và có thể khôi phục lại bất kỳ lúc nào)`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/files/trash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_paths: pathsToClean })
      });
      const data = await res.json();
      setActionStatus(`Đã chuyển an toàn ${data.cleaned_count} tệp vào Thùng rác Windows!`);
      // re-scan
      handleScanDirectory();
    } catch (e: any) {
      setActionStatus(`Lỗi khi dọn dẹp: ${e.message}`);
    }
  };

  // Safe Organize
  const handleSafeOrganize = async (mode: 'copy' | 'move') => {
    const pathsToOrganize = selectedPaths.size > 0 
      ? Array.from(selectedPaths)
      : fileList.filter(f => !f.is_dir && !f.is_junk).map(f => f.path);

    if (pathsToOrganize.length === 0) {
      alert("Vui lòng chọn các tệp cần sắp xếp.");
      return;
    }

    const targetBase = prompt("Nhập đường dẫn thư mục đích để sắp xếp đa phương thức:", `${scanPath}\\Organized_Storage`);
    if (!targetBase) return;

    try {
      const res = await fetch(`${API_BASE}/files/organize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_paths: pathsToOrganize,
          target_base: targetBase,
          mode
        })
      });
      const data = await res.json();
      setActionStatus(`Đã sắp xếp an toàn ${data.success_count} tệp theo 4 modality (text, image, audio, video) vào ${targetBase}`);
      handleScanDirectory();
    } catch (e: any) {
      setActionStatus(`Lỗi sắp xếp: ${e.message}`);
    }
  };

  // Filter items
  const filteredFiles = fileList.filter(f => {
    if (!showHidden && f.is_hidden) return false;
    if (showJunkOnly && !f.is_junk) return false;
    return true;
  });

  const toggleSelect = (p: string) => {
    const s = new Set(selectedPaths);
    if (s.has(p)) s.delete(p);
    else s.add(p);
    setSelectedPaths(s);
  };

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

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('files')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'files' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-4 h-4" /> Quản Lý & Dọn Dẹp File
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'dashboard' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-4 h-4" /> Dashboard Lưu Trữ
            </button>

            <button
              onClick={() => setActiveTab('organize')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'organize' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" /> Luật & Sắp Xếp
            </button>

            <button
              onClick={() => setActiveTab('storage')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'storage' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Database className="w-4 h-4" /> Vị Trí Hot/Warm/Cold
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
              <TrendingUp className="w-4 h-4" /> Báo Cáo & Chi Phí
            </button>
          </nav>
        </div>

        {/* Local model status widget */}
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
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 p-6">
        {/* Top Header */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-800/80 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-lime-400" />
              Quản Lý Tệp Cục Bộ & Dọn Dẹp An Toàn (L1 Ingestion & L6 Storage)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Phát hiện file ẩn, rác tạm (.tmp, thumbs.db), dọn dẹp vào Thùng rác và sắp xếp theo kiến trúc đa phương thức.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-4 h-4" /> An toàn tuyệt đối
            </span>
          </div>
        </header>

        {/* Tab Content: File Manager */}
        {activeTab === 'files' && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-4 pt-4">
            {/* Toolbar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-[320px]">
                <input
                  type="text"
                  value={scanPath}
                  onChange={(e) => setScanPath(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-lime-500"
                  placeholder="Nhập đường dẫn thư mục..."
                />
                <button
                  onClick={handleScanDirectory}
                  disabled={isScanning}
                  className="px-3.5 py-1.5 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  Quét Thư Mục
                </button>
              </div>

              {/* View options & Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHidden(!showHidden)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 border transition-colors ${
                    showHidden ? 'bg-slate-800 text-lime-400 border-lime-500/40' : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  File Ẩn
                </button>

                <button
                  onClick={() => setShowJunkOnly(!showJunkOnly)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 border transition-colors ${
                    showJunkOnly ? 'bg-rose-950/60 text-rose-300 border-rose-800' : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Chỉ File Rác
                </button>

                <div className="h-4 w-px bg-slate-800 mx-1"></div>

                <button
                  onClick={handleSafeCleanTrash}
                  className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Dọn Dẹp An Toàn (Recycle Bin)
                </button>

                <button
                  onClick={() => handleSafeOrganize('copy')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow"
                >
                  <FolderCheck className="w-3.5 h-3.5" />
                  Sắp Xếp An Toàn (Sao Chép)
                </button>
              </div>
            </div>

            {/* Action Banner */}
            {actionStatus && (
              <div className="text-xs font-mono text-lime-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
                ⚡ {actionStatus}
              </div>
            )}

            {/* File Table */}
            <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800 grid grid-cols-12 text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
                <span className="col-span-5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedPaths.size > 0 && selectedPaths.size === filteredFiles.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedPaths(new Set(filteredFiles.map(f => f.path)));
                      else setSelectedPaths(new Set());
                    }}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  Tên Tệp / Thư Mục ({filteredFiles.length})
                </span>
                <span className="col-span-2">Đa Phương Thức</span>
                <span className="col-span-2">Dung Lượng</span>
                <span className="col-span-2">Trạng Thái</span>
                <span className="col-span-1 text-right">Hành Động</span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs">
                {filteredFiles.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    Chưa quét thư mục nào hoặc không có tệp phù hợp. Bấm "Quét Thư Mục" ở trên để bắt đầu.
                  </div>
                ) : (
                  filteredFiles.map((file) => {
                    const isSelected = selectedPaths.has(file.path);
                    return (
                      <div
                        key={file.path}
                        onClick={() => toggleSelect(file.path)}
                        className={`px-4 py-2 grid grid-cols-12 items-center hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isSelected ? 'bg-lime-950/20 text-slate-100' : 'text-slate-300'
                        }`}
                      >
                        {/* Name & Icon */}
                        <div className="col-span-5 flex items-center gap-2.5 truncate pr-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(file.path)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-slate-700 bg-slate-900"
                          />
                          {file.is_dir ? (
                            <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : file.modality === 'text' ? (
                            <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                          ) : file.modality === 'image' ? (
                            <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : file.modality === 'audio' ? (
                            <Music className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : file.modality === 'video' ? (
                            <Video className="w-4 h-4 text-rose-400 shrink-0" />
                          ) : (
                            <HardDrive className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate font-sans font-medium text-xs">{file.name}</span>
                        </div>

                        {/* Modality */}
                        <div className="col-span-2 capitalize text-slate-400 text-[11px]">
                          {file.is_dir ? 'Thư mục' : file.modality}
                        </div>

                        {/* Size */}
                        <div className="col-span-2 text-slate-400 text-[11px]">
                          {file.size_formatted}
                        </div>

                        {/* Status (Hidden / Junk / Normal) */}
                        <div className="col-span-2 flex items-center gap-1.5">
                          {file.is_junk && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/80 text-[10px] font-sans font-semibold">
                              Tệp Rác
                            </span>
                          )}
                          {file.is_hidden && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-sans">
                              Ẩn
                            </span>
                          )}
                          {!file.is_junk && !file.is_hidden && (
                            <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-sans">
                              <CheckCircle className="w-3 h-3" /> Hợp lệ
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="col-span-1 text-right flex justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetch(`${API_BASE}/files/trash`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ file_paths: [file.path] })
                              }).then(() => handleScanDirectory());
                            }}
                            title="Chuyển vào Thùng rác"
                            className="p-1 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Văn Bản (Text)</span>
                <div className="text-xl font-bold text-slate-100 mt-2">1,248 tệp</div>
                <div className="text-[11px] text-slate-500 mt-1">Hot/Warm Tier</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Hình Ảnh (Images)</span>
                <div className="text-xl font-bold text-slate-100 mt-2">4,810 tệp</div>
                <div className="text-[11px] text-slate-500 mt-1">Warm Tier</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Âm Thanh (Audio)</span>
                <div className="text-xl font-bold text-slate-100 mt-2">320 tệp</div>
                <div className="text-[11px] text-slate-500 mt-1">Cold Tier</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Video</span>
                <div className="text-xl font-bold text-slate-100 mt-2">84 tệp</div>
                <div className="text-[11px] text-slate-500 mt-1">Cold Tier</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
