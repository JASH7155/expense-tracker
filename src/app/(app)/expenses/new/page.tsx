'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/lib/hooks'
import { categorizeExpense } from '@/lib/categorize'
import { PAYMENT_METHODS, AUTOPAY_FREQUENCIES } from '@/lib/utils'
import { Category } from '@/types/database'

export default function NewExpensePage() {
  const router = useRouter()
  const { categories } = useCategories()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestedCategory, setSuggestedCategory] = useState<Category | null>(null)

  const [form, setForm] = useState({
    amount: '',
    description: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'upi',
    tags: '',
    is_autopay: false,
    recurring_frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    notes: '',
  })

  function handleDescriptionChange(value: string) {
    setForm(f => ({ ...f, description: value }))
    if (value.length > 2 && categories.length > 0) {
      const suggestion = categorizeExpense(value, categories)
      setSuggestedCategory(suggestion)
      if (suggestion && !form.category_id) {
        setForm(f => ({ ...f, category_id: suggestion.id }))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be signed in to add an expense.')
      setLoading(false)
      return
    }

    const tags = form.tags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean)

    const { error: insertError } = await supabase.from('expenses').insert({
      user_id: user.id,
      amount: parseFloat(form.amount),
      description: form.description,
      category_id: form.category_id || null,
      date: form.date,
      payment_method: form.payment_method,
      tags,
      is_recurring: form.is_autopay,
      recurring_frequency: form.is_autopay ? form.recurring_frequency : null,
      is_autopay: form.is_autopay,
      notes: form.notes || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      router.push('/expenses')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Add Expense</h1>
        <p className="text-gray-400 text-sm">Record a transaction or autopay</p>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Amount (₹) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-lg font-semibold"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="e.g. Swiggy order, Metro daily pass, Netflix autopay, SIP"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            {suggestedCategory && (
              <p className="mt-1.5 text-xs text-green-400">
                ✨ Auto-categorized as {suggestedCategory.icon} {suggestedCategory.name}
              </p>
            )}
          </div>

          {/* Category + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
            <div className="grid grid-cols-5 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, payment_method: m.value }))}
                  className={`p-2.5 rounded-lg border text-center transition-colors ${
                    form.payment_method === m.value
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-[#30363d] text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="text-lg">{m.icon}</div>
                  <div className="text-xs mt-1">{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Autopay / Recurring Section */}
          <div className="p-4 bg-[#0d1117] rounded-xl border border-[#30363d] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autopay"
                  checked={form.is_autopay}
                  onChange={(e) => setForm(f => ({ ...f, is_autopay: e.target.checked }))}
                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
                <label htmlFor="autopay" className="text-sm font-medium text-white cursor-pointer">
                  ⚡ Autopay / Recurring Deduction
                </label>
              </div>
              {form.is_autopay && (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium border border-blue-500/30">
                  Recurring Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 pl-7">
              For expenses automatically deducted (daily commute, daily milk, monthly Netflix, SIP, gym, etc.)
            </p>

            {form.is_autopay && (
              <div className="pt-2 border-t border-[#21262d] pl-7 space-y-2">
                <label className="block text-xs font-medium text-gray-300">
                  Autopay Frequency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AUTOPAY_FREQUENCIES.map((freq) => (
                    <button
                      key={freq.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, recurring_frequency: freq.value as any }))}
                      className={`p-2 rounded-lg border text-left text-xs transition-colors flex items-center gap-2 ${
                        form.recurring_frequency === freq.value
                          ? 'border-blue-500 bg-blue-500/20 text-white'
                          : 'border-[#30363d] text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <span>{freq.icon}</span>
                      <span className="font-medium">{freq.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags <span className="text-gray-500">(comma separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="#weekend, #friends, #autopay"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Any additional details..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 py-3 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Saving...' : 'Save Expense 💾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
