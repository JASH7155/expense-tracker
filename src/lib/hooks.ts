'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { Category, Expense, Budget, ExpenseWithCategory } from '@/types/database'
import { getCurrentMonthRange } from './utils'
import {
  DEMO_USER,
  getDemoCategories,
  getDemoExpenses,
  getDemoBudgets,
} from './demo-storage'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
            .order('name')

          if (!error && data && data.length > 0) {
            setCategories(data)
            setLoading(false)
            return
          }
        }
      } catch {
        // Fall back to demo categories
      }

      setCategories(getDemoCategories())
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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
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
          setLoading(false)
          return
        }
      }
    } catch {
      // Fall back to demo data
    }

    setExpenses(getDemoExpenses(filters))
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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const now = new Date()
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', month)

        if (!error && data && data.length > 0) {
          setBudgets(data)
          setLoading(false)
          return
        }
      }
    } catch {
      // Fall back to demo budgets
    }

    setBudgets(getDemoBudgets())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  return { budgets, loading, refetch: fetchBudgets }
}

export function useAuth() {
  const [user, setUser] = useState<any>(DEMO_USER)
  const [isDemo, setIsDemo] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user: sbUser } } = await supabase.auth.getUser()
        if (sbUser) {
          setUser(sbUser)
          setIsDemo(false)
        } else {
          setUser(DEMO_USER)
          setIsDemo(true)
        }
      } catch {
        setUser(DEMO_USER)
        setIsDemo(true)
      }
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user)
        setIsDemo(false)
      } else {
        setUser(DEMO_USER)
        setIsDemo(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, isDemo, loading }
}
