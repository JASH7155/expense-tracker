import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-provider'

export const metadata: Metadata = {
  title: 'ExpenseIQ — Modern Personal Finance',
  description: 'Track your expenses, understand your spending, take control of your finances.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('expenseiq_theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-zinc-50 text-zinc-900 dark:bg-[#090a0f] dark:text-zinc-100 min-h-screen font-sans selection:bg-zinc-800 selection:text-white dark:selection:bg-zinc-200 dark:selection:text-zinc-900">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
