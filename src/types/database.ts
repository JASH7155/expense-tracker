export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          color: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon: string
          color: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          icon?: string
          color?: string
          is_default?: boolean
          created_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          amount: number
          description: string
          category_id: string | null
          date: string
          payment_method: string
          tags: string[]
          is_recurring: boolean
          recurring_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
          is_autopay: boolean
          notes: string | null
          created_at: string
          type?: 'expense' | 'income' | 'lend'
          bank_account?: string | null
          friend_name?: string | null
          due_status?: 'due' | 'settled' | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          description: string
          category_id?: string | null
          date: string
          payment_method: string
          tags?: string[]
          is_recurring?: boolean
          recurring_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
          is_autopay?: boolean
          notes?: string | null
          created_at?: string
          type?: 'expense' | 'income' | 'lend'
          bank_account?: string | null
          friend_name?: string | null
          due_status?: 'due' | 'settled' | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          description?: string
          category_id?: string | null
          date?: string
          payment_method?: string
          tags?: string[]
          is_recurring?: boolean
          recurring_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
          is_autopay?: boolean
          notes?: string | null
          created_at?: string
          type?: 'expense' | 'income' | 'lend'
          bank_account?: string | null
          friend_name?: string | null
          due_status?: 'due' | 'settled' | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          amount: number
          month: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          amount: number
          month: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          amount?: number
          month?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Category = Database['public']['Tables']['categories']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type Budget = Database['public']['Tables']['budgets']['Row']

export type ExpenseWithCategory = Expense & {
  categories: Category | null
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'netbanking' | 'other'
