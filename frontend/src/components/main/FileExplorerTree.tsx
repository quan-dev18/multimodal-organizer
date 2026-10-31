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
  ArrowUp,
  RotateCcw,
  ShieldCheck,
  X,
  Check
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8001/api";

interface DriveInfo {
  device: string;
  mountpoint: string;
  fstype: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  percent: number;
}

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
  percent?: number;
  speed?: number;
}

interface PreviewItem {
  source_name: string;
  source_path: string;
  dest_path: string;
  is_dir: boolean;
  modality: string;
  category_tag: string;
  size_formatted: string;
  has_conflict: boolean;
  action: string;
}

export const FileExplorerTree: React.FC = () => {
  // Drives State
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("D:\\AI_NCKH");
  const [parentPath, setParentPath] = useState<string | null>(null);
  
  // Folder Content State
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showHidden, setShowHidden] = useState<boolean>(true);
  const [showJunkOnly, setShowJunkOnly] = useState<boolean>(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Deep Scan Progress State
  const [isDeepScanning, setIsDeepScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");

  // Dry-run Preview Modal State
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [targetVaultPath, setTargetVaultPath] = useState<string>("");
  const [isOrganizing, setIsOrganizing] = useState<boolean>(false);

  // Fetch system drives on mount
  const fetchDrives = async () => {
    try {
      const res = await fetch(`${API_BASE}/system/drives`);
      const data = await res.json();
      if (Array.isArray(data)) setDrives(data);
    } catch {}
  };

  // Load single directory level
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
    fetchDrives();
    loadDirectory(currentPath);
  }, [showHidden]);

  // Switch drive easily (C:, D:, USBs)
  const handleSelectDrive = (drivePath: string) => {
    loadDirectory(drivePath);
  };

  // Start Deep Scan with Progress & Time Estimation
  const startDeepScan = async () => {
    setIsDeepScanning(true);
    setScanProgress(null);
    setActionMessage("Bắt đầu quét sâu phân tích cấu trúc thư mục...");

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
              setActionMessage(`Quét xong: ${data.total_scanned} tệp trong ${data.elapsed_seconds}s. Phát hiện ${data.junk_count} tệp rác.`);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setActionMessage(`Lỗi quét: ${e.message}`);
    } finally {
      setIsDeepScanning(false);
    }
  };

  // Safe Trash Action (Recycle Bin) - 1-Click Cleans ALL detected junk automatically!
  const handleSafeTrashAll = async () => {
    // If user checked items, clean those. Otherwise, automatically find and clean ALL junk files in current folder!
    const junkFiles = files.filter(f => f.is_junk).map(f => f.path);
    const targets = selectedPaths.size > 0 ? Array.from(selectedPaths) : junkFiles;

    if (targets.length === 0) {
      alert("Không phát hiện tệp rác nào trong thư mục này cần dọn dẹp!");
      return;
    }

    if (!confirm(`Xác nhận 1-Click dọn sạch toàn bộ ${targets.length} tệp rác vào Thùng rác Windows Recycle Bin? (An toàn 100%, có thể khôi phục lại bất kỳ lúc nào)`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/files/trash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_paths: targets })
      });
      const data = await res.json();
      if (data.blocked_count > 0) {
        setActionMessage(`Đã bảo vệ an toàn ${data.blocked_count} tệp hệ thống Windows. Đã dọn sạch ${data.cleaned_count} tệp rác vào Recycle Bin.`);
      } else {
        setActionMessage(`Đã dọn sạch ${data.cleaned_count} tệp rác vào Thùng rác Recycle Bin thành công!`);
      }
      loadDirectory(currentPath);
    } catch (e: any) {
      setActionMessage(`Lỗi dọn dẹp: ${e.message}`);
    }
  };

  // 1. Dry-Run Preview before Organize (Tự động nhận diện TOÀN BỘ file + folder con trong thư mục hiện tại)
  const handleOpenOrganizePreview = async () => {
    setActionMessage("AI đang phân tích ngữ cảnh và lập sơ đồ phân loại...");
    // Collect all valid files and sub-folders in current folder
    const allLocalItems = [
      ...folders.map(f => f.path),
      ...files.filter(f => !f.is_junk && !f.is_hidden).map(f => f.path)
    ];

    const targets = selectedPaths.size > 0 ? Array.from(selectedPaths) : allLocalItems;

    if (targets.length === 0) {
      alert("Thư mục này không có tệp hoặc thư mục nào để sắp xếp.");
      setActionMessage("");
      return;
    }

    const defaultVault = `${currentPath}\\Organized_Vault`;
    setTargetVaultPath(defaultVault);

    try {
      const res = await fetch(`${API_BASE}/files/organize_preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_paths: targets, target_base: defaultVault })
      });
      const data = await res.json();
      setPreviewItems(data || []);
      setShowPreviewModal(true);
      setActionMessage(`AI đã lập xong kế hoạch sắp xếp ${data.length} mục.`);
    } catch (e: any) {
      alert(`Lỗi tạo bản xem trước: ${e.message}`);
      setActionMessage("");
    }
  };

  // 2. Confirm and Execute Organize with True Move (Di chuyển toàn bộ file & thư mục)
  const handleExecuteOrganize = async () => {
    setIsOrganizing(true);
    setActionMessage("Đang tiến hành di chuyển và sắp xếp file theo cấu trúc AI...");
    const targets = previewItems.map(p => p.source_path);

    try {
      const res = await fetch(`${API_BASE}/files/organize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          file_paths: targets, 
          target_base: targetVaultPath, 
          mode: "move" // TRUE MOVE: Chuyển dời toàn bộ file & folder vào vị trí mới
        })
      });
      const data = await res.json();
      setShowPreviewModal(false);
      const msg = `AI đã hoàn tất chuyển dời thành công ${data.success_count} mục vào ${targetVaultPath}`;
      setActionMessage(msg);
      alert(msg);
      loadDirectory(currentPath);
    } catch (e: any) {
      alert(`Lỗi sắp xếp: ${e.message}`);
    } finally {
      setIsOrganizing(false);
    }
  };

  // 3. Undo Last Organize
  const handleUndo = async () => {
    try {
      const res = await fetch(`${API_BASE}/files/undo`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        loadDirectory(currentPath);
      } else {
        alert(data.message);
      }
    } catch (e: any) {
      alert(`Lỗi hoàn tác: ${e.message}`);
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
    <div className="flex-1 flex flex-col overflow-hidden space-y-3">
      {/* 1. Drive Selector Toolbar (C:, D:, External Drives) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
            <HardDrive className="w-4 h-4 text-lime-400" />
            CHỌN Ổ ĐĨA:
          </span>

          <div className="flex items-center gap-2">
            {drives.map((d) => {
              const isActive = currentPath.toLowerCase().startsWith(d.device.toLowerCase());
              return (
                <button
                  key={d.device}
                  onClick={() => handleSelectDrive(d.device)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 border transition-all ${
                    isActive
                      ? 'bg-lime-950/80 text-lime-400 border-lime-500 shadow-sm shadow-lime-950'
                      : 'bg-slate-950 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-white">{d.device}</span>
                  <span className="text-[11px] text-slate-400">
                    (Trống {d.free_gb}/{d.total_gb} GB)
                  </span>
                  <span className={`w-2 h-2 rounded-full ${d.percent > 85 ? 'bg-rose-500' : 'bg-emerald-400'}`}></span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Undo button */}
        <button
          onClick={handleUndo}
          title="Hoàn tác thao tác sắp xếp vừa thực hiện"
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 border border-slate-700 transition-colors font-mono"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          Hoàn Tác (Undo)
        </button>
      </div>

      {/* 2. Breadcrumb Navigation & Controls */}
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
            onClick={handleSafeTrashAll}
            className="px-3.5 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow shadow-rose-950/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Dọn Sạch Rác (1-Click)
          </button>

          <button
            onClick={handleOpenOrganizePreview}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow shadow-emerald-950/40"
          >
            <FolderCheck className="w-3.5 h-3.5" />
            Sắp Xếp Toàn Bộ Thư Mục
          </button>
        </div>
      </div>

      {/* 3. Deep Scan Progress Bar with dynamic percentage and accurate countdown */}
      {isDeepScanning && scanProgress && (
        <div className="bg-slate-900 border border-lime-500/80 rounded-xl p-4 space-y-2.5 shrink-0 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-lime-400 flex items-center gap-2 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-ping"></span>
              ĐANG QUÉT: {scanProgress.scanned_count.toLocaleString()} tệp tin
              {scanProgress.speed ? <span className="text-slate-400 font-normal">({scanProgress.speed.toLocaleString()} tệp/giây)</span> : null}
            </span>
            <div className="flex items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Đã chạy: <b className="text-white">{scanProgress.elapsed_seconds}s</b>
              </span>
              <span>
                Ước tính còn lại: <b className="text-amber-400">~{scanProgress.estimated_seconds_left}s</b>
              </span>
            </div>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-lime-500 to-emerald-400 rounded-full transition-all duration-200" 
              style={{ width: `${scanProgress.percent || Math.min((scanProgress.scanned_count / 150000) * 100, 95)}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono truncate">
            <span className="truncate">Thư mục hiện tại: {scanProgress.current_folder}</span>
            <div className="flex items-center gap-4 shrink-0 ml-4">
              <span className="text-rose-400 font-bold">Rác phát hiện: {scanProgress.junk_count.toLocaleString()}</span>
              {scanProgress.percent ? <span className="text-lime-400 font-bold">{scanProgress.percent}%</span> : null}
            </div>
          </div>
        </div>
      )}

      {/* 4. Action Notification */}
      {actionMessage && (
        <div className="text-xs font-mono text-lime-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0 flex items-center justify-between">
          <span>⚡ {actionMessage}</span>
          <button onClick={() => setActionMessage("")} className="text-slate-500 hover:text-slate-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Explorer Tree Table */}
      <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
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
            Tên Tệp / Thư Mục ({folders.length} thư mục, {filteredFiles.length} tệp)
          </span>
          <span className="col-span-2">Đa Phương Thức</span>
          <span className="col-span-2">Dung Lượng</span>
          <span className="col-span-2 text-right">Trạng Thái</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 text-xs">
          {/* Folders in current path */}
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
                <span className="text-[10px] text-slate-500 font-mono">(Nhấp đúp để mở)</span>
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

      {/* 6. Dry-run Preview Modal Before Organize */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Kế Hoạch Sắp Xếp & Kiểm Tra Toàn Vẹn (Dry-Run Preview)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kiểm tra trước đích đến và xung đột trùng tên trước khi thực hiện sao chép + xác minh Checksum SHA-256.
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Thư mục đích lưu trữ đa phương thức:</label>
                <input
                  type="text"
                  value={targetVaultPath}
                  onChange={(e) => setTargetVaultPath(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-lime-400 font-mono"
                />
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-950 px-3 py-2 grid grid-cols-12 text-[11px] font-mono text-slate-400 uppercase">
                  <span className="col-span-4">Tệp / Thư Mục Nguồn</span>
                  <span className="col-span-5">Đích Đến Do AI Phân Tích Chuyên Ngành</span>
                  <span className="col-span-3 text-right">Phân Loại Ngữ Cảnh</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80 text-xs font-mono">
                  {previewItems.map((item, idx) => (
                    <div key={idx} className="px-3 py-2 grid grid-cols-12 items-center text-slate-300">
                      <div className="col-span-4 truncate pr-2 font-sans">
                        <span className="font-semibold text-white">{item.source_name}</span>
                        <span className="block text-[10px] text-slate-500 font-mono truncate">{item.source_path}</span>
                      </div>
                      <div className="col-span-5 truncate pr-2 text-emerald-400 text-[11px]">
                        {item.dest_path}
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="px-2 py-0.5 rounded bg-lime-950 text-lime-400 border border-lime-800/60 text-[10px] font-sans font-semibold">
                          {item.category_tag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Hỗ trợ nút Hoàn tác (Undo) bất cứ lúc nào.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Hủy Bỏ
                </button>
                <button
                  onClick={handleExecuteOrganize}
                  disabled={isOrganizing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
                >
                  <Check className="w-4 h-4" />
                  {isOrganizing ? "Đang xử lý & Checksum..." : `Xác Nhận Sắp Xếp (${previewItems.length} tệp)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
