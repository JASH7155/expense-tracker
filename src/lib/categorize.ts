import { Category } from '@/types/database'

type CategoryKeywords = {
  keywords: string[]
}

const CATEGORY_RULES: Record<string, CategoryKeywords> = {
  'Food Outings & Cafes': {
    keywords: [
      'swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'chai', 'tea', 'lunch',
      'dinner', 'breakfast', 'pizza', 'burger', 'biryani', 'mcdonalds', 'kfc',
      'starbucks', 'subway', 'dominos', 'boba', 'bakery', 'pastry', 'snack',
      'shawarma', 'momos', 'blinkit', 'zepto', 'instamart'
    ],
  },
  'Commute & Fuel': {
    keywords: [
      'ola', 'uber', 'rapido', 'auto', 'metro', 'petrol', 'fuel', 'diesel',
      'bus', 'train', 'irctc', 'parking', 'toll', 'fastag', 'taxi', 'bike'
    ],
  },
  'Shopping & Tech': {
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'zara', 'h&m',
      'clothing', 'shoes', 'sneakers', 'shirt', 'jeans', 'watch', 'bag',
      'electronics', 'gadget', 'headphones', 'earphones', 'laptop', 'charger',
      'mouse', 'keyboard', 'phone', 'croma', 'reliance digital'
    ],
  },
  'Entertainment & Outings': {
    keywords: [
      'pvr', 'inox', 'movie', 'cinema', 'bookmyshow', 'concert', 'gaming', 'steam',
      'ps5', 'playstation', 'xbox', 'club', 'party', 'bowling', 'arcade', 'pub', 'bar'
    ],
  },
  'Autopays & Subscriptions': {
    keywords: [
      'netflix', 'spotify', 'youtube premium', 'prime', 'hotstar', 'disney',
      'apple', 'icloud', 'google one', 'gym', 'membership', 'recharge',
      'jio', 'airtel', 'vi', 'subscription', 'autopay', 'annual fee'
    ],
  },
  'Savings & Investments': {
    keywords: [
      'sip', 'mutual fund', 'zerodha', 'groww', 'upstox', 'stocks', 'shares',
      'fd', 'fixed deposit', 'ppf', 'nps', 'gold', 'crypto', 'savings', 'chit'
    ],
  },
  'Family Treats & Gifts': {
    keywords: [
      'mom', 'dad', 'parents', 'family', 'gift', 'birthday', 'anniversary',
      'sweets', 'mithai', 'treat', 'festival', 'diwali', 'rakhi'
    ],
  },
  'Personal Care & Health': {
    keywords: [
      'salon', 'haircut', 'spa', 'grooming', 'perfume', 'skincare', 'pharmacy',
      'medicine', 'doctor', '1mg', 'netmeds', 'gym', 'creatine', 'protein',
      'vitamins', 'cult'
    ],
  },
  'Learning & Courses': {
    keywords: [
      'udemy', 'coursera', 'course', 'book', 'kindle', 'certification',
      'tutorial', 'exam', 'skillshare', 'coaching', 'medium', 'substack'
    ],
  },
  'Trips & Travel': {
    keywords: [
      'flight', 'hotel', 'resort', 'trip', 'vacation', 'goibibo', 'makemytrip',
      'airbnb', 'booking.com', 'travel', 'holiday', 'weekend trip', 'trek'
    ],
  },
  'Home Contributions': {
    keywords: ['electricity', 'wifi', 'broadband', 'groceries', 'supermarket', 'maid', 'maintenance'],
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
