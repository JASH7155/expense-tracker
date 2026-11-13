'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/lib/hooks'
import { useUserSettings } from '@/lib/user-settings'
import { categorizeExpense } from '@/lib/categorize'
import { Category } from '@/types/database'
import { syncAutopays } from '@/lib/autopay-sync'
import { parseUPIText } from '@/lib/upi-parser'
import {
  TransactionType,
  INCOME_CATEGORIES,
  buildTransactionTags,
} from '@/lib/transaction-utils'
import AddCategoryModal from '@/components/AddCategoryModal'
import ReceiptScannerModal from '@/components/ReceiptScannerModal'
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
  ClipboardPaste,
  Check,
  Camera,
  Coins,
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  User,
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
  const { settings: userSettings } = useUserSettings()
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestedCategory, setSuggestedCategory] = useState<Category | null>(null)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false)
  const [upiText, setUpiText] = useState('')
  const [upiParsedFeedback, setUpiParsedFeedback] = useState<string | null>(null)

  // Batch B Transaction Modes: 'expense' | 'income' | 'lend'
  const [transactionType, setTransactionType] = useState<TransactionType>('expense')
  const [bankAccount, setBankAccount] = useState<string>('')
  const [friendName, setFriendName] = useState<string>('')
  const [incomeCategory, setIncomeCategory] = useState<string>('Salary')

  // Set default bank account when userSettings load
  const availableAccounts = userSettings.bank_accounts.length > 0
    ? userSettings.bank_accounts
    : ['HDFC Bank', 'SBI', 'Cash']
  const activeBankAccount = bankAccount || availableAccounts[0]

  function handleProcessUPIText(raw: string) {
    setUpiText(raw)
    if (!raw.trim()) {
      setUpiParsedFeedback(null)
      return
    }

    const result = parseUPIText(raw)
    if (result) {
      const suggestion = categorizeExpense(result.description, categories)
      setForm(prev => ({
        ...prev,
        amount: result.amount,
        description: result.description,
        date: result.date,
        payment_method: 'upi',
        category_id: suggestion ? suggestion.id : prev.category_id,
        notes: result.reference ? `UPI Ref: ${result.reference}` : prev.notes,
      }))
      if (suggestion) {
        setSuggestedCategory(suggestion)
      }
      setUpiParsedFeedback(`Autofilled: ₹${result.amount} to "${result.description}" on ${result.date}`)
    } else {
      setUpiParsedFeedback(null)
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        handleProcessUPIText(text)
      }
    } catch {
      // Browser blocked clipboard permission or not focused
    }
  }

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

    const customTags = form.tags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean)

    if (transactionType === 'lend' && !friendName.trim()) {
      setError('Please provide the friend’s name who is due to pay.')
      setLoading(false)
      return
    }

    // Build resilient tags that carry type, bank, and friend info
    const tags = buildTransactionTags({
      type: transactionType,
      bankAccount: activeBankAccount,
      friendName: transactionType === 'lend' ? friendName.trim() : null,
      dueStatus: 'due',
      isAutopay: transactionType === 'expense' && form.is_autopay,
      customTags,
    })

    // If Income, description or category note
    let finalDescription = form.description
    if (transactionType === 'income' && !finalDescription.trim()) {
      finalDescription = `${incomeCategory} Inflow`
    } else if (transactionType === 'lend' && !finalDescription.trim()) {
      finalDescription = `Lent to ${friendName.trim()}`
    }

    const payload: any = {
      user_id: user.id,
      amount: parseFloat(form.amount),
      description: finalDescription,
      category_id: transactionType === 'expense' ? (form.category_id || null) : null,
      date: form.date,
      payment_method: form.payment_method,
      tags,
      is_recurring: transactionType === 'expense' ? form.is_autopay : false,
      recurring_frequency: (transactionType === 'expense' && form.is_autopay) ? form.recurring_frequency : null,
      is_autopay: transactionType === 'expense' ? form.is_autopay : false,
      notes: form.notes || null,
      type: transactionType,
      bank_account: activeBankAccount,
      friend_name: transactionType === 'lend' ? friendName.trim() : null,
      due_status: transactionType === 'lend' ? 'due' : null,
    }

    const { error: insertError } = await supabase.from('expenses').insert(payload)

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
        {/* Transaction Type Segmented Toggle */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl mb-6 border border-zinc-200/60 dark:border-zinc-800/60">
          <button
            type="button"
            onClick={() => setTransactionType('expense')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              transactionType === 'expense'
                ? 'bg-white dark:bg-[#0e1017] text-zinc-950 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500" />
            <span>Expense</span>
          </button>
          <button
            type="button"
            onClick={() => setTransactionType('income')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              transactionType === 'income'
                ? 'bg-white dark:bg-[#0e1017] text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            <span>Income</span>
          </button>
          <button
            type="button"
            onClick={() => setTransactionType('lend')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              transactionType === 'lend'
                ? 'bg-white dark:bg-[#0e1017] text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5 text-blue-500" />
            <span>Lent to Friend</span>
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {transactionType === 'expense' && 'Add Expense'}
            {transactionType === 'income' && 'Record Income'}
            {transactionType === 'lend' && 'Lent to Friend (IOU)'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5">
            {transactionType === 'expense' && 'Log a new expense or schedule an automatic recurring debit'}
            {transactionType === 'income' && 'Track salary, freelance earnings, investments, or gifts'}
            {transactionType === 'lend' && 'Track money lent to friends and keep tabs on who owes you'}
          </p>
        </div>

        {/* Quick Action Helpers: Only for Expenses */}
        {transactionType === 'expense' && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                UPI Quick Paste
              </span>
              <button
                type="button"
                onClick={() => setIsReceiptScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Camera className="w-3.5 h-3.5 text-purple-500" />
                <span>Scan Bill</span>
              </button>
            </div>

            {/* UPI SMS Quick Fill */}
            <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Paste bank SMS or payment text to autofill.
                </p>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="text-[11px] inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer transition-colors"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  Paste Clipboard
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={upiText}
                  onChange={(e) => handleProcessUPIText(e.target.value)}
                  placeholder='e.g. "Sent Rs. 450 to Swiggy" or "Paid ₹200 to Chai Point"'
                  className="w-full bg-white dark:bg-[#090a0f] border border-blue-200 dark:border-blue-900/60 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              {upiParsedFeedback && (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-0.5">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{upiParsedFeedback}</span>
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {transactionType === 'income' ? 'Income Amount (₹) *' : transactionType === 'lend' ? 'Amount Lent (₹) *' : 'Amount (₹) *'}
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-mono text-lg font-semibold ${
                transactionType === 'income' ? 'text-emerald-500' : transactionType === 'lend' ? 'text-blue-500' : 'text-zinc-400 dark:text-zinc-500'
              }`}>
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
                className={`w-full bg-zinc-50 dark:bg-[#090a0f] border rounded-xl pl-9 pr-4 py-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none text-xl font-semibold tabular-nums ${
                  transactionType === 'income'
                    ? 'border-emerald-200 dark:border-emerald-900/50 focus:ring-1 focus:ring-emerald-500'
                    : transactionType === 'lend'
                    ? 'border-blue-200 dark:border-blue-900/50 focus:ring-1 focus:ring-blue-500'
                    : 'border-zinc-200 dark:border-zinc-800 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600'
                }`}
              />
            </div>
          </div>

          {/* Friend Name: Only when transactionType === 'lend' */}
          {transactionType === 'lend' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Friend's Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="e.g. Rahul, Priya, Amit, Rohit"
                  className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-blue-200 dark:border-blue-900/50 rounded-xl pl-10 pr-4 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {transactionType === 'income' ? 'Income Source / Note' : transactionType === 'lend' ? 'Purpose / Bill Details' : 'Description *'}
            </label>
            <input
              type="text"
              required={transactionType === 'expense'}
              value={form.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={
                transactionType === 'income'
                  ? 'e.g. October Salary, Freelance project, Mutual fund dividend'
                  : transactionType === 'lend'
                  ? 'e.g. Concert tickets, Weekend trip share, Dinner bill split'
                  : 'e.g. Swiggy lunch, Metro pass, Netflix autopay, Gym membership'
              }
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-sm"
            />
            {transactionType === 'expense' && suggestedCategory && (
              <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Suggested category: {suggestedCategory.icon} {suggestedCategory.name}
              </p>
            )}
          </div>

          {/* Category / Source + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {transactionType === 'income' ? 'Income Category' : 'Category'}
                </label>
                {transactionType === 'expense' && (
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen(true)}
                    className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center gap-0.5 font-medium cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    New
                  </button>
                )}
              </div>

              {transactionType === 'income' ? (
                <select
                  value={incomeCategory}
                  onChange={(e) => setIncomeCategory(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {INCOME_CATEGORIES.map((inc) => (
                    <option key={inc.id} value={inc.name}>{inc.icon} {inc.name}</option>
                  ))}
                </select>
              ) : transactionType === 'lend' ? (
                <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-700 dark:text-zinc-300 text-sm flex items-center gap-2">
                  <span>🤝</span>
                  <span className="font-medium">Friends &amp; Lending</span>
                </div>
              ) : (
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
              )}
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

          {/* Bank Account Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {transactionType === 'income' ? 'Credited Into Bank Account' : 'Bank Account / Wallet'}
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={activeBankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              >
                {availableAccounts.map((acc) => (
                  <option key={acc} value={acc}>{acc}</option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
              You can add or remove bank accounts anytime in Settings.
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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

          {/* Autopay / Recurring Schedule: Only for Expenses */}
          {transactionType === 'expense' && (
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-2.5">
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
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 pl-6 leading-relaxed">
                Automatically logs this expense on a recurring daily or monthly schedule.
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
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Tags <span className="text-zinc-400 dark:text-zinc-500 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. coffee, weekend, festival"
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
              className={`flex-1 py-2.5 rounded-xl text-white font-medium text-xs sm:text-sm transition-colors disabled:opacity-50 shadow-sm cursor-pointer ${
                transactionType === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : transactionType === 'lend'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900'
              }`}
            >
              {loading
                ? 'Saving...'
                : transactionType === 'income'
                ? 'Record Income'
                : transactionType === 'lend'
                ? 'Record Friend Due'
                : 'Save Expense'}
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

      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        categories={categories}
        onReceiptScanned={({ amount, description, date, categoryId, notes }) => {
          setForm(prev => ({
            ...prev,
            amount: amount || prev.amount,
            description: description || prev.description,
            date: date || prev.date,
            category_id: categoryId || prev.category_id,
            notes: notes || prev.notes,
          }))
          if (categoryId) {
            const matched = categories.find(c => c.id === categoryId)
            if (matched) setSuggestedCategory(matched)
          }
        }}
      />
    </div>
  )
}
