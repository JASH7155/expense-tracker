'use client'

import { supabase } from './supabase'
import { DEFAULT_CATEGORIES } from './utils'
import { Category } from '@/types/database'

/**
 * Safely merges and cleans up legacy/duplicate categories for the logged-in user:
 * 1. Ensures the 8 simple core categories exist.
 * 2. Re-assigns existing expenses from legacy categories (e.g. "Food Outings & Cafes" -> "Food & Dining").
 * 3. Removes the duplicate/legacy categories from Supabase.
 */
export async function cleanAndResetCategories(userId: string): Promise<boolean> {
  if (!userId) return false

  // 1. Fetch current categories for user
  const { data: existingCats, error: fetchErr } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)

  if (fetchErr || !existingCats) return false

  const existingMap = new Map<string, Category>()
  existingCats.forEach((c) => existingMap.set(c.name.toLowerCase().trim(), c))

  // 2. Ensure each of the 8 default categories exists
  const targetMap = new Map<string, string>() // target name -> target id

  for (const def of DEFAULT_CATEGORIES) {
    const key = def.name.toLowerCase().trim()
    let cat = existingMap.get(key)
    if (!cat) {
      const { data: newCat, error: insertErr } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          name: def.name,
          icon: def.icon,
          color: def.color,
          is_default: true,
        })
        .select()
        .single()

      if (!insertErr && newCat) {
        cat = newCat as Category
      }
    }
    if (cat) {
      targetMap.set(def.name, cat.id)
    }
  }

  // 3. Mapping of legacy category names to new clean category name
  const migrationRules: Record<string, string> = {
    'food outings & cafes': 'Food & Dining',
    'commute & fuel': 'Commute & Travel',
    'transport': 'Commute & Travel',
    'travel': 'Commute & Travel',
    'trips & travel': 'Commute & Travel',
    'shopping & tech': 'Shopping',
    'entertainment & outings': 'Entertainment',
    'autopays & subscriptions': 'Subscriptions',
    'utilities': 'Subscriptions',
    'investments': 'Investments & Savings',
    'savings & investments': 'Investments & Savings',
    'family treats & gifts': 'Family & Gifts',
    'gifts': 'Family & Gifts',
    'housing': 'Other',
    'home contributions': 'Other',
    'health': 'Other',
    'personal care & health': 'Other',
    'education': 'Other',
    'learning & courses': 'Other',
    'miscellaneous': 'Other',
  }

  // 4. Reassign expenses & delete old categories
  for (const [legacyNameLower, newCategoryName] of Object.entries(migrationRules)) {
    const oldCat = existingMap.get(legacyNameLower)
    const newCatId = targetMap.get(newCategoryName)

    if (oldCat && newCatId && oldCat.id !== newCatId) {
      // Reassign expenses
      await supabase
        .from('expenses')
        .update({ category_id: newCatId })
        .eq('category_id', oldCat.id)

      // Reassign budgets
      await supabase
        .from('budgets')
        .update({ category_id: newCatId })
        .eq('category_id', oldCat.id)

      // Delete the old redundant category
      await supabase
        .from('categories')
        .delete()
        .eq('id', oldCat.id)
    }
  }

  return true
}
