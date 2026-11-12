-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏷️',
  color TEXT NOT NULL DEFAULT '#6b7280',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table with Autopay & Frequency support
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'upi' CHECK (payment_method IN ('cash', 'upi', 'card', 'netbanking', 'other')),
  tags TEXT[] DEFAULT '{}',
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT DEFAULT NULL CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly', NULL)),
  is_autopay BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If table already exists, safely add columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'recurring_frequency') THEN
    ALTER TABLE public.expenses ADD COLUMN recurring_frequency TEXT DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'is_autopay') THEN
    ALTER TABLE public.expenses ADD COLUMN is_autopay BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  month DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id, month)
);

-- Row Level Security (Complete Multi-user Isolation)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can only access their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can only access their own budgets" ON public.budgets;

CREATE POLICY "Users can only access their own categories"
  ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own expenses"
  ON public.expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own budgets"
  ON public.budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_autopay ON public.expenses(user_id, is_autopay);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month);

-- Tailored trigger function for young professionals / living with parents
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, icon, color, is_default) VALUES
    (NEW.id, 'Food Outings & Cafes', '🍔', '#f97316', true),
    (NEW.id, 'Commute & Fuel', '🛵', '#3b82f6', true),
    (NEW.id, 'Shopping & Tech', '🛍️', '#a855f7', true),
    (NEW.id, 'Entertainment & Outings', '🎬', '#ec4899', true),
    (NEW.id, 'Autopays & Subscriptions', '⚡', '#06b6d4', true),
    (NEW.id, 'Savings & Investments', '💰', '#22c55e', true),
    (NEW.id, 'Family Treats & Gifts', '🎁', '#f43f5e', true),
    (NEW.id, 'Personal Care & Health', '💊', '#ef4444', true),
    (NEW.id, 'Learning & Courses', '📚', '#f59e0b', true),
    (NEW.id, 'Trips & Travel', '🌴', '#14b8a6', true),
    (NEW.id, 'Home Contributions', '🏠', '#64748b', true),
    (NEW.id, 'Miscellaneous', '🏷️', '#6b7280', true);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();

-- Seed categories for any existing accounts created before this script
INSERT INTO public.categories (user_id, name, icon, color, is_default)
SELECT u.id, c.name, c.icon, c.color, true
FROM auth.users u
CROSS JOIN (
  VALUES
    ('Food Outings & Cafes', '🍔', '#f97316'),
    ('Commute & Fuel', '🛵', '#3b82f6'),
    ('Shopping & Tech', '🛍️', '#a855f7'),
    ('Entertainment & Outings', '🎬', '#ec4899'),
    ('Autopays & Subscriptions', '⚡', '#06b6d4'),
    ('Savings & Investments', '💰', '#22c55e'),
    ('Family Treats & Gifts', '🎁', '#f43f5e'),
    ('Personal Care & Health', '💊', '#ef4444'),
    ('Learning & Courses', '📚', '#f59e0b'),
    ('Trips & Travel', '🌴', '#14b8a6'),
    ('Home Contributions', '🏠', '#64748b'),
    ('Miscellaneous', '🏷️', '#6b7280')
) AS c(name, icon, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories cat WHERE cat.user_id = u.id AND cat.name = c.name
);
