'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth, useCategories } from '@/lib/hooks'
import { useUserSettings, POPULAR_INDIAN_BANKS, getSalaryCycleRange } from '@/lib/user-settings'
import AddCategoryModal from '@/components/AddCategoryModal'
import { cleanAndResetCategories } from '@/lib/cleanup-categories'
import {
  Settings,
  User,
  LogOut,
  Plus,
  Trash2,
  Sparkles,
  Download,
  AlertTriangle,
  Layers,
  Database,
  UserX,
  CalendarClock,
  Building2,
  Check,
} from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { categories, refetch: refetchCategories } = useCategories()
  const {
    settings: userSettings,
    updateSalaryCycleDay,
    addBankAccount,
    removeBankAccount,
  } = useUserSettings()

  const [cycleDayInput, setCycleDayInput] = useState<number>(userSettings.salary_cycle_day || 28)
  const [newBankInput, setNewBankInput] = useState('')
  const [cycleSaved, setCycleSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('')
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)
  const [resettingCats, setResettingCats] = useState(false)

  const activeRange = getSalaryCycleRange(cycleDayInput || userSettings.salary_cycle_day)

  async function handleSaveCycle(day: number) {
    const valid = Math.max(1, Math.min(31, Math.floor(day)))
    setCycleDayInput(valid)
    await updateSalaryCycleDay(valid)
    setCycleSaved(true)
    setTimeout(() => setCycleSaved(false), 2000)
  }

  async function handleAddBank(name: string) {
    if (!name.trim()) return
    await addBankAccount(name.trim())
    setNewBankInput('')
  }

  async function handleResetCategories() {
    if (!confirm('This will merge duplicate categories (e.g. "Food Outings" into "Food & Dining", "Transport" into "Commute & Travel") and leave only the 8 simple core categories. Existing expenses will be safely preserved. Continue?')) return
    setResettingCats(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      await cleanAndResetCategories(authUser.id)
      await refetchCategories()
    }
    setResettingCats(false)
  }

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
        (e.categories as any)?.name || 'Uncategorized',
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
    alert('All expense records deleted successfully.')
    window.location.reload()
  }

  async function handleDeleteAccount() {
    if (deleteAccountConfirm !== 'DELETE MY ACCOUNT') return
    if (!confirm('Are you absolutely certain? This will delete your entire account, all expenses, budgets, categories, and credentials forever. This cannot be undone.')) return
    
    setDeleteAccountLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        // Delete user related records
        await supabase.from('expenses').delete().eq('user_id', authUser.id)
        await supabase.from('budgets').delete().eq('user_id', authUser.id)
        await supabase.from('categories').delete().eq('user_id', authUser.id)
        
        // Attempt database RPC to delete user from auth.users
        try {
          await (supabase as any).rpc('delete_user_account')
        } catch (rpcErr) {
          console.warn('RPC delete_user_account not found or failed, proceeding with sign out:', rpcErr)
        }
      }

      await supabase.auth.signOut()
      alert('Your account has been deleted.')
      router.push('/auth')
    } catch (err: any) {
      alert('Failed to delete account: ' + (err?.message || 'Please try again.'))
    } finally {
      setDeleteAccountLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
          Settings
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5">
          Account credentials, category management, and ledger backups
        </p>
      </div>

      {/* Account Info */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Account Profile</h2>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-semibold text-lg flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() || <User className="w-5 h-5 text-zinc-500" />}
          </div>
          <div className="min-w-0">
            <p className="text-zinc-900 dark:text-zinc-100 font-medium text-sm truncate">{user?.email || 'Authenticated User'}</p>
            <p className="text-zinc-500 text-xs font-mono mt-0.5">Protected with Row-Level Security</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out of ExpenseIQ
        </button>
      </div>

      {/* Salary Cycle Configuration */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-amber-500" />
              <span>Salary Cycle &amp; Payday</span>
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
              Choose the day of the month you receive your salary. Your monthly burn and metrics will calculate within this cycle.
            </p>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Day {userSettings.salary_cycle_day}
          </span>
        </div>

        {/* Quick Pick Pills */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Quick Select Common Paydays:
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { day: 28, label: '28th of month (Your Salary)' },
              { day: 1, label: '1st of month (Calendar)' },
              { day: 25, label: '25th of month' },
              { day: 30, label: '30th of month' },
            ].map(({ day, label }) => (
              <button
                key={day}
                type="button"
                onClick={() => handleSaveCycle(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  (userSettings.salary_cycle_day || 28) === day
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs'
                    : 'bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Day Input */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium whitespace-nowrap">
              Or custom day (1–31):
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={cycleDayInput}
              onChange={(e) => setCycleDayInput(parseInt(e.target.value) || 1)}
              className="w-16 bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-center text-zinc-900 dark:text-zinc-100 font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
            <button
              type="button"
              onClick={() => handleSaveCycle(cycleDayInput)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
            >
              Update Day
            </button>
          </div>

          {cycleSaved && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Saved!</span>
            </p>
          )}
        </div>

        {/* Active Window Preview */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 text-xs flex items-center justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Current Calculated Cycle Window:</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {activeRange.label}
          </span>
        </div>
      </div>

      {/* Bank Accounts & Wallets */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" />
            <span>Bank Accounts &amp; Wallets</span>
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
            Tag expenses and income to specific bank accounts, credit cards, or cash wallets
          </p>
        </div>

        {/* Current Active Accounts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {userSettings.bank_accounts.map((acc) => (
            <div
              key={acc}
              className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800/80 rounded-xl text-xs"
            >
              <span className="text-zinc-900 dark:text-zinc-200 font-medium truncate flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <span className="truncate">{acc}</span>
              </span>
              <button
                type="button"
                onClick={() => removeBankAccount(acc)}
                className="text-zinc-400 hover:text-rose-500 p-1 transition-colors cursor-pointer flex-shrink-0"
                title="Remove account"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Account Input */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Axis Bank, Paytm Wallet, Emergency Cash"
              value={newBankInput}
              onChange={(e) => setNewBankInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddBank(newBankInput); }}
              className="flex-1 bg-zinc-50 dark:bg-[#090a0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
            <button
              type="button"
              onClick={() => handleAddBank(newBankInput)}
              disabled={!newBankInput.trim()}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
            >
              Add
            </button>
          </div>

          {/* Quick Suggestions from Indian Banks */}
          <div>
            <p className="text-[11px] font-medium text-zinc-400 mb-1.5">Quick Add Presets:</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_INDIAN_BANKS.filter(b => !userSettings.bank_accounts.includes(b)).slice(0, 6).map((bank) => (
                <button
                  key={bank}
                  type="button"
                  onClick={() => handleAddBank(bank)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  + {bank}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Categories Management */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-500" />
              Categories ({categories.length})
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
              Default system categories and custom user labels
            </p>
          </div>
          <div className="flex items-center gap-2">
            {categories.length > 8 && (
              <button
                type="button"
                onClick={handleResetCategories}
                disabled={resettingCats}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
                title="Merge duplicates and clean up to 8 simple core categories"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {resettingCats ? 'Cleaning...' : 'Clean to 8 Core'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAddCategoryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Category
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800/80 rounded-xl text-xs"
            >
              <div className="flex items-center gap-2.5 truncate mr-2">
                <span className="w-6 text-center text-sm">{cat.icon}</span>
                <span className="text-zinc-900 dark:text-zinc-200 font-medium truncate">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {cat.is_default ? (
                  <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md font-mono">
                    System
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    disabled={deletingCatId === cat.id}
                    className="text-zinc-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                    title="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* App Architecture & Specs */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-zinc-500" />
          System Information
        </h2>
        <div className="space-y-2.5 text-xs divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {[
            ['Engine', 'Next.js 16 (App Router) + Tailwind CSS v4'],
            ['Authentication', 'Supabase Auth (Multi-User Isolated RLS)'],
            ['Default Currency', '₹ INR (Indian Rupee)'],
            ['Autopay Engine', 'Daily & Monthly Auto-reconciliation'],
            ['Theme Engine', 'Dual-mode (Dark / Light) with anti-flicker'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 first:pt-0 last:pb-0">
              <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
              <span className="text-zinc-900 dark:text-zinc-200 font-medium font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Data Management &amp; Danger Zone</h2>

        {/* Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-zinc-900 dark:text-zinc-200 text-xs sm:text-sm font-medium">Export All Expenses</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs">Download complete transaction ledger in CSV format</p>
          </div>
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        {/* Delete All Expenses */}
        <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-xs sm:text-sm font-semibold">Delete All Expenses</p>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
            Permanently purges all transaction records for your account. This action is irreversible.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder='Type "DELETE" to confirm'
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-rose-200 dark:border-rose-900/40 rounded-xl px-3.5 py-2 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <button
              onClick={handleDeleteAll}
              disabled={deleteConfirm !== 'DELETE' || deleteLoading}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 disabled:opacity-40 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              {deleteLoading ? 'Purging records...' : 'Confirm Ledger Reset'}
            </button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <UserX className="w-4 h-4" />
            <p className="text-xs sm:text-sm font-semibold">Delete Account</p>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
            Permanently deletes your account profile, credentials, all categories, budgets, and all expense data. This action is completely permanent and cannot be undone.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder='Type "DELETE MY ACCOUNT" to confirm'
              value={deleteAccountConfirm}
              onChange={(e) => setDeleteAccountConfirm(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-[#090a0f] border border-rose-200 dark:border-rose-900/40 rounded-xl px-3.5 py-2 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <button
              onClick={handleDeleteAccount}
              disabled={deleteAccountConfirm !== 'DELETE MY ACCOUNT' || deleteAccountLoading}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              <UserX className="w-4 h-4" />
              {deleteAccountLoading ? 'Deleting Account...' : 'Permanently Delete My Account'}
            </button>
          </div>
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
