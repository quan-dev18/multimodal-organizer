import React from 'react';
import { useApp } from './AppContext';
import { Sun, Moon, Globe } from 'lucide-react';

export const ThemeAndLangControls: React.FC = () => {
  const { lang, setLang, theme, setTheme } = useApp();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 transition-colors"
        title="Đổi ngôn ngữ / Switch language"
      >
        <Globe className="w-3.5 h-3.5 text-indigo-400" />
        <span className="uppercase">{lang}</span>
      </button>

      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 transition-colors"
        title="Đổi giao diện / Switch theme"
      >
        {theme === 'dark' ? (
          <Sun className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
        )}
      </button>
    </div>
  );
};
