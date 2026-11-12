'use client'

import { useState, useMemo } from 'react'
import { useExpenses, useCategories } from '@/lib/hooks'
import { formatCurrency, getMonthDateRange, getMonthLabel } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
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
          name: exp.categories?.name || 'Misc',
          total: 0,
          color: exp.categories?.color || '#6b7280',
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
      e.categories?.name || 'Misc',
      e.payment_method,
      (e.tags || []).join(';'),
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${getMonthLabel(selectedYear, selectedMonth).replace(' ', '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: new Date(2024, i, 1).toLocaleDateString('en-IN', { month: 'long' }),
  }))
  const years = [now.getFullYear() - 1, now.getFullYear()]
  const paymentIcons: Record<string, string> = {
    upi: '📱', card: '💳', cash: '💵', netbanking: '🏦', other: '🔄',
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 text-sm">Monthly breakdown &amp; export</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={downloadCSV}
            disabled={expenses.length === 0}
            className="bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Total Spent</p>
          <p className="text-white text-2xl font-bold">{formatCurrency(stats.total)}</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Transactions</p>
          <p className="text-white text-2xl font-bold">{expenses.length}</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Avg / Day</p>
          <p className="text-white text-2xl font-bold">{formatCurrency(Math.round(stats.avgPerDay))}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Category Breakdown</h2>
        {stats.byCategory.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No expenses for this month</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(stats.byCategory.length * 40, 180)}>
              <BarChart data={stats.byCategory} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#6b7280"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <YAxis type="category" dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} width={110} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Spent']}
                  contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {stats.byCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Table */}
            <div className="mt-5 space-y-2 border-t border-[#30363d] pt-4">
              {stats.byCategory.map((cat, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span>{cat.icon}</span>
                  <span className="text-gray-300 flex-1">{cat.name}</span>
                  <span className="text-gray-500 text-xs">{cat.count} txns</span>
                  <span className="text-white font-medium w-24 text-right">{formatCurrency(cat.total)}</span>
                  <span className="text-gray-500 w-10 text-right text-xs">
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
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">By Payment Method</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(stats.byPayment).map(([method, amount]) => (
              <div key={method} className="bg-[#21262d] rounded-lg p-3 text-center">
                <span className="text-2xl">{paymentIcons[method] || '💳'}</span>
                <p className="text-white font-medium text-sm mt-1">{formatCurrency(amount)}</p>
                <p className="text-gray-500 text-xs capitalize mt-0.5">
                  {method === 'netbanking' ? 'Net Banking' : method.toUpperCase()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
