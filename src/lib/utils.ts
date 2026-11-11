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

// Tailored categories for young professionals / living with parents
export const DEFAULT_CATEGORIES = [
  { name: 'Food Outings & Cafes', icon: '🍔', color: '#f97316' },
  { name: 'Commute & Fuel', icon: '🛵', color: '#3b82f6' },
  { name: 'Shopping & Tech', icon: '🛍️', color: '#a855f7' },
  { name: 'Entertainment & Outings', icon: '🎬', color: '#ec4899' },
  { name: 'Autopays & Subscriptions', icon: '⚡', color: '#06b6d4' },
  { name: 'Savings & Investments', icon: '💰', color: '#22c55e' },
  { name: 'Family Treats & Gifts', icon: '🎁', color: '#f43f5e' },
  { name: 'Personal Care & Health', icon: '💊', color: '#ef4444' },
  { name: 'Learning & Courses', icon: '📚', color: '#f59e0b' },
  { name: 'Trips & Travel', icon: '🌴', color: '#14b8a6' },
  { name: 'Home Contributions', icon: '🏠', color: '#64748b' },
  { name: 'Miscellaneous', icon: '🏷️', color: '#6b7280' },
] as const
