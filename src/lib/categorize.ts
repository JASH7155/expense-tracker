import { Category } from '@/types/database'

type CategoryKeywords = {
  keywords: string[]
}

const CATEGORY_RULES: Record<string, CategoryKeywords> = {
  'Food & Dining': {
    keywords: [
      'swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'chai', 'tea', 'lunch',
      'dinner', 'breakfast', 'pizza', 'burger', 'biryani', 'mcdonalds', 'kfc',
      'starbucks', 'subway', 'dominos', 'boba', 'bakery', 'pastry', 'snack',
      'shawarma', 'momos', 'blinkit', 'zepto', 'instamart', 'groceries', 'food'
    ],
  },
  'Commute & Travel': {
    keywords: [
      'ola', 'uber', 'rapido', 'auto', 'metro', 'petrol', 'fuel', 'diesel',
      'bus', 'train', 'irctc', 'parking', 'toll', 'fastag', 'taxi', 'bike',
      'flight', 'hotel', 'resort', 'trip', 'travel', 'vacation', 'makemytrip'
    ],
  },
  'Shopping': {
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'zara', 'h&m',
      'clothing', 'shoes', 'sneakers', 'shirt', 'jeans', 'watch', 'bag',
      'electronics', 'gadget', 'headphones', 'earphones', 'laptop', 'charger',
      'mouse', 'keyboard', 'phone', 'croma', 'reliance digital', 'tech'
    ],
  },
  'Entertainment': {
    keywords: [
      'pvr', 'inox', 'movie', 'cinema', 'bookmyshow', 'concert', 'gaming', 'steam',
      'ps5', 'playstation', 'xbox', 'club', 'party', 'bowling', 'arcade', 'pub', 'bar'
    ],
  },
  'Subscriptions': {
    keywords: [
      'netflix', 'spotify', 'youtube premium', 'prime', 'hotstar', 'disney',
      'apple', 'icloud', 'google one', 'gym', 'membership', 'recharge',
      'jio', 'airtel', 'vi', 'subscription', 'autopay', 'annual fee', 'wifi', 'broadband'
    ],
  },
  'Investments & Savings': {
    keywords: [
      'sip', 'mutual fund', 'zerodha', 'groww', 'upstox', 'stocks', 'shares',
      'fd', 'fixed deposit', 'ppf', 'nps', 'gold', 'crypto', 'savings', 'chit'
    ],
  },
  'Family & Gifts': {
    keywords: [
      'mom', 'dad', 'parents', 'family', 'gift', 'birthday', 'anniversary',
      'sweets', 'mithai', 'treat', 'festival', 'diwali', 'rakhi'
    ],
  },
}

export function categorizeExpense(description: string, categories: Category[]): Category | null {
  const lowerDesc = description.toLowerCase()

  for (const [categoryName, { keywords }] of Object.entries(CATEGORY_RULES)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        const matched = categories.find(
          (c) =>
            c.name.toLowerCase() === categoryName.toLowerCase() ||
            c.name.toLowerCase().includes(categoryName.toLowerCase().split(' ')[0])
        )
        if (matched) return matched
      }
    }
  }

  return null
}
