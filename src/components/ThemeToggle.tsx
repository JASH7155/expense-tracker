'use client'

import { useTheme } from '@/lib/theme-provider'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center justify-center p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800/80 transition-colors ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 transition-transform duration-200 hover:rotate-45 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-200 text-zinc-700" />
      )}
    </button>
  )
}
