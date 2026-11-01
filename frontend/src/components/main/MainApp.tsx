import React, { useState } from 'react';
import {
  Sliders,
  Database,
  Search,
  HardDrive,
  FolderOpen,
  Zap,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart2
} from 'lucide-react';
import { FileExplorerTree } from './FileExplorerTree';
import { DedicatedTempCleaner } from './DedicatedTempCleaner';
import { RuleConfigView } from './RuleConfigView';
import { TieringOptimizerView } from './TieringOptimizerView';
import { SemanticSearchView } from './SemanticSearchView';
import { DashboardOverviewView } from './DashboardOverviewView';
import { BenchmarkDashboardView } from './BenchmarkDashboardView';
import { sfx } from '../../lib/sounds';
import { useApp } from '../../lib/AppContext';
import { ThemeAndLangControls } from '../../lib/ThemeAndLangControls';

interface MainAppProps {
  onBackToPreflight: () => void;
  activeModelNames: string[];
  activeModelTags?: string[];
  primaryModelTag?: string;
  hardware?: any;
}

type TabId = 'files' | 'temp_cleaner' | 'dashboard' | 'benchmark' | 'organize' | 'storage' | 'search';

export const MainApp: React.FC<MainAppProps> = ({ onBackToPreflight, activeModelNames, activeModelTags = [], primaryModelTag = '', hardware: _hardware }) => {
  const { t: _t } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('files');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const TAB_CONFIG: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'files', label: 'Quản lý tệp', icon: FolderOpen, description: 'Cây thư mục & quét sâu' },
    { id: 'temp_cleaner', label: 'Dọn rác hệ thống', icon: Zap, description: 'Xóa tệp tạm %TEMP%' },
    { id: 'dashboard', label: 'Tổng quan & Chat AI', icon: HardDrive, description: 'Hỏi đáp trợ lý AI' },
    { id: 'benchmark', label: 'Đo hiệu năng Laptop', icon: BarChart2, description: 'Benchmark AI thực tế' },
    { id: 'organize', label: 'Quy tắc phân loại', icon: Sliders, description: 'Sắp xếp theo định dạng' },
    { id: 'storage', label: 'Tối ưu lưu trữ', icon: Database, description: 'Phân tầng Hot/Warm/Cold' },
    { id: 'search', label: 'Tìm kiếm ngữ nghĩa', icon: Search, description: 'Tìm kiếm theo nội dung' }
  ];

  const currentTab = TAB_CONFIG.find(t => t.id === activeTab)!;

  const handleTabChange = (tabId: TabId) => {
    if (tabId !== activeTab) {
      sfx.navigate();
      setActiveTab(tabId);
    }
  };

  const toggleSidebar = () => {
    sfx.toggle();
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside 
        className={`${
          isSidebarCollapsed ? 'w-16' : 'w-60'
        } bg-zinc-900/80 border-r border-zinc-800/80 flex flex-col justify-between select-none shrink-0 transition-all duration-300 ease-in-out`}
      >
        {/* Logo & Navigation */}
        <div>
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-4 border-b border-zinc-800/60`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <img 
                src="./mmo_app_icon.png" 
                alt="MMO Logo" 
                className="w-8 h-8 rounded-lg object-contain bg-zinc-900 p-0.5 shrink-0 shadow-sm"
              />
              {!isSidebarCollapsed && (
                <div className="truncate">
                  <h1 className="font-semibold text-sm text-zinc-100 truncate">MMO Desktop</h1>
                  <p className="text-[11px] text-zinc-500 truncate">Python AI Core Engine</p>
                </div>
              )}
            </div>

            {!isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                title="Thu gọn thanh bên"
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          <nav className="px-2 pt-3 space-y-1">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  title={isSidebarCollapsed ? tab.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  {!isSidebarCollapsed && (
                    <span className="truncate">{tab.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-800/60 space-y-2">
          {isSidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              title="Mở rộng thanh bên"
              className="w-full flex justify-center p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onBackToPreflight}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-xl transition-colors cursor-pointer ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Quay lại chọn mô hình AI"
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">Cấu hình & Mô hình</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-zinc-950">
        {/* Top Header Bar */}
        <header className="h-14 px-6 border-b border-zinc-800/60 flex items-center justify-between shrink-0 bg-zinc-900/40">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">{currentTab.label}</h2>
            <p className="text-[11px] text-zinc-500">{currentTab.description}</p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeAndLangControls />
          </div>
        </header>

        {/* Tab View Container */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'files' ? 'flex' : 'hidden'}`}>
            <FileExplorerTree />
          </div>

          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'temp_cleaner' ? 'flex' : 'hidden'}`}>
            <DedicatedTempCleaner />
          </div>

          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'dashboard' ? 'flex' : 'hidden'}`}>
            <DashboardOverviewView
              activeModelTags={activeModelTags}
              primaryModelTag={primaryModelTag}
              activeModelNames={activeModelNames}
            />
          </div>

          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'benchmark' ? 'flex' : 'hidden'}`}>
            <BenchmarkDashboardView />
          </div>

          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'organize' ? 'flex' : 'hidden'}`}>
            <RuleConfigView />
          </div>

          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'storage' ? 'flex' : 'hidden'}`}>
            <TieringOptimizerView />
          </div>

          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'search' ? 'flex' : 'hidden'}`}>
            <SemanticSearchView />
          </div>
        </div>
      </main>
    </div>
  );
};
