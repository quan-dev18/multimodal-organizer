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
  PanelLeftOpen
} from 'lucide-react';
import { FileExplorerTree } from './FileExplorerTree';
import { DedicatedTempCleaner } from './DedicatedTempCleaner';
import { RuleConfigView } from './RuleConfigView';
import { TieringOptimizerView } from './TieringOptimizerView';
import { SemanticSearchView } from './SemanticSearchView';
import { DashboardOverviewView } from './DashboardOverviewView';
import { sfx } from '../../lib/sounds';
import { useApp } from '../../lib/AppContext';
import { ThemeAndLangControls } from '../../lib/ThemeAndLangControls';

interface MainAppProps {
  onBackToPreflight: () => void;
  activeModelNames: string[];
}

type TabId = 'files' | 'temp_cleaner' | 'dashboard' | 'organize' | 'storage' | 'search';

export const MainApp: React.FC<MainAppProps> = ({ onBackToPreflight, activeModelNames }) => {
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('files');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const TAB_CONFIG: { id: TabId; labelKey: string; icon: React.ElementType; descriptionKey: string }[] = [
    { id: 'files', labelKey: 'tab_explorer', icon: FolderOpen, descriptionKey: 'tab_explorer' },
    { id: 'temp_cleaner', labelKey: 'tab_cleaner', icon: Zap, descriptionKey: 'tab_cleaner' },
    { id: 'dashboard', labelKey: 'tab_chat', icon: HardDrive, descriptionKey: 'tab_chat' },
    { id: 'organize', labelKey: 'tab_rules', icon: Sliders, descriptionKey: 'tab_rules' },
    { id: 'storage', labelKey: 'tab_tiering', icon: Database, descriptionKey: 'tab_tiering' },
    { id: 'search', labelKey: 'tab_semantic_search', icon: Search, descriptionKey: 'tab_semantic_search' }
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
                  <p className="text-[11px] text-zinc-500 truncate">File organizer</p>
                </div>
              )}
            </div>

            {!isSidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                title="Thu gọn thanh bên (chỉ hiện icon)"
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
              const label = t(tab.labelKey);
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  title={isSidebarCollapsed ? label : undefined}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2'
                  } rounded-lg text-xs font-medium transition-all duration-200 relative group cursor-pointer ${
                    isActive
                      ? 'text-indigo-300 bg-indigo-500/10'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-indigo-500 rounded-r-full" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">{label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Area: AI Status & Sidebar Expand Toggle */}
        <div className={`${isSidebarCollapsed ? 'px-2 pb-3' : 'px-3 pb-3'} space-y-2`}>
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2 py-1">
              {/* Expand button at the bottom of collapsed sidebar */}
              <button
                onClick={toggleSidebar}
                title="Mở rộng thanh bên"
                className="w-9 h-9 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-zinc-100 flex items-center justify-center border border-zinc-700/50 transition-colors cursor-pointer shadow-sm"
              >
                <PanelLeftOpen className="w-4 h-4 text-indigo-400" />
              </button>

              <button
                onClick={() => { sfx.click(); onBackToPreflight(); }}
                title={`${activeModelNames.length} mô hình đang hoạt động. Nhấn để cấu hình.`}
                className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center relative hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse absolute -top-0.5 -right-0.5" />
                <Settings className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          ) : (
            <div className="bg-zinc-950/80 rounded-xl border border-zinc-800/60 p-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{activeModelNames.length} mô hình đang hoạt động</span>
              </div>

              <div className="space-y-1">
                {activeModelNames.slice(0, 2).map((name, idx) => (
                  <div key={idx} className="text-xs font-mono text-zinc-300 truncate bg-zinc-900/60 px-2 py-1 rounded border border-zinc-800/50">
                    {name}
                  </div>
                ))}
                {activeModelNames.length > 2 && (
                  <div className="text-xs text-zinc-500">+{activeModelNames.length - 2} khác</div>
                )}
              </div>

              <button
                onClick={() => { sfx.click(); onBackToPreflight(); }}
                className="mt-2.5 w-full py-1.5 text-xs bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-zinc-100 rounded-lg border border-zinc-700/50 flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-500" />
                Cấu hình mô hình
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-indigo-500/10">
              {React.createElement(currentTab.icon, { className: 'w-4.5 h-4.5 text-indigo-400' })}
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">{t(currentTab.labelKey)}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{t(currentTab.descriptionKey)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeAndLangControls />
          </div>
        </header>

        {/* Tab Content with persistent state across tabs */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'files' ? 'block' : 'hidden'}`}>
            <FileExplorerTree />
          </div>

          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'temp_cleaner' ? 'block' : 'hidden'}`}>
            <DedicatedTempCleaner />
          </div>

          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'organize' ? 'block' : 'hidden'}`}>
            <RuleConfigView />
          </div>

          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'storage' ? 'block' : 'hidden'}`}>
            <TieringOptimizerView />
          </div>

          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'search' ? 'block' : 'hidden'}`}>
            <SemanticSearchView />
          </div>

          <div className={`h-full flex-1 min-h-0 overflow-y-auto flex flex-col ${activeTab === 'dashboard' ? 'block' : 'hidden'}`}>
            <DashboardOverviewView />
          </div>
        </div>
      </main>
    </div>
  );
};