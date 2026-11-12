'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/lib/hooks'
import { categorizeExpense } from '@/lib/categorize'
import { Category } from '@/types/database'
import { syncAutopays } from '@/lib/autopay-sync'
import AddCategoryModal from '@/components/AddCategoryModal'
import {
  ArrowLeft,
  Calendar,
  Zap,
  Plus,
  Smartphone,
  CreditCard,
  Banknote,
  Building2,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react'

const PAYMENT_OPTIONS = [
  { value: 'upi', label: 'UPI', Icon: Smartphone },
  { value: 'card', label: 'Card', Icon: CreditCard },
  { value: 'cash', label: 'Cash', Icon: Banknote },
  { value: 'netbanking', label: 'Net Banking', Icon: Building2 },
  { value: 'other', label: 'Other', Icon: HelpCircle },
] as const

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily (Every day)', sub: 'Generates automatically every day' },
  { value: 'monthly', label: 'Monthly (SIP / EMI)', sub: 'Generates once per month' },
  { value: 'weekly', label: 'Weekly', sub: 'Generates every 7 days' },
  { value: 'yearly', label: 'Yearly', sub: 'Annual renewal' },
] as const

export default function NewExpensePage() {
  const router = useRouter()
  const { categories, refetch: refetchCategories } = useCategories()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestedCategory, setSuggestedCategory] = useState<Category | null>(null)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)

  const [form, setForm] = useState({
    amount: '',
    description: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'upi',
    tags: '',
    is_autopay: false,
    recurring_frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'yearly',
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

    if (form.is_autopay && !tags.includes('⚡ Autopay')) {
      tags.push('⚡ Autopay')
    }

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
      // If recurring autopay, immediately backfill any missing days up to today
      if (form.is_autopay) {
        try {
          await syncAutopays(user.id)
        } catch (syncErr) {
          console.warn('Autopay sync error on submit:', syncErr)
        }
      }
      router.push('/expenses')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Expenses
        </button>
      </div>

      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Add Expense
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5">
            Log a new transaction or schedule an automatic recurring debit
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-mono text-lg font-semibold">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-xl font-semibold tabular-nums"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description *
            </label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="e.g. Swiggy lunch, Metro pass, Netflix autopay, Gym membership"
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-sm"
            />
            {suggestedCategory && (
              <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Suggested category: {suggestedCategory.icon} {suggestedCategory.name}
              </p>
            )}
          </div>

          {/* Category + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Category</label>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center gap-0.5 font-medium cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  New
                </button>
              </div>
              <select
                value={form.category_id}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setIsAddCategoryOpen(true)
                  } else {
                    setForm(f => ({ ...f, category_id: e.target.value }))
                  }
                }}
                className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
                <option value="__new__">+ Create New Category...</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Date *</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium transition-colors cursor-pointer"
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate('firstOfMonth')}
                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium transition-colors cursor-pointer"
                  >
                    1st
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
                  className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-3.5 pr-10 py-2.5 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={openDatePicker}
                  title="Open Calendar"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-5 gap-2">
              {PAYMENT_OPTIONS.map(({ value, label, Icon }) => {
                const isSelected = form.payment_method === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, payment_method: value }))}
                    className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-medium leading-tight">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Autopay / Recurring Deduction */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="autopay"
                  checked={form.is_autopay}
                  onChange={(e) => setForm(f => ({ ...f, is_autopay: e.target.checked }))}
                  className="w-4 h-4 rounded text-zinc-900 dark:text-zinc-100 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Autopay / Recurring Schedule
                </span>
              </label>
              {form.is_autopay && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold tracking-wider">
                  Active Autopay
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pl-6">
              When enabled, ExpenseIQ automatically posts deductions daily or monthly up to today. Each auto-posted transaction carries a permanent <span className="font-mono text-zinc-700 dark:text-zinc-300">⚡ Autopay</span> badge.
            </p>

            {form.is_autopay && (
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 pl-6 space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Deduction Frequency
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FREQUENCY_OPTIONS.map((freq) => {
                    const isSelected = form.recurring_frequency === freq.value
                    return (
                      <button
                        key={freq.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, recurring_frequency: freq.value as any }))}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-zinc-900 bg-white dark:bg-[#0e1017] dark:border-zinc-100 shadow-sm'
                            : 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <p className={`text-xs font-semibold ${isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
                          {freq.label}
                        </p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{freq.sub}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Tags <span className="text-zinc-400 dark:text-zinc-500 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. coffee, weekend, autopay"
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Notes <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Reference number, bill notes, or remarks..."
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs sm:text-sm transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>

      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onCategoryCreated={(newCat) => {
          refetchCategories()
          setForm(f => ({ ...f, category_id: newCat.id }))
        }}
      />
    </div>
  )
}
