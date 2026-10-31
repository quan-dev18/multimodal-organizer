import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  HardDrive, 
  Search, 
  Trash2, 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  EyeOff,
  FolderCheck,
  ArrowUp
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8001/api";

interface FolderItem {
  name: string;
  path: string;
  is_dir: boolean;
  is_hidden: boolean;
  has_children: boolean;
}

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

interface ScanProgress {
  scanned_count: number;
  current_file: string;
  current_folder: string;
  junk_count: number;
  hidden_count: number;
  elapsed_seconds: number;
  estimated_seconds_left: number;
}

export const FileExplorerTree: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>("d:\\AI_NCKH");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showHidden, setShowHidden] = useState<boolean>(true);
  const [showJunkOnly, setShowJunkOnly] = useState<boolean>(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Deep Scan Progress State (Only runs on-demand)
  const [isDeepScanning, setIsDeepScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");

  // Load single directory level (Clean Tree, no overloading)
  const loadDirectory = async (path: string) => {
    setLoading(true);
    setActionMessage("");
    try {
      const res = await fetch(`${API_BASE}/files/tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: path, include_hidden: showHidden })
      });
      const data = await res.json();
      if (data.folders) setFolders(data.folders);
      if (data.files) setFiles(data.files);
      if (data.current_path) setCurrentPath(data.current_path);
      setParentPath(data.parent_path || null);
      setSelectedPaths(new Set());
    } catch (e: any) {
      setActionMessage(`Lỗi mở thư mục: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, [showHidden]);

  // Trigger Deep Scan with Progress and Estimated Time
  const startDeepScan = async () => {
    setIsDeepScanning(true);
    setScanProgress(null);
    setActionMessage("Bắt đầu quét sâu cấu trúc thư mục...");

    try {
      const res = await fetch(`${API_BASE}/files/deep_scan_stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: currentPath })
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'progress') {
              setScanProgress(data);
            } else if (data.type === 'completed') {
              setActionMessage(`Quét hoàn tất: ${data.total_scanned} tệp trong ${data.elapsed_seconds}s. Phát hiện ${data.junk_count} tệp rác.`);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setActionMessage(`Lỗi khi quét: ${e.message}`);
    } finally {
      setIsDeepScanning(false);
    }
  };

  // Safe Trash Action (Recycle Bin)
  const handleSafeTrash = async () => {
    const targets = selectedPaths.size > 0 
      ? Array.from(selectedPaths)
      : files.filter(f => f.is_junk).map(f => f.path);

    if (targets.length === 0) {
      alert("Không có tệp nào được chọn.");
      return;
    }

    if (!confirm(`Chuyển an toàn ${targets.length} tệp vào Thùng rác Windows Recycle Bin? (Có thể khôi phục bất cứ lúc nào)`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/files/trash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_paths: targets })
      });
      const data = await res.json();
      setActionMessage(`Đã dọn dẹp an toàn ${data.cleaned_count} tệp.`);
      loadDirectory(currentPath);
    } catch (e: any) {
      setActionMessage(`Lỗi dọn dẹp: ${e.message}`);
    }
  };

  // Safe Organize
  const handleSafeOrganize = async () => {
    const targets = selectedPaths.size > 0 
      ? Array.from(selectedPaths)
      : files.filter(f => !f.is_junk).map(f => f.path);

    if (targets.length === 0) return;

    const dest = prompt("Nhập thư mục đích để sắp xếp theo 4 Modality (Text/Image/Audio/Video):", `${currentPath}\\Organized_Vault`);
    if (!dest) return;

    try {
      const res = await fetch(`${API_BASE}/files/organize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_paths: targets, target_base: dest, mode: "copy" })
      });
      const data = await res.json();
      setActionMessage(`Đã sắp xếp an toàn ${data.success_count} tệp vào ${dest}`);
      loadDirectory(currentPath);
    } catch (e: any) {
      setActionMessage(`Lỗi sắp xếp: ${e.message}`);
    }
  };

  const filteredFiles = files.filter(f => {
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
    <div className="flex-1 flex flex-col overflow-hidden space-y-4">
      {/* Top Breadcrumb & Deep Scan Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[340px]">
          {parentPath && (
            <button
              onClick={() => loadDirectory(parentPath)}
              title="Lên thư mục cha"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}

          <div className="flex-1 flex items-center bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-lime-400">
            <HardDrive className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <span className="truncate">{currentPath}</span>
          </div>

          <button
            onClick={() => loadDirectory(currentPath)}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-lime-400' : ''}`} />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Deep scan on-demand button */}
          <button
            onClick={startDeepScan}
            disabled={isDeepScanning}
            className="px-3.5 py-1.5 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow shadow-lime-950/40 disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            {isDeepScanning ? "Đang quét sâu..." : "Quét Sâu Phân Tích"}
          </button>

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
              showJunkOnly ? 'bg-rose-950/80 text-rose-300 border-rose-800' : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Chỉ File Rác
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1"></div>

          <button
            onClick={handleSafeTrash}
            className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Dọn Vào Thùng Rác
          </button>

          <button
            onClick={handleSafeOrganize}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow"
          >
            <FolderCheck className="w-3.5 h-3.5" />
            Sắp Xếp An Toàn
          </button>
        </div>
      </div>

      {/* Real-time Progress Bar & Time Estimation when Scanning */}
      {isDeepScanning && scanProgress && (
        <div className="bg-slate-900 border border-lime-500/80 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-lime-400 flex items-center gap-2 font-bold">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping"></span>
              ĐANG QUÉT: {scanProgress.scanned_count} tệp tin
            </span>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Đã chạy: <b className="text-white">{scanProgress.elapsed_seconds}s</b>
              </span>
              <span>
                Ước tính còn lại: <b className="text-amber-400">~{scanProgress.estimated_seconds_left}s</b>
              </span>
            </div>
          </div>

          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div className="h-full bg-lime-500 animate-pulse rounded-full" style={{ width: '70%' }}></div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono truncate">
            <span className="truncate">Thư mục hiện tại: {scanProgress.current_folder}</span>
            <span className="text-rose-400 shrink-0 ml-4">Rác phát hiện: {scanProgress.junk_count}</span>
          </div>
        </div>
      )}

      {/* Action Status Banner */}
      {actionMessage && (
        <div className="text-xs font-mono text-lime-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
          ⚡ {actionMessage}
        </div>
      )}

      {/* Explorer Tree & Files View */}
      <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="bg-slate-950/90 px-4 py-2 border-b border-slate-800 grid grid-cols-12 text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
          <span className="col-span-6 flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedPaths.size > 0 && selectedPaths.size === filteredFiles.length}
              onChange={(e) => {
                if (e.target.checked) setSelectedPaths(new Set(filteredFiles.map(f => f.path)));
                else setSelectedPaths(new Set());
              }}
              className="rounded border-slate-700 bg-slate-900"
            />
            Tên Tệp / Thư Mục (Nằm đúng cây thư mục)
          </span>
          <span className="col-span-2">Đa Phương Thức</span>
          <span className="col-span-2">Dung Lượng</span>
          <span className="col-span-2 text-right">Trạng Thái</span>
        </div>

        {/* Content Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 text-xs">
          {/* Sub-folders in current path */}
          {folders.map((folder) => (
            <div
              key={folder.path}
              onDoubleClick={() => loadDirectory(folder.path)}
              className="px-4 py-2 grid grid-cols-12 items-center hover:bg-slate-800/50 cursor-pointer text-slate-200 transition-colors"
            >
              <div className="col-span-6 flex items-center gap-2.5 truncate">
                <Folder className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400/20" />
                <span className="font-semibold text-slate-100 hover:text-lime-400 transition-colors">
                  {folder.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">(Thư mục con - Nhấp đúp để mở)</span>
              </div>
              <div className="col-span-2 text-slate-500 font-mono text-[11px]">Folder</div>
              <div className="col-span-2 text-slate-500 font-mono text-[11px]">--</div>
              <div className="col-span-2 text-right">
                <button
                  onClick={() => loadDirectory(folder.path)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono"
                >
                  Mở &gt;
                </button>
              </div>
            </div>
          ))}

          {/* Files in current path */}
          {filteredFiles.map((file) => {
            const isSelected = selectedPaths.has(file.path);
            return (
              <div
                key={file.path}
                onClick={() => toggleSelect(file.path)}
                className={`px-4 py-2 grid grid-cols-12 items-center hover:bg-slate-800/40 cursor-pointer transition-colors ${
                  isSelected ? 'bg-lime-950/20 text-slate-100' : 'text-slate-300'
                }`}
              >
                <div className="col-span-6 flex items-center gap-2.5 truncate pr-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(file.path)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  {file.modality === 'text' ? (
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
                  <span className="truncate font-medium">{file.name}</span>
                </div>

                <div className="col-span-2 capitalize text-slate-400 font-mono text-[11px]">
                  {file.modality}
                </div>

                <div className="col-span-2 text-slate-400 font-mono text-[11px]">
                  {file.size_formatted}
                </div>

                <div className="col-span-2 text-right">
                  {file.is_junk && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-semibold">
                      Tệp Rác
                    </span>
                  )}
                  {file.is_hidden && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] ml-1">
                      Ẩn
                    </span>
                  )}
                  {!file.is_junk && !file.is_hidden && (
                    <span className="text-emerald-400 text-[10px] flex items-center justify-end gap-1">
                      <CheckCircle className="w-3 h-3" /> Hợp lệ
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {folders.length === 0 && filteredFiles.length === 0 && (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              Thư mục trống.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
