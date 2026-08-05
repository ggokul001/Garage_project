import { createContext,useCallback,useContext,useEffect,useState,ReactNode } from 'react';
export type Theme='light'|'dark'|'system';
const ThemeCtx=createContext<{theme:Theme;resolved:'light'|'dark';setTheme:(t:Theme)=>void}|null>(null);
const system=()=>window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light' as const;
export function ThemeProvider({children}:{children:ReactNode}){const [theme,setState]=useState<Theme>(()=>(localStorage.getItem('accura.theme') as Theme)||'system');const [resolved,setResolved]=useState<'light'|'dark'>(()=>theme==='system'?system():theme);
  const apply=useCallback(()=>{const next=theme==='system'?system():theme;setResolved(next);document.documentElement.classList.toggle('dark',next==='dark');document.documentElement.style.colorScheme=next},[theme]);
  useEffect(apply,[apply]);useEffect(()=>{const mq=window.matchMedia('(prefers-color-scheme: dark)');const h=()=>theme==='system'&&apply();mq.addEventListener('change',h);return()=>mq.removeEventListener('change',h)},[theme,apply]);
  const setTheme=(t:Theme)=>{localStorage.setItem('accura.theme',t);setState(t)};return <ThemeCtx.Provider value={{theme,resolved,setTheme}}>{children}</ThemeCtx.Provider>}
export const useTheme=()=>{const value=useContext(ThemeCtx);if(!value)throw new Error('ThemeProvider missing');return value};
