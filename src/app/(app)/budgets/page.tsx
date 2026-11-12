'use client'

import { useState, useMemo } from 'react'
import { useCategories, useMonthlyExpenses, useBudgets } from '@/lib/hooks'
import { formatCurrency, getMonthLabel } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Target, Wallet, Check, AlertCircle, ArrowUpRight } from 'lucide-react'

export default function BudgetsPage() {
  const { categories } = useCategories()
  const { expenses } = useMonthlyExpenses()
  const { budgets } = useBudgets()
  const [saving, setSaving] = useState(false)
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const now = new Date()
  const monthLabel = getMonthLabel(now.getFullYear(), now.getMonth())
  const monthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const spendingByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const exp of expenses) {
      const key = exp.category_id || 'misc'
      map[key] = (map[key] || 0) + exp.amount
    }
    return map
  }, [expenses])

  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])
  const getBudgetForCategory = (categoryId: string | null) =>
    budgets.find(b => b.category_id === categoryId)

  async function saveBudgets() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const upserts = Object.entries(budgetInputs)
      .filter(([_, v]) => v && parseFloat(v) > 0)
      .map(([categoryId, amount]) => ({
        user_id: user.id,
        category_id: categoryId === 'overall' ? null : categoryId,
        amount: parseFloat(amount),
        month: monthDate,
      }))

    if (upserts.length > 0) {
      await supabase.from('budgets').upsert(upserts, {
        onConflict: 'user_id,category_id,month',
      })
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
    setBudgetInputs({})
  }

  const overallBudget = getBudgetForCategory(null)

  // Deduplicate categories by lowercase name for resilient UI
  const displayCategories = useMemo(() => {
    const seen = new Set<string>()
    return categories.filter(c => {
      const key = c.name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [categories])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Target className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
            Budgets
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5">
            Set and track spending limits for {monthLabel}
          </p>
        </div>
        <button
          onClick={saveBudgets}
          disabled={saving || Object.keys(budgetInputs).length === 0}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 disabled:opacity-40 disabled:pointer-events-none shadow-sm cursor-pointer"
        >
          {saving ? (
            'Saving...'
          ) : saved ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              Saved
            </>
          ) : (
            'Save Budgets'
          )}
        </button>
      </div>

      {/* Overall Budget */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Overall Monthly Budget</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Total expenditure cap for all categories</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Spent so far</p>
            <p className="text-base sm:text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatCurrency(totalSpent)}
            </p>
          </div>
        </div>

        <div className="relative mb-4">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-mono text-sm">₹</span>
          <input
            type="number"
            placeholder={overallBudget ? String(overallBudget.amount) : 'e.g. 25000'}
            value={budgetInputs['overall'] || ''}
            onChange={(e) => setBudgetInputs(p => ({ ...p, overall: e.target.value }))}
            className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-sm font-medium tabular-nums"
          />
        </div>

        {overallBudget && (
          <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
            <div className="flex justify-between text-xs font-medium tabular-nums">
              <span className="text-zinc-500 dark:text-zinc-400">
                {formatCurrency(totalSpent)} of {formatCurrency(overallBudget.amount)}
              </span>
              <span className={totalSpent > overallBudget.amount ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                {((totalSpent / overallBudget.amount) * 100).toFixed(0)}% used
              </span>
            </div>
            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalSpent > overallBudget.amount
                    ? 'bg-rose-500'
                    : totalSpent > overallBudget.amount * 0.8
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min((totalSpent / overallBudget.amount) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Per-Category Budgets */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Per-Category Budgets</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
              Set limits for individual spending categories ({displayCategories.length} categories)
            </p>
          </div>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {displayCategories.map((category) => {
            const spent = spendingByCategory[category.id] || 0
            const budget = getBudgetForCategory(category.id)
            const percent = budget ? Math.min((spent / budget.amount) * 100, 100) : null
            const isExceeded = budget && spent > budget.amount
            const isNearLimit = budget && spent > budget.amount * 0.8 && !isExceeded

            return (
              <div key={category.id} className="p-4 sm:p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex-shrink-0">
                    {category.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-900 dark:text-zinc-100 text-sm font-medium truncate">{category.name}</p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs tabular-nums">
                      Spent: <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatCurrency(spent)}</span>
                    </p>
                  </div>
                  <div className="w-32 sm:w-40 flex-shrink-0">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-xs font-mono">₹</span>
                      <input
                        type="number"
                        placeholder={budget ? String(budget.amount) : 'Set limit'}
                        value={budgetInputs[category.id] || ''}
                        onChange={(e) => setBudgetInputs(p => ({ ...p, [category.id]: e.target.value }))}
                        className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-6 pr-3 py-1.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-xs sm:text-sm font-medium tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {percent !== null && (
                  <div className="mt-2.5 space-y-1">
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isExceeded
                            ? 'bg-rose-500'
                            : isNearLimit
                            ? 'bg-amber-500'
                            : 'bg-zinc-900 dark:bg-zinc-100'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {isExceeded ? (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" /> Budget exceeded ({((spent / (budget?.amount || 1)) * 100).toFixed(0)}%)
                      </p>
                    ) : isNearLimit ? (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" /> Approaching monthly limit ({percent.toFixed(0)}%)
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
