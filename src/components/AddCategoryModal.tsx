'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Category } from '@/types/database'

const QUICK_EMOJIS = ['🏋️', '☕', '📚', '🎮', '👕', '🩺', '✈️', '🏠', '🍕', '💡', '🐾', '🎯', '🚗', '🎨', '🎸', '💻']

export default function AddCategoryModal({
  isOpen,
  onClose,
  onCategoryCreated,
}: {
  isOpen: boolean
  onClose: () => void
  onCategoryCreated?: (category: Category) => void
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏷️')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a category name.')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be signed in to add a category.')
      setLoading(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: name.trim(),
        icon: icon || '🏷️',
        color: '#71717a',
        is_default: false,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setName('')
    setIcon('🏷️')
    setLoading(false)
    if (onCategoryCreated && data) {
      onCategoryCreated(data as Category)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Create New Category</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 text-sm rounded-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Category Name *</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Gym, Books, Gaming, Skincare"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Icon / Emoji</label>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl p-2 bg-[#0d1117] border border-[#30363d] rounded-lg w-12 h-12 flex items-center justify-center">
                {icon}
              </span>
              <input
                type="text"
                placeholder="Type or paste emoji"
                value={icon}
                maxLength={4}
                onChange={(e) => setIcon(e.target.value || '🏷️')}
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`p-1.5 rounded-lg text-base hover:bg-zinc-800 transition-colors ${
                    icon === emoji ? 'bg-zinc-800 ring-1 ring-zinc-500' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#21262d] hover:bg-[#30363d] text-zinc-300 py-2.5 rounded-lg text-sm font-medium transition-colors border border-[#30363d]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-zinc-100 hover:bg-white text-zinc-900 disabled:opacity-40 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              {loading ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
