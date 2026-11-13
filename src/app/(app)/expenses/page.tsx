'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useExpenses, useCategories } from '@/lib/hooks'
import { formatCurrency, formatDate, PAYMENT_METHODS } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Calendar, Pencil, Trash2, X, AlertCircle, FileSpreadsheet } from 'lucide-react'

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

  const hasActiveFilters = Boolean(search || categoryFilter || paymentFilter || startDate || endDate)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Expenses
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5">
            {expenses.length} transaction{expenses.length === 1 ? '' : 's'} recorded · <span className="font-semibold text-zinc-900 dark:text-zinc-200 tabular-nums">{formatCurrency(totalShown)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/expenses/import"
            className="inline-flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
            <span>Import Statement</span>
          </Link>
          <Link
            href="/expenses/new"
            className="inline-flex items-center justify-center gap-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>

          {/* Payment Method */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors"
          >
            <option value="">All Payment Methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
            ))}
          </select>

          {/* Start Date */}
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => { try { (e.currentTarget as any).showPicker?.() } catch {} }}
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => { try { (e.currentTarget as any).showPicker?.() } catch {} }}
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
            <span className="text-[11px] text-zinc-500 font-medium">Filtered results</span>
            <button
              onClick={() => { setSearch(''); setCategoryFilter(''); setPaymentFilter(''); setStartDate(''); setEndDate(''); }}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium"
            >
              <X className="w-3 h-3" />
              <span>Clear filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Expense Ledger Table */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="text-center py-20 text-zinc-400 text-xs">Loading ledger...</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-20 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-zinc-900 dark:text-zinc-100 text-sm font-semibold">No expenses found</p>
              <p className="text-zinc-500 text-xs mt-0.5">Try adjusting your filters or record a new transaction.</p>
            </div>
            <Link
              href="/expenses/new"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-semibold underline underline-offset-4 hover:opacity-80 pt-1"
            >
              <span>Add an expense</span>
              <span>→</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {expenses.map((expense) => {
              const isRecurringOrAutopay = expense.is_autopay || expense.is_recurring
              const freq = (expense as any).recurring_frequency

              return (
                <div
                  key={expense.id}
                  className="flex items-center gap-3.5 p-3.5 sm:p-4 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors group"
                >
                  {/* Category Icon Badge */}
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-lg flex-shrink-0">
                    {expense.categories?.icon || '🏷️'}
                  </div>

                  {/* Expense Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-xs sm:text-sm truncate">
                      {expense.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">{expense.categories?.name || 'Misc'}</span>
                      <span className="text-zinc-300 dark:text-zinc-700">·</span>
                      <span className="text-zinc-500 dark:text-zinc-400">{formatDate(expense.date)}</span>
                      <span className="text-zinc-300 dark:text-zinc-700">·</span>
                      <span className="text-zinc-400 dark:text-zinc-500 uppercase font-mono text-[10px]">{expense.payment_method}</span>

                      {/* Autopay Pill */}
                      {isRecurringOrAutopay && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/20 font-medium">
                          <span>⚡</span>
                          <span>
                            {expense.tags?.includes('auto-generated')
                              ? (freq ? `${freq} Auto` : 'Auto-deducted')
                              : (freq ? `${freq} Autopay` : 'Autopay')}
                          </span>
                        </span>
                      )}

                      {/* Custom User Tags */}
                      {expense.tags && expense.tags.filter(t => t !== 'auto-generated' && t !== '⚡ Autopay').map(t => (
                        <span key={t} className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-700/50">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-zinc-950 dark:text-zinc-50 font-bold text-xs sm:text-sm tabular-nums">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 sm:opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0 pl-1">
                    <Link
                      href={`/expenses/${expense.id}/edit`}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Edit transaction"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      disabled={deleting === expense.id}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
