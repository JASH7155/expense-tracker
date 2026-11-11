'use client'

import { Category, ExpenseWithCategory, Budget } from '@/types/database'
import { DEFAULT_CATEGORIES } from './utils'

export const DEMO_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@expenseiq.local',
  user_metadata: { name: 'Demo User' },
}

const STORAGE_KEYS = {
  CATEGORIES: 'expenseiq_demo_categories',
  EXPENSES: 'expenseiq_demo_expenses',
  BUDGETS: 'expenseiq_demo_budgets',
  INITIALIZED: 'expenseiq_demo_initialized_v2',
}

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return true
  // Check if explicitly logged in with Supabase session or if in demo
  const supabaseSession = window.localStorage.getItem('sb-placeholder-auth-token')
  return !supabaseSession
}

function getInitialCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((cat, index) => ({
    id: `cat-${index + 1}`,
    user_id: DEMO_USER.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    is_default: true,
    created_at: new Date().toISOString(),
  }))
}

function getInitialExpenses(categories: Category[]): ExpenseWithCategory[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const currentDay = Math.min(now.getDate(), 28)

  const catMap = new Map(categories.map(c => [c.name, c]))

  const rawSample = [
    { desc: 'Swiggy Dinner - Biryani & Coke', amount: 480, cat: 'Food & Dining', day: Math.max(1, currentDay), method: 'upi', tags: ['food', 'weekend'] },
    { desc: 'Uber Ride to Office', amount: 260, cat: 'Transport', day: Math.max(1, currentDay - 1), method: 'upi', tags: ['commute'] },
    { desc: 'Monthly Apartment Rent', amount: 18000, cat: 'Housing', day: 1, method: 'netbanking', isRecurring: true, tags: ['essential', 'rent'] },
    { desc: 'Blinkit Grocery Order', amount: 1450, cat: 'Food & Dining', day: Math.max(1, currentDay - 2), method: 'upi', tags: ['groceries'] },
    { desc: 'Netflix Subscription', amount: 649, cat: 'Entertainment', day: 5, method: 'card', isRecurring: true, tags: ['subscription'] },
    { desc: 'Electricity Bill', amount: 1850, cat: 'Utilities', day: 7, method: 'upi', isRecurring: true, tags: ['bills'] },
    { desc: 'Petrol - Full Tank', amount: 2100, cat: 'Transport', day: Math.max(1, currentDay - 4), method: 'card', tags: ['fuel'] },
    { desc: 'Amazon - Noise Cancelling Headphones', amount: 3499, cat: 'Shopping', day: Math.max(1, currentDay - 5), method: 'card', tags: ['electronics'] },
    { desc: 'Apollo Pharmacy - Vitamins & First Aid', amount: 540, cat: 'Health', day: Math.max(1, currentDay - 6), method: 'upi', tags: ['health'] },
    { desc: 'Starbucks Coffee & Sandwich', amount: 420, cat: 'Food & Dining', day: Math.max(1, currentDay - 3), method: 'upi', tags: ['coffee'] },
    { desc: 'SIP Mutual Fund Investment', amount: 5000, cat: 'Investments', day: 10, method: 'netbanking', isRecurring: true, tags: ['investment', 'sip'] },
  ]

  return rawSample.map((item, idx) => {
    const dayStr = String(item.day).padStart(2, '0')
    const category = catMap.get(item.cat) || null
    return {
      id: `exp-${idx + 1}-${Date.now()}`,
      user_id: DEMO_USER.id,
      amount: item.amount,
      description: item.desc,
      category_id: category?.id || null,
      date: `${year}-${month}-${dayStr}`,
      payment_method: item.method,
      tags: item.tags,
      is_recurring: item.isRecurring || false,
      notes: null,
      created_at: new Date().toISOString(),
      categories: category,
    }
  })
}

function getInitialBudgets(categories: Category[]): Budget[] {
  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const foodCat = categories.find(c => c.name === 'Food & Dining')
  const transportCat = categories.find(c => c.name === 'Transport')
  const shoppingCat = categories.find(c => c.name === 'Shopping')

  const list: Budget[] = [
    {
      id: 'b-overall',
      user_id: DEMO_USER.id,
      category_id: null,
      amount: 40000,
      month: monthStr,
      created_at: new Date().toISOString(),
    },
  ]

  if (foodCat) {
    list.push({
      id: 'b-food',
      user_id: DEMO_USER.id,
      category_id: foodCat.id,
      amount: 8000,
      month: monthStr,
      created_at: new Date().toISOString(),
    })
  }

  if (transportCat) {
    list.push({
      id: 'b-transport',
      user_id: DEMO_USER.id,
      category_id: transportCat.id,
      amount: 4000,
      month: monthStr,
      created_at: new Date().toISOString(),
    })
  }

  if (shoppingCat) {
    list.push({
      id: 'b-shopping',
      user_id: DEMO_USER.id,
      category_id: shoppingCat.id,
      amount: 5000,
      month: monthStr,
      created_at: new Date().toISOString(),
    })
  }

  return list
}

