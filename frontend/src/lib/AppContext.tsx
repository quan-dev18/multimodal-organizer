import React, { createContext, useContext, useState, useEffect } from 'react';
import { i18nResources, type Language } from './i18n';

export type Theme = 'dark' | 'light' | 'system';

interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  // Shared persistent working directory across tabs
  globalDirectory: string;
  setGlobalDirectory: (dir: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('mmo_lang') as Language) || 'vi';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('mmo_theme') as Theme) || 'dark';
  });

  const [globalDirectory, setGlobalDirectoryState] = useState<string>(() => {
    return localStorage.getItem('mmo_working_dir') || 'D:\\AI_NCKH';
  });

  // Load last opened folder from backend configuration on startup
  useEffect(() => {
    fetch('http://127.0.0.1:8001/api/config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg && cfg.last_opened_folder) {
          setGlobalDirectoryState(cfg.last_opened_folder);
          localStorage.setItem('mmo_working_dir', cfg.last_opened_folder);
        }
      })
      .catch(() => {});
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('mmo_lang', newLang);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('mmo_theme', newTheme);
  };

  const setGlobalDirectory = (dir: string) => {
    const trimmed = dir.trim();
    if (trimmed) {
      setGlobalDirectoryState(trimmed);
      localStorage.setItem('mmo_working_dir', trimmed);
      // Synchronize with backend config.json
      fetch('http://127.0.0.1:8001/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_opened_folder: trimmed })
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = key;
    if (i18nResources[key] && i18nResources[key][lang]) {
      text = i18nResources[key][lang];
    }
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  };

  return (
    <AppContext.Provider value={{ 
      lang, 
      setLang, 
      theme, 
      setTheme, 
      t,
      globalDirectory,
      setGlobalDirectory
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
