'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/lib/hooks'
import { PAYMENT_METHODS, AUTOPAY_FREQUENCIES } from '@/lib/utils'
import { Category, ExpenseWithCategory } from '@/types/database'
import { syncAutopays } from '@/lib/autopay-sync'

export default function EditExpensePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const dateInputRef = useRef<HTMLInputElement>(null)
  const { categories } = useCategories()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

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

  function openDatePicker() {
    try {
      dateInputRef.current?.showPicker?.()
      dateInputRef.current?.focus()
    } catch {
      dateInputRef.current?.focus()
    }
  }

  function setQuickDate(offset: number | 'firstOfMonth') {
    const d = new Date()
    if (offset === 'firstOfMonth') {
      d.setDate(1)
    } else {
      d.setDate(d.getDate() - offset)
    }
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setForm(f => ({ ...f, date: `${y}-${m}-${day}` }))
  }

  useEffect(() => {
    async function fetchExpense() {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, categories(*)')
        .eq('id', id)
        .single()

      if (error || !data) {
        setError('Expense not found')
        setFetching(false)
        return
      }

      const exp = data as unknown as ExpenseWithCategory
      setForm({
        amount: String(exp.amount),
        description: exp.description,
        category_id: exp.category_id || '',
        date: exp.date,
        payment_method: exp.payment_method,
        tags: (exp.tags || []).join(', '),
        is_autopay: exp.is_autopay ?? exp.is_recurring ?? false,
        recurring_frequency: (exp.recurring_frequency as any) || 'monthly',
        notes: exp.notes || '',
      })
      setFetching(false)
    }
    fetchExpense()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const tags = form.tags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean)

    if (form.is_autopay && !tags.includes('⚡ Autopay')) {
      tags.push('⚡ Autopay')
    }

    const { error: updateError } = await supabase
      .from('expenses')
      .update({
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
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      if (form.is_autopay) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          try {
            await syncAutopays(user.id)
          } catch (syncErr) {
            console.warn('Autopay sync error on edit:', syncErr)
          }
        }
      }
      router.push('/expenses')
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">Loading expense...</div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Edit Expense</h1>
        <p className="text-gray-400 text-sm">Update transaction details</p>
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
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-400"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Date *</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700/60"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700/60"
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate('firstOfMonth')}
                    className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700/60"
                  >
                    1st of Month
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  ref={dateInputRef}
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                  onClick={openDatePicker}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={openDatePicker}
                  title="Open Calendar"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 transition-colors"
                >
                  📅
                </button>
              </div>
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
                      ? 'border-zinc-400 bg-zinc-800 text-white font-medium'
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
                  className="w-4 h-4 accent-zinc-200 rounded cursor-pointer"
                />
                <label htmlFor="autopay" className="text-sm font-medium text-white cursor-pointer flex items-center gap-1.5">
                  <span className="text-amber-400">⚡</span> Autopay / Recurring Deduction
                </label>
              </div>
              {form.is_autopay && (
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium border border-zinc-700">
                  Active Recurring
                </span>
              )}
            </div>

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
                          ? 'border-zinc-400 bg-zinc-800 text-white font-medium'
                          : 'border-[#30363d] text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <span>{freq.icon}</span>
                      <span>{freq.label}</span>
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
              placeholder="#weekend, #work"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-zinc-500"
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
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-[#21262d] hover:bg-[#30363d] text-zinc-300 py-3 rounded-lg font-medium transition-colors border border-[#30363d]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-zinc-100 hover:bg-white text-zinc-900 disabled:opacity-50 py-3 rounded-lg font-semibold transition-colors shadow-sm"
            >
              {loading ? 'Saving...' : 'Update Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
