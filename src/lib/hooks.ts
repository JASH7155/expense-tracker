'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { Category, Expense, Budget, ExpenseWithCategory } from '@/types/database'
import { getCurrentMonthRange, DEFAULT_CATEGORIES } from './utils'
import { syncAutopays } from './autopay-sync'

let lastSyncTimestamp = 0

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (!error && data && data.length > 0) {
        setCategories(data)
      } else {
        // Fallback: If DB trigger hasn't populated categories yet, seed client-side
        const seeded = DEFAULT_CATEGORIES.map((c, i) => ({
          id: `default-cat-${i + 1}`,
          user_id: user.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          is_default: true,
          created_at: new Date().toISOString(),
        }))
        setCategories(seeded)
      }
      setLoading(false)
    }

    fetchCategories()
  }, [])

  return { categories, loading }
}

export function useExpenses(filters?: {
  startDate?: string
  endDate?: string
  categoryId?: string
  paymentMethod?: string
  search?: string
}) {
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setExpenses([])
      setLoading(false)
      return
    }

    // Auto-sync recurring autopays (e.g. daily Nov 1 -> today)
    const now = Date.now()
    if (now - lastSyncTimestamp > 10000) {
      lastSyncTimestamp = now
      try {
        await syncAutopays(user.id)
      } catch (err) {
        console.warn('Autopay sync error:', err)
      }
    }

    let query = supabase
      .from('expenses')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters?.startDate) query = query.gte('date', filters.startDate)
    if (filters?.endDate) query = query.lte('date', filters.endDate)
    if (filters?.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters?.paymentMethod) query = query.eq('payment_method', filters.paymentMethod)
    if (filters?.search) query = query.ilike('description', `%${filters.search}%`)

    const { data, error } = await query
    if (!error && data) {
      setExpenses(data as unknown as ExpenseWithCategory[])
    }
    setLoading(false)
  }, [filters?.startDate, filters?.endDate, filters?.categoryId, filters?.paymentMethod, filters?.search])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  return { expenses, loading, refetch: fetchExpenses }
}

export function useMonthlyExpenses() {
  const { start, end } = getCurrentMonthRange()
  return useExpenses({ startDate: start, endDate: end })
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setBudgets([])
      setLoading(false)
      return
    }

    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month)

    if (!error && data) {
      setBudgets(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  return { budgets, loading, refetch: fetchBudgets }
}

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
