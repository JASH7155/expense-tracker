'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useMonthlyExpenses, useCategories, useBudgets } from '@/lib/hooks'
import { formatCurrency, getMonthLabel } from '@/lib/utils'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'

function StatCard({ title, value, sub, icon, color }: {
  title: string; value: string; sub?: string; icon: string; color: string
}) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${color}`}>{sub}</span>
      </div>
      <p className="text-gray-400 text-sm mb-1">{title}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
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

    // Category breakdown
    const byCategory: Record<string, { name: string; total: number; icon: string; color: string }> = {}
    for (const exp of expenses) {
      const cat = exp.categories
      const key = cat?.id || 'misc'
      if (!byCategory[key]) {
        byCategory[key] = {
          name: cat?.name || 'Miscellaneous',
          total: 0,
          icon: cat?.icon || '🏷️',
          color: cat?.color || '#6b7280',
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
        <div className="text-gray-400">Loading your finances...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm">{getMonthLabel(now.getFullYear(), now.getMonth())}</p>
        </div>
        <Link
          href="/expenses/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          + Add Expense
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Spent"
          value={formatCurrency(stats.total)}
          icon="💸"
          sub={`${expenses.length} txns`}
          color="text-blue-400 bg-blue-400/10"
        />
        <StatCard
          title="Today's Spend"
          value={formatCurrency(stats.todayTotal)}
          icon="📅"
          sub="Today"
          color="text-green-400 bg-green-400/10"
        />
        <StatCard
          title="Autopays & Subscriptions"
          value={formatCurrency(stats.autopayTotal)}
          icon="⚡"
          sub={`${stats.autopays.length} active`}
          color="text-cyan-400 bg-cyan-400/10"
        />
        <StatCard
          title="Budget Left"
          value={overallBudget ? formatCurrency(Math.max(overallBudget.amount - stats.total, 0)) : '—'}
          icon="🎯"
          sub={overallBudget ? `of ${formatCurrency(overallBudget.amount)}` : 'No budget set'}
          color="text-purple-400 bg-purple-400/10"
        />
      </div>

      {/* Autopays & Subscriptions Highlight */}
      {stats.autopays.length > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <div>
                <h2 className="text-white font-semibold text-sm">Autopays &amp; Recurring Commitments</h2>
                <p className="text-gray-400 text-xs">
                  {stats.autopays.length} active recurring deduction{stats.autopays.length > 1 ? 's' : ''} (SIP, daily commute, OTT)
                </p>
              </div>
            </div>
            <Link href="/expenses" className="text-xs text-blue-400 hover:text-blue-300">
              Manage in Expenses →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.autopays.slice(0, 3).map((item) => {
              const freq = (item as any).recurring_frequency
              return (
                <div key={item.id} className="bg-[#21262d] rounded-lg p-3 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <p className="text-white text-xs font-medium truncate">{item.description}</p>
                    <p className="text-cyan-400 text-[11px] capitalize">
                      {freq ? `${freq} Autopay` : 'Recurring'}
                    </p>
                  </div>
                  <span className="text-white font-semibold text-xs whitespace-nowrap">
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
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-white">Monthly Budget</span>
            <span className={`text-sm font-bold ${budgetPercent >= 100 ? 'text-red-400' : budgetPercent >= 80 ? 'text-yellow-400' : 'text-green-400'}`}>
              {budgetPercent.toFixed(0)}% used
            </span>
          </div>
          <div className="h-3 bg-[#21262d] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${budgetPercent >= 100 ? 'bg-red-500' : budgetPercent >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{formatCurrency(stats.total)} spent</span>
            <span>{formatCurrency(overallBudget!.amount)} budget</span>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Spending by Category - Pie Chart */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Spending by Category</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              No expenses yet this month
            </div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="total" nameKey="name">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), '']}
                    contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {pieData.map((cat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-gray-400 truncate">{cat.icon} {cat.name}</span>
                    <span className="text-white ml-auto">{formatCurrency(cat.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Daily Spending - Line Chart */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Daily Spending Trend</h2>
          {stats.dailyData.every(d => d.amount === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              No expenses yet this month
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Spent']}
                  contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', color: '#fff' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Transactions */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-semibold">Top Transactions This Month</h2>
          <Link href="/expenses" className="text-blue-400 text-sm hover:text-blue-300">View all →</Link>
        </div>
        {topExpenses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-3xl mb-2">💸</p>
            <p>No expenses yet. <Link href="/expenses/new" className="text-blue-400 hover:text-blue-300">Add your first one!</Link></p>
          </div>
        ) : (
          <div className="space-y-3">
            {topExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3 p-3 bg-[#21262d] rounded-lg">
                <span className="text-xl">{expense.categories?.icon || '🏷️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{expense.description}</p>
                  <p className="text-gray-500 text-xs">
                    {expense.categories?.name || 'Misc'} · {new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    {(expense.is_autopay || expense.is_recurring) && ' · ⚡ Autopay'}
                  </p>
                </div>
                <span className="text-white font-semibold text-sm">{formatCurrency(expense.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
