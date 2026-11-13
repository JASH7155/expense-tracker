import { Expense, ExpenseWithCategory } from '@/types/database'

export type TransactionType = 'expense' | 'income' | 'lend'
export type DueStatus = 'due' | 'settled'

export const INCOME_CATEGORIES = [
  { id: 'inc_salary', name: 'Salary', icon: '💼', color: '#10b981' },
  { id: 'inc_freelance', name: 'Freelance & Consulting', icon: '💻', color: '#06b6d4' },
  { id: 'inc_investments', name: 'Investments & Dividends', icon: '📈', color: '#8b5cf6' },
  { id: 'inc_rental', name: 'Rental & Real Estate', icon: '🏠', color: '#f59e0b' },
  { id: 'inc_cashback', name: 'Refunds & Cashbacks', icon: '🎁', color: '#ec4899' },
  { id: 'inc_other', name: 'Other Inflow', icon: '💵', color: '#64748b' },
] as const

export interface FriendDueInfo {
  friendName: string
  dueStatus: DueStatus
}

/**
 * Extracts transaction type ('expense' | 'income' | 'lend')
 * Looks in item.type, or tag 'type:income' / 'type:lend', or category indicators
 */
export function getTransactionType(item: any): TransactionType {
  if (item.type === 'income' || item.type === 'lend' || item.type === 'expense') {
    return item.type
  }

  const tags: string[] = Array.isArray(item.tags) ? item.tags : []
  for (const t of tags) {
    if (t === 'type:income') return 'income'
    if (t === 'type:lend') return 'lend'
  }

  // Check if description or category name matches income
  const catName = item.categories?.name?.toLowerCase() || ''
  if (catName.includes('salary') || catName.includes('income')) {
    return 'income'
  }

  return 'expense'
}

/**
 * Extracts bank account name, e.g. from item.bank_account or tag 'bank:HDFC Bank'
 */
export function getBankAccount(item: any): string | null {
  if (item.bank_account) return item.bank_account
  const tags: string[] = Array.isArray(item.tags) ? item.tags : []
  for (const t of tags) {
    if (t.startsWith('bank:')) {
      return t.replace('bank:', '').trim()
    }
  }
  return null
}

/**
 * Extracts friend lending info
 */
export function getFriendDueInfo(item: any): FriendDueInfo | null {
  const type = getTransactionType(item)
  if (type !== 'lend') return null

  let friendName = item.friend_name || ''
  let dueStatus: DueStatus = item.due_status || 'due'

  const tags: string[] = Array.isArray(item.tags) ? item.tags : []
  for (const t of tags) {
    if (t.startsWith('friend:')) {
      friendName = t.replace('friend:', '').trim()
    }
    if (t === 'due_status:settled') {
      dueStatus = 'settled'
    } else if (t === 'due_status:due') {
      dueStatus = 'due'
    }
  }

  if (!friendName) {
    // Try to guess from description e.g. "Lent to Rahul"
    const match = item.description?.match(/lent to\s+([a-zA-Z0-9_\s]+)/i)
    friendName = match ? match[1].trim() : 'Friend'
  }

  return { friendName, dueStatus }
}

/**
 * Builds tags array for a transaction
 */
export function buildTransactionTags(params: {
  type: TransactionType
  bankAccount?: string | null
  friendName?: string | null
  dueStatus?: DueStatus
  isAutopay?: boolean
  customTags?: string[]
}): string[] {
  const tags: string[] = []

  if (params.type === 'income') {
    tags.push('type:income')
  } else if (params.type === 'lend') {
    tags.push('type:lend')
    if (params.friendName) {
      tags.push(`friend:${params.friendName.trim()}`)
    }
    tags.push(`due_status:${params.dueStatus || 'due'}`)
  }

  if (params.bankAccount) {
    tags.push(`bank:${params.bankAccount.trim()}`)
  }

  if (params.isAutopay) {
    tags.push('⚡ Autopay')
  }

  if (params.customTags) {
    for (const t of params.customTags) {
      const clean = t.trim().replace(/^#/, '')
      if (clean && !tags.includes(clean)) {
        tags.push(clean)
      }
    }
  }

  return tags
}
