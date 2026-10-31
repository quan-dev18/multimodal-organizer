import React, { useState } from 'react';
import { 
  Sliders, 
  CheckCircle, 
  Save, 
  Cpu
} from 'lucide-react';

interface RuleItem {
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

const INITIAL_RULES: RuleItem[] = [
  {
    id: 'gamedev',
    name: 'Game Development Assets',
    domain: 'GameDev & Engine',
    extensions: ['unity', 'prefab', 'fbx', 'obj', 'blend', 'uproject', 'shader', 'hlsl', 'cs'],
    destFolder: 'GameDev_Projects',
    subFolderPattern: '{Domain}/{FileType}',
    aiModel: 'qwen2.5:1.5b (SLM Heuristic)',
    priority: 1,
    enabled: true
  },
  {
    id: 'code',
    name: 'Software Development & Repos',
    domain: 'Software_Engineering',
    extensions: ['py', 'cpp', 'ts', 'js', 'html', 'css', 'java', 'rs', 'go', 'json'],
    destFolder: 'Source_Code',
    subFolderPattern: '{Language}/{ProjectName}',
    aiModel: 'qwen2.5:1.5b (AST & Domain)',
    priority: 2,
    enabled: true
  },
  {
    id: 'docs',
    name: 'Office & Finance Documents',
    domain: 'Documents_Office',
    extensions: ['docx', 'pdf', 'xlsx', 'pptx', 'csv', 'txt'],
    destFolder: 'Office_Vault',
    subFolderPattern: '{Category}/{Year}',
    aiModel: 'qwen2.5:1.5b + bge-m3',
    priority: 3,
    enabled: true
  },
  {
    id: 'media',
    name: 'Creative Media & Audio/Video',
    domain: 'Creative_Media',
    extensions: ['png', 'jpg', 'psd', 'ai', 'mp4', 'mov', 'wav', 'mp3', 'flac'],
    destFolder: 'Media_Library',
    subFolderPattern: '{Modality}/{Resolution}',
    aiModel: 'moondream (Vision) + whisper',
    priority: 4,
    enabled: true
  },
  {
    id: 'installers',
    name: 'Setup Installers & Archives',
    domain: 'Installers_Packages',
    extensions: ['exe', 'msi', 'zip', 'rar', '7z', 'iso'],
    destFolder: 'Installers_Archives',
    subFolderPattern: '{Type}',
    aiModel: 'Rule Engine',
    priority: 5,
    enabled: true
  }
];

export const RuleConfigView: React.FC = () => {
  const [rules, setRules] = useState<RuleItem[]>(INITIAL_RULES);
  const [saveMessage, setSaveMessage] = useState<string>('');

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleSave = () => {
    setSaveMessage('Đã lưu cấu hình quy tắc sắp xếp AI thành công vào hệ thống!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-lime-400" />
            Quy Tắc Sắp Xếp & Định Tuyến AI (Storage Router)
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Định nghĩa chính sách phân loại tự động cho từng chuyên ngành (Game Dev, Lập trình, Văn phòng, Đồ họa)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-lime-950/40 transition-all font-mono"
          >
            <Save className="w-4 h-4" />
            Lưu Quy Tắc
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="bg-lime-950/40 border border-lime-500/60 rounded-xl p-3 px-4 text-xs font-mono text-lime-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-lime-400" />
          {saveMessage}
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`p-4 rounded-xl border transition-all ${
              rule.enabled 
                ? 'bg-slate-900 border-slate-700/80 shadow-md' 
                : 'bg-slate-950/60 border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleRule(rule.id)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-lime-500"
                />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {rule.name}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-lime-400 border border-slate-700">
                      Ưu tiên #{rule.priority}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Miền ngữ cảnh: <span className="text-slate-200">{rule.domain}</span> · Thư mục đích: <span className="text-lime-300 font-bold">{rule.destFolder}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <Cpu className="w-3.5 h-3.5 text-lime-400" />
                  {rule.aiModel}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-500 mr-2">Định dạng khớp:</span>
              {rule.extensions.map((ext) => (
                <span
                  key={ext}
                  className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 rounded text-[11px] font-mono"
                >
                  .{ext}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
