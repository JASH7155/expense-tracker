'use client'

import { supabase } from './supabase'
import { DEFAULT_CATEGORIES } from './utils'
import { Category } from '@/types/database'

/**
 * Safely merges and cleans up legacy/duplicate categories for the logged-in user:
 * 1. Ensures the 8 simple core categories exist.
 * 2. Re-assigns existing expenses & budgets from legacy categories into the 8 core categories.
 * 3. Removes duplicate and legacy categories from Supabase.
 */
export async function cleanAndResetCategories(userId: string): Promise<boolean> {
  if (!userId) return false

  try {
    // 1. Fetch all current categories for the user
    const { data: existingCats, error: fetchErr } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)

    if (fetchErr || !existingCats) return false

    // Map by lowercase trimmed name. If duplicates exist, store list
    const nameToCats = new Map<string, Category[]>()
    for (const cat of existingCats) {
      const key = cat.name.toLowerCase().trim()
      const list = nameToCats.get(key) || []
      list.push(cat)
      nameToCats.set(key, list)
    }

    // 2. Ensure each of the 8 default categories exists
    const canonicalMap = new Map<string, string>() // target name -> target id

    for (const def of DEFAULT_CATEGORIES) {
      const key = def.name.toLowerCase().trim()
      const matches = nameToCats.get(key)
      let cat = matches && matches.length > 0 ? matches[0] : null

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
        canonicalMap.set(def.name, cat.id)
      }
    }

    // 3. Mapping of legacy/duplicate category names to the target canonical name
    const legacyMapping: Record<string, string> = {
      // Food
      'food outings & cafes': 'Food & Dining',
      'food & dining': 'Food & Dining',
      // Commute
      'commute & fuel': 'Commute & Travel',
      'transport': 'Commute & Travel',
      'travel': 'Commute & Travel',
      'trips & travel': 'Commute & Travel',
      'commute & travel': 'Commute & Travel',
      // Shopping
      'shopping & tech': 'Shopping',
      'shopping': 'Shopping',
      // Entertainment
      'entertainment & outings': 'Entertainment',
      'entertainment': 'Entertainment',
      // Subscriptions
      'autopays & subscriptions': 'Subscriptions',
      'utilities': 'Subscriptions',
      'subscriptions': 'Subscriptions',
      // Investments
      'investments': 'Investments & Savings',
      'savings & investments': 'Investments & Savings',
      'investments & savings': 'Investments & Savings',
      // Family & Gifts
      'family treats & gifts': 'Family & Gifts',
      'gifts': 'Family & Gifts',
      'family & gifts': 'Family & Gifts',
      // Other
      'housing': 'Other',
      'home contributions': 'Other',
      'health': 'Other',
      'personal care & health': 'Other',
      'education': 'Other',
      'learning & courses': 'Other',
      'miscellaneous': 'Other',
      'other': 'Other',
    }

    // 4. Identify all categories that need to be merged and deleted
    const idsToDelete = new Set<string>()

    for (const cat of existingCats) {
      const key = cat.name.toLowerCase().trim()
      const targetName = legacyMapping[key]

      if (targetName) {
        const targetId = canonicalMap.get(targetName)
        if (targetId && cat.id !== targetId) {
          // Reassign expenses safely
          await supabase
            .from('expenses')
            .update({ category_id: targetId })
            .eq('category_id', cat.id)

          // Reassign budgets safely (check conflict on month)
          const { data: oldBudgets } = await supabase
            .from('budgets')
            .select('id, month')
            .eq('category_id', cat.id)

          if (oldBudgets && oldBudgets.length > 0) {
            for (const ob of oldBudgets) {
              const { data: conflict } = await supabase
                .from('budgets')
                .select('id')
                .eq('category_id', targetId)
                .eq('month', ob.month)
                .maybeSingle()

              if (conflict) {
                await supabase.from('budgets').delete().eq('id', ob.id)
              } else {
                await supabase.from('budgets').update({ category_id: targetId }).eq('id', ob.id)
              }
            }
          }

          idsToDelete.add(cat.id)
        }
      }
    }

    // 5. Delete all merged/redundant category IDs in one batch
    if (idsToDelete.size > 0) {
      await supabase
        .from('categories')
        .delete()
        .in('id', Array.from(idsToDelete))
    }

    return true
  } catch (err) {
    console.error('Category cleanup error:', err)
    return false
  }
}
