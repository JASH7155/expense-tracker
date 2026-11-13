'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useExpenses, useCategories } from '@/lib/hooks'
import { useUserSettings } from '@/lib/user-settings'
import { formatCurrency, formatDate, PAYMENT_METHODS } from '@/lib/utils'
import { getTransactionType, getBankAccount, getFriendDueInfo } from '@/lib/transaction-utils'
import { supabase } from '@/lib/supabase'
import {
  Plus,
  Search,
  Calendar,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  FileSpreadsheet,
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Building2,
  User,
} from 'lucide-react'

export default function ExpensesPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income' | 'lend'>('all')
  const [bankFilter, setBankFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [settlingId, setSettlingId] = useState<string | null>(null)

  const { settings: userSettings } = useUserSettings()
  const { expenses: rawExpenses, loading, refetch } = useExpenses({
    search: search || undefined,
    categoryId: categoryFilter || undefined,
    paymentMethod: paymentFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })
  const { categories } = useCategories()

  // Filter by Type and Bank Account in memory
  const filteredTransactions = useMemo(() => {
    return rawExpenses.filter((item) => {
      const type = getTransactionType(item)
      if (typeFilter !== 'all' && type !== typeFilter) {
        return false
      }

      if (bankFilter) {
        const bank = getBankAccount(item)
        if (bank !== bankFilter) {
          return false
        }
      }

      return true
    })
  }, [rawExpenses, typeFilter, bankFilter])

  // Aggregate financial metrics for shown items
  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    let lend = 0

    for (const item of filteredTransactions) {
      const type = getTransactionType(item)
      if (type === 'income') {
        income += item.amount
      } else if (type === 'lend') {
        const info = getFriendDueInfo(item)
        if (info?.dueStatus !== 'settled') {
          lend += item.amount
        }
      } else {
        expense += item.amount
      }
    }

    return { income, expense, lend, net: income - expense }
  }, [filteredTransactions])

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction record?')) return
    setDeleting(id)
    await supabase.from('expenses').delete().eq('id', id)
    await refetch()
    setDeleting(null)
  }

  async function handleSettleDue(id: string, friendName: string, amount: number) {
    if (!confirm(`Mark ₹${amount.toLocaleString('en-IN')} from ${friendName} as settled / repaid?`)) return
    setSettlingId(id)

    try {
      const item = rawExpenses.find(t => t.id === id)
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
      alert('Failed to settle due: ' + (err?.message || 'Please try again.'))
    } finally {
      setSettlingId(null)
    }
  }

  const hasActiveFilters = Boolean(
    search ||
    categoryFilter ||
    paymentFilter ||
    typeFilter !== 'all' ||
    bankFilter ||
    startDate ||
    endDate
  )

  function resetFilters() {
    setSearch('')
    setCategoryFilter('')
    setPaymentFilter('')
    setTypeFilter('all')
    setBankFilter('')
    setStartDate('')
    setEndDate('')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Transactions &amp; Ledger
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5">
            {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? '' : 's'} ·{' '}
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{formatCurrency(summary.income)}</span>
            {' · '}
            <span className="text-zinc-900 dark:text-zinc-200 font-semibold">-{formatCurrency(summary.expense)}</span>
            {summary.lend > 0 && (
              <>
                {' · '}
                <span className="text-blue-600 dark:text-blue-400 font-semibold">🤝 {formatCurrency(summary.lend)} Due</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/expenses/import"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
            <span>Import Statement</span>
          </Link>
          <Link
            href="/expenses/new"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white px-3.5 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </Link>
        </div>
      </div>

      {/* Type Quick Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All Transactions', count: rawExpenses.length },
          { key: 'expense', label: 'Expenses Only', count: rawExpenses.filter(e => getTransactionType(e) === 'expense').length },
          { key: 'income', label: 'Income Inflows', count: rawExpenses.filter(e => getTransactionType(e) === 'income').length },
          { key: 'lend', label: 'Friends & Lending (IOUs)', count: rawExpenses.filter(e => getTransactionType(e) === 'lend').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTypeFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
              typeFilter === tab.key
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                : 'bg-white dark:bg-[#0e1017] text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              typeFilter === tab.key
                ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Filter Ledger
          </span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Search</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="By note, friend, or merchant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              />
            </div>
          </div>

          {/* Bank Account */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Bank Account</label>
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            >
              <option value="">All Accounts</option>
              {userSettings.bank_accounts.map((acc) => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => { try { (e.currentTarget as any).showPicker?.() } catch {} }}
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => { try { (e.currentTarget as any).showPicker?.() } catch {} }}
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="text-center py-20 text-zinc-400 text-xs">Loading ledger...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-20 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-zinc-900 dark:text-zinc-100 text-sm font-semibold">No records found</p>
              <p className="text-zinc-500 text-xs mt-0.5">Try adjusting your filters or record a new transaction.</p>
            </div>
            <Link
              href="/expenses/new"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-semibold underline underline-offset-4 hover:opacity-80 pt-1"
            >
              <span>Add a transaction</span>
              <span>→</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filteredTransactions.map((item) => {
              const type = getTransactionType(item)
              const isIncome = type === 'income'
              const isLend = type === 'lend'
              const dueInfo = isLend ? getFriendDueInfo(item) : null
              const isSettled = dueInfo?.dueStatus === 'settled'
              const bank = getBankAccount(item)
              const isRecurringOrAutopay = item.is_autopay || item.is_recurring
              const freq = (item as any).recurring_frequency

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3.5 p-3.5 sm:p-4 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors group"
                >
                  {/* Badge Icon */}
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg flex-shrink-0 ${
                    isIncome
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : isLend
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/60 dark:border-zinc-700/60'
                  }`}>
                    {isIncome ? '💰' : isLend ? '🤝' : (item.categories?.icon || '🏷️')}
                  </div>

                  {/* Transaction Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-xs sm:text-sm truncate">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                      {isIncome ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Income Inflow</span>
                      ) : isLend ? (
                        <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{dueInfo?.friendName || 'Friend'}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-500 dark:text-zinc-400">{item.categories?.name || 'Misc'}</span>
                      )}

                      <span className="text-zinc-300 dark:text-zinc-700">·</span>
                      <span className="text-zinc-500 dark:text-zinc-400">{formatDate(item.date)}</span>

                      {bank && (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-700">·</span>
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-zinc-400" />
                            <span>{bank}</span>
                          </span>
                        </>
                      )}

                      <span className="text-zinc-300 dark:text-zinc-700">·</span>
                      <span className="text-zinc-400 dark:text-zinc-500 uppercase font-mono text-[10px]">{item.payment_method}</span>

                      {/* Friend Due Status Pill */}
                      {isLend && (
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.2 rounded font-semibold border ${
                          isSettled
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          <span>{isSettled ? '✓ Settled' : '⏳ Due'}</span>
                        </span>
                      )}

                      {/* Autopay Pill */}
                      {isRecurringOrAutopay && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/20 font-medium">
                          <span>⚡</span>
                          <span>
                            {item.tags?.includes('auto-generated')
                              ? (freq ? `${freq} Auto` : 'Auto-deducted')
                              : (freq ? `${freq} Autopay` : 'Autopay')}
                          </span>
                        </span>
                      )}

                      {/* Custom User Tags */}
                      {item.tags && item.tags.filter(t => !t.startsWith('type:') && !t.startsWith('bank:') && !t.startsWith('friend:') && !t.startsWith('due_status:') && t !== 'auto-generated' && t !== '⚡ Autopay').map(t => (
                        <span key={t} className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-700/50">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quick Settle Action for Dues */}
                  {isLend && !isSettled && (
                    <button
                      onClick={() => handleSettleDue(item.id, dueInfo?.friendName || 'Friend', item.amount)}
                      disabled={settlingId === item.id}
                      className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60 shadow-2xs transition-colors cursor-pointer mr-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>{settlingId === item.id ? 'Settling...' : 'Mark Settled'}</span>
                    </button>
                  )}

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-xs sm:text-sm tabular-nums ${
                      isIncome
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isLend
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-zinc-950 dark:text-zinc-50'
                    }`}>
                      {isIncome ? `+${formatCurrency(item.amount)}` : formatCurrency(item.amount)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 sm:opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0 pl-1">
                    <Link
                      href={`/expenses/${item.id}/edit`}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Edit transaction"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40 cursor-pointer"
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
