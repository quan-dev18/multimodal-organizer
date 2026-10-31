import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  CheckCircle2, 
  Save, 
  Cpu,
  Plus,
  Trash2,
  Edit2,
  X,
  Check
} from 'lucide-react';
import { sfx } from '../../lib/sounds';

const API_BASE = "http://127.0.0.1:8001/api";

export interface RuleItem {
  id: string;
  name: string;
  domain: string;
  extensions: string[];
  destFolder: string;
  subFolderPattern: string;
  aiModel: string;
  priority: number;
  enabled: boolean;
}

export const RuleConfigView: React.FC = () => {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [, setLoading] = useState<boolean>(true);
  const [saveMessage, setSaveMessage] = useState<string>('');
  
  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formDomain, setFormDomain] = useState<string>('');
  const [formDestFolder, setFormDestFolder] = useState<string>('');
  const [formExts, setFormExts] = useState<string>('');
  const [formModel, setFormModel] = useState<string>('qwen2.5:1.5b (Phân loại ngữ cảnh)');
  const [formPriority, setFormPriority] = useState<number>(1);

  // Fetch rules from backend
  const fetchRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/rules`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRules(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleRule = (id: string) => {
    sfx.toggle();
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleDeleteRule = (id: string, name: string) => {
    sfx.delete();
    if (confirm(`Bạn có chắc chắn muốn xóa quy tắc "${name}" không?`)) {
      setRules(prev => prev.filter(r => r.id !== id));
      setSaveMessage(`Đã xóa quy tắc "${name}". Hãy bấm "Lưu thay đổi" để áp dụng.`);
      setTimeout(() => setSaveMessage(''), 4000);
    }
  };

  const handleOpenAddModal = () => {
    sfx.click();
    setEditingRuleId(null);
    setFormName('');
    setFormDomain('Custom_Domain');
    setFormDestFolder('Custom_Folder');
    setFormExts('');
    setFormModel('qwen2.5:1.5b (Phân loại ngữ cảnh)');
    setFormPriority(rules.length + 1);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: RuleItem) => {
    sfx.click();
    setEditingRuleId(rule.id);
    setFormName(rule.name);
    setFormDomain(rule.domain);
    setFormDestFolder(rule.destFolder);
    setFormExts(rule.extensions.join(', '));
    setFormModel(rule.aiModel);
    setFormPriority(rule.priority);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    sfx.success();
    const cleanExts = formExts
      .split(/[,;\s]+/)
      .map(ext => ext.trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean);

    if (!formName.trim() || cleanExts.length === 0) {
      alert("Vui lòng điền tên quy tắc và ít nhất một định dạng tệp!");
      return;
    }

    if (editingRuleId) {
      // Edit existing
      setRules(prev => prev.map(r => {
        if (r.id === editingRuleId) {
          return {
            ...r,
            name: formName.trim(),
            domain: formDomain.trim(),
            destFolder: formDestFolder.trim(),
            extensions: cleanExts,
            aiModel: formModel,
            priority: Number(formPriority)
          };
        }
        return r;
      }));
    } else {
      // Add new
      const newRule: RuleItem = {
        id: `custom_${Date.now()}`,
        name: formName.trim(),
        domain: formDomain.trim() || 'Custom_Domain',
        destFolder: formDestFolder.trim() || 'Custom_Folder',
        extensions: cleanExts,
        subFolderPattern: '{Category}/{Year}',
        aiModel: formModel,
        priority: Number(formPriority),
        enabled: true
      };
      setRules(prev => [...prev, newRule]);
    }

    setIsModalOpen(false);
    setSaveMessage('Đã cập nhật quy tắc trong bộ nhớ. Hãy bấm "Lưu thay đổi" để ghi lại vào ổ đĩa.');
    setTimeout(() => setSaveMessage(''), 4000);
  };

  // Persist all rules to backend
  const handleSaveToBackend = async () => {
    sfx.click();
    try {
      const res = await fetch(`${API_BASE}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules)
      });
      const data = await res.json();
      if (data.success) {
        sfx.success();
        setSaveMessage(data.message || 'Đã lưu tất cả quy tắc thành công!');
        setTimeout(() => setSaveMessage(''), 4000);
      }
    } catch (e: any) {
      alert(`Lỗi lưu quy tắc: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            Quản lý quy tắc phân loại và định tuyến tệp
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Tự do thêm mới, sửa đổi hoặc xóa các chính sách phân loại theo nhu cầu làm việc của bạn (Lập trình, Đồ họa, Tài liệu...)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs flex items-center gap-1.5 border border-zinc-700 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            Thêm quy tắc mới
          </button>

          <button
            onClick={handleSaveToBackend}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Lưu thay đổi
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3.5 px-4 text-xs text-emerald-300 flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span>Danh sách quy tắc hoạt động ({rules.length} quy tắc):</span>
          <span>Có thể bật/tắt từng quy tắc bằng checkbox</span>
        </div>

        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`p-4 rounded-xl border transition-all ${
              rule.enabled 
                ? 'bg-zinc-900/70 border-zinc-800 shadow-sm' 
                : 'bg-zinc-950/40 border-zinc-800/60 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleRule(rule.id)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-500 cursor-pointer"
                />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    {rule.name}
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-mono">
                      Ưu tiên #{rule.priority}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Miền: <span className="text-zinc-200">{rule.domain}</span> · Thư mục đích: <span className="text-indigo-400 font-mono font-medium">{rule.destFolder}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg text-zinc-400">
                  <Cpu className="w-3 h-3 text-indigo-400" />
                  {rule.aiModel}
                </span>

                <button
                  onClick={() => handleOpenEditModal(rule)}
                  className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                  title="Chỉnh sửa quy tắc"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteRule(rule.id, rule.name)}
                  className="p-1.5 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                  title="Xóa quy tắc"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-800/60 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-zinc-500 mr-1.5">Định dạng khớp:</span>
              {rule.extensions.map((ext) => (
                <span
                  key={ext}
                  className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-300 rounded text-xs font-mono"
                >
                  .{ext}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                {editingRuleId ? "Chỉnh sửa quy tắc" : "Thêm quy tắc phân loại mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div>
                <label className="text-zinc-300 font-medium block mb-1">Tên quy tắc:</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Tài liệu đồ án hoặc File Thiết Kế..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-medium block mb-1">Miền ngữ cảnh (Domain):</label>
                  <input
                    type="text"
                    value={formDomain}
                    onChange={(e) => setFormDomain(e.target.value)}
                    placeholder="GameDev / Office..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-medium block mb-1">Thư mục đích lưu trữ:</label>
                  <input
                    type="text"
                    value={formDestFolder}
                    onChange={(e) => setFormDestFolder(e.target.value)}
                    placeholder="Office_Vault..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-medium block mb-1">
                  Định dạng tệp mở rộng (ngăn cách bằng dấu phẩy):
                </label>
                <input
                  type="text"
                  value={formExts}
                  onChange={(e) => setFormExts(e.target.value)}
                  placeholder="docx, pdf, xlsx, pptx, zip..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 font-mono outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-medium block mb-1">Mô hình AI gán nhãn:</label>
                  <select
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500"
                  >
                    <option value="qwen2.5:1.5b (Phân loại ngữ cảnh)">Qwen 2.5 (1.5B)</option>
                    <option value="llama3.2:1b (AST & Domain)">Llama 3.2 (1B)</option>
                    <option value="moondream (Vision SLM)">Moondream 2 (Vision)</option>
                    <option value="Quy tắc định dạng">Quy tắc định dạng nhanh</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-300 font-medium block mb-1">Mức ưu tiên (Số nhỏ ưu tiên trước):</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};