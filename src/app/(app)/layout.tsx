'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ThemeToggle from '@/components/ThemeToggle'
import {
  LayoutDashboard,
  ReceiptText,
  Target,
  Sparkles,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Wallet,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/expenses', icon: ReceiptText, label: 'Expenses' },
  { href: '/budgets', icon: Target, label: 'Budgets' },
  { href: '/insights', icon: Sparkles, label: 'Insights' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/settings', icon: Settings, label: 'Settings' },
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#090a0f]">
        <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 text-sm">
          <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading ExpenseIQ...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#090a0f] text-zinc-900 dark:text-zinc-100 flex transition-colors duration-200">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-[#0e1017] border-r border-zinc-200/80 dark:border-zinc-800/80 fixed h-full z-20 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        {/* Brand Header */}
        <div className="p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 flex items-center justify-center text-white dark:text-zinc-950 shadow-sm transition-transform group-hover:scale-105">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-zinc-900 dark:text-white leading-tight">
                ExpenseIQ
              </h1>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">Personal Finance</p>
            </div>
          </Link>
          <ThemeToggle />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3.5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Card & Sign Out */}
        <div className="p-3.5 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60">
            <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-xs font-bold flex-shrink-0">
              {user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-200 truncate">{user.email}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">Account Active</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/90 dark:bg-[#0e1017]/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between px-4 z-30 shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-950">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-white">ExpenseIQ</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white p-2 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute top-14 left-0 right-0 bg-white dark:bg-[#0e1017] border-b border-zinc-200 dark:border-zinc-800 p-4 shadow-xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-500 truncate max-w-[180px]">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium px-2 py-1 rounded"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Page Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <Suspense fallback={<div className="text-zinc-400 p-4 text-xs">Loading...</div>}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  )
}
