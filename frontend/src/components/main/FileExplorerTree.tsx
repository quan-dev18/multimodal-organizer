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
  RotateCw,
  History,
  ShieldCheck,
  X,
  Check,
  FolderOpen
} from 'lucide-react';
import { sfx } from '../../lib/sounds';

const API_BASE = "http://127.0.0.1:8001/api";

interface DriveInfo {
  name?: string;
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
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return localStorage.getItem('mmo_global_dir') || '/home/quandev';
  });
  const [pathInput, setPathInput] = useState<string>(() => {
    return localStorage.getItem('mmo_global_dir') || '/home/quandev';
  });
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
  const [discoveredJunkPaths, setDiscoveredJunkPaths] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<string>("");

  // Dry-run Preview Modal State
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [targetVaultPath, setTargetVaultPath] = useState<string>("");
  const [isOrganizing, setIsOrganizing] = useState<boolean>(false);

  // Undo / Redo & History State
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

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
      if (data.current_path) {
        setCurrentPath(data.current_path);
        setPathInput(data.current_path);
      }
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

  // Switch drive easily (Home, Root, USBs)
  const handleSelectDrive = (drivePath: string) => {
    sfx.click();
    loadDirectory(drivePath);
  };

  // Open native Windows Folder Picker for Explorer
  const handleBrowseExplorerFolder = async () => {
    sfx.click();
    try {
      const res = await fetch(`${API_BASE}/system/select_folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: "Chọn thư mục duyệt tệp MMO" })
      });
      const data = await res.json();
      if (data.success && data.path) {
        loadDirectory(data.path);
      }
    } catch (e: any) {
      setActionMessage(`Lỗi mở hộp thoại duyệt thư mục: ${e.message}`);
    }
  };

  // Open native Windows Folder Picker for Target Vault
  const handleBrowseVaultFolder = async () => {
    sfx.click();
    try {
      const res = await fetch(`${API_BASE}/system/select_folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: "Chọn thư mục đích lưu trữ" })
      });
      const data = await res.json();
      if (data.success && data.path) {
        setTargetVaultPath(data.path);
      }
    } catch (e: any) {
      alert(`Lỗi chọn thư mục đích: ${e.message}`);
    }
  };

  // Start Deep Scan with Progress & Time Estimation
  const startDeepScan = async () => {
    sfx.scan();
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
              sfx.complete();
              setActionMessage(`Quét xong: ${data.total_scanned} tệp trong ${data.elapsed_seconds}s. Phát hiện ${data.junk_count} tệp rác.`);
              if (Array.isArray(data.junk_paths)) {
                setDiscoveredJunkPaths(data.junk_paths);
              }
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

  // Safe Trash Action (Recycle Bin)
  const handleSafeTrashAll = async () => {
    const localJunkFiles = files.filter(f => f.is_junk).map(f => f.path);
    let targets: string[] = [];

    if (selectedPaths.size > 0) {
      targets = Array.from(selectedPaths);
    } else if (discoveredJunkPaths.length > 0) {
      targets = discoveredJunkPaths;
    } else {
      targets = localJunkFiles;
    }

    if (targets.length === 0) {
      alert("Không phát hiện tệp rác nào cần dọn dẹp!");
      return;
    }

    if (!confirm(`Xác nhận chuyển ${targets.length} tệp rác vào Thùng rác Windows (Recycle Bin)?`)) {
      return;
    }

    sfx.delete();
    try {
      setActionMessage(`Đang tiến hành dọn sạch ${targets.length} tệp rác...`);
      const res = await fetch(`${API_BASE}/files/trash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_paths: targets, clean_system_temp: false })
      });
      const data = await res.json();
      setDiscoveredJunkPaths([]);
      if (data.blocked_count > 0) {
        setActionMessage(`Đã bảo vệ an toàn ${data.blocked_count} tệp hệ thống. Đã chuyển ${data.cleaned_count} tệp rác vào Recycle Bin.`);
      } else {
        setActionMessage(`Đã chuyển ${data.cleaned_count} tệp rác vào Thùng rác thành công.`);
      }
      sfx.success();
      loadDirectory(currentPath);
    } catch (e: any) {
      setActionMessage(`Lỗi dọn dẹp: ${e.message}`);
    }
  };

  // Organize Preview
  const handleOpenOrganizePreview = async () => {
    sfx.click();
    setActionMessage("Hệ thống đang phân tích cấu trúc và lập kế hoạch sắp xếp...");
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
      setActionMessage(`Đã lập kế hoạch sắp xếp cho ${data.length} mục.`);
    } catch (e: any) {
      alert(`Lỗi tạo bản xem trước: ${e.message}`);
      setActionMessage("");
    }
  };

  // Execute Organize
  const handleExecuteOrganize = async () => {
    sfx.click();
    setIsOrganizing(true);
    setActionMessage("Đang tiến hành di chuyển và sắp xếp tệp...");
    const targets = previewItems.map(p => p.source_path);

    try {
      const res = await fetch(`${API_BASE}/files/organize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          file_paths: targets, 
          target_base: targetVaultPath, 
          mode: "move" 
        })
      });
      const data = await res.json();
      setShowPreviewModal(false);
      sfx.success();
      const msg = `Đã hoàn tất sắp xếp ${data.success_count} mục vào ${targetVaultPath}`;
      setActionMessage(msg);
      loadDirectory(currentPath);
    } catch (e: any) {
      alert(`Lỗi sắp xếp: ${e.message}`);
    } finally {
      setIsOrganizing(false);
    }
  };

  // Fetch History status
  const fetchHistoryStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/files/history`);
      const data = await res.json();
      if (data) {
        setCanUndo(!!data.can_undo);
        setCanRedo(!!data.can_redo);
        setHistoryItems(data.history || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchHistoryStatus();
  }, []);

  // Undo Last Organize
  const handleUndo = async () => {
    sfx.click();
    setActionMessage("Đang hoàn tác...");
    try {
      const res = await fetch(`${API_BASE}/files/undo`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        sfx.success();
        setActionMessage(data.message);
        loadDirectory(currentPath);
        fetchHistoryStatus();
      } else {
        setActionMessage(data.message);
      }
    } catch (e: any) {
      setActionMessage(`Lỗi hoàn tác: ${e.message}`);
    }
  };

  // Redo Last Undone Action
  const handleRedo = async () => {
    sfx.click();
    setActionMessage("Đang làm lại (Redo)...");
    try {
      const res = await fetch(`${API_BASE}/files/redo`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        sfx.success();
        setActionMessage(data.message);
        loadDirectory(currentPath);
        fetchHistoryStatus();
      } else {
        setActionMessage(data.message);
      }
    } catch (e: any) {
      setActionMessage(`Lỗi làm lại: ${e.message}`);
    }
  };

  const filteredFiles = files.filter(f => {
    if (!showHidden && f.is_hidden) return false;
    if (showJunkOnly && !f.is_junk) return false;
    return true;
  });

  const toggleSelect = (p: string) => {
    sfx.toggle();
    const s = new Set(selectedPaths);
    if (s.has(p)) s.delete(p);
    else s.add(p);
    setSelectedPaths(s);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-3.5 p-6">
      {/* 1. Drive Selector Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 shrink-0">
        {/* Drive Buttons */}
        {drives.map((d) => {
          const isActive = d.device === '/' 
            ? currentPath === '/' 
            : currentPath.toLowerCase().startsWith(d.device.toLowerCase());
          const isWarning = d.percent > 85;
          return (
            <div
              key={d.device}
              onClick={() => handleSelectDrive(d.device)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'bg-zinc-900/90 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30'
                  : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900/90 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800/60 text-zinc-400'}`}>
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-zinc-100 font-sans">{d.name || d.device}</span>
                    <span className="text-xs text-zinc-400 ml-2.5 font-sans">
                      Trống <strong className="text-zinc-200">{d.free_gb} GB</strong> / {d.total_gb} GB
                    </span>
                  </div>
                </div>

                {/* Badge status */}
                {isWarning ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/80 text-rose-300 border border-rose-800/60">
                    Sắp đầy
                  </span>
                ) : isActive ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                    Đang xem
                  </span>
                ) : null}
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/60 mt-1">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isWarning ? 'bg-rose-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${d.percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Breadcrumb Navigation & Controls */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
        {/* Left: Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenOrganizePreview}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs flex items-center gap-2 transition-all font-semibold shadow-md shadow-indigo-950/40 cursor-pointer"
          >
            <FolderCheck className="w-4 h-4" />
            Sắp xếp thư mục
          </button>
        </div>

        {/* Center: Path Input & Navigation */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (pathInput.trim()) loadDirectory(pathInput.trim());
          }}
          className="flex items-center gap-2 flex-1 min-w-[280px]"
        >
          {parentPath && (
            <button
              type="button"
              onClick={() => {
                sfx.click();
                loadDirectory(parentPath);
              }}
              title="Lên thư mục cha"
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}

          <div className="flex-1 flex items-center bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 focus-within:border-indigo-500">
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="Nhập hoặc dán đường dẫn thư mục..."
              className="w-full bg-transparent outline-none text-zinc-200 placeholder:text-zinc-600 font-mono text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs border border-zinc-700/60 transition-colors shrink-0 cursor-pointer"
          >
            Đi đến
          </button>

          <button
            type="button"
            onClick={handleBrowseExplorerFolder}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs border border-zinc-700/60 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            Chọn...
          </button>

          <button
            type="button"
            onClick={() => {
              sfx.click();
              loadDirectory(currentPath);
            }}
            disabled={loading}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors shrink-0 cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </form>

        {/* Right: Scan, Filter, Trash, History */}
        <div className="flex items-center gap-2">
          <button
            onClick={startDeepScan}
            disabled={isDeepScanning}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-zinc-700/60 disabled:opacity-50 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            {isDeepScanning ? "Đang quét..." : "Quét phân tích"}
          </button>

          <button
            onClick={() => {
              sfx.toggle();
              setShowHidden(!showHidden);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border transition-colors cursor-pointer ${
              showHidden ? 'bg-zinc-800 text-zinc-100 border-zinc-600' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
            }`}
          >
            {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            File ẩn
          </button>

          <button
            onClick={() => {
              sfx.toggle();
              setShowJunkOnly(!showJunkOnly);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border transition-colors cursor-pointer ${
              showJunkOnly ? 'bg-rose-950/60 text-rose-300 border-rose-800' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Chỉ file rác
          </button>

          <button
            onClick={handleSafeTrashAll}
            className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs flex items-center gap-1.5 transition-colors font-medium shadow-sm cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {discoveredJunkPaths.length > 0 
              ? `Dọn ${discoveredJunkPaths.length} tệp rác` 
              : "Dọn rác"}
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          {/* Undo / Redo & History Group */}
          <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title="Hoàn tác thao tác gần nhất (Undo)"
              className="p-1.5 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="Làm lại thao tác vừa hoàn tác (Redo)"
              className="p-1.5 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                sfx.click();
                fetchHistoryStatus();
                setShowHistoryModal(true);
              }}
              title="Xem toàn bộ lịch sử chỉnh sửa / hoàn tác"
              className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800 rounded cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Deep Scan Progress */}
      {isDeepScanning && scanProgress && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2.5 shrink-0 shadow-md animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-200 flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Đang quét: <span className="font-mono text-zinc-100">{scanProgress.scanned_count.toLocaleString()}</span> tệp
              {scanProgress.speed ? <span className="text-zinc-500 font-normal">({scanProgress.speed.toLocaleString()} tệp/giây)</span> : null}
            </span>
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400" />
                Thời gian: <span className="text-zinc-200 font-mono">{scanProgress.elapsed_seconds}s</span>
              </span>
              <span>
                Còn lại: <span className="text-zinc-200 font-mono">~{scanProgress.estimated_seconds_left}s</span>
              </span>
            </div>
          </div>

          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-200" 
              style={{ width: `${scanProgress.percent || Math.min((scanProgress.scanned_count / 150000) * 100, 95)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 truncate">
            <span className="truncate font-mono">{scanProgress.current_folder}</span>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <span className="text-rose-400 font-medium">Rác phát hiện: {scanProgress.junk_count.toLocaleString()}</span>
              {scanProgress.percent ? <span className="text-zinc-300 font-mono font-medium">{scanProgress.percent}%</span> : null}
            </div>
          </div>
        </div>
      )}

      {/* 4. Action Notification */}
      {actionMessage && (
        <div className="text-xs text-zinc-300 bg-zinc-900/90 border border-zinc-800 px-3.5 py-2 rounded-xl shrink-0 flex items-center justify-between shadow-sm">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            {actionMessage}
          </span>
          <button onClick={() => setActionMessage("")} className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Explorer Table with Smooth Scrollbar & Guaranteed Scrolling */}
      <div className="flex-1 min-h-0 bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden flex flex-col shadow-sm">
        {/* Table header */}
        <div className="bg-zinc-950/80 px-4 py-2.5 border-b border-zinc-800 grid grid-cols-12 text-xs font-medium text-zinc-400 shrink-0">
          <span className="col-span-6 flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={selectedPaths.size > 0 && selectedPaths.size === filteredFiles.length}
              onChange={(e) => {
                sfx.toggle();
                if (e.target.checked) setSelectedPaths(new Set(filteredFiles.map(f => f.path)));
                else setSelectedPaths(new Set());
              }}
              className="rounded border-zinc-700 bg-zinc-900 cursor-pointer"
            />
            Tên tệp / thư mục ({folders.length} thư mục, {filteredFiles.length} tệp)
          </span>
          <span className="col-span-2">Định dạng</span>
          <span className="col-span-2">Dung lượng</span>
          <span className="col-span-2 text-right">Trạng thái</span>
        </div>

        {/* Scrollable Rows Container */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40 text-xs">
          {/* Folders */}
          {folders.map((folder) => (
            <div
              key={folder.path}
              onDoubleClick={() => {
                sfx.click();
                loadDirectory(folder.path);
              }}
              className="px-4 py-2.5 grid grid-cols-12 items-center hover:bg-zinc-800/40 cursor-pointer text-zinc-300 transition-colors"
            >
              <div className="col-span-6 flex items-center gap-2.5 truncate">
                <Folder className="w-4 h-4 text-amber-400/90 shrink-0" />
                <span className="font-medium text-zinc-200 hover:text-indigo-400 transition-colors truncate">
                  {folder.name}
                </span>
              </div>
              <div className="col-span-2 text-zinc-500">Thư mục</div>
              <div className="col-span-2 text-zinc-500">--</div>
              <div className="col-span-2 text-right">
                <button
                  onClick={() => {
                    sfx.click();
                    loadDirectory(folder.path);
                  }}
                  className="px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700/50 cursor-pointer"
                >
                  Mở &gt;
                </button>
              </div>
            </div>
          ))}

          {/* Files */}
          {filteredFiles.map((file) => {
            const isSelected = selectedPaths.has(file.path);
            return (
              <div
                key={file.path}
                onClick={() => toggleSelect(file.path)}
                className={`px-4 py-2 grid grid-cols-12 items-center hover:bg-zinc-800/30 cursor-pointer transition-colors ${
                  isSelected ? 'bg-indigo-950/20 text-zinc-100' : 'text-zinc-300'
                }`}
              >
                <div className="col-span-6 flex items-center gap-2.5 truncate pr-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(file.path)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-zinc-700 bg-zinc-900 cursor-pointer"
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
                    <HardDrive className="w-4 h-4 text-zinc-400 shrink-0" />
                  )}
                  <span className="truncate">{file.name}</span>
                </div>

                <div className="col-span-2 capitalize text-zinc-500">
                  {file.modality}
                </div>

                <div className="col-span-2 text-zinc-400 font-mono">
                  {file.size_formatted}
                </div>

                <div className="col-span-2 text-right">
                  {file.is_junk && (
                    <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 text-xs">
                      Tệp rác
                    </span>
                  )}
                  {file.is_hidden && (
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs ml-1">
                      Ẩn
                    </span>
                  )}
                  {!file.is_junk && !file.is_hidden && (
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 text-xs font-medium">
                      Hợp lệ
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {folders.length === 0 && filteredFiles.length === 0 && (
            <div className="p-16 text-center text-zinc-500 text-xs">
              Thư mục trống
            </div>
          )}
        </div>
      </div>

      {/* 6. Dry-run Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-indigo-400" />
                  Kế hoạch sắp xếp tệp tin
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Xem trước đường dẫn đích trước khi thực hiện di chuyển
                </p>
              </div>
              <button
                onClick={() => {
                  sfx.click();
                  setShowPreviewModal(false);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Thư mục đích lưu trữ:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={targetVaultPath}
                    onChange={(e) => setTargetVaultPath(e.target.value)}
                    placeholder="Đường dẫn đích..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseVaultFolder}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs border border-zinc-700/60 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                    Chọn...
                  </button>
                </div>
              </div>

              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <div className="bg-zinc-950 px-3.5 py-2 grid grid-cols-12 text-xs font-medium text-zinc-400">
                  <span className="col-span-4">Tệp nguồn</span>
                  <span className="col-span-5">Đích đến đề xuất</span>
                  <span className="col-span-3 text-right">Phân loại</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/60 text-xs">
                  {previewItems.map((item, idx) => (
                    <div key={idx} className="px-3.5 py-2 grid grid-cols-12 items-center text-zinc-300">
                      <div className="col-span-4 truncate pr-2">
                        <span className="font-medium text-zinc-200 block truncate">{item.source_name}</span>
                        <span className="text-xs text-zinc-500 font-mono truncate block">{item.source_path}</span>
                      </div>
                      <div className="col-span-5 truncate pr-2 text-indigo-300 text-xs font-mono">
                        {item.dest_path}
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-xs">
                          {item.category_tag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Có thể hoàn tác bất kỳ lúc nào qua nút Hoàn tác.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleExecuteOrganize}
                  disabled={isOrganizing}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isOrganizing ? "Đang xử lý..." : `Xác nhận (${previewItems.length} mục)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 7. Edit History & Undo/Redo Timeline Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  Lịch sử thao tác & Hoàn tác (Undo / Redo)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Xem chi tiết các tệp đã di chuyển, trạng thái hiện tại và cơ chế phân nhánh lịch sử
                </p>
              </div>
              <button
                onClick={() => {
                  sfx.click();
                  setShowHistoryModal(false);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
              {/* Timeline explanation banner */}
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-indigo-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-xs text-indigo-300">Quy tắc nhánh lịch sử (Branch Truncation Rule):</p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Khi bạn thực hiện <strong>Hoàn tác (Undo)</strong>, thao tác sẽ được đưa vào hàng đợi <strong>Làm lại (Redo)</strong>. Nếu bạn tiếp tục <strong>Sắp xếp hoặc Di chuyển một tệp mới</strong> trong khi đang ở trạng thái Undo, nhánh tương lai (Redo Stack) sẽ tự động bị xoá để bảo đảm tính nhất quán trên ổ đĩa.
                  </p>
                </div>
              </div>

              {/* History List */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <div className="bg-zinc-950 px-3.5 py-2 grid grid-cols-12 text-xs font-medium text-zinc-400">
                  <span className="col-span-5">Tệp ban đầu (From)</span>
                  <span className="col-span-5">Đích đến (To)</span>
                  <span className="col-span-2 text-right">Trạng thái</span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/50">
                  {historyItems.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      Chưa có lịch sử thao tác nào được ghi nhận.
                    </div>
                  ) : (
                    historyItems.map((item, idx) => (
                      <div key={idx} className="px-3.5 py-2.5 grid grid-cols-12 items-center hover:bg-zinc-800/30 transition-colors">
                        <div className="col-span-5 truncate pr-2">
                          <span className="font-mono text-zinc-300 block truncate">{item.from}</span>
                        </div>
                        <div className="col-span-5 truncate pr-2">
                          <span className="font-mono text-indigo-300 block truncate">{item.to}</span>
                        </div>
                        <div className="col-span-2 text-right">
                          {item.state === 'applied' ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                              Đã áp dụng
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/80 text-amber-300 border border-amber-800/50">
                              Đã hoàn tác
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Lịch sử lưu bền vững trên ổ đĩa
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Hoàn tác bước trước
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Làm lại bước sau
                </button>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs cursor-pointer font-medium"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};