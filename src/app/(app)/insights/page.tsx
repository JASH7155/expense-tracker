'use client'

import { useMemo } from 'react'
import { useMonthlyExpenses, useBudgets } from '@/lib/hooks'
import { formatCurrency, getMonthLabel } from '@/lib/utils'

function InsightCard({ icon, title, description, type }: {
  icon: string
  title: string
  description: string
  type: 'info' | 'warning' | 'success' | 'tip'
}) {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    success: 'bg-green-500/10 border-green-500/30 text-green-300',
    tip: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
  }
  return (
    <div className={`border rounded-xl p-5 ${styles[type]}`}>
      <div className="flex gap-3">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div>
          <p className="font-semibold mb-1">{title}</p>
          <p className="text-sm opacity-80 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}

export default function InsightsPage() {
  const { expenses } = useMonthlyExpenses()
  const { budgets } = useBudgets()
  const now = new Date()

  const insights = useMemo(() => {
    const results: Array<{
      icon: string
      title: string
      description: string
      type: 'info' | 'warning' | 'success' | 'tip'
    }> = []

    if (expenses.length === 0) return results

    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
    const avgDaily = totalSpent / (now.getDate() || 1)

    // Category analysis
    const byCategory: Record<string, { name: string; total: number; count: number; icon: string }> = {}
    for (const exp of expenses) {
      const key = exp.category_id || 'misc'
      if (!byCategory[key]) {
        byCategory[key] = {
          name: exp.categories?.name || 'Misc',
          total: 0,
          count: 0,
          icon: exp.categories?.icon || '🏷️',
        }
      }
      byCategory[key].total += exp.amount
      byCategory[key].count++
    }

    const topCategory = Object.values(byCategory).sort((a, b) => b.total - a.total)[0]
    if (topCategory) {
      const percent = ((topCategory.total / totalSpent) * 100).toFixed(0)
      results.push({
        icon: topCategory.icon,
        title: `${topCategory.name} is your biggest spend`,
        description: `You've spent ${formatCurrency(topCategory.total)} on ${topCategory.name} this month — that's ${percent}% of your total spending.`,
        type: parseInt(percent) > 40 ? 'warning' : 'info',
      })
    }

    // Living with Parents financial superpower insight
    const rentOrBills = expenses.filter(e => {
      const name = (e.categories?.name || '').toLowerCase()
      const desc = e.description.toLowerCase()
      return desc.includes('rent') || desc.includes('electricity') || desc.includes('eb bill') || desc.includes('water bill') || name.includes('rent')
    })
    const savingsExp = expenses.filter(e => {
      const name = (e.categories?.name || '').toLowerCase()
      return name.includes('saving') || name.includes('invest') || e.description.toLowerCase().includes('sip') || e.description.toLowerCase().includes('mutual fund')
    })
    const totalSavings = savingsExp.reduce((s, e) => s + e.amount, 0)
    const savingsRate = totalSpent > 0 ? Math.round((totalSavings / (totalSpent + totalSavings)) * 100) : 0

    if (rentOrBills.length === 0) {
      results.push({
        icon: '🏡',
        title: 'Living with Parents Advantage',
        description: `Zero rent & zero household utility bills detected! This gives you a superpower to direct 40–50%+ of your income into Savings, SIPs, or Emergency Funds. ${totalSavings > 0 ? `You've allocated ${formatCurrency(totalSavings)} to investments this month.` : 'Tip: Set up an auto-debit SIP right after payday!'}`,
        type: 'success',
      })
    }

    // Autopays breakdown: Daily vs Monthly
    const autopayExpenses = expenses.filter(e => e.is_autopay || e.is_recurring)
    if (autopayExpenses.length > 0) {
      const dailyAutopays = autopayExpenses.filter(e => e.recurring_frequency === 'daily')
      const monthlyAutopays = autopayExpenses.filter(e => e.recurring_frequency === 'monthly')
      const dailySum = dailyAutopays.reduce((s, e) => s + e.amount, 0)
      const monthlySum = monthlyAutopays.reduce((s, e) => s + e.amount, 0)
      const projectedDaily = dailySum * 30

      results.push({
        icon: '⚡',
        title: `${autopayExpenses.length} Autopays & Recurring Deductions`,
        description: `You have ${dailyAutopays.length} daily autopays (~${formatCurrency(dailySum)}/day, projecting to ~${formatCurrency(projectedDaily)}/month) and ${monthlyAutopays.length} monthly autopays (${formatCurrency(monthlySum)}/month). Keeping track prevents silent subscription creep.`,
        type: 'info',
      })
    }

    // Food delivery & Cafes check
    const foodDeliveryExpenses = expenses.filter(e => {
      const d = e.description.toLowerCase()
      const cat = (e.categories?.name || '').toLowerCase()
      return d.includes('swiggy') || d.includes('zomato') || d.includes('starbucks') || d.includes('cafe') || cat.includes('cafe') || cat.includes('food outing')
    })
    if (foodDeliveryExpenses.length >= 3) {
      const totalFoodDelivery = foodDeliveryExpenses.reduce((s, e) => s + e.amount, 0)
      results.push({
        icon: '☕',
        title: `${foodDeliveryExpenses.length} Cafe & Food Outings (${formatCurrency(totalFoodDelivery)})`,
        description: `Since regular home meals are taken care of by family, cafe hangs and delivery orders are purely discretionary. Enjoying them guilt-free works best when capped to a set monthly budget.`,
        type: 'tip',
      })
    }

    // Weekend vs weekday spending
    const weekendSpend = expenses
      .filter(e => { const d = new Date(e.date).getDay(); return d === 0 || d === 6 })
      .reduce((s, e) => s + e.amount, 0)
    const weekdaySpend = totalSpent - weekendSpend
    const weekendDays = Math.min(now.getDate(), 8)
    const weekdayDays = Math.max(now.getDate() - weekendDays, 1)
    const avgWeekendDaily = weekendSpend / Math.max(weekendDays, 1)
    const avgWeekdayDaily = weekdaySpend / Math.max(weekdayDays, 1)

    if (avgWeekendDaily > avgWeekdayDaily * 1.5 && weekendSpend > 0) {
      results.push({
        icon: '📅',
        title: 'You spend more on weekends',
        description: `Weekend avg: ${formatCurrency(Math.round(avgWeekendDaily))}/day vs ${formatCurrency(Math.round(avgWeekdayDaily))}/day on weekdays. Plan weekend activities with a budget in mind.`,
        type: 'warning',
      })
    }

    // Budget health
    const overallBudget = budgets.find(b => b.category_id === null)
    if (overallBudget) {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const daysLeft = daysInMonth - now.getDate()
      const budgetLeft = overallBudget.amount - totalSpent
      const dailyBudgetLeft = budgetLeft / Math.max(daysLeft, 1)

      if (budgetLeft > 0) {
        results.push({
          icon: '✅',
          title: 'On track with your budget',
          description: `You have ${formatCurrency(budgetLeft)} left for ${daysLeft} more days. That's ${formatCurrency(Math.round(dailyBudgetLeft))}/day you can comfortably spend.`,
          type: 'success',
        })
      } else {
        results.push({
          icon: '🚨',
          title: 'Monthly budget exceeded!',
          description: `You've exceeded your ${formatCurrency(overallBudget.amount)} budget by ${formatCurrency(Math.abs(budgetLeft))}. Try cutting discretionary spending for the rest of the month.`,
          type: 'warning',
        })
      }
    }

    // Daily average
    results.push({
      icon: '📊',
      title: `Daily average: ${formatCurrency(Math.round(avgDaily))}`,
      description: `You're spending ~${formatCurrency(Math.round(avgDaily))}/day this month. At this pace, you'll end the month at ~${formatCurrency(Math.round(avgDaily * 30))}.`,
      type: 'info',
    })

    // Largest single transaction
    const highestExpense = [...expenses].sort((a, b) => b.amount - a.amount)[0]
    if (highestExpense && highestExpense.amount > avgDaily * 5) {
      results.push({
        icon: '💰',
        title: `Largest transaction: "${highestExpense.description}"`,
        description: `Your biggest expense was ${formatCurrency(highestExpense.amount)} — ${((highestExpense.amount / totalSpent) * 100).toFixed(0)}% of your total monthly spend.`,
        type: 'info',
      })
    }

    // UPI heavy usage tip
    const upiExpenses = expenses.filter(e => e.payment_method === 'upi')
    if (upiExpenses.length > expenses.length * 0.8) {
      results.push({
        icon: '📱',
        title: 'You mostly pay via UPI',
        description: `${upiExpenses.length} of your ${expenses.length} transactions are UPI. Great for tracking — keep at it! Check your UPI app statement monthly to cross-verify.`,
        type: 'tip',
      })
    }

    return results
  }, [expenses, budgets])

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const monthLabel = getMonthLabel(now.getFullYear(), now.getMonth())

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Insights</h1>
        <p className="text-gray-400 text-sm">{monthLabel} · {formatCurrency(totalSpent)} spent</p>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-white font-medium mb-1">No data to analyze yet</p>
          <p className="text-gray-400 text-sm">Add some expenses and come back for personalized insights!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight, i) => (
            <InsightCard key={i} {...insight} />
          ))}
        </div>
      )}

      {/* Summary stats */}
      {expenses.length > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Month at a Glance</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{expenses.length}</p>
              <p className="text-gray-400 text-xs mt-1">Transactions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(Math.round(totalSpent / now.getDate()))}
              </p>
              <p className="text-gray-400 text-xs mt-1">Daily Average</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {expenses.length > 0 ? formatCurrency(Math.max(...expenses.map(e => e.amount))) : '—'}
              </p>
              <p className="text-gray-400 text-xs mt-1">Largest Expense</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
