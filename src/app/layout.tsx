import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ExpenseIQ — Personal Expense Tracker',
  description: 'Track your expenses, understand your spending, take control of your finances.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
