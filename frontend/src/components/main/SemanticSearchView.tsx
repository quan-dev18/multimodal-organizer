import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video,
  Sparkles,
  Loader2,
  FolderOpen,
  Folder,
  ExternalLink,
  Clock,
  Activity
} from 'lucide-react';
import { sfx } from '../../lib/sounds';
import { useApp } from '../../lib/AppContext';

const API_BASE = "http://127.0.0.1:8001/api";

interface SearchResult {
  title: string;
  path: string;
  modality: 'text' | 'image' | 'audio' | 'video' | 'other';
  score: number;
  snippet: string;
  cluster: string;
  tier: string;
}

export const SemanticSearchView: React.FC = () => {
  const { t, globalDirectory, setGlobalDirectory } = useApp();
  const [query, setQuery] = useState<string>('báo cáo kế hoạch');
  const [searchDir, setSearchDir] = useState<string>(globalDirectory);

  // Sync with global directory
  useEffect(() => {
    setSearchDir(globalDirectory);
  }, [globalDirectory]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [modelUsed, setModelUsed] = useState<string>('nomic-embed-text');
  const [searchInfo, setSearchInfo] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Search Progress State
  const [searchProgress, setSearchProgress] = useState<number>(0);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Exact real-time stopwatch
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    let interval: any;
    if (isSearching) {
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      interval = setInterval(() => {
        const seconds = (Date.now() - startTimeRef.current) / 1000;
        setElapsedTime(seconds);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  // Native folder picker via system API
  const handlePickDirectory = async () => {
    sfx.click();
    try {
      const res = await fetch(`${API_BASE}/system/select_folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: "Chọn thư mục tìm kiếm ngữ nghĩa" })
      });
      const data = await res.json();
      if (data && data.success && data.path) {
        setSearchDir(data.path);
        setGlobalDirectory(data.path);
        return;
      }
    } catch {}

    const manual = prompt('Nhập đường dẫn thư mục cần tìm kiếm:', searchDir);
    if (manual && manual.trim()) {
      setSearchDir(manual.trim());
      setGlobalDirectory(manual.trim());
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    sfx.scan();
    setIsSearching(true);
    setSearchInfo('');
    setHasSearched(true);
    setSearchProgress(20);
    setCurrentTask(t('task_scanning'));

    const t1 = setTimeout(() => {
      setSearchProgress(55);
      setCurrentTask(t('task_sniffing'));
    }, 200);

    const t2 = setTimeout(() => {
      setSearchProgress(85);
      setCurrentTask(t('task_embedding'));
    }, 450);

    try {
      const res = await fetch(`${API_BASE}/search/semantic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: query.trim(), 
          search_dir: searchDir.trim(), 
          top_k: 15 
        })
      });
      const data = await res.json();
      setSearchProgress(100);
      setCurrentTask(t('task_done'));

      if (data.success && Array.isArray(data.results)) {
        setResults(data.results);
        setModelUsed(data.model_used || 'Hybrid Lexical Engine');
        setSearchInfo(`${t('scanned_files')} ${data.total_scanned} ${t('files_unit')} · ${t('found_results')} ${data.results.length} ${t('results_unit')}.`);
        sfx.success();
      } else {
        setResults([]);
        setSearchInfo(t('no_results'));
      }
    } catch (err: any) {
      setSearchInfo(`Lỗi tìm kiếm: ${err.message}`);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setTimeout(() => {
        setIsSearching(false);
      }, 350);
    }
  };

  const handleOpenPath = async (filePath: string) => {
    sfx.click();
    try {
      await fetch(`${API_BASE}/system/open_file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });
    } catch {}
  };

  const handleOpenDir = async (filePath: string) => {
    sfx.click();
    try {
      await fetch(`${API_BASE}/system/open_explorer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });
    } catch {}
  };

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-amber-400" />;
      case 'video':
        return <Video className="w-4 h-4 text-purple-400" />;
      case 'text':
      default:
        return <FileText className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-6 space-y-5 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
          <Search className="w-4.5 h-4.5 text-indigo-400" />
          {t('search_title')}
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          {t('search_desc')}
        </p>
      </div>

      {/* Directory Selector Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 flex-1 min-w-[320px]">
          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-medium text-zinc-300 shrink-0">{t('search_dir_label')}</span>
          <input
            type="text"
            value={searchDir}
            onChange={(e) => setSearchDir(e.target.value)}
            placeholder="C:\Users\..."
            className="flex-1 bg-zinc-950/80 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono outline-none focus:border-indigo-500"
          />
        </div>
        <button
          onClick={handlePickDirectory}
          type="button"
          className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          {t('browse_btn')}
        </button>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 pl-11 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/80 transition-all font-sans"
          />
          <Sparkles className="w-4 h-4 text-indigo-400 absolute left-4 top-3.5" />
        </div>

        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {t('search_btn')}
        </button>
      </form>

      {/* Search Progress, Estimator & Current Task Bar */}
      {isSearching && (
        <div className="bg-zinc-900/95 border border-indigo-500/40 rounded-xl p-4 space-y-3 shadow-md animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
              <span className="text-zinc-200 font-medium flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                {currentTask}
              </span>
            </div>
            <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-300" />
                {t('elapsed_label')} {elapsedTime.toFixed(1)}s
              </span>
              <span className="text-indigo-400 font-semibold">{searchProgress}%</span>
            </div>
          </div>

          {/* Progress track */}
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${searchProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status & Model info */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="text-zinc-400">
          {searchInfo || `${t('model_used')} ${modelUsed}`}
        </div>
        <div className="text-zinc-500 font-mono">
          Top {results.length} results
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3 pb-6">
        {results.map((item, idx) => (
          <div 
            key={idx}
            className="p-4 bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl flex items-start justify-between gap-4 transition-all group"
          >
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {getModalityIcon(item.modality)}
                <span className="text-xs font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </span>

                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  {item.cluster}
                </span>

                <span className={`text-xs px-2 py-0.5 rounded border ${
                  item.tier === 'Hot' ? 'bg-rose-950/60 text-rose-300 border-rose-800/60' :
                  item.tier === 'Warm' ? 'bg-amber-950/60 text-amber-300 border-amber-800/60' :
                  'bg-sky-950/60 text-sky-300 border-sky-800/60'
                }`}>
                  Tầng: {item.tier}
                </span>
              </div>

              {/* Real content preview snippet */}
              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/40 font-sans">
                {item.snippet}
              </p>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                <span className="truncate max-w-[70%] font-mono select-all">
                  {item.path}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleOpenDir(item.path)}
                    className="hover:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <FolderOpen className="w-3 h-3 text-amber-400" /> {t('open_dir')}
                  </button>
                  <button
                    onClick={() => handleOpenPath(item.path)}
                    className="hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3 text-indigo-400" /> {t('open_file')}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className={`text-sm font-mono font-semibold ${
                item.score >= 0.65 ? 'text-emerald-400' :
                item.score >= 0.35 ? 'text-indigo-400' : 'text-zinc-400'
              }`}>
                {(item.score * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">{t('similarity_score')}</div>
            </div>
          </div>
        ))}

        {hasSearched && results.length === 0 && !isSearching && (
          <div className="p-12 text-center text-zinc-500 text-xs border border-zinc-800/60 rounded-xl bg-zinc-950/40">
            {t('no_results')}
          </div>
        )}
      </div>
    </div>
  );
};
