'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export interface UserSettings {
  salary_cycle_day: number // 1 to 31 (default 28)
  bank_accounts: string[]
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  salary_cycle_day: 28, // Matches user's salary cycle on 28th of month
  bank_accounts: [
    'HDFC Bank',
    'State Bank of India (SBI)',
    'ICICI Bank',
    'Cash',
    'Paytm / Wallet',
  ],
}

export const POPULAR_INDIAN_BANKS = [
  'HDFC Bank',
  'State Bank of India (SBI)',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Bank of Baroda',
  'Punjab National Bank (PNB)',
  'Canara Bank',
  'IndusInd Bank',
  'Federal Bank',
  'IDFC FIRST Bank',
  'Paytm Payments Bank / Wallet',
  'CRED / UPI',
  'Cash',
]

/**
 * Calculates the exact date window for the user's salary cycle.
 * For example, if cycleDay is 28:
 * - If referenceDate is 13 Nov 2026: cycle runs from 28 Oct 2026 to 27 Nov 2026.
 * - If referenceDate is 29 Nov 2026: cycle runs from 28 Nov 2026 to 27 Dec 2026.
 */
export function getSalaryCycleRange(cycleDay: number = 28, referenceDate: Date = new Date()) {
  const safeDay = Math.max(1, Math.min(31, cycleDay))

  if (safeDay === 1) {
    // Standard calendar month (1st to last day of month)
    const year = referenceDate.getFullYear()
    const month = referenceDate.getMonth()
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    return {
      startDate: formatDateIso(start),
      endDate: formatDateIso(end),
      label: `${start.toLocaleDateString('en-IN', { month: 'short' })} 1 – ${end.getDate()} ${end.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`,
      cycleDay: 1,
      isStandardMonth: true,
    }
  }

  const currentYear = referenceDate.getFullYear()
  const currentMonth = referenceDate.getMonth()
  const currentDate = referenceDate.getDate()

  let startYear = currentYear
  let startMonth = currentMonth
  let endYear = currentYear
  let endMonth = currentMonth

  if (currentDate >= safeDay) {
    // We are currently on or after the salary day this month (e.g., Nov 28+)
    // Cycle starts on Nov 28 and ends on Dec 27
    startMonth = currentMonth
    endMonth = currentMonth + 1
    if (endMonth > 11) {
      endMonth = 0
      endYear += 1
    }
  } else {
    // We are before the salary day this month (e.g., Nov 13 with cycleDay 28)
    // Cycle started on Oct 28 and ends on Nov 27
    startMonth = currentMonth - 1
    if (startMonth < 0) {
      startMonth = 11
      startYear -= 1
    }
    endMonth = currentMonth
  }

  // Handle months with fewer days (e.g. Feb)
  const maxStartDays = new Date(startYear, startMonth + 1, 0).getDate()
  const actualStartDay = Math.min(safeDay, maxStartDays)
  const startDate = new Date(startYear, startMonth, actualStartDay)

  // End date is 1 day before the next cycle start
  const maxEndDays = new Date(endYear, endMonth + 1, 0).getDate()
  const nextCycleStartDay = Math.min(safeDay, maxEndDays)
  const nextCycleStart = new Date(endYear, endMonth, nextCycleStartDay)
  const endDate = new Date(nextCycleStart.getTime() - 24 * 60 * 60 * 1000)

  const label = `${startDate.getDate()} ${startDate.toLocaleDateString('en-IN', { month: 'short' })} – ${endDate.getDate()} ${endDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`

  return {
    startDate: formatDateIso(startDate),
    endDate: formatDateIso(endDate),
    label,
    cycleDay: safeDay,
    isStandardMonth: false,
  }
}

function formatDateIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const STORAGE_KEY = 'expenseiq_user_settings'

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS)
  const [loading, setLoading] = useState(true)

  // Load from localStorage first, then sync with Supabase user_metadata
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        setSettings({ ...DEFAULT_USER_SETTINGS, ...JSON.parse(cached) })
      }
    } catch {}

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.settings) {
        const remoteSettings = { ...DEFAULT_USER_SETTINGS, ...user.user_metadata.settings }
        setSettings(remoteSettings)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteSettings))
        } catch {}
      }
      setLoading(false)
    })
  }, [])

  const saveSettings = useCallback(async (newSettings: UserSettings) => {
    setSettings(newSettings)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
    } catch {}

    try {
      await supabase.auth.updateUser({
        data: { settings: newSettings },
      })
    } catch (err) {
      console.warn('Failed to sync settings to Supabase user_metadata:', err)
    }
  }, [])

  const updateSalaryCycleDay = useCallback(async (day: number) => {
    const validDay = Math.max(1, Math.min(31, Math.floor(day)))
    const updated = { ...settings, salary_cycle_day: validDay }
    await saveSettings(updated)
  }, [settings, saveSettings])

  const addBankAccount = useCallback(async (accountName: string) => {
    const trimmed = accountName.trim()
    if (!trimmed || settings.bank_accounts.includes(trimmed)) return
    const updated = { ...settings, bank_accounts: [...settings.bank_accounts, trimmed] }
    await saveSettings(updated)
  }, [settings, saveSettings])

  const removeBankAccount = useCallback(async (accountName: string) => {
    const updated = {
      ...settings,
      bank_accounts: settings.bank_accounts.filter(a => a !== accountName),
    }
    await saveSettings(updated)
  }, [settings, saveSettings])

  return {
    settings,
    loading,
    updateSalaryCycleDay,
    addBankAccount,
    removeBankAccount,
    saveSettings,
  }
}
