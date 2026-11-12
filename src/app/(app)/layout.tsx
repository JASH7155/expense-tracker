'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    async function checkUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/auth')
      } else {
        setUser(currentUser)
      }
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session?.user) {
        router.push('/auth')
      } else {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="text-gray-400">Loading your account...</div>
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
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-zinc-800 text-white border border-zinc-700/80 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#30363d]">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 text-xs font-bold">
              {user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user.email}</p>
              <p className="text-xs text-zinc-500">Authenticated</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <span className="text-white font-bold">ExpenseIQ</span>
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
                      ? 'bg-zinc-800 text-white border border-zinc-700/80'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
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
                🚪 Sign Out
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
