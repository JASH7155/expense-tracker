-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏷️',
  color TEXT NOT NULL DEFAULT '#6b7280',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'upi' CHECK (payment_method IN ('cash', 'upi', 'card', 'netbanking', 'other')),
  tags TEXT[] DEFAULT '{}',
  is_recurring BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  month DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id, month)
);

-- Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own categories"
  ON categories FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own expenses"
  ON expenses FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own budgets"
  ON budgets FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);

-- Function to seed default categories for new users
CREATE OR REPLACE FUNCTION seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (user_id, name, icon, color, is_default) VALUES
    (NEW.id, 'Food & Dining', '🍔', '#f97316', true),
    (NEW.id, 'Transport', '🚗', '#3b82f6', true),
    (NEW.id, 'Shopping', '🛍️', '#a855f7', true),
    (NEW.id, 'Housing', '🏠', '#14b8a6', true),
    (NEW.id, 'Entertainment', '🎬', '#ec4899', true),
    (NEW.id, 'Health', '💊', '#ef4444', true),
    (NEW.id, 'Education', '📚', '#f59e0b', true),
    (NEW.id, 'Travel', '✈️', '#06b6d4', true),
    (NEW.id, 'Investments', '💰', '#22c55e', true),
    (NEW.id, 'Utilities', '🔧', '#64748b', true),
    (NEW.id, 'Gifts', '🎁', '#f43f5e', true),
    (NEW.id, 'Miscellaneous', '🏷️', '#6b7280', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION seed_default_categories();
