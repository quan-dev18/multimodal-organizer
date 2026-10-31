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
  Folder
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
}

export const DashboardOverviewView: React.FC = () => {
  const { globalDirectory, setGlobalDirectory } = useApp();
  // Real stats state
  const [, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [totalSize, setTotalSize] = useState<string>('0 B');
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [targetDir, setTargetDir] = useState<string>(globalDirectory);

  // Sync with global directory
  useEffect(() => {
    setTargetDir(globalDirectory);
  }, [globalDirectory]);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Xin chào! Tôi là Trợ lý AI tích hợp của MMO. Bạn có thắc mắc gì về phân loại tệp tin, dọn rác hay quản lý bộ nhớ đĩa không?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
        body: JSON.stringify({ message: userText, model: "llama3.2:1b" })
      });
      const data = await res.json();
      const botText = data.reply || "Xin lỗi, hiện tại tôi chưa thể kết nối tới mô hình AI.";
      
      setChatMessages(prev => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: botText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      sfx.success();
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: `Lỗi kết nối tới Trợ lý AI: ${err.message}. Hãy đảm bảo Ollama đang chạy.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      default: return HardDrive;
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-indigo-400" />
            Tổng quan dữ liệu thực tế & Trợ lý hỗ trợ
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Thống kê tự động từ thư mục dự án trên máy của bạn và tương tác trực tiếp với Trợ lý AI cục bộ
          </p>
        </div>

        <button
          onClick={() => fetchRealOverview()}
          disabled={loadingStats}
          className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs flex items-center gap-1.5 border border-zinc-700 shadow-sm transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin text-indigo-400' : ''}`} />
          Quét cập nhật
        </button>
      </div>

      {/* Directory Selector Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 flex-1 min-w-[320px]">
          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-medium text-zinc-300 shrink-0">Thư mục phân tích:</span>
          <input
            type="text"
            value={targetDir}
            onChange={(e) => setTargetDir(e.target.value)}
            className="flex-1 bg-zinc-950/80 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono outline-none focus:border-indigo-500"
          />
        </div>
        <button
          onClick={handlePickDirectory}
          type="button"
          className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          Chọn thư mục
        </button>
      </div>

      {/* 1. Real Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {chartData.map((item) => {
          const Icon = getModalityIcon(item.key);
          const percent = totalFiles > 0 ? ((item.count / totalFiles) * 100).toFixed(1) : 0;
          return (
            <div
              key={item.key}
              className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 transition-all hover:border-zinc-700/80 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs text-zinc-400 font-medium">{item.name}</span>
                <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-zinc-100">
                {item.count.toLocaleString()} <span className="text-xs font-normal text-zinc-500 font-sans">tệp</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500 mt-2 font-mono">
                <span>{item.size}</span>
                <span className="text-zinc-400">{percent}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Visual Distribution Chart Bar */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between text-xs text-zinc-300">
          <span className="font-semibold flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            Biểu đồ phân bổ tỷ lệ tệp tin (Tổng: {totalFiles.toLocaleString()} tệp · {totalSize})
          </span>
          <span className="text-zinc-500 text-xs font-mono truncate max-w-[50%]">Thư mục: {targetDir}</span>
        </div>

        {/* Multi-segmented distribution bar */}
        <div className="w-full h-3.5 bg-zinc-950 rounded-full overflow-hidden flex p-0.5 border border-zinc-800/80">
          {chartData.map((item) => {
            const widthPct = totalFiles > 0 ? (item.count / totalFiles) * 100 : 0;
            if (widthPct <= 0) return null;
            return (
              <div
                key={item.key}
                style={{ width: `${widthPct}%`, backgroundColor: item.color }}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
                title={`${item.name}: ${item.count} tệp (${widthPct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-400">
          {chartData.map((item) => (
            <div key={item.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.name}:</span>
              <b className="text-zinc-200 font-mono">{item.count}</b>
            </div>
          ))}
        </div>
      </div>

      {/* 3. AI Assistant Chatbot Panel */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col h-96 min-h-[340px] shadow-md overflow-hidden shrink-0">
        {/* Chat Header */}
        <div className="px-4 py-3 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                Trợ lý AI Hỗ Trợ MMO (Llama 3.2 1B Cục Bộ)
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-xs text-zinc-500">Hỏi đáp cách tổ chức dữ liệu, phân loại tệp và giải phóng ổ cứng</p>
            </div>
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
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <span className={`block text-xs font-mono ${msg.sender === 'user' ? 'text-indigo-200 text-right' : 'text-zinc-500'}`}>
                  {msg.time}
                </span>
              </div>
            </div>
          ))}

          {isAiReplying && (
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-indigo-400">
                <Bot className="w-3.5 h-3.5 animate-bounce" />
              </div>
              <div className="bg-zinc-950 rounded-xl px-3.5 py-2 border border-zinc-800 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                <span>Trợ lý AI đang suy nghĩ...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-zinc-950/90 border-t border-zinc-800 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Hỏi trợ lý (ví dụ: 'Cách dọn sạch tệp tạm an toàn', 'Quy tắc nào cho tệp ảnh đồ họa?')..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isAiReplying}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};