export function initDemoStorage(): void {
  if (typeof window === 'undefined') return
  const isInit = window.localStorage.getItem(STORAGE_KEYS.INITIALIZED)
  if (!isInit) {
    const categories = getInitialCategories()
    const expenses = getInitialExpenses(categories)
    const budgets = getInitialBudgets(categories)

    window.localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories))
    window.localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses))
    window.localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets))
    window.localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true')
  }
}

export function getDemoCategories(): Category[] {
  if (typeof window === 'undefined') return getInitialCategories()
  initDemoStorage()
  const data = window.localStorage.getItem(STORAGE_KEYS.CATEGORIES)
  return data ? JSON.parse(data) : getInitialCategories()
}

export function getDemoExpenses(filters?: {
  startDate?: string
  endDate?: string
  categoryId?: string
  paymentMethod?: string
  search?: string
}): ExpenseWithCategory[] {
  if (typeof window === 'undefined') return []
  initDemoStorage()
  const data = window.localStorage.getItem(STORAGE_KEYS.EXPENSES)
  let list: ExpenseWithCategory[] = data ? JSON.parse(data) : []

  if (filters?.startDate) {
    list = list.filter(e => e.date >= filters.startDate!)
  }
  if (filters?.endDate) {
    list = list.filter(e => e.date <= filters.endDate!)
  }
  if (filters?.categoryId) {
    list = list.filter(e => e.category_id === filters.categoryId)
  }
  if (filters?.paymentMethod) {
    list = list.filter(e => e.payment_method === filters.paymentMethod)
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    list = list.filter(e => e.description.toLowerCase().includes(q))
  }

  return list.sort((a, b) => b.date.localeCompare(a.date))
}

export function addDemoExpense(expense: Omit<ExpenseWithCategory, 'id' | 'created_at' | 'user_id'>): ExpenseWithCategory {
  initDemoStorage()
  const list = getDemoExpenses()
  const categories = getDemoCategories()
  const matchedCategory = categories.find(c => c.id === expense.category_id) || null

  const newExpense: ExpenseWithCategory = {
    ...expense,
    id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    user_id: DEMO_USER.id,
    created_at: new Date().toISOString(),
    categories: matchedCategory,
  }

  const updated = [newExpense, ...list]
  window.localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updated))
  return newExpense
}

export function updateDemoExpense(id: string, updates: Partial<ExpenseWithCategory>): void {
  initDemoStorage()
  const list = getDemoExpenses()
  const categories = getDemoCategories()
  const updated = list.map(exp => {
    if (exp.id === id) {
      const catId = updates.category_id !== undefined ? updates.category_id : exp.category_id
      const matchedCategory = catId ? categories.find(c => c.id === catId) || null : null
      return {
        ...exp,
        ...updates,
        categories: matchedCategory,
      }
    }
    return exp
  })
  window.localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updated))
}

export function deleteDemoExpense(id: string): void {
  initDemoStorage()
  const list = getDemoExpenses()
  const updated = list.filter(exp => exp.id !== id)
  window.localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updated))
}

export function getDemoBudgets(): Budget[] {
  if (typeof window === 'undefined') return []
  initDemoStorage()
  const data = window.localStorage.getItem(STORAGE_KEYS.BUDGETS)
  return data ? JSON.parse(data) : []
}

export function saveDemoBudgets(newBudgets: Array<{ category_id: string | null; amount: number; month: string }>): void {
  initDemoStorage()
  const current = getDemoBudgets()
  const updated = [...current]

  for (const nb of newBudgets) {
    const existingIndex = updated.findIndex(
      b => b.category_id === nb.category_id && b.month === nb.month
    )
    if (existingIndex >= 0) {
      updated[existingIndex].amount = nb.amount
    } else {
      updated.push({
        id: `budget-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        user_id: DEMO_USER.id,
        category_id: nb.category_id,
        amount: nb.amount,
        month: nb.month,
        created_at: new Date().toISOString(),
      })
    }
  }

  window.localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(updated))
}

export function resetDemoData(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEYS.INITIALIZED)
  window.localStorage.removeItem(STORAGE_KEYS.CATEGORIES)
  window.localStorage.removeItem(STORAGE_KEYS.EXPENSES)
  window.localStorage.removeItem(STORAGE_KEYS.BUDGETS)
  initDemoStorage()
}
