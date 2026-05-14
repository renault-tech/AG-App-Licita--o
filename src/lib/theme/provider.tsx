'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export const THEMES = {
  petroleo: { name: 'Petroleo', desc: 'Editorial classico', swatch: ['#1F3B4E', '#F7F5F0', '#A8693D'] },
  grafite:  { name: 'Grafite',  desc: 'Moderno monocromatico', swatch: ['#171A1F', '#FBFBF8', '#3A8C6E'] },
  brasao:   { name: 'Brasao',   desc: 'Republicano tradicional', swatch: ['#1F4A33', '#F4F1E8', '#9C6A14'] },
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
