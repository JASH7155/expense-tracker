'use client'

import { useState, useMemo } from 'react'
import { useExpenses, useCategories } from '@/lib/hooks'
import { formatCurrency, getMonthDateRange, getMonthLabel } from '@/lib/utils'
import {
  BarChart3,
  Download,
  Calendar,
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  HelpCircle,
  TrendingUp,
  Receipt,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export default function ReportsPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())

  const { start, end } = getMonthDateRange(selectedYear, selectedMonth)
  const { expenses } = useExpenses({ startDate: start, endDate: end })
  const { categories } = useCategories()

  const stats = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0)
    const byCategory: Record<string, { name: string; total: number; color: string; icon: string; count: number }> = {}
    const byPayment: Record<string, number> = {}

    for (const exp of expenses) {
      const catKey = exp.category_id || 'misc'
      if (!byCategory[catKey]) {
        byCategory[catKey] = {
          name: exp.categories?.name || 'Uncategorized',
          total: 0,
          color: exp.categories?.color || '#71717a',
          icon: exp.categories?.icon || '🏷️',
          count: 0,
        }
      }
      byCategory[catKey].total += exp.amount
      byCategory[catKey].count++
      byPayment[exp.payment_method] = (byPayment[exp.payment_method] || 0) + exp.amount
    }

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()

    return {
      total,
      byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
      byPayment,
      avgPerDay: total / daysInMonth,
    }
  }, [expenses, selectedYear, selectedMonth])

  function downloadCSV() {
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Payment Method', 'Tags', 'Notes']
    const rows = expenses.map(e => [
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      e.amount,
      e.categories?.name || 'Uncategorized',
      e.payment_method,
      (e.tags || []).join(';'),
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${getMonthLabel(selectedYear, selectedMonth).replace(/\s+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: new Date(2024, i, 1).toLocaleDateString('en-IN', { month: 'long' }),
  }))
  const years = [now.getFullYear() - 1, now.getFullYear()]

  const paymentIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    upi: Smartphone,
    card: CreditCard,
    cash: Banknote,
    netbanking: Building2,
    other: HelpCircle,
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
            Financial Reports
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5">
            Detailed monthly ledger analytics and spreadsheet export
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 font-medium"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 font-medium"
          >
            {years.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={downloadCSV}
            disabled={expenses.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 disabled:opacity-40 disabled:pointer-events-none shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1">Total Period Spend</p>
          <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatCurrency(stats.total)}
          </p>
        </div>
        <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1">Total Transactions</p>
          <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {expenses.length}
          </p>
        </div>
        <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1">Daily Average</p>
          <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatCurrency(Math.round(stats.avgPerDay))}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Category Breakdown</h2>
        {stats.byCategory.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-xs text-center py-10">
            No transaction records found for this period.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(stats.byCategory.length * 42, 200)}>
              <BarChart data={stats.byCategory} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a33" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#71717a"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <YAxis type="category" dataKey="name" stroke="#71717a" tick={{ fontSize: 11 }} width={120} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Spent']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                  {stats.byCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Table */}
            <div className="mt-6 space-y-2.5 border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
              {stats.byCategory.map((cat, i) => (
                <div key={i} className="flex items-center gap-3 text-xs sm:text-sm py-1">
                  <span className="w-5 text-center">{cat.icon}</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium flex-1 truncate">{cat.name}</span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-xs tabular-nums">{cat.count} txns</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold tabular-nums w-24 text-right">
                    {formatCurrency(cat.total)}
                  </span>
                  <span className="text-zinc-500 text-right text-xs tabular-nums w-12 font-mono">
                    {stats.total > 0 ? ((cat.total / stats.total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Payment Method Breakdown */}
      {Object.keys(stats.byPayment).length > 0 && (
        <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Payment Method Distribution</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(stats.byPayment).map(([method, amount]) => {
              const Icon = paymentIconMap[method] || HelpCircle
              return (
                <div
                  key={method}
                  className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 rounded-xl p-3 text-center"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-1.5 text-zinc-700 dark:text-zinc-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-xs sm:text-sm tabular-nums">
                    {formatCurrency(amount)}
                  </p>
                  <p className="text-zinc-400 dark:text-zinc-500 text-[10px] uppercase font-mono mt-0.5 tracking-wider">
                    {method === 'netbanking' ? 'Net Banking' : method}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
