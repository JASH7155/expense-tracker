'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useMonthlyExpenses, useCategories, useBudgets } from '@/lib/hooks'
import { formatCurrency, getMonthLabel, getCategoryColor } from '@/lib/utils'
import {
  Wallet,
  Calendar,
  Zap,
  Target,
  Plus,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
}: {
  title: string
  value: string
  sub?: string
  icon: any
}) {
  return (
    <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between mb-2.5 sm:mb-3.5">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
          <Icon className="w-4 h-4" />
        </div>
        {sub && (
          <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 font-medium truncate max-w-[95px] sm:max-w-none">
            {sub}
          </span>
        )}
      </div>
      <p className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 tracking-wide uppercase truncate">{title}</p>
      <p className="text-zinc-950 dark:text-zinc-50 text-lg sm:text-2xl font-bold tracking-tight tabular-nums truncate">{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { expenses, loading } = useMonthlyExpenses()
  const { categories } = useCategories()
  const { budgets } = useBudgets()
  const now = new Date()

  const stats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0)
    const today = new Date().toISOString().split('T')[0]
    const todayTotal = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0)
    const avgDaily = total / (now.getDate() || 1)

    // Autopays
    const autopays = expenses.filter(e => e.is_autopay || e.is_recurring)
    const autopayTotal = autopays.reduce((sum, e) => sum + e.amount, 0)

    // Category breakdown with distinct, vivid colors
    const byCategory: Record<string, { name: string; total: number; icon: string; color: string }> = {}
    let catIndex = 0
    for (const exp of expenses) {
      const cat = exp.categories
      const key = cat?.id || 'misc'
      if (!byCategory[key]) {
        const catName = cat?.name || 'Miscellaneous'
        byCategory[key] = {
          name: catName,
          total: 0,
          icon: cat?.icon || '🏷️',
          color: getCategoryColor(catName, cat?.color, catIndex++),
        }
      }
      byCategory[key].total += exp.amount
    }

    // Daily timeline
    const dailyMap: Record<string, number> = {}
    for (const exp of expenses) {
      dailyMap[exp.date] = (dailyMap[exp.date] || 0) + exp.amount
    }
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dailyData = Array.from({ length: now.getDate() }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1)
      const dateStr = d.toISOString().split('T')[0]
      return {
        day: i + 1,
        amount: dailyMap[dateStr] || 0,
      }
    })

    return { total, todayTotal, avgDaily, autopays, autopayTotal, byCategory, dailyData }
  }, [expenses])

  const overallBudget = budgets.find(b => b.category_id === null)
  const budgetPercent = overallBudget ? Math.min((stats.total / overallBudget.amount) * 100, 100) : null

  const pieData = Object.values(stats.byCategory).sort((a, b) => b.total - a.total).slice(0, 8)
  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm">Loading financial overview...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Dashboard
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5">
            {getMonthLabel(now.getFullYear(), now.getMonth())} · Performance overview
          </p>
        </div>
        <Link
          href="/expenses/new"
          className="inline-flex items-center justify-center gap-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Expense</span>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Spent"
          value={formatCurrency(stats.total)}
          icon={Wallet}
          sub={`${expenses.length} txns`}
        />
        <StatCard
          title="Today's Spend"
          value={formatCurrency(stats.todayTotal)}
          icon={Calendar}
          sub="Today"
        />
        <StatCard
          title="Autopays / Recurring"
          value={formatCurrency(stats.autopayTotal)}
          icon={Zap}
          sub={`${stats.autopays.length} active`}
        />
        <StatCard
          title="Budget Left"
          value={overallBudget ? formatCurrency(Math.max(overallBudget.amount - stats.total, 0)) : '—'}
          icon={Target}
          sub={overallBudget ? `of ${formatCurrency(overallBudget.amount)}` : 'No budget set'}
        />
      </div>

      {/* Autopays & Subscriptions Highlight */}
      {stats.autopays.length > 0 && (
        <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-zinc-900 dark:text-zinc-100 font-semibold text-xs sm:text-sm">Active Autopays &amp; Recurring</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  {stats.autopays.length} recurring commitment{stats.autopays.length > 1 ? 's' : ''} auto-tracked
                </p>
              </div>
            </div>
            <Link href="/expenses" className="text-xs text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 font-medium transition-colors">
              <span>View in Expenses</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.autopays.slice(0, 3).map((item) => {
              const freq = (item as any).recurring_frequency
              return (
                <div key={item.id} className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl p-3 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <p className="text-zinc-900 dark:text-zinc-100 text-xs font-medium truncate">{item.description}</p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px] capitalize flex items-center gap-1 mt-0.5">
                      <span className="text-amber-500 text-[10px]">⚡</span>
                      <span>{freq ? `${freq} Autopay` : 'Recurring'}</span>
                    </p>
                  </div>
                  <span className="text-zinc-900 dark:text-zinc-100 font-bold text-xs whitespace-nowrap tabular-nums">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Budget Progress */}
      {budgetPercent !== null && (
        <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Monthly Budget Burn</span>
            <span className={`text-xs font-bold tabular-nums ${budgetPercent >= 100 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-200'}`}>
              {budgetPercent.toFixed(0)}% used
            </span>
          </div>
          <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${budgetPercent >= 100 ? 'bg-red-500' : 'bg-zinc-900 dark:bg-zinc-100'}`}
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium tabular-nums">
            <span>{formatCurrency(stats.total)} spent</span>
            <span>{formatCurrency(overallBudget!.amount)} limit</span>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Spending by Category - Pie Chart */}
        <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
          <h2 className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm mb-4">Spending by Category</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-zinc-400 text-xs">
              No expenses recorded yet this month
            </div>
          ) : (
            <div>
              <div className="relative">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="total"
                      nameKey="name"
                      stroke="none"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [formatCurrency(Number(value) || 0), String(name)]}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      }}
                      itemStyle={{ color: '#fff', fontWeight: 500 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-1">
                  <span className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider">Total</span>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatCurrency(stats.total)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                {pieData.map((cat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-xs" style={{ backgroundColor: cat.color }} />
                    <span className="text-zinc-600 dark:text-zinc-400 truncate text-[11px] font-medium">{cat.name}</span>
                    <span className="text-zinc-900 dark:text-zinc-200 ml-auto font-semibold tabular-nums text-[11px]">{formatCurrency(cat.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Daily Spending - Line Chart */}
        <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm">Daily Spending Velocity</h2>
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Cumulative Pace</span>
            </div>
          </div>
          {stats.dailyData.every(d => d.amount === 0) ? (
            <div className="flex items-center justify-center h-48 text-zinc-400 text-xs">
              No daily transactions yet this month
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={stats.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800/40" />
                <XAxis dataKey="day" stroke="#a1a1aa" tick={{ fontSize: 10 }} />
                <YAxis stroke="#a1a1aa" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Spent']}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#71717a" strokeWidth={2} dot={{ r: 2.5, fill: '#ffffff' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Transactions */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm">Top Transactions This Month</h2>
          <Link href="/expenses" className="text-xs text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white font-medium flex items-center gap-1 transition-colors">
            <span>View all</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {topExpenses.length === 0 ? (
          <div className="text-center py-10 text-zinc-400 text-xs">
            <p className="text-zinc-500">No expenses logged yet. <Link href="/expenses/new" className="text-zinc-900 dark:text-zinc-100 underline font-medium">Add your first transaction</Link></p>
          </div>
        ) : (
          <div className="space-y-2">
            {topExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <span className="text-lg w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  {expense.categories?.icon || '🏷️'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-900 dark:text-zinc-100 text-xs font-semibold truncate">{expense.description}</p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                    <span>{expense.categories?.name || 'Misc'}</span>
                    <span className="text-zinc-400">·</span>
                    <span>{new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    {(expense.is_autopay || expense.is_recurring) && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium">
                        ⚡ {expense.tags?.includes('auto-generated') ? 'Auto' : 'Autopay'}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-zinc-950 dark:text-zinc-100 font-bold text-xs tabular-nums">{formatCurrency(expense.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
