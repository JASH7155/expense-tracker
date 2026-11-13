import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function getMonthDateRange(year: number, month: number) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export function getCurrentMonthRange() {
  const now = new Date()
  return getMonthDateRange(now.getFullYear(), now.getMonth())
}

export function getMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI', icon: '📱' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'netbanking', label: 'Net Banking', icon: '🏦' },
  { value: 'other', label: 'Other', icon: '🔄' },
] as const

export const AUTOPAY_FREQUENCIES = [
  { value: 'daily', label: 'Daily (Every day)', icon: '📅' },
  { value: 'monthly', label: 'Monthly (SIP / Subscription / EMI)', icon: '🔄' },
  { value: 'weekly', label: 'Weekly', icon: '🗓️' },
  { value: 'yearly', label: 'Yearly (Annual renewal)', icon: '📆' },
] as const

// Simple, clean core categories with distinct, vibrant colors
export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#f97316' },        // Orange
  { name: 'Commute & Travel', icon: '🛵', color: '#3b82f6' },     // Blue
  { name: 'Shopping', icon: '🛍️', color: '#8b5cf6' },             // Purple
  { name: 'Entertainment', icon: '🎬', color: '#ec4899' },        // Pink
  { name: 'Subscriptions', icon: '⚡', color: '#06b6d4' },        // Cyan
  { name: 'Investments & Savings', icon: '💰', color: '#10b981' },// Emerald
  { name: 'Family & Gifts', icon: '🎁', color: '#f43f5e' },       // Rose
  { name: 'Other', icon: '🏷️', color: '#64748b' },                // Slate
] as const

export const CATEGORY_COLOR_MAP: Record<string, string> = {
  'food & dining': '#f97316',
  'commute & travel': '#3b82f6',
  'shopping': '#8b5cf6',
  'entertainment': '#ec4899',
  'subscriptions': '#06b6d4',
  'investments & savings': '#10b981',
  'family & gifts': '#f43f5e',
  'other': '#64748b',
}

export const DISTINCT_PALETTE = [
  '#f97316', '#3b82f6', '#8b5cf6', '#10b981',
  '#ec4899', '#06b6d4', '#f43f5e', '#eab308',
  '#14b8a6', '#6366f1', '#a855f7', '#84cc16'
]

export function getCategoryColor(name: string, fallbackColor?: string, index = 0): string {
  const key = name.toLowerCase().trim()
  if (CATEGORY_COLOR_MAP[key]) return CATEGORY_COLOR_MAP[key]
  if (fallbackColor && fallbackColor !== '#71717a' && fallbackColor !== '#6b7280') {
    return fallbackColor
  }
  return DISTINCT_PALETTE[index % DISTINCT_PALETTE.length]
}
