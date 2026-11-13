'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/lib/hooks'
import { categorizeExpense } from '@/lib/categorize'
import { formatCurrency } from '@/lib/utils'
import { parseBankStatement, ParsedStatementRow } from '@/lib/bank-statement-parser'
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Trash2,
  Sparkles,
  Calendar,
  Layers,
  Loader2,
  CheckSquare,
  Square,
  FileText,
} from 'lucide-react'

export default function ImportExpensesPage() {
  const router = useRouter()
  const { categories } = useCategories()
  const [tab, setTab] = useState<'upload' | 'paste'>('upload')
  const [pastedText, setPastedText] = useState('')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedStatementRow[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  function handleProcessText(content: string, name?: string) {
    setError('')
    if (name) setFileName(name)
    const parsed = parseBankStatement(content)
    if (parsed.length === 0) {
      setError('No debit transactions found. Please ensure the file contains Date, Narration, and Debit/Amount columns.')
      return
    }

    // Auto-categorize each parsed row
    const withCategories = parsed.map(row => {
      const suggestion = categorizeExpense(row.cleanDescription, categories)
      return {
        ...row,
        suggestedCategoryId: suggestion ? suggestion.id : '',
      }
    })

    setRows(withCategories)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        handleProcessText(text, file.name)
      }
    }
    reader.readAsText(file)
  }

  function handleToggleRow(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r))
  }

  function handleSelectAll(select: boolean) {
    setRows(prev => prev.map(r => ({ ...r, selected: select })))
  }

  function handleUpdateRow(id: string, updates: Partial<ParsedStatementRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  function handleDeleteRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const selectedRows = useMemo(() => rows.filter(r => r.selected), [rows])
  const totalSelectedAmount = useMemo(() => selectedRows.reduce((s, r) => s + r.amount, 0), [selectedRows])

  async function handleConfirmImport() {
    if (selectedRows.length === 0) return
    setImporting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be signed in to import transactions.')
      setImporting(false)
      return
    }

    const payload = selectedRows.map(r => ({
      user_id: user.id,
      amount: r.amount,
      description: r.cleanDescription || r.rawDescription,
      category_id: r.suggestedCategoryId || null,
      date: r.date,
      payment_method: r.paymentMethod,
      tags: ['Imported', 'Statement'],
      notes: r.rawDescription !== r.cleanDescription ? `Narration: ${r.rawDescription}` : null,
    }))

    const { error: insertErr } = await supabase.from('expenses').insert(payload)

    if (insertErr) {
      setError(insertErr.message)
      setImporting(false)
    } else {
      router.push('/expenses')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Expenses
        </Link>
      </div>

      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Import Bank Statement
            </h1>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5">
            Extract, auto-categorize, and bulk-import transactions from your bank CSV or pasted ledger.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Switch: Upload vs Paste */}
        {rows.length === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl w-fit border border-zinc-200/60 dark:border-zinc-800/60">
              <button
                type="button"
                onClick={() => setTab('upload')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  tab === 'upload'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Upload CSV / Excel File
              </button>
              <button
                type="button"
                onClick={() => setTab('paste')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  tab === 'paste'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Paste Statement Text
              </button>
            </div>

            {tab === 'upload' ? (
              <label className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-900/20">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  Click to upload or drag &amp; drop
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                  Supports .csv or .txt statement files from HDFC, SBI, ICICI, Axis, Kotak, etc.
                </p>
                <span className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium shadow-xs">
                  Browse Files
                </span>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={8}
                  placeholder={`Paste statement rows from netbanking or CSV here, for example:
Date,Narration,Withdrawal Amount
12/11/2026,UPI/431289/SWIGGY/swiggy@icici,450.00
11/11/2026,POS 4321 CHAI POINT BANGALORE,150.00`}
                  className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
                <button
                  type="button"
                  onClick={() => handleProcessText(pastedText, 'pasted-text')}
                  disabled={!pastedText.trim()}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs sm:text-sm font-medium transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  Parse &amp; Preview Transactions
                </button>
              </div>
            )}
          </div>
        )}

        {/* Staging & Review Table */}
        {rows.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectAll(selectedRows.length !== rows.length)}
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  {selectedRows.length === rows.length ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-400" />
                  )}
                  <span>Select All ({rows.length})</span>
                </button>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  <strong className="text-zinc-900 dark:text-zinc-100">{selectedRows.length}</strong> selected · Total:{' '}
                  <strong className="text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatCurrency(totalSelectedAmount)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setRows([]); setPastedText(''); setFileName(''); }}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 px-3 py-1.5 transition-colors cursor-pointer"
                >
                  Clear File
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={selectedRows.length === 0 || importing}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold shadow-xs disabled:opacity-40 cursor-pointer transition-all"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Import {selectedRows.length} Expenses
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[500px] overflow-y-auto">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
                    row.selected ? 'bg-white dark:bg-[#0e1017]' : 'bg-zinc-50/40 dark:bg-zinc-900/20 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleRow(row.id)}
                      className="cursor-pointer text-zinc-400 hover:text-zinc-600 flex-shrink-0"
                    >
                      {row.selected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={row.cleanDescription}
                        onChange={(e) => handleUpdateRow(row.id, { cleanDescription: e.target.value })}
                        className="w-full bg-transparent font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-zinc-100 dark:focus:bg-zinc-800 rounded px-1 -mx-1"
                      />
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5" title={row.rawDescription}>
                        {row.rawDescription}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 justify-between sm:justify-end pl-7 sm:pl-0">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => handleUpdateRow(row.id, { date: e.target.value })}
                      className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
                    />

                    <select
                      value={row.suggestedCategoryId || ''}
                      onChange={(e) => handleUpdateRow(row.id, { suggestedCategoryId: e.target.value })}
                      className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none max-w-[130px] truncate"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>

                    <span className="font-semibold text-xs sm:text-sm tabular-nums text-zinc-900 dark:text-zinc-100 w-20 text-right">
                      {formatCurrency(row.amount)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteRow(row.id)}
                      className="text-zinc-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
