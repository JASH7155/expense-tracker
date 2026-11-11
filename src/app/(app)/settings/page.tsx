'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks'
import { getDemoExpenses, resetDemoData } from '@/lib/demo-storage'

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleExportAll() {
    setExporting(true)
    let rawData: any[] = []

    try {
      const { data } = await supabase
        .from('expenses')
        .select('*, categories(name, icon)')
        .order('date', { ascending: false })
      if (data && data.length > 0) {
        rawData = data
      }
    } catch {
      // Demo fallback
    }

    if (rawData.length === 0) {
      rawData = getDemoExpenses()
    }

    if (rawData.length > 0) {
      const headers = ['Date', 'Description', 'Amount', 'Category', 'Payment Method', 'Tags', 'Notes', 'Recurring']
      const rows = rawData.map(e => [
        e.date,
        `"${e.description.replace(/"/g, '""')}"`,
        e.amount,
        (e.categories as any)?.name || 'Misc',
        e.payment_method,
        (e.tags || []).join(';'),
        `"${(e.notes || '').replace(/"/g, '""')}"`,
        e.is_recurring,
      ])
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'all-expenses.csv'
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  async function handleDeleteAll() {
    if (deleteConfirm !== 'DELETE') return
    setDeleteLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        await supabase.from('expenses').delete().eq('user_id', authUser.id)
      }
    } catch {
      // Demo fallback
    }
    window.localStorage.setItem('expenseiq_demo_expenses', '[]')
    setDeleteConfirm('')
    setDeleteLoading(false)
    alert('✅ All expenses deleted successfully.')
    window.location.reload()
  }

  function handleResetDemo() {
    if (confirm('Reset to initial sample expenses and budgets?')) {
      resetDemoData()
      alert('Sample data restored!')
      window.location.reload()
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm">Manage your account and data</p>
      </div>

      {/* Account Info */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Account</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-white font-medium">{user?.email}</p>
            <p className="text-gray-500 text-sm">Signed in via Magic Link</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          🚪 Sign Out
        </button>
      </div>

      {/* App Info */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">About ExpenseIQ</h2>
        <div className="space-y-3 text-sm divide-y divide-[#30363d]">
          {[
            ['Version', '1.0.0'],
            ['Currency', '₹ INR'],
            ['Database', 'Supabase (PostgreSQL)'],
            ['Hosting', 'Vercel (Free Tier)'],
            ['Auth', 'Magic Link (Passwordless)'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 first:pt-0 last:pb-0">
              <span className="text-gray-400">{label}</span>
              <span className="text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Data Management</h2>

        {/* Export */}
        <div className="mb-5 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <p className="text-gray-300 text-sm font-medium mb-1">Export all expenses</p>
            <p className="text-gray-500 text-xs">Download a complete CSV of your expense history</p>
          </div>
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 text-green-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : '📥 Export All as CSV'}
          </button>
        </div>

        {/* Reset Sample Data */}
        <div className="border-t border-[#30363d] py-4 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <p className="text-gray-300 text-sm font-medium mb-1">Sample Data</p>
            <p className="text-gray-500 text-xs">Restore pre-populated sample expenses and budgets</p>
          </div>
          <button
            onClick={handleResetDemo}
            className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/40 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🔄 Restore Sample Data
          </button>
        </div>

        {/* Delete All */}
        <div className="border-t border-[#30363d] pt-5">
          <p className="text-red-400 text-sm font-medium mb-1">⚠️ Delete all expenses</p>
          <p className="text-gray-500 text-xs mb-3">
            This permanently deletes all your expense records. This action cannot be undone.
          </p>
          <input
            type="text"
            placeholder='Type "DELETE" to confirm'
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="w-full bg-[#0d1117] border border-red-500/30 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500 mb-3"
          />
          <button
            onClick={handleDeleteAll}
            disabled={deleteConfirm !== 'DELETE' || deleteLoading}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 disabled:opacity-30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {deleteLoading ? 'Deleting...' : '🗑️ Delete All Expenses'}
          </button>
        </div>
      </div>
    </div>
  )
}
