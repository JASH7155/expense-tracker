'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useExpenses, useCategories } from '@/lib/hooks'
import { formatCurrency, formatDate, PAYMENT_METHODS } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function ExpensesPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const { expenses, loading, refetch } = useExpenses({
    search: search || undefined,
    categoryId: categoryFilter || undefined,
    paymentMethod: paymentFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })
  const { categories } = useCategories()

  const totalShown = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return
    setDeleting(id)
    await supabase.from('expenses').delete().eq('id', id)
    await refetch()
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-gray-400 text-sm">{expenses.length} transactions · {formatCurrency(totalShown)}</p>
        </div>
        <Link
          href="/expenses/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          + Add Expense
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="🔍 Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Payment Methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        {(search || categoryFilter || paymentFilter || startDate || endDate) && (
          <button
            onClick={() => { setSearch(''); setCategoryFilter(''); setPaymentFilter(''); setStartDate(''); setEndDate('') }}
            className="mt-3 text-xs text-gray-400 hover:text-white"
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* Expense List */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-gray-400">No expenses found.</p>
            <Link href="/expenses/new" className="mt-3 inline-block text-blue-400 hover:text-blue-300 text-sm">
              Add your first expense →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#30363d]">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-4 p-4 hover:bg-[#21262d] transition-colors">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${expense.categories?.color || '#6b7280'}20` }}
                >
                  {expense.categories?.icon || '🏷️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{expense.description}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500">{expense.categories?.name || 'Misc'}</span>
                    <span className="text-gray-600">·</span>
                    <span className="text-xs text-gray-500">{formatDate(expense.date)}</span>
                    <span className="text-gray-600">·</span>
                    <span className="text-xs text-gray-500 uppercase">{expense.payment_method}</span>
                    {expense.is_recurring && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">🔄 Recurring</span>
                    )}
                  </div>
                </div>
                <p className="text-white font-semibold flex-shrink-0">{formatCurrency(expense.amount)}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/expenses/${expense.id}/edit`} className="text-gray-500 hover:text-blue-400 text-sm transition-colors">✏️</Link>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    disabled={deleting === expense.id}
                    className="text-gray-500 hover:text-red-400 text-sm transition-colors disabled:opacity-50"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
