'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export const THEMES = {
  petroleo: { name: 'Petroleo', desc: 'Naval editorial com serifa', swatch: ['#1F3B4E', '#F7F5F0', '#B56B30'] },
  grafite:  { name: 'Grafite',  desc: 'Monocromo tecnico minimalista', swatch: ['#111111', '#EBEBEB', '#0F6FBA'] },
  brasao:   { name: 'Brasao',   desc: 'Verde republica e ouro classico', swatch: ['#1A4828', '#F0ECD8', '#9C6A14'] },
  noite:    { name: 'Noite',    desc: 'Dark institucional azul profundo', swatch: ['#0D1117', '#161C24', '#4A90D9'] },
} as const

export type ThemeName = keyof typeof THEMES

const ThemeCtx = createContext<{
  theme: ThemeName
  setTheme: (t: ThemeName) => void
}>({ theme: 'petroleo', setTheme: () => {} })

export function ThemeProvider({
  children,
  initial = 'petroleo',
}: {
  children: ReactNode
  initial?: ThemeName
}) {
  const [theme, setThemeState] = useState<ThemeName>(initial)

  useEffect(() => {
    const saved = localStorage.getItem('licita-theme') as ThemeName | null
    if (saved && THEMES[saved]) setThemeState(saved)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const setTheme = (t: ThemeName) => {
    setThemeState(t)
    localStorage.setItem('licita-theme', t)
  }

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
