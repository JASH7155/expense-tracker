'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth, useCategories } from '@/lib/hooks'
import AddCategoryModal from '@/components/AddCategoryModal'

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { categories, refetch: refetchCategories } = useCategories()
  const [exporting, setExporting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Existing expenses will become Uncategorized.`)) return
    setDeletingCatId(id)
    await supabase.from('categories').delete().eq('id', id)
    await refetchCategories()
    setDeletingCatId(null)
  }

  async function handleExportAll() {
    setExporting(true)
    const { data } = await supabase
      .from('expenses')
      .select('*, categories(name, icon)')
      .order('date', { ascending: false })

    if (data && data.length > 0) {
      const headers = ['Date', 'Description', 'Amount', 'Category', 'Payment Method', 'Tags', 'Notes', 'Recurring']
      const rows = data.map(e => [
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
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      await supabase.from('expenses').delete().eq('user_id', authUser.id)
    }
    setDeleteConfirm('')
    setDeleteLoading(false)
    alert('✅ All expenses deleted successfully.')
    window.location.reload()
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
          <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 font-bold text-lg flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-white font-medium">{user?.email || 'Loading...'}</p>
            <p className="text-zinc-500 text-sm">Signed in with Supabase</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          🚪 Sign Out
        </button>
      </div>

      {/* Categories Management */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold">Categories</h2>
            <p className="text-zinc-400 text-xs">Manage your default and custom expense categories</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddCategoryOpen(true)}
            className="bg-zinc-100 hover:bg-white text-zinc-900 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            + Add Category
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm"
            >
              <div className="flex items-center gap-2.5 truncate mr-2">
                <span className="text-lg">{cat.icon}</span>
                <span className="text-zinc-200 truncate text-xs font-medium">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {cat.is_default ? (
                  <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded border border-zinc-700/50">
                    Default
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    disabled={deletingCatId === cat.id}
                    className="text-zinc-500 hover:text-red-400 text-xs p-1 transition-colors"
                    title="Delete category"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
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
            ['Auth', 'Supabase Auth (Password & Magic Link)'],
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

      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onCategoryCreated={() => refetchCategories()}
      />
    </div>
  )
}
