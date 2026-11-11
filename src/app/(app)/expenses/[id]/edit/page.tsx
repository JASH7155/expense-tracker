'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/lib/hooks'
import { categorizeExpense } from '@/lib/categorize'
import { PAYMENT_METHODS } from '@/lib/utils'
import { Category, ExpenseWithCategory } from '@/types/database'

export default function EditExpensePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
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
    is_recurring: false,
    notes: '',
  })

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
        is_recurring: exp.is_recurring,
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

    const { error: updateError } = await supabase
      .from('expenses')
      .update({
        amount: parseFloat(form.amount),
        description: form.description,
        category_id: form.category_id || null,
        date: form.date,
        payment_method: form.payment_method,
        tags,
        is_recurring: form.is_recurring,
        notes: form.notes || null,
      })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
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
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center gap-3 p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
            <input
              type="checkbox"
              id="recurring"
              checked={form.is_recurring}
              onChange={(e) => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
              className="w-4 h-4 accent-blue-500"
            />
            <label htmlFor="recurring" className="text-sm text-gray-300 cursor-pointer">
              🔄 This is a recurring expense
            </label>
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
              {loading ? 'Saving...' : 'Update Expense ✅'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
