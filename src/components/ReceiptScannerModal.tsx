'use client'

import { useState, useRef } from 'react'
import { createWorker } from 'tesseract.js'
import { parseReceiptText, ParsedReceiptResult } from '@/lib/receipt-scanner'
import { Category } from '@/types/database'
import { categorizeExpense } from '@/lib/categorize'
import { formatCurrency } from '@/lib/utils'
import {
  X,
  Camera,
  Upload,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  FileText,
  Calendar,
  Layers,
  Store,
} from 'lucide-react'

interface ReceiptScannerModalProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  onReceiptScanned: (data: {
    amount: string
    description: string
    date: string
    categoryId?: string
    notes?: string
  }) => void
}

export default function ReceiptScannerModal({
  isOpen,
  onClose,
  categories,
  onReceiptScanned,
}: ReceiptScannerModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [parsed, setParsed] = useState<ParsedReceiptResult | null>(null)
  const [suggestedCat, setSuggestedCat] = useState<Category | null>(null)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  async function processImageFile(file: File) {
    setError('')
    setParsed(null)
    setSuggestedCat(null)
    setProgress(0)

    const imageUrl = URL.createObjectURL(file)
    setImagePreview(imageUrl)
    setScanning(true)
    setStatusText('Initializing OCR engine...')

    try {
      const worker = await createWorker('eng')
      setStatusText('Scanning receipt text...')

      const { data } = await worker.recognize(file)
      await worker.terminate()

      if (!data || !data.text.trim()) {
        setError('No readable text found in this image. Please ensure the receipt is well-lit and clear.')
        setScanning(false)
        return
      }

      const result = parseReceiptText(data.text)
      setParsed(result)

      if (result.merchant && categories.length > 0) {
        const cat = categorizeExpense(result.merchant, categories)
        if (cat) setSuggestedCat(cat)
      }

      setScanning(false)
      setStatusText('Scan complete!')
    } catch (err: any) {
      console.error('OCR Error:', err)
      setError('Could not scan receipt. Please try another image or enter manually.')
      setScanning(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      processImageFile(file)
    }
  }

  function handleApply() {
    if (!parsed) return

    onReceiptScanned({
      amount: parsed.amount,
      description: parsed.merchant,
      date: parsed.date,
      categoryId: suggestedCat ? suggestedCat.id : undefined,
      notes: `Scanned from receipt (${parsed.merchant})`,
    })

    handleClose()
  }

  function handleClose() {
    setImagePreview(null)
    setParsed(null)
    setSuggestedCat(null)
    setScanning(false)
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Scan Receipt or Invoice
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                100% Free on-device OCR · Zero API tokens required
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!imagePreview ? (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-purple-500 dark:hover:border-purple-400 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-900/20 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
                  <Upload className="w-6 h-6 text-purple-500" />
                </div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  Upload Receipt Image
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 max-w-xs">
                  Supports JPG, PNG, and WebP photos of restaurant bills, grocery slips, or retail receipts.
                </p>
                <span className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium shadow-xs">
                  Choose Photo
                </span>
              </div>

              {/* Mobile Camera Option */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-purple-500" />
                <span>Take Photo with Camera</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 max-h-48 bg-zinc-950 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Scanned Receipt"
                  className="max-h-48 object-contain w-full"
                />
                {!scanning && (
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setParsed(null); }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors text-xs"
                    title="Change Photo"
                  >
                    Change
                  </button>
                )}
              </div>

              {/* Scanning Spinner / Progress */}
              {scanning && (
                <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-500/10 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto" />
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{statusText}</p>
                  <p className="text-[11px] text-zinc-500">Processing text on-device in WebAssembly...</p>
                </div>
              )}

              {/* Extracted Fields Preview */}
              {parsed && !scanning && (
                <div className="space-y-3 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      Extracted Receipt Data
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                      {parsed.confidence}% Confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Total Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={parsed.amount}
                        onChange={(e) => setParsed({ ...parsed, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-white dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-bold tabular-nums text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Receipt Date
                      </label>
                      <input
                        type="date"
                        value={parsed.date}
                        onChange={(e) => setParsed({ ...parsed, date: e.target.value })}
                        className="w-full bg-white dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Merchant / Store
                      </label>
                      <input
                        type="text"
                        value={parsed.merchant}
                        onChange={(e) => setParsed({ ...parsed, merchant: e.target.value })}
                        placeholder="Store or merchant name"
                        className="w-full bg-white dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    {suggestedCat && (
                      <div className="col-span-2 flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800">
                        <span className="text-[11px] text-zinc-500">Auto-Categorized As:</span>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {suggestedCat.icon} {suggestedCat.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {parsed && !scanning && (
          <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!parsed.amount}
              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply to Expense Form</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
