'use client'

import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { Category, Expense, Budget, ExpenseWithCategory } from '@/types/database'
import { getCurrentMonthRange } from './utils'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (!error && data) setCategories(data)
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

  useEffect(() => {
    async function fetchExpenses() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
      if (!error && data) setExpenses(data as unknown as ExpenseWithCategory[])
      setLoading(false)
    }
    fetchExpenses()
  }, [filters?.startDate, filters?.endDate, filters?.categoryId, filters?.paymentMethod, filters?.search])

  const refetch = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('expenses')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (filters?.startDate) query = query.gte('date', filters.startDate)
    if (filters?.endDate) query = query.lte('date', filters.endDate)

    const { data, error } = await query
    if (!error && data) setExpenses(data as unknown as ExpenseWithCategory[])
    setLoading(false)
  }

  return { expenses, loading, refetch }
}

export function useMonthlyExpenses() {
  const { start, end } = getCurrentMonthRange()
  return useExpenses({ startDate: start, endDate: end })
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBudgets() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', month)

      if (!error && data) setBudgets(data)
      setLoading(false)
    }
    fetchBudgets()
  }, [])

  return { budgets, loading }
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
