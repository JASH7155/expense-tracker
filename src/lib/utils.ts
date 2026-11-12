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

// Tailored categories for young professionals / living with parents (Minimal, elegant palette)
export const DEFAULT_CATEGORIES = [
  { name: 'Food Outings & Cafes', icon: '🍔', color: '#71717a' },
  { name: 'Commute & Fuel', icon: '🛵', color: '#64748b' },
  { name: 'Shopping & Tech', icon: '🛍️', color: '#78716c' },
  { name: 'Entertainment & Outings', icon: '🎬', color: '#52525b' },
  { name: 'Autopays & Subscriptions', icon: '⚡', color: '#475569' },
  { name: 'Savings & Investments', icon: '💰', color: '#3f3f46' },
  { name: 'Family Treats & Gifts', icon: '🎁', color: '#737373' },
  { name: 'Personal Care & Health', icon: '💊', color: '#6b7280' },
  { name: 'Learning & Courses', icon: '📚', color: '#525252' },
  { name: 'Trips & Travel', icon: '🌴', color: '#57534e' },
  { name: 'Home Contributions', icon: '🏠', color: '#64748b' },
  { name: 'Miscellaneous', icon: '🏷️', color: '#71717a' },
] as const
