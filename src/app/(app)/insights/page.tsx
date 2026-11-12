'use client'

import { useMemo } from 'react'
import { useMonthlyExpenses, useBudgets } from '@/lib/hooks'
import { formatCurrency, getMonthLabel } from '@/lib/utils'
import {
  Sparkles,
  Home,
  Zap,
  Coffee,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Smartphone,
  Coins,
  Search,
  PieChart,
} from 'lucide-react'

function InsightCard({
  Icon,
  title,
  description,
  type,
}: {
  Icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  type: 'info' | 'warning' | 'success' | 'tip'
}) {
  const typeConfigs = {
    info: {
      badge: 'Analysis',
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      iconContainer: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    warning: {
      badge: 'Attention',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      iconContainer: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    success: {
      badge: 'Positive',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      iconContainer: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    tip: {
      badge: 'Suggestion',
      badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      iconContainer: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
  }

  const cfg = typeConfigs[type]

  return (
    <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconContainer}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border font-semibold ${cfg.badgeClass}`}>
              {cfg.badge}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{description}</p>
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
      Icon: React.ComponentType<{ className?: string }>
      title: string
      description: string
      type: 'info' | 'warning' | 'success' | 'tip'
    }> = []

    if (expenses.length === 0) return results

    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
    const avgDaily = totalSpent / (now.getDate() || 1)

    // Category analysis
    const byCategory: Record<string, { name: string; total: number; count: number }> = {}
    for (const exp of expenses) {
      const key = exp.category_id || 'misc'
      if (!byCategory[key]) {
        byCategory[key] = {
          name: exp.categories?.name || 'Misc',
          total: 0,
          count: 0,
        }
      }
      byCategory[key].total += exp.amount
      byCategory[key].count++
    }

    const topCategory = Object.values(byCategory).sort((a, b) => b.total - a.total)[0]
    if (topCategory && totalSpent > 0) {
      const percent = ((topCategory.total / totalSpent) * 100).toFixed(0)
      results.push({
        Icon: PieChart,
        title: `${topCategory.name} is your biggest spend`,
        description: `You've spent ${formatCurrency(topCategory.total)} on ${topCategory.name} this month — that's ${percent}% of your total expenditure.`,
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

    if (rentOrBills.length === 0) {
      results.push({
        Icon: Home,
        title: 'Zero Rent & Utilities Advantage',
        description: `No rent or household utility bills recorded! This allows you to comfortably allocate 40–50%+ of your income into Savings, SIPs, or emergency reserves. ${totalSavings > 0 ? `You've allocated ${formatCurrency(totalSavings)} to investments this month.` : 'Setting up an auto-debit SIP right after payday makes building wealth automatic.'}`,
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
        Icon: Zap,
        title: `${autopayExpenses.length} Active Autopays Tracked`,
        description: `You have ${dailyAutopays.length} daily autopays (~${formatCurrency(dailySum)}/day, projecting to ~${formatCurrency(projectedDaily)}/month) and ${monthlyAutopays.length} monthly autopays (${formatCurrency(monthlySum)}/month). Systematic tracking prevents silent recurring budget creep.`,
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
        Icon: Coffee,
        title: `${foodDeliveryExpenses.length} Outings & Delivery Orders (${formatCurrency(totalFoodDelivery)})`,
        description: `Discretionary dining and coffee runs recorded so far. Enjoying these without hesitation works best when governed by an explicit monthly dining budget.`,
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
        Icon: Calendar,
        title: 'Elevated Weekend Spending Pattern',
        description: `Weekend average is ${formatCurrency(Math.round(avgWeekendDaily))}/day vs ${formatCurrency(Math.round(avgWeekdayDaily))}/day on weekdays. Consider setting a weekend spending threshold.`,
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
          Icon: CheckCircle2,
          title: 'Within Monthly Budget Limits',
          description: `You have ${formatCurrency(budgetLeft)} remaining for ${daysLeft} more days (~${formatCurrency(Math.round(dailyBudgetLeft))}/day allowance).`,
          type: 'success',
        })
      } else {
        results.push({
          Icon: AlertTriangle,
          title: 'Monthly Budget Limit Reached',
          description: `Spending exceeds the planned ${formatCurrency(overallBudget.amount)} budget by ${formatCurrency(Math.abs(budgetLeft))}. Restricting non-essential debits is recommended.`,
          type: 'warning',
        })
      }
    }

    // Daily average
    results.push({
      Icon: TrendingUp,
      title: `Current Burn Rate: ${formatCurrency(Math.round(avgDaily))}/day`,
      description: `At this current pace, projected total monthly spending will conclude near ${formatCurrency(Math.round(avgDaily * 30))}.`,
      type: 'info',
    })

    // Largest single transaction
    const highestExpense = [...expenses].sort((a, b) => b.amount - a.amount)[0]
    if (highestExpense && highestExpense.amount > avgDaily * 3 && totalSpent > 0) {
      results.push({
        Icon: Coins,
        title: `Single Largest Debit: "${highestExpense.description}"`,
        description: `${formatCurrency(highestExpense.amount)} representing ${((highestExpense.amount / totalSpent) * 100).toFixed(0)}% of your total monthly expense.`,
        type: 'info',
      })
    }

    // UPI heavy usage tip
    const upiExpenses = expenses.filter(e => e.payment_method === 'upi')
    if (upiExpenses.length > expenses.length * 0.75 && expenses.length >= 4) {
      results.push({
        Icon: Smartphone,
        title: 'UPI Primary Channel',
        description: `${upiExpenses.length} of ${expenses.length} transactions processed via instant UPI. Keep transaction descriptions descriptive for seamless monthly accounting.`,
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
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
          Smart Insights
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5">
          {monthLabel} · <span className="tabular-nums font-medium text-zinc-700 dark:text-zinc-300">{formatCurrency(totalSpent)}</span> total expenditure
        </p>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm mb-1">No transaction patterns yet</p>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm mx-auto">
            Log transactions to unlock intelligent cash flow analytics and personalized budget tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {insights.map((insight, i) => (
            <InsightCard key={i} {...insight} />
          ))}
        </div>
      )}

      {/* Month at a Glance */}
      {expenses.length > 0 && (
        <div className="bg-white dark:bg-[#0e1017] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Month at a Glance</h2>
          <div className="grid grid-cols-3 gap-4 text-center divide-x divide-zinc-100 dark:divide-zinc-800/60">
            <div>
              <p className="text-xl sm:text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {expenses.length}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">Transactions</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(Math.round(totalSpent / Math.max(now.getDate(), 1)))}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">Daily Average</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {expenses.length > 0 ? formatCurrency(Math.max(...expenses.map(e => e.amount))) : '—'}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5">Largest Debit</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
