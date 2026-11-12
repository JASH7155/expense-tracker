'use client'

import { supabase } from './supabase'
import { ExpenseWithCategory } from '@/types/database'

function getLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getNextDate(currentDateStr: string, frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
  const d = parseLocalDate(currentDateStr)
  if (frequency === 'daily') {
    d.setDate(d.getDate() + 1)
  } else if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7)
  } else if (frequency === 'monthly') {
    d.setMonth(d.getMonth() + 1)
  } else if (frequency === 'yearly') {
    d.setFullYear(d.getFullYear() + 1)
  }
  return formatLocalDate(d)
}

/**
 * Automatically syncs recurring autopays:
 * If an autopay started on Nov 1st and is marked daily,
 * it generates records for Nov 2nd, Nov 3rd... up to today.
 * Each auto-created record has tag "⚡ Autopay" and "auto-generated".
 */
export async function syncAutopays(userId: string): Promise<number> {
  if (!userId) return 0

  const todayStr = getLocalDateString()

  // 1. Fetch all recurring / autopay expenses for this user
  const { data: recurringData, error: recError } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .or('is_autopay.eq.true,is_recurring.eq.true')
    .not('recurring_frequency', 'is', null)
    .order('date', { ascending: true })

  if (recError || !recurringData || recurringData.length === 0) {
    return 0
  }

  // Group recurring items by (description + amount + frequency) to find the master (earliest)
  const mastersMap = new Map<string, typeof recurringData[0]>()
  for (const item of recurringData) {
    const key = `${item.description.trim().toLowerCase()}__${item.amount}__${item.recurring_frequency}`
    if (!mastersMap.has(key)) {
      mastersMap.set(key, item)
    }
  }

  // 2. Fetch all existing dates for this user's expenses
  const { data: allUserExpenses, error: allErr } = await supabase
    .from('expenses')
    .select('description, amount, date')
    .eq('user_id', userId)

  if (allErr || !allUserExpenses) return 0

  const existingMap = new Set<string>()
  for (const exp of allUserExpenses) {
    existingMap.add(`${exp.description.trim().toLowerCase()}__${exp.date}`)
  }

  const toInsert: any[] = []

  // 3. For each master autopay, generate missing occurrences up to today
  for (const master of Array.from(mastersMap.values())) {
    const freq = master.recurring_frequency as 'daily' | 'weekly' | 'monthly' | 'yearly'
    if (!freq) continue

    let curDate = getNextDate(master.date, freq)
    let count = 0
    const MAX_OCCURRENCES = 90 // Safety cap

    while (curDate <= todayStr && count < MAX_OCCURRENCES) {
      const existKey = `${master.description.trim().toLowerCase()}__${curDate}`
      if (!existingMap.has(existKey)) {
        const cleanTags = Array.from(
          new Set([...(master.tags || []), '⚡ Autopay', 'auto-generated'])
        )

        toInsert.push({
          user_id: userId,
          amount: master.amount,
          description: master.description,
          category_id: master.category_id,
          date: curDate,
          payment_method: master.payment_method || 'upi',
          tags: cleanTags,
          is_recurring: true,
          recurring_frequency: freq,
          is_autopay: true,
          notes: master.notes
            ? `${master.notes} · Auto-deducted`
            : `Auto-deducted via recurring ${freq} autopay`,
        })

        // Mark as existing in our local set so we don't duplicate within the same loop
        existingMap.add(existKey)
      }

      curDate = getNextDate(curDate, freq)
      count++
    }
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from('expenses').insert(toInsert)
    if (insertErr) {
      console.error('Failed to sync autopays:', insertErr)
      return 0
    }
    return toInsert.length
  }

  return 0
}
