'use client'

import { useState, useMemo } from 'react'
import { useCategories, useMonthlyExpenses, useBudgets } from '@/lib/hooks'
import { formatCurrency, getMonthLabel } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

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

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Budgets</h1>
          <p className="text-gray-400 text-sm">{monthLabel}</p>
        </div>
        <button
          onClick={saveBudgets}
          disabled={saving || Object.keys(budgetInputs).length === 0}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Budgets'}
        </button>
      </div>

      {/* Overall Budget */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Overall Monthly Budget</h2>
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input
                type="number"
                placeholder={overallBudget ? String(overallBudget.amount) : 'e.g. 30000'}
                value={budgetInputs['overall'] || ''}
                onChange={(e) => setBudgetInputs(p => ({ ...p, overall: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Spent so far</p>
            <p className="text-white font-bold text-lg">{formatCurrency(totalSpent)}</p>
          </div>
        </div>
        {overallBudget && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{formatCurrency(totalSpent)} of {formatCurrency(overallBudget.amount)}</span>
              <span className={totalSpent > overallBudget.amount ? 'text-red-400' : 'text-green-400'}>
                {((totalSpent / overallBudget.amount) * 100).toFixed(0)}% used
              </span>
            </div>
            <div className="h-3 bg-[#21262d] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${totalSpent > overallBudget.amount ? 'bg-red-500' : totalSpent > overallBudget.amount * 0.8 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min((totalSpent / overallBudget.amount) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Per-Category Budgets */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#30363d]">
          <h2 className="text-white font-semibold">Per-Category Budgets</h2>
          <p className="text-gray-400 text-xs mt-0.5">Set limits for individual spending categories</p>
        </div>
        <div className="divide-y divide-[#30363d]">
          {categories.map((category) => {
            const spent = spendingByCategory[category.id] || 0
            const budget = getBudgetForCategory(category.id)
            const percent = budget ? Math.min((spent / budget.amount) * 100, 100) : null

            return (
              <div key={category.id} className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{category.name}</p>
                    <p className="text-gray-500 text-xs">Spent: {formatCurrency(spent)}</p>
                  </div>
                  <div className="w-36">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span>
                      <input
                        type="number"
                        placeholder={budget ? String(budget.amount) : 'Set limit'}
                        value={budgetInputs[category.id] || ''}
                        onChange={(e) => setBudgetInputs(p => ({ ...p, [category.id]: e.target.value }))}
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-6 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
                {percent !== null && (
                  <div>
                    <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: percent >= 100 ? '#ef4444' : percent >= 80 ? '#eab308' : category.color,
                        }}
                      />
                    </div>
                    {percent >= 80 && (
                      <p className={`text-xs mt-1 ${percent >= 100 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {percent >= 100 ? '🚨 Budget exceeded!' : '⚠️ Approaching limit'}
                      </p>
                    )}
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
