import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Send,
  Bot,
  User,
  PieChart as PieIcon,
  RefreshCw,
  HardDrive,
  FolderOpen,
  Folder,
  Cpu
} from 'lucide-react';
import { sfx } from '../../lib/sounds';
import { useApp } from '../../lib/AppContext';

const API_BASE = "http://127.0.0.1:8001/api";

interface ChartItem {
  name: string;
  key: string;
  count: number;
  size: string;
  bytes: number;
  color: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  model?: string;
}

interface DashboardOverviewViewProps {
  activeModelTags?: string[];
  primaryModelTag?: string;
  activeModelNames?: string[];
}

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({
  activeModelTags = [],
  primaryModelTag = '',
  activeModelNames: _activeModelNames = []
}) => {
  const [installedModels, setInstalledModels] = useState<string[]>(activeModelTags);
  const [selectedChatModel, setSelectedChatModel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('mmo_chat_model');
      if (saved) return saved;
    } catch {}
    return primaryModelTag || (activeModelTags.length > 0 ? activeModelTags[0] : 'qwen2.5:1.5b');
  });

  const { globalDirectory, setGlobalDirectory } = useApp();
  // Real stats state
  const [, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [totalSize, setTotalSize] = useState<string>('0 B');
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [targetDir, setTargetDir] = useState<string>(globalDirectory);

  // Sync available installed models from Ollama dynamically
  useEffect(() => {
    fetch(`${API_BASE}/ollama/status`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.installed_models) && data.installed_models.length > 0) {
          setInstalledModels(data.installed_models);
          // If current model not installed, pick the first available
          if (!data.installed_models.includes(selectedChatModel)) {
            setSelectedChatModel(data.installed_models[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleModelChange = (newModel: string) => {
    setSelectedChatModel(newModel);
    try {
      localStorage.setItem('mmo_chat_model', newModel);
    } catch {}
    sfx.click();
  };

  // Sync with global directory
  useEffect(() => {
    setTargetDir(globalDirectory);
  }, [globalDirectory]);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Xin chào! Tôi là Trợ lý AI tích hợp của MMO. Bạn có thể chọn mô hình đã tải bất kỳ ở góc trên để trao đổi về phân loại tệp tin, dọn rác hay tối ưu bộ nhớ.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: selectedChatModel
    }
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isAiReplying, setIsAiReplying] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchRealOverview = async (dirToScan?: string) => {
    const dir = dirToScan || targetDir;
    setLoadingStats(true);
    try {
      const res = await fetch(`${API_BASE}/stats/overview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: dir })
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setChartData(data.chart_data);
        setTotalFiles(data.total_files);
        setTotalSize(data.total_size_formatted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchRealOverview(targetDir);
  }, [targetDir]);

  const handlePickDirectory = async () => {
    sfx.click();
    try {
      const res = await fetch(`${API_BASE}/system/select_folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: "Chọn thư mục phân tích tỷ lệ tệp" })
      });
      const data = await res.json();
      if (data && data.success && data.path) {
        setTargetDir(data.path);
        setGlobalDirectory(data.path);
        return;
      }
    } catch {}

    const manual = prompt('Nhập đường dẫn thư mục cần phân tích:', targetDir);
    if (manual && manual.trim()) {
      setTargetDir(manual.trim());
      setGlobalDirectory(manual.trim());
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isAiReplying) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    sfx.click();

    const newMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setIsAiReplying(true);

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, model: selectedChatModel })
      });
      const data = await res.json();
      const botText = data.reply || "Xin lỗi, hiện tại tôi chưa thể kết nối tới mô hình AI.";
      
      setChatMessages(prev => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: botText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: data.model || selectedChatModel
        }
      ]);
      sfx.success();
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: `Lỗi kết nối tới Trợ lý AI (${selectedChatModel}): ${err.message}. Hãy đảm bảo Ollama đang chạy.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: selectedChatModel
        }
      ]);
    } finally {
      setIsAiReplying(false);
    }
  };

  const getModalityIcon = (key: string) => {
    switch (key) {
      case 'text': return FileText;
      case 'image': return ImageIcon;
      case 'audio': return Music;
      case 'video': return Video;
      default: return Folder;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-7xl mx-auto w-full overflow-y-auto">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-indigo-400" />
            Tổng Quan Thống Kê & Trợ Lý AI
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Phân tích tỷ lệ chiếm dụng đĩa và hỗ trợ trực tiếp từ mô hình AI cục bộ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs">
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
            <input
              type="text"
              value={targetDir}
              onChange={(e) => setTargetDir(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setGlobalDirectory(targetDir);
                  fetchRealOverview(targetDir);
                }
              }}
              className="bg-transparent text-zinc-200 outline-none w-48 font-mono text-xs"
              placeholder="Đường dẫn thư mục..."
            />
          </div>

          <button
            onClick={handlePickDirectory}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Duyệt
          </button>

          <button
            onClick={() => fetchRealOverview(targetDir)}
            disabled={loadingStats}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Làm mới thống kê"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Real Modality Distribution Grid */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Tỷ lệ Định Dạng Tệp ({targetDir})
            </h3>
          </div>
          <div className="text-xs text-zinc-400">
            Tổng cộng: <span className="font-semibold text-zinc-200">{totalFiles.toLocaleString()}</span> tệp (<span className="text-indigo-300 font-mono">{totalSize}</span>)
          </div>
        </div>

        {/* Visual Multi-Segment Bar */}
        <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden flex mb-5 border border-zinc-800">
          {chartData.length > 0 ? (
            chartData.map((item) => {
              const pct = totalFiles > 0 ? (item.count / totalFiles) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={item.key}
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                  className="h-full transition-all duration-300 hover:opacity-80"
                  title={`${item.name}: ${item.count} tệp (${pct.toFixed(1)}%)`}
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-zinc-800 animate-pulse" />
          )}
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {chartData.map((item) => {
            const Icon = getModalityIcon(item.key);
            const pct = totalFiles > 0 ? ((item.count / totalFiles) * 100).toFixed(1) : '0';
            return (
              <div
                key={item.key}
                className="flex items-center gap-3 p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${item.color}20`, color: item.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-zinc-200 truncate">{item.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">({pct}%)</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    {item.count.toLocaleString()} tệp · {item.size}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. AI Assistant Chatbot Panel */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col h-[450px] min-h-[380px] shadow-md overflow-hidden shrink-0">
        {/* Chat Header with Dynamic Model Selector */}
        <div className="px-5 py-3.5 bg-zinc-950/90 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                Trợ lý AI Hỗ Trợ MMO
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-xs text-zinc-500">Hỏi đáp cách tổ chức dữ liệu, phân loại tệp và giải phóng ổ cứng</p>
            </div>
          </div>

          {/* Dynamic Model Picker */}
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-xs text-zinc-400 font-medium">Mô hình AI:</span>
            <select
              value={selectedChatModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm hover:bg-zinc-800 transition-colors"
            >
              {installedModels.length > 0 ? (
                installedModels.map((m) => (
                  <option key={m} value={m} className="bg-zinc-900 text-zinc-200">
                    {m}
                  </option>
                ))
              ) : (
                <option value={selectedChatModel}>{selectedChatModel}</option>
              )}
            </select>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-indigo-400 border border-zinc-700'
              }`}>
                {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 space-y-1 shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-950/90 text-zinc-200 border border-zinc-800/80'
              }`}>
                {msg.sender === 'bot' && msg.model && (
                  <span className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-900/60 mb-1">
                    {msg.model}
                  </span>
                )}
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <span className={`block text-[10px] font-mono ${msg.sender === 'user' ? 'text-indigo-200 text-right' : 'text-zinc-500'}`}>
                  {msg.time}
                </span>
              </div>
            </div>
          ))}

          {isAiReplying && (
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 text-indigo-400 flex items-center justify-center border border-zinc-700 shrink-0">
                <Bot className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                <span className="text-zinc-400">Đang suy luận với <strong className="text-indigo-300 font-mono">{selectedChatModel}</strong>...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-zinc-950/80 border-t border-zinc-800 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Đặt câu hỏi cho ${selectedChatModel} về quản lý dữ liệu, dọn rác...`}
            disabled={isAiReplying}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isAiReplying}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            Gửi
          </button>
        </form>
      </div>
    </div>
  );
};
