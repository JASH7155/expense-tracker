'use client'

import { useState, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/expenses', icon: '💸', label: 'Expenses' },
  { href: '/budgets', icon: '🎯', label: 'Budgets' },
  { href: '/insights', icon: '✨', label: 'Insights' },
  { href: '/reports', icon: '📄', label: 'Reports' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isDemo, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore
    }
    router.push('/auth')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#161b22] border-r border-[#30363d] fixed h-full z-20">
        <div className="p-6 border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">ExpenseIQ</h1>
              <p className="text-xs text-gray-500">Personal Finance</p>
            </div>
          </div>
          {isDemo && (
            <div className="mt-3 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-center justify-between text-xs text-amber-400">
              <span>👤 Demo Mode Active</span>
              <Link href="/auth" className="underline hover:text-amber-300">Login</Link>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#21262d]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#30363d]">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.email?.[0]?.toUpperCase() || 'D'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.email || 'demo@expenseiq.local'}</p>
              <p className="text-xs text-gray-500">{isDemo ? 'Predefined User' : 'Authenticated'}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            {isDemo ? '🔐 Switch to Login' : '🚪 Sign Out'}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <span className="text-white font-bold">ExpenseIQ</span>
          {isDemo && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
              Demo
            </span>
          )}
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-400 hover:text-white p-2"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-[#161b22] border-b border-[#30363d] p-4" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-gray-400 hover:text-white hover:bg-[#21262d]'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 pt-3 border-t border-[#30363d]">
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-red-400 rounded-lg"
              >
                {isDemo ? '🔐 Switch to Login' : '🚪 Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
          <Suspense fallback={<div className="text-gray-400 p-4">Loading...</div>}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  )
}
