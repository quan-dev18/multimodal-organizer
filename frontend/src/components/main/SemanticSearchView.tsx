import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video
} from 'lucide-react';

interface SearchResult {
  title: string;
  path: string;
  modality: 'text' | 'image' | 'audio' | 'video';
  score: number;
  snippet: string;
  cluster: string;
  tier: string;
}

const SAMPLE_RESULTS: SearchResult[] = [
  {
    title: 'Bao_cao_NCKH_Multimodal_Storage_2026.docx',
    path: 'D:\\AI_NCKH\\Office_Vault\\Documents\\Bao_cao_NCKH_Multimodal_Storage_2026.docx',
    modality: 'text',
    score: 0.94,
    snippet: 'Đề xuất kiến trúc lưu trữ đa phương thức kết hợp mô hình phân tầng Hot/Warm/Cold và suy luận cục bộ...',
    cluster: 'Documents_Office',
    tier: 'Hot'
  },
  {
    title: 'Character_Rig_Combat_Animation.blend',
    path: 'D:\\AI_NCKH\\GameDev_Projects\\3D_Assets\\Character_Rig_Combat_Animation.blend',
    modality: 'image',
    score: 0.88,
    snippet: 'Mô hình nhân vật chiến đấu 3D cho Unity/Unreal Engine, kết cấu texture PBR 4K.',
    cluster: 'GameDev & Engine',
    tier: 'Warm'
  },
  {
    title: 'meeting_discussion_audio_whisper.wav',
    path: 'D:\\AI_NCKH\\Media_Library\\Audio\\meeting_discussion_audio_whisper.wav',
    modality: 'audio',
    score: 0.81,
    snippet: 'Bản ghi âm cuộc họp bàn giao kiến trúc phần mềm, trích xuất text tự động qua Whisper SLM.',
    cluster: 'Audio_Speech',
    tier: 'Cold'
  }
];

export const SemanticSearchView: React.FC = () => {
  const [query, setQuery] = useState<string>('lưu trữ đa phương thức NCKH và asset đồ họa');
  const [results, setResults] = useState<SearchResult[]>(SAMPLE_RESULTS);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setResults(SAMPLE_RESULTS);
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <Search className="w-6 h-6 text-purple-400" />
          Tìm Kiếm Ngữ Nghĩa Đa Phương Thức (Hybrid Search: Vector + BM25)
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Truy xuất dữ liệu chéo modality (tìm kiếm văn bản để phát hiện ảnh, âm thanh, mã nguồn) thông qua mô hình Embedding BGE-M3 & CLIP
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <div className="flex-1 flex items-center bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 shadow-lg focus-within:border-purple-500">
          <Sparkles className="w-5 h-5 text-purple-400 mr-2.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập truy vấn tự nhiên (ví dụ: 'tìm tài liệu báo cáo tháng trước' hoặc 'ảnh 3D game dev')..."
            className="w-full bg-transparent outline-none text-white text-sm placeholder:text-slate-500 font-sans"
          />
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-xl text-xs font-mono shadow-lg shadow-purple-950/50 flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          {isSearching ? 'Đang Tìm...' : 'Tìm Kiếm AI'}
        </button>
      </form>

      {/* Results List */}
      <div className="space-y-3">
        <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
          <span>Kết quả tìm kiếm ngữ nghĩa tương đồng (Recall: Top-3):</span>
          <span className="text-purple-400">Embedding: BGE-M3 (1024-dim)</span>
        </div>

        {results.map((item, idx) => (
          <div
            key={idx}
            className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 p-4 rounded-xl transition-all shadow-md flex items-start justify-between"
          >
            <div className="space-y-1.5 flex-1 pr-4">
              <div className="flex items-center gap-2">
                {item.modality === 'text' && <FileText className="w-4 h-4 text-sky-400" />}
                {item.modality === 'image' && <ImageIcon className="w-4 h-4 text-emerald-400" />}
                {item.modality === 'audio' && <Music className="w-4 h-4 text-amber-400" />}
                {item.modality === 'video' && <Video className="w-4 h-4 text-rose-400" />}

                <h3 className="text-sm font-bold text-white hover:text-purple-300 cursor-pointer">
                  {item.title}
                </h3>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                  {item.cluster}
                </span>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  item.tier === 'Hot' ? 'bg-rose-950/60 text-rose-300 border-rose-800' :
                  item.tier === 'Warm' ? 'bg-amber-950/60 text-amber-300 border-amber-800' :
                  'bg-sky-950/60 text-sky-300 border-sky-800'
                }`}>
                  Tầng: {item.tier}
                </span>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {item.snippet}
              </p>

              <div className="text-[11px] font-mono text-slate-500 truncate">
                {item.path}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-sm font-mono font-bold text-purple-400">
                {(item.score * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Similarity</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
