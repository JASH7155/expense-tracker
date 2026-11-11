# ExpenseIQ — Personal Expense Tracker

A full-stack personal expense tracker built with Next.js 14, Supabase, and deployed on Vercel.

## 🚀 Features

- 💸 **Quick expense entry** with auto-categorization
- 📊 **Dashboard** with charts (donut, line, bar)
- 🎯 **Budget tracking** — overall and per-category
- ✨ **Smart insights** — spending patterns and suggestions
- 📄 **Reports** with CSV export
- 🔒 **Secure auth** via Supabase Magic Link
- 🌙 **Dark mode** by default
- 📱 **Mobile-responsive** design

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Backend**: Next.js API Routes (serverless)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Magic Link)
- **Deployment**: Vercel

## 📦 Getting Started

### 1. Clone & Install

```bash
git clone <your-repo>
cd expense-tracker
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
4. Go to **Settings → API** and copy your Project URL and anon key

### 3. Configure Environment Variables

Copy `.env.local` and fill in your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🌐 Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add your environment variables in Vercel dashboard
4. Click **Deploy** — done! 🎉

## 📁 Project Structure

```
src/
├── app/
│   ├── auth/           # Login page
│   ├── (app)/          # Protected app pages
│   │   ├── dashboard/  # Main dashboard
│   │   ├── expenses/   # Expense list + add form
│   │   ├── budgets/    # Budget management
│   │   ├── insights/   # AI-powered insights
│   │   ├── reports/    # Reports + CSV export
│   │   └── settings/   # Account settings
│   └── layout.tsx
├── lib/
│   ├── supabase.ts     # Supabase client
│   ├── hooks.ts        # React data hooks
│   ├── categorize.ts   # Auto-categorization
│   └── utils.ts        # Utility functions
├── types/
│   └── database.ts     # TypeScript DB types
└── middleware.ts       # Auth middleware
supabase/
└── schema.sql          # Database schema + RLS
```

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Each user can only access their own data
- Magic Link auth — no passwords stored
