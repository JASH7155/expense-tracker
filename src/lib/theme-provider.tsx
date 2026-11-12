'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Read saved preference or system preference
    const saved = localStorage.getItem('expenseiq_theme') as Theme | null
    if (saved === 'light' || saved === 'dark') {
      setThemeState(saved)
      applyTheme(saved)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const initial = prefersDark ? 'dark' : 'light'
      setThemeState(initial)
      applyTheme(initial)
    }
    setMounted(true)
  }, [])

  function applyTheme(t: Theme) {
    const root = document.documentElement
    if (t === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }

  function setTheme(t: Theme) {
    setThemeState(t)
    applyTheme(t)
    localStorage.setItem('expenseiq_theme', t)
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
