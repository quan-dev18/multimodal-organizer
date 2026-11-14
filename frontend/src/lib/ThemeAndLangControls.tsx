import React from 'react';
import { Sun, Moon, Monitor, Languages } from 'lucide-react';
import { useApp } from './AppContext';
import { sfx } from './sounds';

export const ThemeAndLangControls: React.FC = () => {
  const { lang, setLang, theme, setTheme } = useApp();

  const handleToggleTheme = () => {
    sfx.click();
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const handleToggleLang = () => {
    sfx.click();
    setLang(lang === 'vi' ? 'en' : 'vi');
  };

  return (
    <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg p-1 text-xs shadow-sm">
      {/* Language Switcher */}
      <button
        onClick={handleToggleLang}
        title={lang === 'vi' ? 'Đổi sang English' : 'Chuyển sang Tiếng Việt'}
        className="flex items-center gap-1 px-2 py-1 rounded text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <Languages className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-semibold text-[11px]">{lang === 'vi' ? 'VI' : 'EN'}</span>
      </button>

      <div className="w-[1px] h-3.5 bg-zinc-800" />

      {/* Theme Switcher */}
      <button
        onClick={handleToggleTheme}
        title={`Giao diện: ${theme === 'dark' ? 'Tối (Dark)' : theme === 'light' ? 'Sáng (Light)' : 'Hệ thống (System)'}`}
        className="flex items-center gap-1 px-2 py-1 rounded text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        {theme === 'dark' && <Moon className="w-3.5 h-3.5 text-amber-400" />}
        {theme === 'light' && <Sun className="w-3.5 h-3.5 text-amber-400" />}
        {theme === 'system' && <Monitor className="w-3.5 h-3.5 text-indigo-400" />}
        <span className="capitalize text-[11px] hidden sm:inline">{theme}</span>
      </button>
    </div>
  );
};
