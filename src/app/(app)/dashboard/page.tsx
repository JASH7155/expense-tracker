'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useCycleFinancials, useCategories, useBudgets } from '@/lib/hooks'
import { formatCurrency, getCategoryColor } from '@/lib/utils'
import { getFriendDueInfo } from '@/lib/transaction-utils'
import { supabase } from '@/lib/supabase'
import {
  Wallet,
  Calendar,
  Zap,
  Target,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Coins,
  HandCoins,
  ArrowDownLeft,
  CalendarClock,
  CheckCircle2,
  User,
  Settings,
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
  variant = 'default',
}: {
  title: string
  value: string
  sub?: string
  icon: any
  variant?: 'default' | 'income' | 'savings' | 'dues'
}) {
  const colorStyles = {
    default: 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/60 dark:border-zinc-700/60',
    income: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    savings: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    dues: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
  }

  const valueStyles = {
    default: 'text-zinc-950 dark:text-zinc-50',
    income: 'text-emerald-600 dark:text-emerald-400',
    savings: 'text-purple-600 dark:text-purple-400',
    dues: 'text-blue-600 dark:text-blue-400',
  }

  return (
    <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between mb-2.5 sm:mb-3.5">
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center ${colorStyles[variant]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {sub && (
          <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 font-medium truncate max-w-[120px] sm:max-w-none">
            {sub}
          </span>
        )}
      </div>
      <p className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 tracking-wide uppercase truncate">{title}</p>
      <p className={`text-lg sm:text-2xl font-bold tracking-tight tabular-nums truncate ${valueStyles[variant]}`}>{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const {
    rawTransactions,
    incomes,
    expenses,
    friendDues,
    outstandingDues,
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    totalOutstandingDue,
    activeCycle,
    cycleDay,
    loading,
    refetch,
  } = useCycleFinancials()

  const { categories } = useCategories()
  const { budgets } = useBudgets()
  const [settlingId, setSettlingId] = useState<string | null>(null)

  async function handleSettleDue(id: string, friendName: string, amount: number) {
    if (!confirm(`Mark ₹${amount.toLocaleString('en-IN')} from ${friendName} as settled / repaid?`)) return
    setSettlingId(id)

    try {
      // Find the item to get existing tags
      const item = rawTransactions.find(t => t.id === id)
      const existingTags = (item?.tags || []).filter(t => t !== 'due_status:due')
      if (!existingTags.includes('due_status:settled')) {
        existingTags.push('due_status:settled')
      }

      let { error: updateError } = await supabase
        .from('expenses')
        .update({
          due_status: 'settled',
          tags: existingTags,
        } as any)
        .eq('id', id)

      if (updateError && (
        updateError.message?.toLowerCase().includes('schema cache') ||
        updateError.message?.toLowerCase().includes('column') ||
        (updateError as any).code === 'PGRST204'
      )) {
        await supabase
          .from('expenses')
          .update({
            tags: existingTags,
          } as any)
          .eq('id', id)
      }

      await refetch()
    } catch (err: any) {
      alert('Failed to update due: ' + (err?.message || 'Please try again.'))
    } finally {
      setSettlingId(null)
    }
  }

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todaySpend = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0)

    // Autopays
    const autopays = expenses.filter(e => e.is_autopay || e.is_recurring)
    const autopayTotal = autopays.reduce((sum, e) => sum + e.amount, 0)

    // Category breakdown with distinct colors for expenses
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

    // Daily timeline for expenses within current cycle
    const dailyMap: Record<string, number> = {}
    for (const exp of expenses) {
      dailyMap[exp.date] = (dailyMap[exp.date] || 0) + exp.amount
    }

    // Construct array of days in cycle
    const startD = new Date(activeCycle.startDate)
    const endD = new Date(activeCycle.endDate)
    const now = new Date()
    const diffDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    
    const dailyData = Array.from({ length: Math.min(diffDays, 31) }, (_, i) => {
      const d = new Date(startD.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split('T')[0]
      return {
        day: `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}`,
        amount: dailyMap[dateStr] || 0,
      }
    })

    return { todaySpend, autopays, autopayTotal, byCategory, dailyData }
  }, [expenses, activeCycle])

  const overallBudget = budgets.find(b => b.category_id === null)
  const budgetPercent = overallBudget ? Math.min((totalExpense / overallBudget.amount) * 100, 100) : null
  const pieData = Object.values(stats.byCategory).sort((a, b) => b.total - a.total).slice(0, 8)
  const recentTransactions = [...rawTransactions].slice(0, 6)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm">Loading money manager overview...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Money Manager
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5">
            Active Cycle: <span className="font-semibold text-zinc-900 dark:text-zinc-200">{activeCycle.label}</span> (Starts on day {cycleDay})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/expenses/new"
            className="inline-flex items-center justify-center gap-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </Link>
        </div>
      </div>

      {/* Salary Cycle Info Banner */}
      <div className="bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/25 dark:border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <CalendarClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-zinc-950 dark:text-zinc-50">Salary Cycle Active</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold border border-amber-500/30">
                Starts Day {cycleDay}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Cycle Window: <span className="text-zinc-950 dark:text-zinc-100 font-semibold">{activeCycle.label}</span> · All metrics and charts calculate within this window.
            </p>
          </div>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-semibold transition-colors border border-amber-200 dark:border-zinc-700 shadow-2xs flex-shrink-0 cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Edit Cycle Day</span>
        </Link>
      </div>

      {/* Money Manager 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Income"
          value={`+${formatCurrency(totalIncome)}`}
          icon={ArrowDownLeft}
          sub={`${incomes.length} inflow${incomes.length === 1 ? '' : 's'}`}
          variant="income"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(totalExpense)}
          icon={Wallet}
          sub={`${expenses.length} spend${expenses.length === 1 ? '' : 's'}`}
          variant="default"
        />
        <StatCard
          title="Net Savings"
          value={formatCurrency(netSavings)}
          icon={Coins}
          sub={totalIncome > 0 ? `${savingsRate.toFixed(0)}% Saved` : 'No income recorded'}
          variant="savings"
        />
        <StatCard
          title="Friends Due (IOUs)"
          value={formatCurrency(totalOutstandingDue)}
          icon={HandCoins}
          sub={`${outstandingDues.length} pending`}
          variant="dues"
        />
      </div>

      {/* Friends & Lending Dues Spotlight */}
      {outstandingDues.length > 0 && (
        <div className="bg-white dark:bg-[#0e1017] border border-blue-500/20 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <HandCoins className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-zinc-900 dark:text-zinc-100 font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                  <span>Friends &amp; Lending Tracker</span>
                  <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800">
                    {formatCurrency(totalOutstandingDue)} Owed to You
                  </span>
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Pending loans and shared bill split dues
                </p>
              </div>
            </div>
            <Link href="/expenses" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium">
              <span>View All</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {outstandingDues.slice(0, 6).map((item) => {
              const dueInfo = getFriendDueInfo(item)
              return (
                <div
                  key={item.id}
                  className="bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3 flex flex-col justify-between space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-zinc-900 dark:text-zinc-100 font-bold text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        <span>{dueInfo?.friendName || 'Friend'}</span>
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-[11px] truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold text-sm tabular-nums">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-blue-100 dark:border-blue-900/30">
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                    <button
                      onClick={() => handleSettleDue(item.id, dueInfo?.friendName || 'Friend', item.amount)}
                      disabled={settlingId === item.id}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60 shadow-2xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>{settlingId === item.id ? 'Settling...' : 'Mark Settled'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Salary Cycle Budget Burn</span>
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
            <span>{formatCurrency(totalExpense)} spent</span>
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
              No expenses recorded yet in this cycle
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
                    {formatCurrency(totalExpense)}
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
            <h2 className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm">Cycle Spending Velocity</h2>
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Daily Pace</span>
            </div>
          </div>
          {stats.dailyData.every(d => d.amount === 0) ? (
            <div className="flex items-center justify-center h-48 text-zinc-400 text-xs">
              No daily transactions yet this cycle
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={stats.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800/40" />
                <XAxis dataKey="day" stroke="#a1a1aa" tick={{ fontSize: 9 }} />
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

      {/* Recent Ledger Inflows & Spends */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm">Recent Activity in Cycle</h2>
          <Link href="/expenses" className="text-xs text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white font-medium flex items-center gap-1 transition-colors">
            <span>View all</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-10 text-zinc-400 text-xs">
            <p className="text-zinc-500">No transactions recorded in this cycle. <Link href="/expenses/new" className="text-zinc-900 dark:text-zinc-100 underline font-medium">Add a transaction</Link></p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((item) => {
              const isIncome = incomes.some(i => i.id === item.id)
              const isLend = friendDues.some(f => f.id === item.id)
              const dueInfo = isLend ? getFriendDueInfo(item) : null

              return (
                <div key={item.id} className="flex items-center gap-3.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                  <span className={`text-lg w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isIncome
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : isLend
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}>
                    {isIncome ? '💰' : isLend ? '🤝' : (item.categories?.icon || '🏷️')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-900 dark:text-zinc-100 text-xs font-semibold truncate">{item.description}</p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                      <span>{isIncome ? 'Income' : isLend ? `Due from ${dueInfo?.friendName || 'Friend'}` : (item.categories?.name || 'Expense')}</span>
                      <span className="text-zinc-400">·</span>
                      <span>{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      {item.bank_account && (
                        <>
                          <span className="text-zinc-400">·</span>
                          <span className="text-zinc-400 font-mono text-[10px]">{item.bank_account}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className={`font-bold text-xs tabular-nums ${
                    isIncome
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isLend
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-zinc-950 dark:text-zinc-100'
                  }`}>
                    {isIncome ? `+${formatCurrency(item.amount)}` : formatCurrency(item.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
