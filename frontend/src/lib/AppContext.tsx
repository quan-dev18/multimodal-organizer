import React, { createContext, useContext, useState, useEffect } from 'react';
import { type Language, type Theme, translations } from './i18n';

interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  globalDirectory: string;
  setGlobalDirectory: (dir: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('mmo_lang') as Language) || 'vi';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('mmo_theme') as Theme) || 'dark';
  });

  const [globalDirectory, setGlobalDirectoryState] = useState<string>(() => {
    return localStorage.getItem('mmo_global_dir') || '/home/quandev';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('mmo_lang', newLang);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('mmo_theme', newTheme);
  };

  const setGlobalDirectory = (dir: string) => {
    setGlobalDirectoryState(dir);
    localStorage.setItem('mmo_global_dir', dir);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[lang]?.[key] || translations['en']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        theme,
        setTheme,
        globalDirectory,
        setGlobalDirectory,
        t,
      }}
    >
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
